import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";
import { getDb } from "@/db";
import { businessCards } from "@/db/schema";
import { requireWorkspacePermission } from "@/lib/auth/workspace-context";

const createCardSchema = z.object({ workspaceSlug: z.string().min(1), imageCount: z.number().int().min(1).max(3), source: z.enum(["camera", "file_upload"]).default("file_upload") });

export async function POST(request: Request) {
  const parsed = createCardSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid card request", details: parsed.error.flatten() }, { status: 400 });
  const context = await requireWorkspacePermission(parsed.data.workspaceSlug, "cards:create");
  const cardId = createId();
  await getDb().insert(businessCards).values({ id: cardId, workspaceId: context.workspaceId, collectedByUserId: context.userId, ownerUserId: context.userId, source: parsed.data.source, status: "uploading" });
  return Response.json({ cardId, workspaceId: context.workspaceId, imageIds: Array.from({ length: parsed.data.imageCount }, () => createId()) }, { status: 201 });
}
