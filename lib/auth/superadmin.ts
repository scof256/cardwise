import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { platformStaff, users } from "@/db/schema";

export function isConfiguredSuperadmin(clerkUserId: string | null | undefined) {
  if (!clerkUserId) return false;
  return new Set((process.env.SUPERADMIN_CLERK_USER_IDS ?? "").split(",").map((value) => value.trim()).filter(Boolean)).has(clerkUserId);
}

async function ensureConfiguredSuperadminUser(clerkUserId: string) {
  const db = getDb();
  const [existing] = await db.select({ userId: users.id }).from(users).where(eq(users.clerkUserId, clerkUserId)).limit(1);
  if (existing) return existing;

  const clerkUser = await currentUser();
  const fallbackEmail = (process.env.SUPERADMIN_EMAILS ?? "").split(",").map((value) => value.trim()).find(Boolean);
  const primaryEmail = clerkUser?.primaryEmailAddress?.emailAddress ?? fallbackEmail;
  if (!primaryEmail) throw new Error("Configure SUPERADMIN_EMAILS or add a primary Clerk email before opening the superadmin dashboard.");

  const displayName = clerkUser?.fullName || clerkUser?.username || primaryEmail.split("@")[0] || "Cardwise superadmin";
  await db.insert(users).values({
    id: createId(),
    clerkUserId,
    primaryEmail,
    displayName,
    avatarUrl: clerkUser?.imageUrl ?? null,
  }).onConflictDoNothing({ target: users.clerkUserId });

  const [provisioned] = await db.select({ userId: users.id }).from(users).where(eq(users.clerkUserId, clerkUserId)).limit(1);
  if (!provisioned) throw new Error("Unable to provision the configured superadmin in the application database.");
  return provisioned;
}

export async function requirePlatformStaff(requiredPermission?: string) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthenticated");
  if (isConfiguredSuperadmin(clerkUserId)) {
    if (!process.env.DATABASE_URL) return { userId: clerkUserId, role: "superadmin" as const, permissions: ["*"] };
    const actor = await ensureConfiguredSuperadminUser(clerkUserId);
    return { userId: actor.userId, role: "superadmin" as const, permissions: ["*"] };
  }
  const [staff] = await getDb().select({ userId: users.id, role: platformStaff.role, permissions: platformStaff.permissions }).from(users).innerJoin(platformStaff, and(eq(platformStaff.userId, users.id), eq(platformStaff.active, true))).where(eq(users.clerkUserId, clerkUserId)).limit(1);
  if (!staff || (requiredPermission && staff.role !== "superadmin" && !staff.permissions.includes(requiredPermission))) throw new Error("Platform staff access required");
  return staff;
}
