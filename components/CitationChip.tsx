"use client";

import { useState } from "react";
import type { Citation } from "@/lib/types";

export function CitationChip({
  citation,
  n,
  defaultOpen = false,
}: {
  citation: Citation;
  n: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="group flex items-center gap-1.5 rounded-full border border-edge bg-panel px-2.5 py-1 text-xs text-slate-300 transition hover:border-accent/60 hover:text-white"
      >
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent/20 text-[10px] font-semibold text-accent">
          {n}
        </span>
        <span className="max-w-[160px] truncate">{citation.fileName}</span>
        {citation.page != null && (
          <span className="text-slate-500">· p.{citation.page}</span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-10 mb-2 w-80 animate-fade-up rounded-xl border border-edge bg-panel p-3 shadow-2xl shadow-black/50">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-accent2">
              Source · page {citation.page ?? "—"}
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-500 hover:text-slate-300"
            >
              ✕
            </button>
          </div>
          <p className="text-sm leading-relaxed text-slate-300">
            “{citation.citedText.trim()}”
          </p>
          <p className="mt-2 truncate text-[11px] text-slate-500">
            {citation.fileName}
          </p>
        </div>
      )}
    </div>
  );
}
