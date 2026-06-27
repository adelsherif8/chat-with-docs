// Import the implementation directly to avoid pdf-parse's index.js, which tries
// to read a bundled test PDF on load and crashes in a serverless build.
import pdf from "pdf-parse/lib/pdf-parse.js";

export type PdfPage = { page: number; text: string };

/**
 * Extract text from a PDF buffer, preserving page boundaries.
 * Page numbers are what power citations ("contract.pdf · page 4").
 */
export async function extractPdfPages(buffer: Buffer): Promise<PdfPage[]> {
  const pages: PdfPage[] = [];
  let pageNumber = 0;

  await pdf(buffer, {
    // Called once per page. We render the text content ourselves so we can
    // capture each page separately instead of one concatenated blob.
    pagerender: async (pageData: any) => {
      pageNumber += 1;
      const textContent = await pageData.getTextContent();
      const text = textContent.items
        .map((item: any) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      pages.push({ page: pageNumber, text });
      return text;
    },
  });

  // Drop empty pages (scanned image-only pages with no extractable text).
  return pages.filter((p) => p.text.length > 0);
}
