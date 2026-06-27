import { openai, EMBEDDING_MODEL } from "./openai";

export { EMBEDDING_MODEL };

/**
 * Embed one or more strings. Returns vectors aligned to the input order
 * (the OpenAI batch endpoint preserves order).
 */
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await openai().embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}

export async function embedOne(text: string): Promise<number[]> {
  const [v] = await embed([text]);
  return v;
}
