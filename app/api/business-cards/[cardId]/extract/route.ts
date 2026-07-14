import { createHash } from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { start } from "workflow/api";
import { z } from "zod";
import { getDb } from "@/db";
import { aiGenerations, businessCardImages, businessCards, extractionRuns } from "@/db/schema";
import { requireWorkspacePermission } from "@/lib/auth/workspace-context";
import { BUSINESS_CARD_PROMPT_VERSION, BUSINESS_CARD_SCHEMA_VERSION } from "@/lib/ai/business-card-schema";
import { getExtractionModelId, getExtractionProviderName } from "@/lib/ai/extraction-model";
import { extractBusinessCardWorkflow } from "@/workflows/extract-business-card";

const requestSchema = z.object({ workspaceSlug: z.string().min(1) });

export async function POST(request: Request, { params }: { params: Promise<{ cardId: string }> }) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Workspace is required" }, { status: 400 });
  const context = await requireWorkspacePermission(parsed.data.workspaceSlug, "cards:create");
  const { cardId } = await params;
  const [card] = await getDb().select({ id: businessCards.id, status: businessCards.status }).from(businessCards).where(and(eq(businessCards.id, cardId), eq(businessCards.workspaceId, context.workspaceId), eq(businessCards.collectedByUserId, context.userId))).limit(1);
  if (!card) return Response.json({ error: "Card not found" }, { status: 404 });
  const images = await getDb().select({ id: businessCardImages.id }).from(businessCardImages).where(and(eq(businessCardImages.workspaceId, context.workspaceId), eq(businessCardImages.businessCardId, cardId), eq(businessCardImages.uploadStatus, "complete")));
  if (!images.length) return Response.json({ error: "Upload at least one card image first" }, { status: 409 });

  const extractionRunId = createId();
  const generationId = createId();
  const model = getExtractionModelId();
  const provider = getExtractionProviderName();
  await getDb().insert(aiGenerations).values({ id: generationId, workspaceId: context.workspaceId, userId: context.userId, feature: "business_card_extraction", provider, model, status: "pending", promptHash: createHash("sha256").update(BUSINESS_CARD_PROMPT_VERSION).digest("hex") });
  await getDb().insert(extractionRuns).values({ id: extractionRunId, workspaceId: context.workspaceId, businessCardId: cardId, generationId, provider, model, promptVersion: BUSINESS_CARD_PROMPT_VERSION, schemaVersion: BUSINESS_CARD_SCHEMA_VERSION, status: "pending" });
  await getDb().update(businessCards).set({ status: "queued", currentExtractionRunId: extractionRunId, updatedAt: new Date() }).where(and(eq(businessCards.id, cardId), eq(businessCards.workspaceId, context.workspaceId)));

  const run = await start(extractBusinessCardWorkflow, [{ workspaceId: context.workspaceId, businessCardId: cardId, extractionRunId, generationId }]);
  await getDb().update(extractionRuns).set({ workflowRunId: run.runId, updatedAt: new Date() }).where(eq(extractionRuns.id, extractionRunId));
  return Response.json({ cardId, extractionRunId, workflowRunId: run.runId, status: "queued" }, { status: 202 });
}
