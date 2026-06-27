import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
// Bundled, pre-embedded sample documents. Imported (not fs-read) so it's always
// included in the serverless bundle. Acts as a read-only fallback so the hosted
// demo works with zero external services.
import seedData from "../data/seed-store.json";

// Persistent vector store backed by a JSON file on disk.
// - Local dev: writes to ./.data/store.json
// - Vercel (read-only project FS): writes to /tmp (per-instance, ephemeral)
// - If no writable store exists yet, falls back to the bundled seed above.
// For a multi-tenant production deploy, swap these functions for a hosted vector
// DB (the pgvector schema in supabase/schema.sql is ready to drop in).
const WRITABLE_DIR = process.env.VERCEL
  ? "/tmp"
  : path.join(process.cwd(), ".data");
const STORE_PATH = path.join(WRITABLE_DIR, "store.json");

export type StoredDocument = {
  id: string;
  file_name: string;
  page_count: number;
  chunk_count: number;
  created_at: string;
};

export type StoredChunk = {
  id: number;
  document_id: string;
  file_name: string;
  page: number;
  chunk_index: number;
  content: string;
  embedding: number[];
};

export type MatchedChunk = Omit<StoredChunk, "embedding"> & { similarity: number };

type StoreShape = {
  documents: StoredDocument[];
  chunks: StoredChunk[];
  nextChunkId: number;
};

async function readStore(): Promise<StoreShape> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    return JSON.parse(raw) as StoreShape;
  } catch {
    // No writable store yet — start from the bundled seed (deep-copied so we
    // never mutate the imported module).
    return JSON.parse(JSON.stringify(seedData)) as StoreShape;
  }
}

async function writeStore(store: StoreShape): Promise<void> {
  await fs.mkdir(WRITABLE_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store), "utf8");
}

export async function addDocument(meta: {
  fileName: string;
  pageCount: number;
  chunkCount: number;
}): Promise<StoredDocument> {
  const store = await readStore();
  const doc: StoredDocument = {
    id: crypto.randomUUID(),
    file_name: meta.fileName,
    page_count: meta.pageCount,
    chunk_count: meta.chunkCount,
    created_at: new Date().toISOString(),
  };
  store.documents.push(doc);
  await writeStore(store);
  return doc;
}

export async function addChunks(
  rows: Array<{
    documentId: string;
    fileName: string;
    page: number;
    chunkIndex: number;
    content: string;
    embedding: number[];
  }>,
): Promise<void> {
  const store = await readStore();
  for (const r of rows) {
    store.chunks.push({
      id: store.nextChunkId++,
      document_id: r.documentId,
      file_name: r.fileName,
      page: r.page,
      chunk_index: r.chunkIndex,
      content: r.content,
      embedding: r.embedding,
    });
  }
  await writeStore(store);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/** Top-k most similar chunks to a query embedding (cosine), optionally scoped. */
export async function matchChunks(
  queryEmbedding: number[],
  k: number,
  filterDocument?: string | null,
): Promise<MatchedChunk[]> {
  const store = await readStore();
  const pool = filterDocument
    ? store.chunks.filter((c) => c.document_id === filterDocument)
    : store.chunks;

  return pool
    .map((c) => {
      const { embedding, ...rest } = c;
      return { ...rest, similarity: cosineSimilarity(queryEmbedding, embedding) };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);
}
