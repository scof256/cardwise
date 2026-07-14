import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { businessCardImages } from "@/db/schema";
import { requireWorkspacePermission } from "@/lib/auth/workspace-context";
import { getPrivateObject } from "@/lib/storage/supabase";

export async function GET(request: Request, { params }: { params: Promise<{ imageId: string }> }) {
  const workspaceSlug = new URL(request.url).searchParams.get("workspace");
  if (!workspaceSlug) return Response.json({ error: "Workspace is required" }, { status: 400 });
  const context = await requireWorkspacePermission(workspaceSlug, "directory:read");
  const { imageId } = await params;
  const [image] = await getDb().select().from(businessCardImages).where(and(eq(businessCardImages.id, imageId), eq(businessCardImages.workspaceId, context.workspaceId))).limit(1);
  if (!image) return Response.json({ error: "Image not found" }, { status: 404 });
  const blob = await getPrivateObject(image.sanitizedBlobKey ?? image.blobKey);
  if (!blob || blob.statusCode === 304 || !blob.stream) return new Response(null, { status: blob?.statusCode ?? 404 });
  return new Response(blob.stream, { headers: { "Content-Type": image.mimeType, "Content-Length": String(image.byteSize), "Cache-Control": "private, max-age=60", "Content-Disposition": `inline; filename="${image.originalFilename.replace(/["\\]/g, "")}"` } });
}
