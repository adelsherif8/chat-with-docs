// @types/pdf-parse only declares the package root, not the internal
// implementation path we import to avoid pdf-parse's debug index.
declare module "pdf-parse/lib/pdf-parse.js" {
  interface PdfParseResult {
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    version: string;
    text: string;
  }
  interface PdfParseOptions {
    pagerender?: (pageData: any) => string | Promise<string>;
    max?: number;
    version?: string;
  }
  function pdf(
    dataBuffer: Buffer,
    options?: PdfParseOptions,
  ): Promise<PdfParseResult>;
  export default pdf;
}
