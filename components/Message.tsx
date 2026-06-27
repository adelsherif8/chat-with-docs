"use client";

import type { ChatMessage } from "@/lib/types";
import { CitationChip } from "./CitationChip";

export function Message({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  // De-duplicate citations by file + page so we show one chip per source.
  const citations = dedupeCitations(message.citations ?? []);

  return (
    <div className={`flex animate-fade-up ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[85%] gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
        <Avatar isUser={isUser} />
        <div className={isUser ? "text-right" : ""}>
          <div
            className={`inline-block rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
              isUser
                ? "bg-accent text-white"
                : "border border-edge bg-panel text-slate-100"
            }`}
          >
            {message.content ? (
              <span className="whitespace-pre-wrap">{message.content}</span>
            ) : message.pending ? (
              <TypingDots />
            ) : null}
          </div>

          {!isUser && citations.length > 0 && (
            <div className="mt-2.5">
              <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Cited sources
              </div>
              <div className="flex flex-wrap gap-2">
                {citations.map((c, i) => (
                  <CitationChip key={i} citation={c} n={i + 1} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Avatar({ isUser }: { isUser: boolean }) {
  return (
    <div
      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${
        isUser
          ? "bg-accent/20 text-accent"
          : "bg-gradient-to-br from-accent to-accent2 text-white"
      }`}
    >
      <i className={isUser ? "fa-solid fa-user" : "fa-solid fa-wand-magic-sparkles"} />
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-slate-400"
          style={{ animation: `blink 1.2s ${i * 0.2}s infinite` }}
        />
      ))}
    </span>
  );
}

function dedupeCitations<T extends { fileName: string; page: number | null }>(
  citations: T[],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const c of citations) {
    const key = `${c.fileName}#${c.page}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(c);
    }
  }
  return out;
}
