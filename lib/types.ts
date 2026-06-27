export type Citation = {
  documentIndex: number;
  citedText: string;
  fileName: string;
  page: number | null;
};

export type Source = {
  index: number;
  fileName: string;
  page: number;
  similarity: number;
  snippet: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  sources?: Source[];
  pending?: boolean;
};

export type UploadedDoc = {
  documentId: string;
  fileName: string;
  pages: number;
  chunks: number;
};
