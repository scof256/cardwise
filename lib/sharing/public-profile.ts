import "server-only";
import { createHash } from "node:crypto";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { getDb } from "@/db";
import { contactMethods, digitalProfiles, shareLinks } from "@/db/schema";

export async function getPublicProfile(token: string) {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [result] = await getDb().select({ linkId: shareLinks.id, workspaceId: shareLinks.workspaceId, maxViews: shareLinks.maxViews, viewCount: shareLinks.viewCount, profileId: digitalProfiles.id, displayName: digitalProfiles.displayName, jobTitle: digitalProfiles.jobTitle, companyName: digitalProfiles.companyName, bio: digitalProfiles.bio, avatarBlobKey: digitalProfiles.avatarBlobKey, theme: digitalProfiles.theme }).from(shareLinks).innerJoin(digitalProfiles, eq(digitalProfiles.id, shareLinks.digitalProfileId)).where(and(eq(shareLinks.tokenHash, tokenHash), eq(shareLinks.status, "active"), eq(digitalProfiles.isPublished, true), or(isNull(shareLinks.expiresAt), gt(shareLinks.expiresAt, new Date())))).limit(1);
  if (!result || (result.maxViews != null && result.viewCount >= result.maxViews)) return null;
  const methods = await getDb().select().from(contactMethods).where(and(eq(contactMethods.workspaceId, result.workspaceId), eq(contactMethods.ownerType, "digital_profile"), eq(contactMethods.ownerId, result.profileId)));
  return { ...result, methods };
}

export function escapeVCard(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

