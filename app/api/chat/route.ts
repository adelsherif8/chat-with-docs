import { NextRequest } from "next/server";
import { anthropic, ANTHROPIC_MODEL } from "@/lib/anthropic";
import { embedOne } from "@/lib/embeddings";
import { supabase, type MatchedChunk } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `You are a precise assistant that answers questions about the user's uploaded documents.

Rules:
- Answer using ONLY the information in the provided documents.
- Cite the specific passages you used. Citations are attached automatically when you ground a statement in a document.
- If the answer is not contained in the documents, say so plainly — do not guess or use outside knowledge.
- Be concise and direct. Prefer a short, well-structured answer over a long one.`;

const TOP_K = 6;

function send(controller: ReadableStreamDefaultController, obj: unknown) {
  controller.enqueue(new TextEncoder().encode(JSON.stringify(obj) + "\n"));
}

export async function POST(req: NextRequest) {
  const { messages, documentId } = (await req.json()) as {
    messages: ChatMessage[];
    documentId?: string | null;
  };

  const question = messages?.filter((m) => m.role === "user").at(-1)?.content?.trim();
  if (!question) {
    return new Response(JSON.stringify({ error: "No question provided." }), { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 1. Retrieve relevant chunks
        const queryEmbedding = await embedOne(question);
        const { data, error } = await supabase.rpc("match_chunks", {
          query_embedding: queryEmbedding,
          match_count: TOP_K,
          filter_document: documentId ?? null,
        });
        if (error) throw new Error(error.message);

        const matches = (data ?? []) as MatchedChunk[];

        if (matches.length === 0) {
          send(controller, {
            type: "text",
            text: "I don't have any documents to search yet. Upload a PDF and ask again.",
          });
          send(controller, { type: "done" });
          controller.close();
          return;
        }

        // Tell the UI which sources we retrieved (index === document block index)
        const sources = matches.map((m, index) => ({
          index,
          fileName: m.file_name,
          page: m.page,
          similarity: m.similarity,
          snippet: m.content.slice(0, 220),
        }));
        send(controller, { type: "sources", sources });

        // 2. Build the Claude request — each chunk is a citable document block
        const documentBlocks = matches.map((m) => ({
          type: "document" as const,
          source: {
            type: "content" as const,
            content: [{ type: "text" as const, text: m.content }],
          },
          title: `${m.file_name} · page ${m.page}`,
          citations: { enabled: true },
        }));

        const history = messages.slice(0, -1).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const anthropicStream = anthropic.messages.stream({
          model: ANTHROPIC_MODEL,
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: [
            ...history,
            {
              role: "user",
              content: [
                ...documentBlocks,
                { type: "text", text: question },
              ],
            },
          ],
        });

        // 3. Forward text + citation deltas to the client
        for await (const event of anthropicStream) {
          if (event.type === "content_block_delta") {
            const delta = event.delta as any;
            if (delta.type === "text_delta") {
              send(controller, { type: "text", text: delta.text });
            } else if (delta.type === "citations_delta" && delta.citation) {
              const c = delta.citation;
              const src = sources[c.document_index] ?? null;
              send(controller, {
                type: "citation",
                citation: {
                  documentIndex: c.document_index,
                  citedText: c.cited_text,
                  fileName: src?.fileName ?? c.document_title,
                  page: src?.page ?? null,
                },
              });
            }
          }
        }

        send(controller, { type: "done" });
        controller.close();
      } catch (err: any) {
        console.error("[chat] error:", err);
        send(controller, { type: "error", error: err?.message || "Something went wrong." });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
