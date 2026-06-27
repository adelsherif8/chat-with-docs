import { NextRequest } from "next/server";
import { openai, CHAT_MODEL } from "@/lib/openai";
import { embedOne } from "@/lib/embeddings";
import { matchChunks } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `You are a precise assistant that answers questions about the user's uploaded documents.

Rules:
- Answer using ONLY the information in the numbered sources provided.
- After each statement you make, cite the source it came from with a bracketed number like [1] or [2][3].
- If the answer is not contained in the sources, say so plainly — do not guess or use outside knowledge.
- Be concise and direct.`;

// Higher k so cross-document questions ("which candidate is best?") can see
// passages from every uploaded document, not just the closest one or two.
const TOP_K = 10;

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
        // 1. Retrieve relevant chunks via vector similarity
        const queryEmbedding = await embedOne(question);
        const matches = await matchChunks(queryEmbedding, TOP_K, documentId ?? null);

        if (matches.length === 0) {
          send(controller, {
            type: "text",
            text: "I don't have any documents to search yet. Upload a PDF and ask again.",
          });
          send(controller, { type: "done" });
          controller.close();
          return;
        }

        // Source index === the [n] the model will cite (1-based for the model).
        const sources = matches.map((m, index) => ({
          index,
          fileName: m.file_name,
          page: m.page,
          similarity: m.similarity,
          snippet: m.content.slice(0, 220),
        }));
        send(controller, { type: "sources", sources });

        // 2. Build the grounded prompt
        const context = matches
          .map((m, i) => `[${i + 1}] (${m.file_name}, page ${m.page})\n${m.content}`)
          .join("\n\n");

        const history = messages.slice(0, -1).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const completion = await openai().chat.completions.create({
          model: CHAT_MODEL,
          stream: true,
          temperature: 0.2,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...history,
            {
              role: "user",
              content: `Sources:\n\n${context}\n\nQuestion: ${question}`,
            },
          ],
        });

        // 3. Stream tokens, tracking which [n] markers the model actually cites
        let full = "";
        const citedNumbers = new Set<number>();

        for await (const part of completion) {
          const delta = part.choices[0]?.delta?.content;
          if (!delta) continue;
          full += delta;
          send(controller, { type: "text", text: delta });

          // Detect newly-completed [n] references in the accumulated text
          for (const m of full.matchAll(/\[(\d+)\]/g)) {
            citedNumbers.add(parseInt(m[1], 10));
          }
        }

        // 4. Emit one citation per cited source (mapping [n] → file + page + passage)
        for (const n of [...citedNumbers].sort((a, b) => a - b)) {
          const src = matches[n - 1];
          if (!src) continue;
          send(controller, {
            type: "citation",
            citation: {
              documentIndex: n - 1,
              citedText: src.content.slice(0, 320),
              fileName: src.file_name,
              page: src.page,
            },
          });
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
