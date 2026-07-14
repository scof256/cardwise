import { createHash, randomBytes } from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";
import { getDb } from "@/db";
import { contactMethods, digitalProfiles, shareLinks } from "@/db/schema";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

const profileSchema = z.object({ workspaceSlug: z.string().min(1), displayName: z.string().trim().min(1).max(160), jobTitle: z.string().max(200), companyName: z.string().max(240), bio: z.string().max(1200), phoneNumbers: z.array(z.string().min(3).max(80)).max(8), emailAddresses: z.array(z.string().email()).max(8), slug: z.string().regex(/^[a-z0-9-]{3,60}$/).optional() });
const normalizeSlug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48) || "profile";

export async function POST(request: Request) {
  const parsed = profileSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid digital profile", details: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;
  const context = await requireWorkspaceContext(input.workspaceSlug);
  const profileId = createId();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const slug = `${input.slug ?? normalizeSlug(input.displayName)}-${profileId.slice(-5)}`;
  await getDb().transaction(async (tx) => {
    await tx.insert(digitalProfiles).values({ id: profileId, workspaceId: context.workspaceId, userId: context.userId, slug, displayName: input.displayName, jobTitle: input.jobTitle || null, companyName: input.companyName || null, bio: input.bio || null, isPublished: true });
    const methods = [
      ...input.phoneNumbers.map((value, index) => ({ id: createId(), workspaceId: context.workspaceId, ownerType: "digital_profile" as const, ownerId: profileId, kind: "phone" as const, displayValue: value, normalizedValue: value.replace(/\D/g, ""), isPrimary: index === 0 })),
      ...input.emailAddresses.map((value, index) => ({ id: createId(), workspaceId: context.workspaceId, ownerType: "digital_profile" as const, ownerId: profileId, kind: "email" as const, displayValue: value, normalizedValue: value.toLowerCase(), isPrimary: index === 0 })),
    ];
    if (methods.length) await tx.insert(contactMethods).values(methods);
    await tx.insert(shareLinks).values({ id: createId(), workspaceId: context.workspaceId, digitalProfileId: profileId, tokenHash, status: "active", createdByUserId: context.userId });
  });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  return Response.json({ profileId, slug, shareUrl: `${baseUrl}/p/${token}`, qrCodeUrl: `${baseUrl}/api/share/${token}/qr`, vcardUrl: `${baseUrl}/api/share/${token}/vcard` }, { status: 201 });
}

