import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { businessCardImages, businessCards } from "@/db/schema";
import { requireWorkspacePermission } from "@/lib/auth/workspace-context";
import { businessCardObjectPath, createPrivateUploadToken, privateObjectExists } from "@/lib/storage/supabase";

const payloadSchema = z.object({ workspaceSlug: z.string(), workspaceId: z.string(), cardId: z.string(), imageId: z.string(), side: z.enum(["front", "back", "additional", "unknown"]), sortOrder: z.number().int().min(0).max(2), originalFilename: z.string().min(1).max(240), mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]), byteSize: z.number().int().positive().max(12 * 1024 * 1024), checksumSha256: z.string().regex(/^[a-f0-9]{64}$/) });
const requestSchema = z.object({ action: z.enum(["create_upload", "complete_upload"]), pathname: z.string().min(1), payload: payloadSchema });

async function validateUpload(payload: z.infer<typeof payloadSchema>, pathname: string) {
  const context = await requireWorkspacePermission(payload.workspaceSlug, "cards:create");
  if (context.workspaceId !== payload.workspaceId) throw new Error("Workspace mismatch");
  const [card] = await getDb().select({ id: businessCards.id }).from(businessCards).where(and(eq(businessCards.id, payload.cardId), eq(businessCards.workspaceId, context.workspaceId), eq(businessCards.collectedByUserId, context.userId))).limit(1);
  if (!card) throw new Error("Card upload session not found");
  const expectedPath = businessCardObjectPath(context.workspaceId, payload.cardId, payload.imageId, payload.originalFilename);
  if (pathname !== expectedPath) throw new Error("Invalid upload pathname");
}

export async function POST(request: Request) {
  try {
    const { action, pathname, payload } = requestSchema.parse(await request.json());
    await validateUpload(payload, pathname);

    if (action === "create_upload") {
      const upload = await createPrivateUploadToken(pathname);
      return Response.json({ pathname: upload.path, token: upload.token });
    }

    if (!await privateObjectExists(pathname)) throw new Error("The card image was not found in Supabase Storage.");
    await getDb().insert(businessCardImages).values({ id: payload.imageId, workspaceId: payload.workspaceId, businessCardId: payload.cardId, side: payload.side, sortOrder: payload.sortOrder, blobKey: pathname, originalFilename: payload.originalFilename, mimeType: payload.mimeType, byteSize: payload.byteSize, checksumSha256: payload.checksumSha256, uploadStatus: "complete", validationStatus: "pending" }).onConflictDoNothing();
    return Response.json({ pathname, status: "complete" });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 });
  }
}
