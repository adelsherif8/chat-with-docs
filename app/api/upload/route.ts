import { NextRequest, NextResponse } from "next/server";
import { extractPdfPages } from "@/lib/pdf";
import { chunkPages } from "@/lib/chunk";
import { embed } from "@/lib/embeddings";
import { supabase } from "@/lib/supabase";

// pdf-parse + Buffer need the Node runtime, not the edge runtime.
export const runtime = "nodejs";
export const maxDuration = 60;

const EMBED_BATCH = 96; // OpenAI handles large batches; keep requests reasonable.

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. PDF → per-page text
    const pages = await extractPdfPages(buffer);
    if (pages.length === 0) {
      return NextResponse.json(
        { error: "Couldn't extract text. Is this a scanned (image-only) PDF?" },
        { status: 422 },
      );
    }

    // 2. Pages → overlapping chunks (carrying page numbers for citations)
    const chunks = chunkPages(pages);

    // 3. Create the document row
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .insert({
        file_name: file.name,
        page_count: pages.length,
        chunk_count: chunks.length,
      })
      .select()
      .single();

    if (docErr || !doc) {
      throw new Error(docErr?.message || "Failed to create document row.");
    }

    // 4. Embed chunks in batches and insert
    for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
      const batch = chunks.slice(i, i + EMBED_BATCH);
      const vectors = await embed(batch.map((c) => c.content));

      const rows = batch.map((c, j) => ({
        document_id: doc.id,
        file_name: file.name,
        page: c.page,
        chunk_index: c.chunkIndex,
        content: c.content,
        embedding: vectors[j],
      }));

      const { error: insErr } = await supabase.from("chunks").insert(rows);
      if (insErr) throw new Error(insErr.message);
    }

    return NextResponse.json({
      documentId: doc.id,
      fileName: file.name,
      pages: pages.length,
      chunks: chunks.length,
    });
  } catch (err: any) {
    console.error("[upload] error:", err);
    return NextResponse.json(
      { error: err?.message || "Upload failed." },
      { status: 500 },
    );
  }
}
