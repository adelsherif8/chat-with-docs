"use client";

// Static showcase page used only for generating portfolio screenshots.
// Renders the real components with representative mock data — no API calls.
import { Message } from "@/components/Message";
import { CitationChip } from "@/components/CitationChip";
import type { ChatMessage } from "@/lib/types";

const messages: ChatMessage[] = [
  {
    role: "user",
    content: "What is the notice period for termination, and who can terminate?",
  },
  {
    role: "assistant",
    content:
      "Either party may terminate the agreement for convenience by giving 60 days' written notice. The Customer may also terminate immediately if Acme fails to remedy a material breach within 30 days of written notice.",
    citations: [
      {
        documentIndex: 0,
        fileName: "Acme_MSA_2024.pdf",
        page: 7,
        citedText:
          "Either party may terminate this Agreement for convenience upon sixty (60) days' prior written notice to the other party.",
      },
      {
        documentIndex: 1,
        fileName: "Acme_MSA_2024.pdf",
        page: 8,
        citedText:
          "Customer may terminate immediately if Provider fails to cure a material breach within thirty (30) days after receiving written notice thereof.",
      },
    ],
  },
];

export default function DemoPage() {
  return (
    <div className="mx-auto flex h-screen max-w-6xl gap-6 px-4 py-6">
      <aside className="hidden w-80 shrink-0 flex-col md:flex">
        <header className="mb-5">
          <h1 className="text-lg font-semibold text-white">Chat with your documents</h1>
          <p className="mt-1 text-sm text-slate-400">
            Upload a PDF and ask anything. Every answer is grounded in your files with
            inline citations.
          </p>
        </header>

        <div className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-edge bg-panel/40 px-4 py-6 text-center">
          <i className="fa-solid fa-cloud-arrow-up text-2xl text-accent" />
          <div className="mt-1 text-sm font-medium text-slate-200">
            Drop a PDF or click to upload
          </div>
          <div className="text-xs text-slate-500">Contracts, reports, policies, manuals…</div>
        </div>

        <ul className="mt-3 space-y-1.5">
          <li className="flex items-center gap-2 rounded-lg border border-edge bg-panel px-3 py-2 text-sm">
            <i className="fa-solid fa-file-pdf text-accent2" />
            <span className="flex-1 truncate text-slate-200">Acme_MSA_2024.pdf</span>
            <span className="shrink-0 text-[11px] text-slate-500">14p · 38 chunks</span>
          </li>
        </ul>

        <div className="mt-auto pt-6 text-[11px] leading-relaxed text-slate-600">
          <div className="mb-1 font-medium text-slate-500">How it works</div>
          PDF → chunk + embed → pgvector search → the model answers with cited sources.
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-edge bg-panel/30">
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <Message message={messages[0]} />
          {/* Render the assistant message with the first citation popover open for the shot */}
          <div className="flex animate-fade-up justify-start">
            <div className="flex max-w-[85%] gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent2 text-sm text-white">
                <i className="fa-solid fa-wand-magic-sparkles" />
              </div>
              <div>
                <div className="inline-block rounded-2xl border border-edge bg-panel px-4 py-2.5 text-[15px] leading-relaxed text-slate-100">
                  <span className="whitespace-pre-wrap">{messages[1].content}</span>
                </div>
                <div className="mt-2.5">
                  <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    Cited sources
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <CitationChip citation={messages[1].citations![0]} n={1} defaultOpen />
                    <CitationChip citation={messages[1].citations![1]} n={2} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-edge p-4">
          <div className="flex items-end gap-2">
            <div className="max-h-32 flex-1 rounded-xl border border-edge bg-ink px-4 py-3 text-[15px] text-slate-500">
              Ask a question about your documents…
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
              <i className="fa-solid fa-arrow-up" />
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-slate-600">
            Answers are generated from your documents and cited. Verify anything important.
          </p>
        </div>
      </main>
    </div>
  );
}
