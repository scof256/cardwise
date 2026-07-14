import "server-only";

import { createOpenAI } from "@ai-sdk/openai";

let provider: ReturnType<typeof createOpenAI> | null = null;

export function getChatModelId() {
  return process.env.OPENAI_MODEL?.trim() || process.env.AI_CHAT_MODEL?.trim() || "gpt-5-mini";
}

export function getChatModel() {
  const baseURL = process.env.OPENAI_BASE_URL?.trim();
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!baseURL || !apiKey) return getChatModelId();
  provider ??= createOpenAI({ apiKey, baseURL, name: "directory-llm" });
  return provider.chat(getChatModelId());
}
