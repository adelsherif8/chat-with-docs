import OpenAI from "openai";

// Lazy singleton — constructing OpenAI() eagerly throws when the key is absent,
// which breaks `next build` (route modules are evaluated without env vars).
let _client: OpenAI | null = null;
export function openai(): OpenAI {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      console.warn("[chat-with-docs] OPENAI_API_KEY is not set — see .env.local.example");
    }
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
export const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
