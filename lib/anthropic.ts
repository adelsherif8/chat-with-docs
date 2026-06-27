import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  // Surface a clear error at boot rather than a cryptic 401 later.
  console.warn("[chat-with-docs] ANTHROPIC_API_KEY is not set — see .env.local.example");
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";
