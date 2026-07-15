import "server-only";

import { createOpenAI } from "@ai-sdk/openai";

let provider: ReturnType<typeof createOpenAI> | null = null;

export function getExtractionModelId() {
  return process.env.AI_EXTRACTION_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || "openai/gpt-5.2";
}

export function getExtractionProviderName() {
  if (!process.env.AI_EXTRACTION_MODEL?.trim() && process.env.OPENAI_BASE_URL?.trim() && process.env.OPENAI_API_KEY?.trim()) return "openai-compatible";
  return getExtractionModelId().split("/")[0] || "gateway";
}

export function getExtractionModel() {
  const explicitGatewayModel = process.env.AI_EXTRACTION_MODEL?.trim();
  if (explicitGatewayModel) return explicitGatewayModel;

  const baseURL = process.env.OPENAI_BASE_URL?.trim();
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const modelId = process.env.OPENAI_MODEL?.trim();
  if (!baseURL || !apiKey || !modelId) return "openai/gpt-5.2";

  provider ??= createOpenAI({ apiKey, baseURL, name: "business-card-vision" });
  return provider.chat(modelId);
}
