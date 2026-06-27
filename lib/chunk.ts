import type { PdfPage } from "./pdf";

export type Chunk = {
  page: number;
  chunkIndex: number;
  content: string;
};

// ~500 tokens ≈ 2000 chars. Overlap keeps context across chunk boundaries so an
// answer that straddles two chunks still retrieves cleanly.
const CHUNK_SIZE = 2000;
const CHUNK_OVERLAP = 200;

/**
 * Split each page into overlapping character windows, breaking on sentence
 * boundaries where possible so chunks read naturally when shown as citations.
 */
export function chunkPages(pages: PdfPage[]): Chunk[] {
  const chunks: Chunk[] = [];
  let chunkIndex = 0;

  for (const { page, text } of pages) {
    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + CHUNK_SIZE, text.length);

      // Try to end on a sentence boundary within the last 200 chars of the window.
      if (end < text.length) {
        const slice = text.slice(start, end);
        const lastStop = Math.max(
          slice.lastIndexOf(". "),
          slice.lastIndexOf("! "),
          slice.lastIndexOf("? "),
          slice.lastIndexOf("\n"),
        );
        if (lastStop > CHUNK_SIZE - 400) {
          end = start + lastStop + 1;
        }
      }

      const content = text.slice(start, end).trim();
      if (content.length > 0) {
        chunks.push({ page, chunkIndex: chunkIndex++, content });
      }

      if (end >= text.length) break;
      start = end - CHUNK_OVERLAP;
    }
  }

  return chunks;
}
