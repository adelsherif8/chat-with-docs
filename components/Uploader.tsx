"use client";

import { useRef, useState } from "react";
import type { UploadedDoc } from "@/lib/types";

export function Uploader({
  docs,
  onUploaded,
}: {
  docs: UploadedDoc[];
  onUploaded: (doc: UploadedDoc) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function upload(file: File) {
    setError(null);
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onUploaded(data as UploadedDoc);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) upload(file);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
          dragOver
            ? "border-accent bg-accent/10"
            : "border-edge bg-panel/40 hover:border-accent/50"
        } ${busy ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
            e.target.value = "";
          }}
        />
        {busy ? (
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Spinner /> Indexing… parsing, chunking & embedding
          </div>
        ) : (
          <>
            <i className="fa-solid fa-cloud-arrow-up text-2xl text-accent" />
            <div className="mt-1 text-sm font-medium text-slate-200">
              Drop a PDF or click to upload
            </div>
            <div className="text-xs text-slate-500">
              Contracts, reports, policies, manuals…
            </div>
          </>
        )}
      </label>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      {docs.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {docs.map((d) => (
            <li
              key={d.documentId}
              className="flex items-center gap-2 rounded-lg border border-edge bg-panel px-3 py-2 text-sm"
            >
              <i className="fa-solid fa-file-pdf text-accent2" />
              <span className="flex-1 truncate text-slate-200">{d.fileName}</span>
              <span className="shrink-0 text-[11px] text-slate-500">
                {d.pages}p · {d.chunks} chunks
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-accent" />
  );
}
