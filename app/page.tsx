"use client";

import { useRef, useState } from "react";
import { Uploader } from "@/components/Uploader";
import { Message } from "@/components/Message";
import type { ChatMessage, Citation, Source, UploadedDoc } from "@/lib/types";

const SUGGESTIONS = [
  "Summarize this document in 3 bullet points",
  "What are the key dates or deadlines?",
  "What are the main obligations or terms?",
];

export default function Home() {
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasDocs = docs.length > 0;

  function scrollToBottom() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }

  async function send(text: string) {
    const question = text.trim();
    if (!question || streaming) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: question },
      { role: "assistant", content: "", pending: true, citations: [], sources: [] },
    ];
    setMessages(nextMessages);
    setInput("");
    setStreaming(true);
    scrollToBottom();

    const assistantIndex = nextMessages.length - 1;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages
            .slice(0, -1)
            .map((m) => ({ role: m.role, content: m.content })),
          documentId: null, // search across all uploaded docs
        }),
      });

      if (!res.body) throw new Error("No response stream.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const update = (fn: (m: ChatMessage) => ChatMessage) => {
        setMessages((prev) => {
          const copy = [...prev];
          copy[assistantIndex] = fn(copy[assistantIndex]);
          return copy;
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // keep the trailing partial line

        for (const line of lines) {
          if (!line.trim()) continue;
          const evt = JSON.parse(line);

          if (evt.type === "sources") {
            update((m) => ({ ...m, sources: evt.sources as Source[], pending: true }));
          } else if (evt.type === "text") {
            update((m) => ({ ...m, content: m.content + evt.text, pending: false }));
            scrollToBottom();
          } else if (evt.type === "citation") {
            update((m) => ({
              ...m,
              citations: [...(m.citations ?? []), evt.citation as Citation],
            }));
          } else if (evt.type === "error") {
            update((m) => ({
              ...m,
              content: `⚠️ ${evt.error}`,
              pending: false,
            }));
          } else if (evt.type === "done") {
            update((m) => ({ ...m, pending: false }));
          }
        }
      }
    } catch (e: any) {
      setMessages((prev) => {
        const copy = [...prev];
        copy[assistantIndex] = {
          ...copy[assistantIndex],
          content: `⚠️ ${e.message}`,
          pending: false,
        };
        return copy;
      });
    } finally {
      setStreaming(false);
      scrollToBottom();
    }
  }

  return (
    <div className="mx-auto flex h-screen max-w-6xl gap-6 px-4 py-6">
      {/* Sidebar */}
      <aside className="hidden w-80 shrink-0 flex-col md:flex">
        <header className="mb-5">
          <h1 className="text-lg font-semibold text-white">
            Chat with your documents
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Upload a PDF and ask anything. Every answer is grounded in your
            files with inline citations.
          </p>
        </header>

        <Uploader
          docs={docs}
          onUploaded={(doc) => setDocs((prev) => [...prev, doc])}
        />

        <div className="mt-auto pt-6 text-[11px] leading-relaxed text-slate-600">
          <div className="mb-1 font-medium text-slate-500">How it works</div>
          PDF → chunk + embed → pgvector search → Claude answers with cited
          sources.
        </div>
      </aside>

      {/* Chat panel */}
      <main className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-edge bg-panel/30">
        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <EmptyState hasDocs={hasDocs} onPick={send} />
          ) : (
            messages.map((m, i) => <Message key={i} message={m} />)
          )}
        </div>

        <div className="border-t border-edge p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder={
                hasDocs ? "Ask a question about your documents…" : "Upload a PDF to get started…"
              }
              className="max-h-32 flex-1 resize-none rounded-xl border border-edge bg-ink px-4 py-3 text-[15px] text-slate-100 placeholder:text-slate-600 focus:border-accent/60 focus:outline-none"
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {streaming ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                "↑"
              )}
            </button>
          </form>
          <p className="mt-2 text-center text-[11px] text-slate-600">
            Answers are generated from your documents and cited. Verify anything
            important.
          </p>
        </div>
      </main>
    </div>
  );
}

function EmptyState({
  hasDocs,
  onPick,
}: {
  hasDocs: boolean;
  onPick: (q: string) => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent2 text-3xl">
        ✦
      </div>
      <h2 className="mt-4 text-xl font-semibold text-white">
        Ask your documents anything
      </h2>
      <p className="mt-1 max-w-sm text-sm text-slate-400">
        {hasDocs
          ? "Your document is indexed. Try one of these:"
          : "Upload a PDF from the left panel, then ask away."}
      </p>

      {hasDocs && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onPick(s)}
              className="rounded-full border border-edge bg-panel px-3.5 py-1.5 text-sm text-slate-300 transition hover:border-accent/60 hover:text-white"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
