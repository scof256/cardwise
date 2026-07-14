"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | undefined;

function requiredPublicEnvironment(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" | "NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET") {
  const value = name === "NEXT_PUBLIC_SUPABASE_URL"
    ? process.env.NEXT_PUBLIC_SUPABASE_URL
    : name === "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
      ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      : process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "directory-media";
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function getStorageClient() {
  browserClient ??= createClient(
    requiredPublicEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
    requiredPublicEnvironment("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  return browserClient;
}

export async function uploadPrivateCardImage(pathname: string, file: File, payload: Record<string, unknown>) {
  const tokenResponse = await fetch("/api/uploads/business-card", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create_upload", pathname, payload }),
  });
  const tokenResult = await tokenResponse.json() as { token?: string; error?: string };
  if (!tokenResponse.ok || !tokenResult.token) throw new Error(tokenResult.error || "Could not authorize the card image upload.");

  const { error: uploadError } = await getStorageClient()
    .storage
    .from(requiredPublicEnvironment("NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET"))
    .uploadToSignedUrl(pathname, tokenResult.token, file, { contentType: String(payload.mimeType || file.type), upsert: false });
  if (uploadError) throw new Error(`Supabase Storage upload failed: ${uploadError.message}`);

  const completionResponse = await fetch("/api/uploads/business-card", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "complete_upload", pathname, payload }),
  });
  const completion = await completionResponse.json() as { error?: string };
  if (!completionResponse.ok) throw new Error(completion.error || "Could not finish the card image upload.");
}
