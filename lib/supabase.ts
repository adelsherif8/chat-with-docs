import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.warn(
    "[chat-with-docs] Supabase env vars missing — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
  );
}

// Service-role client. Used only in server-side API routes, never shipped to the
// browser. Non-empty fallbacks keep `next build` from throwing when env vars are
// absent; the real values are used at runtime.
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  serviceKey || "placeholder-service-key",
  { auth: { persistSession: false } },
);

export type MatchedChunk = {
  id: number;
  document_id: string;
  file_name: string;
  page: number;
  chunk_index: number;
  content: string;
  similarity: number;
};
