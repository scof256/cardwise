import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";

const voyageEmbeddingResponseSchema = z.object({
  data: z.array(z.object({ embedding: z.array(z.number()) })).min(1),
});

const voyageRerankResponseSchema = z.object({
  data: z.array(z.object({ index: z.number().int().nonnegative(), relevance_score: z.number() })),
});

const hybridDocumentSchema = z.object({
  document_id: z.string(),
  entity_type: z.string(),
  entity_id: z.string(),
  chunk_type: z.string(),
  content: z.string(),
  hybrid_score: z.coerce.number(),
});

export type HybridDocument = z.infer<typeof hybridDocumentSchema> & { rerankScore?: number };

type SearchDocumentInput = {
  workspaceId: string;
  entityId: string;
  content: string;
  entityType?: string;
  chunkType?: string;
};

type EventSearchDocumentInput = SearchDocumentInput & {
  eventId: string;
};

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for hybrid search.`);
  return value;
}

function supabaseHeaders() {
  const serviceRoleKey = requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY");
  const headers: Record<string, string> = {
    apikey: serviceRoleKey,
    "Content-Type": "application/json",
  };
  // Modern sb_secret_* keys are opaque API keys, not JWTs. Sending one as a
  // bearer token makes Supabase reject the request before it reaches PostgREST.
  if (!serviceRoleKey.startsWith("sb_secret_")) headers.Authorization = `Bearer ${serviceRoleKey}`;
  return headers;
}

async function createVoyageEmbedding(value: string, inputType: "query" | "document") {
  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requiredEnvironment("VOYAGE_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: value,
      model: process.env.VOYAGE_EMBEDDING_MODEL ?? "voyage-4",
      input_type: inputType,
      output_dimension: Number(process.env.VOYAGE_EMBEDDING_DIMENSIONS ?? 1024),
      output_dtype: "float",
      truncation: true,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Voyage embedding request failed (${response.status}).`);
  const parsed = voyageEmbeddingResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("Voyage returned an invalid embedding response.");
  const embedding = parsed.data.data[0].embedding;
  const dimensions = Number(process.env.VOYAGE_EMBEDDING_DIMENSIONS ?? 1024);
  if (embedding.length !== dimensions) throw new Error(`Voyage returned ${embedding.length} dimensions; expected ${dimensions}.`);
  return embedding;
}

