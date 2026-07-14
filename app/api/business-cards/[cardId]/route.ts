import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { businessCardImages, businessCards, extractedFields, extractionRuns } from "@/db/schema";
import { requireWorkspacePermission } from "@/lib/auth/workspace-context";

export async function GET(request: Request, { params }: { params: Promise<{ cardId: string }> }) {
  const workspaceSlug = new URL(request.url).searchParams.get("workspace");
  if (!workspaceSlug) return Response.json({ error: "Workspace is required" }, { status: 400 });
  const context = await requireWorkspacePermission(workspaceSlug, "directory:read");
  const { cardId } = await params;
  const [card] = await getDb().select().from(businessCards).where(and(eq(businessCards.id, cardId), eq(businessCards.workspaceId, context.workspaceId))).limit(1);
  if (!card) return Response.json({ error: "Card not found" }, { status: 404 });
  const images = await getDb().select({ id: businessCardImages.id, side: businessCardImages.side, sortOrder: businessCardImages.sortOrder }).from(businessCardImages).where(and(eq(businessCardImages.workspaceId, context.workspaceId), eq(businessCardImages.businessCardId, cardId))).orderBy(businessCardImages.sortOrder);
  const extraction = card.currentExtractionRunId ? (await getDb().select().from(extractionRuns).where(and(eq(extractionRuns.id, card.currentExtractionRunId), eq(extractionRuns.workspaceId, context.workspaceId))).limit(1))[0] : null;
  const fields = extraction ? await getDb().select().from(extractedFields).where(and(eq(extractedFields.workspaceId, context.workspaceId), eq(extractedFields.extractionRunId, extraction.id))) : [];
  return Response.json({ card, images: images.map((image) => ({ ...image, url: `/api/card-images/${image.id}?workspace=${encodeURIComponent(workspaceSlug)}` })), extraction, fields });
}

