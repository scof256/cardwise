import "server-only";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { platformStaff, users } from "@/db/schema";

export function isConfiguredSuperadmin(clerkUserId: string | null | undefined) {
  if (!clerkUserId) return false;
  return new Set((process.env.SUPERADMIN_CLERK_USER_IDS ?? "").split(",").map((value) => value.trim()).filter(Boolean)).has(clerkUserId);
}

export async function requirePlatformStaff(requiredPermission?: string) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthenticated");
  if (isConfiguredSuperadmin(clerkUserId)) {
    if (!process.env.DATABASE_URL) return { userId: clerkUserId, role: "superadmin" as const, permissions: ["*"] };
    const [actor] = await getDb().select({ userId: users.id }).from(users).where(eq(users.clerkUserId, clerkUserId)).limit(1);
    if (!actor) throw new Error("This superadmin must complete account provisioning before database operations are available.");
    return { userId: actor.userId, role: "superadmin" as const, permissions: ["*"] };
  }
  const [staff] = await getDb().select({ userId: users.id, role: platformStaff.role, permissions: platformStaff.permissions }).from(users).innerJoin(platformStaff, and(eq(platformStaff.userId, users.id), eq(platformStaff.active, true))).where(eq(users.clerkUserId, clerkUserId)).limit(1);
  if (!staff || (requiredPermission && staff.role !== "superadmin" && !staff.permissions.includes(requiredPermission))) throw new Error("Platform staff access required");
  return staff;
}
