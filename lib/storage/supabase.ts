import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnvironment, serverEnvironment } from "@/lib/env";

let adminClient: SupabaseClient | undefined;

function getStorageAdmin() {
  adminClient ??= createClient(
    requireEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnvironment("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  return adminClient;
}

function getStorageBucket() {
  return serverEnvironment.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "directory-media";
}

export async function createPrivateUploadToken(pathname: string) {
  const { data, error } = await getStorageAdmin()
    .storage
    .from(getStorageBucket())
    .createSignedUploadUrl(pathname, { upsert: false });

  if (error) throw new Error(`Supabase Storage could not create an upload token: ${error.message}`);
  return data;
}

export async function privateObjectExists(pathname: string) {
  const pathParts = pathname.split("/");
  const filename = pathParts.pop();
  if (!filename) return false;

  const { data, error } = await getStorageAdmin()
    .storage
    .from(getStorageBucket())
    .list(pathParts.join("/"), { limit: 100, search: filename });

  if (error) throw new Error(`Supabase Storage could not verify the upload: ${error.message}`);
  return data.some((object) => object.name === filename);
}

export async function getPrivateObject(pathname: string) {
  const { data, error } = await getStorageAdmin()
    .storage
    .from(getStorageBucket())
    .download(pathname);

  if (error) {
    const statusCode = Number((error as { statusCode?: string | number }).statusCode);
    if (statusCode === 400 || statusCode === 404) return null;
    throw new Error(`Supabase Storage could not retrieve the card image: ${error.message}`);
  }

  return { statusCode: 200, stream: data.stream() };
}

export async function removePrivateObjects(pathnames: string[]) {
  const uniquePathnames = [...new Set(pathnames.map((pathname) => pathname.trim()).filter(Boolean))];

  if (uniquePathnames.length === 0) return;

  const { error } = await getStorageAdmin().storage.from(getStorageBucket()).remove(uniquePathnames);
  if (error) throw new Error(`Supabase Storage could not delete the card images: ${error.message}`);
}

export function businessCardObjectPath(workspaceId: string, businessCardId: string, imageId: string, filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  return `workspaces/${workspaceId}/cards/${businessCardId}/${imageId}.${extension}`;
}
