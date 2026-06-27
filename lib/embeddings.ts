import OpenAI from "openai";

export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";

// Lazy singleton — constructing OpenAI() eagerly throws when the key is absent,
// which breaks `next build` (it evaluates route modules without env vars).
let _openai: OpenAI | null = null;
function client(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

/**
 * Embed one or more strings. Returns an array of vectors aligned to the input order.
 * The OpenAI batch endpoint preserves order, so index N out maps to index N in.
 */
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await client().embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}

export async function embedOne(text: string): Promise<number[]> {
  const [v] = await embed([text]);
  return v;
}
