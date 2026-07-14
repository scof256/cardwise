import "server-only";
import { get } from "@vercel/blob";
import { requireEnvironment } from "@/lib/env";

export async function getPrivateBlob(pathname: string) {
  return get(pathname, { access: "private", token: requireEnvironment("BLOB_READ_WRITE_TOKEN") });
}

export function businessCardBlobPath(workspaceId: string, businessCardId: string, imageId: string, filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  return `workspaces/${workspaceId}/cards/${businessCardId}/${imageId}.${extension}`;
}

