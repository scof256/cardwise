import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { businessCardImages, businessCards } from "@/db/schema";
import { requireWorkspacePermission } from "@/lib/auth/workspace-context";
import { requireEnvironment } from "@/lib/env";
import { businessCardBlobPath } from "@/lib/storage/blob";

const payloadSchema = z.object({ workspaceSlug: z.string(), workspaceId: z.string(), cardId: z.string(), imageId: z.string(), side: z.enum(["front", "back", "additional", "unknown"]), sortOrder: z.number().int().min(0).max(2), originalFilename: z.string().min(1).max(240), mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]), byteSize: z.number().int().positive().max(12 * 1024 * 1024), checksumSha256: z.string().regex(/^[a-f0-9]{64}$/) });

export async function POST(request: Request) {
  const body = await request.json() as HandleUploadBody;
  try {
    const result = await handleUpload({
      request, body, token: requireEnvironment("BLOB_READ_WRITE_TOKEN"),
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = payloadSchema.parse(JSON.parse(clientPayload ?? "{}"));
        const context = await requireWorkspacePermission(payload.workspaceSlug, "cards:create");
        if (context.workspaceId !== payload.workspaceId) throw new Error("Workspace mismatch");
        const [card] = await getDb().select({ id: businessCards.id }).from(businessCards).where(and(eq(businessCards.id, payload.cardId), eq(businessCards.workspaceId, context.workspaceId), eq(businessCards.collectedByUserId, context.userId))).limit(1);
        if (!card) throw new Error("Card upload session not found");
        const expectedPath = businessCardBlobPath(context.workspaceId, payload.cardId, payload.imageId, payload.originalFilename);
        if (pathname !== expectedPath) throw new Error("Invalid upload pathname");
        return { allowedContentTypes: [payload.mimeType], maximumSizeInBytes: 12 * 1024 * 1024, addRandomSuffix: false, allowOverwrite: false, tokenPayload: JSON.stringify(payload) };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = payloadSchema.parse(JSON.parse(tokenPayload ?? "{}"));
        await getDb().insert(businessCardImages).values({ id: payload.imageId, workspaceId: payload.workspaceId, businessCardId: payload.cardId, side: payload.side, sortOrder: payload.sortOrder, blobKey: blob.pathname, originalFilename: payload.originalFilename, mimeType: payload.mimeType, byteSize: payload.byteSize, checksumSha256: payload.checksumSha256, uploadStatus: "complete", validationStatus: "pending" }).onConflictDoNothing();
      },
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 });
  }
}