async function rerankDocuments(query: string, documents: HybridDocument[]) {
  if (documents.length < 2 || !process.env.VOYAGE_RERANK_MODEL) return documents;
  const response = await fetch("https://api.voyageai.com/v1/rerank", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requiredEnvironment("VOYAGE_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      documents: documents.map((document) => document.content),
      model: process.env.VOYAGE_RERANK_MODEL,
      top_k: Math.min(documents.length, 12),
      truncation: true,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Voyage reranking request failed (${response.status}).`);
  const parsed = voyageRerankResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("Voyage returned an invalid reranking response.");
  return parsed.data.data.flatMap((item) => {
    const document = documents[item.index];
    return document ? [{ ...document, rerankScore: item.relevance_score }] : [];
  });
}

export function buildCompanySearchContent(input: {
  companyName: string;
  industry?: string | null;
  category?: string | null;
  tagline?: string | null;
  description?: string | null;
  productsServices?: string[];
  website?: string | null;
  phones?: string[];
  emails?: string[];
  physicalAddress?: string | null;
  socialMedia?: string | null;
  contactName?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  contactPhones?: string[];
  contactEmails?: string[];
  otherInformation?: string | null;
}) {
  const lines = [
    `Company: ${input.companyName}`,
    input.industry && `Industry: ${input.industry}`,
    input.category && `Category: ${input.category}`,
    input.tagline && `Tagline: ${input.tagline}`,
    input.description && `Description: ${input.description}`,
    input.productsServices?.length && `Products and services: ${input.productsServices.join(", ")}`,
    input.website && `Website: ${input.website}`,
    input.phones?.length && `Company phones: ${input.phones.join(", ")}`,
    input.emails?.length && `Company emails: ${input.emails.join(", ")}`,
    input.physicalAddress && `Address: ${input.physicalAddress}`,
    input.socialMedia && `Social media: ${input.socialMedia}`,
    input.contactName && `Primary contact: ${input.contactName}`,
    input.jobTitle && `Job title: ${input.jobTitle}`,
    input.department && `Department: ${input.department}`,
    input.contactPhones?.length && `Contact phones: ${input.contactPhones.join(", ")}`,
    input.contactEmails?.length && `Contact emails: ${input.contactEmails.join(", ")}`,
    input.otherInformation && `Other information: ${input.otherInformation}`,
  ];
  return lines.filter(Boolean).join("\n");
}

export async function indexCompanySearchDocument(input: SearchDocumentInput) {
  const embedding = await createVoyageEmbedding(input.content, "document");
  const modelVersion = `${process.env.VOYAGE_EMBEDDING_MODEL ?? "voyage-4"}:${process.env.VOYAGE_EMBEDDING_DIMENSIONS ?? "1024"}`;
  const response = await fetch(`${requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/search_documents?on_conflict=id`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      id: `company:${input.entityId}:profile`,
      workspace_id: input.workspaceId,
      entity_type: input.entityType ?? "company",
      entity_id: input.entityId,
      chunk_type: input.chunkType ?? "profile",
      content: input.content,
      embedding,
      content_hash: createHash("sha256").update(input.content).digest("hex"),
      model_version: modelVersion,
      updated_at: new Date().toISOString(),
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase search indexing failed (${response.status}). Apply the hybrid-search migration first.`);
}

export async function indexEventSearchDocument(input: EventSearchDocumentInput) {
  const embedding = await createVoyageEmbedding(input.content, "document");
  const modelVersion = `${process.env.VOYAGE_EMBEDDING_MODEL ?? "voyage-4"}:${process.env.VOYAGE_EMBEDDING_DIMENSIONS ?? "1024"}`;
  const response = await fetch(`${requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/search_documents?on_conflict=id`, {
    method: "POST",
    headers: { ...supabaseHeaders(), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      id: `event:${input.eventId}:${input.entityId}`,
      workspace_id: input.workspaceId,
      event_id: input.eventId,
      entity_type: input.entityType ?? "event_card",
      entity_id: input.entityId,
      chunk_type: input.chunkType ?? "consent_snapshot",
      content: input.content,
      embedding,
      content_hash: createHash("sha256").update(input.content).digest("hex"),
      model_version: modelVersion,
      updated_at: new Date().toISOString(),
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase event search indexing failed (${response.status}). Apply the networking-events migration first.`);
}

export async function removeEventSearchDocuments(eventId: string, entityIds: string[]) {
  if (!entityIds.length) return;
  const params = new URLSearchParams({ event_id: `eq.${eventId}`, entity_type: "eq.event_card", entity_id: `in.(${entityIds.join(",")})` });
  const response = await fetch(`${requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/search_documents?${params}`, {
    method: "DELETE",
    headers: { ...supabaseHeaders(), Prefer: "return=minimal" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase event search removal failed (${response.status}).`);
}

export async function hybridSearchDocuments(workspaceId: string, query: string, matchCount = 12) {
  const queryEmbedding = await createVoyageEmbedding(query, "query");
  const response = await fetch(`${requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/rpc/hybrid_search_business_cards`, {
    method: "POST",
    headers: supabaseHeaders(),
    body: JSON.stringify({
      p_workspace_id: workspaceId,
      query_text: query,
      query_embedding: queryEmbedding,
      match_count: Math.min(Math.max(matchCount, 1), 30),
      full_text_weight: 1.15,
      semantic_weight: 1,
      rrf_k: 50,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase hybrid search failed (${response.status}). Apply the hybrid-search migration first.`);
  const parsed = z.array(hybridDocumentSchema).safeParse(await response.json());
  if (!parsed.success) throw new Error("Supabase returned an invalid hybrid-search response.");
  return rerankDocuments(query, parsed.data);
}

export async function hybridSearchEventDocuments(eventId: string, query: string, matchCount = 12) {
  const queryEmbedding = await createVoyageEmbedding(query, "query");
  const response = await fetch(`${requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/rpc/hybrid_search_event_cards`, {
    method: "POST",
    headers: supabaseHeaders(),
    body: JSON.stringify({
      p_event_id: eventId,
      query_text: query,
      query_embedding: queryEmbedding,
      match_count: Math.min(Math.max(matchCount, 1), 30),
      full_text_weight: 1.15,
      semantic_weight: 1,
      rrf_k: 50,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase event hybrid search failed (${response.status}). Apply the networking-events migration first.`);
  const parsed = z.array(hybridDocumentSchema).safeParse(await response.json());
  if (!parsed.success) throw new Error("Supabase returned an invalid event hybrid-search response.");
  return rerankDocuments(query, parsed.data);
}
