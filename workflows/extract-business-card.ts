import { Output, generateText } from "ai";
import { and, eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { getDb } from "../db/index";
import { aiGenerations, businessCardImages, businessCards, extractedFields, extractionRuns, fieldEvidence } from "../db/schema/index";
import { businessCardExtractionInstructions, businessCardExtractionSchema, type BusinessCardExtraction } from "../lib/ai/business-card-schema";
import { getPrivateBlob } from "../lib/storage/blob";

export type ExtractionWorkflowInput = { workspaceId: string; businessCardId: string; extractionRunId: string; generationId: string };

export async function extractBusinessCardWorkflow(input: ExtractionWorkflowInput) {
  "use workflow";
  try {
    await markExtractionRunning(input);
    const extraction = await analyzeBusinessCard(input);
    await persistExtraction(input, extraction);
    return { businessCardId: input.businessCardId, overallConfidence: extraction.overallConfidence };
  } catch (error) {
    await markExtractionFailed(input, error instanceof Error ? error.message : "Extraction failed");
    throw error;
  }
}

async function markExtractionRunning(input: ExtractionWorkflowInput) {
  "use step";
  const now = new Date();
  await getDb().update(extractionRuns).set({ status: "running", startedAt: now, updatedAt: now }).where(and(eq(extractionRuns.id, input.extractionRunId), eq(extractionRuns.workspaceId, input.workspaceId)));
  await getDb().update(aiGenerations).set({ status: "running", startedAt: now, updatedAt: now }).where(and(eq(aiGenerations.id, input.generationId), eq(aiGenerations.workspaceId, input.workspaceId)));
  await getDb().update(businessCards).set({ status: "processing", updatedAt: now }).where(and(eq(businessCards.id, input.businessCardId), eq(businessCards.workspaceId, input.workspaceId)));
}

async function analyzeBusinessCard(input: ExtractionWorkflowInput): Promise<BusinessCardExtraction> {
  "use step";
  const images = await getDb().select().from(businessCardImages).where(and(eq(businessCardImages.workspaceId, input.workspaceId), eq(businessCardImages.businessCardId, input.businessCardId))).orderBy(businessCardImages.sortOrder);
  if (!images.length) throw new Error("No uploaded images are available for extraction.");

  const imageParts: Array<{ type: "image"; image: Uint8Array; mediaType: string }> = [];
  for (const image of images) {
    const blob = await getPrivateBlob(image.sanitizedBlobKey ?? image.blobKey);
    if (!blob || blob.statusCode === 304 || !blob.stream) throw new Error(`Card image ${image.id} is unavailable.`);
    const bytes = new Uint8Array(await new Response(blob.stream).arrayBuffer());
    imageParts.push({ type: "image", image: bytes, mediaType: image.mimeType });
  }

  const result = await generateText({
    model: process.env.AI_EXTRACTION_MODEL ?? "openai/gpt-5.2",
    output: Output.object({ schema: businessCardExtractionSchema }),
    system: businessCardExtractionInstructions,
    messages: [{ role: "user", content: [{ type: "text", text: `Analyze these ${images.length} image(s) together as one business card. Image order and side labels: ${images.map((image, index) => `${index}=${image.side}`).join(", ")}.` }, ...imageParts] }],
    maxRetries: 2,
  });

  const usage = { inputTokens: result.usage.inputTokens ?? 0, outputTokens: result.usage.outputTokens ?? 0, totalTokens: result.usage.totalTokens ?? 0 };
  await getDb().update(extractionRuns).set({ usage, updatedAt: new Date() }).where(and(eq(extractionRuns.id, input.extractionRunId), eq(extractionRuns.workspaceId, input.workspaceId)));
  return result.output;
}

async function markExtractionFailed(input: ExtractionWorkflowInput, message: string) {
  "use step";
  const now = new Date();
  const sanitizedMessage = message.replace(/(?:sk-|Bearer\s+)[A-Za-z0-9._-]+/g, "[redacted]").slice(0, 500);
  await getDb().update(extractionRuns).set({ status: "failed", errorCode: "EXTRACTION_FAILED", errorMessage: sanitizedMessage, completedAt: now, updatedAt: now }).where(and(eq(extractionRuns.id, input.extractionRunId), eq(extractionRuns.workspaceId, input.workspaceId)));
  await getDb().update(aiGenerations).set({ status: "failed", errorCode: "EXTRACTION_FAILED", completedAt: now, updatedAt: now }).where(and(eq(aiGenerations.id, input.generationId), eq(aiGenerations.workspaceId, input.workspaceId)));
  await getDb().update(businessCards).set({ status: "failed", updatedAt: now }).where(and(eq(businessCards.id, input.businessCardId), eq(businessCards.workspaceId, input.workspaceId)));
}

type CandidateField = { path: string; value: unknown; confidence: number; needsReview: boolean; conflict: string | null; evidence: Array<{ imageIndex: number; side: string; textAsSeen: string | null; visualReason: string | null; boundingBox: { x: number; y: number; width: number; height: number } | null }> };

function collectCandidateFields(value: unknown, path = ""): CandidateField[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const record = value as Record<string, unknown>;
  if (typeof record.confidence === "number" && "value" in record && Array.isArray(record.evidence)) {
    return [{ path, value: record.value, confidence: record.confidence, needsReview: Boolean(record.needsReview), conflict: typeof record.conflict === "string" ? record.conflict : null, evidence: record.evidence as CandidateField["evidence"] }];
  }
  return Object.entries(record).flatMap(([key, child]) => collectCandidateFields(child, path ? `${path}.${key}` : key));
}

async function persistExtraction(input: ExtractionWorkflowInput, extraction: BusinessCardExtraction) {
  "use step";
  const db = getDb();
  const now = new Date();
  const images = await db.select({ id: businessCardImages.id, sortOrder: businessCardImages.sortOrder }).from(businessCardImages).where(and(eq(businessCardImages.workspaceId, input.workspaceId), eq(businessCardImages.businessCardId, input.businessCardId)));
  const imageByIndex = new Map(images.map((image) => [image.sortOrder, image.id]));
  const candidates = collectCandidateFields(extraction);

  for (const candidate of candidates) {
    const fieldId = createId();
    await db.insert(extractedFields).values({ id: fieldId, workspaceId: input.workspaceId, extractionRunId: input.extractionRunId, entityType: candidate.path.startsWith("contact.") ? "contact" : candidate.path.startsWith("company.") ? "company" : "card", entityTemporaryKey: candidate.path.startsWith("contact.") ? "contact-1" : candidate.path.startsWith("company.") ? "company-1" : "card-1", fieldPath: candidate.path, displayValue: candidate.value == null ? null : Array.isArray(candidate.value) ? candidate.value.join(", ") : typeof candidate.value === "string" ? candidate.value : JSON.stringify(candidate.value), typedValue: candidate.value, modelConfidence: String(candidate.confidence), validationConfidence: String(candidate.confidence), conflictState: candidate.conflict ? "conflicting" : candidate.needsReview ? "needs_review" : "none", userDecision: "unresolved" });
    const evidenceRows = candidate.evidence.flatMap((evidence) => {
      const imageId = imageByIndex.get(evidence.imageIndex);
      return imageId ? [{ id: createId(), workspaceId: input.workspaceId, extractedFieldId: fieldId, imageId, textAsSeen: evidence.textAsSeen, side: evidence.side, boundingBox: evidence.boundingBox, visualReason: evidence.visualReason, confidence: String(candidate.confidence) }] : [];
    });
    if (evidenceRows.length) await db.insert(fieldEvidence).values(evidenceRows);
  }

  const usage = { fields: candidates.length };
  await db.update(extractionRuns).set({ status: "succeeded", rawStructuredOutput: extraction, completeUnstructuredOutput: extraction.completeUnstructuredContent, usage, completedAt: now, updatedAt: now }).where(and(eq(extractionRuns.id, input.extractionRunId), eq(extractionRuns.workspaceId, input.workspaceId)));
  await db.update(aiGenerations).set({ status: "succeeded", resultReference: input.extractionRunId, completedAt: now, updatedAt: now }).where(and(eq(aiGenerations.id, input.generationId), eq(aiGenerations.workspaceId, input.workspaceId)));
  await db.update(businessCards).set({ status: "awaiting_review", verificationStatus: extraction.reviewReasons.length ? "needs_review" : "unverified", overallConfidence: String(extraction.overallConfidence), currentExtractionRunId: input.extractionRunId, updatedAt: now }).where(and(eq(businessCards.id, input.businessCardId), eq(businessCards.workspaceId, input.workspaceId)));
}
