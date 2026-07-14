import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ReviewEditor } from "@/components/review-editor";
import { getDb } from "@/db";
import { businessCardImages, businessCards, extractionRuns } from "@/db/schema";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";
import { businessCardExtractionSchema } from "@/lib/ai/business-card-schema";

export const dynamic = "force-dynamic";

export default async function CardReviewPage({ params }: { params: Promise<{ workspaceSlug: string; cardId: string }> }) {
  const { workspaceSlug, cardId } = await params;
  const context = await requireWorkspaceContext(workspaceSlug);
  const [card] = await getDb().select().from(businessCards).where(and(eq(businessCards.id, cardId), eq(businessCards.workspaceId, context.workspaceId))).limit(1);
  if (!card?.currentExtractionRunId) notFound();
  const [run] = await getDb().select().from(extractionRuns).where(and(eq(extractionRuns.id, card.currentExtractionRunId), eq(extractionRuns.workspaceId, context.workspaceId))).limit(1);
  const parsed = businessCardExtractionSchema.safeParse(run?.rawStructuredOutput);
  if (!parsed.success) return <main className="auth-page"><section className="auth-setup"><span className="eyebrow">ANALYSIS NOT READY</span><h1>This card still needs attention</h1><p>{run?.errorMessage || "The structured extraction is not available yet. Return to the workspace and retry analysis."}</p><a href={`/app/${workspaceSlug}`}>Return to workspace</a></section></main>;
  const images = await getDb().select({ id: businessCardImages.id, side: businessCardImages.side }).from(businessCardImages).where(and(eq(businessCardImages.workspaceId, context.workspaceId), eq(businessCardImages.businessCardId, cardId))).orderBy(businessCardImages.sortOrder);
  return <ReviewEditor workspaceSlug={workspaceSlug} cardId={cardId} extraction={parsed.data} imageUrls={images.map((image) => ({ side: image.side, url: `/api/card-images/${image.id}?workspace=${encodeURIComponent(workspaceSlug)}` }))} />;
}

