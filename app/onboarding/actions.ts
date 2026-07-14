"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { users, workspaceMemberships, workspaces } from "@/db/schema";

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 42) || "workspace";
}

export async function createPersonalWorkspace() {
  const { userId: clerkUserId } = await auth();
  const clerkUser = await currentUser();
  if (!clerkUserId || !clerkUser) throw new Error("Sign in to continue.");

  const email = clerkUser.primaryEmailAddress?.emailAddress;
  if (!email) throw new Error("A primary email address is required.");
  const db = getDb();
  const displayName = clerkUser.fullName || clerkUser.username || email.split("@")[0];

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.clerkUserId, clerkUserId)).limit(1);
  const userId = existing[0]?.id ?? createId();
  if (!existing[0]) {
    await db.insert(users).values({ id: userId, clerkUserId, primaryEmail: email, displayName, avatarUrl: clerkUser.imageUrl });
  }

  const personal = await db.select({ slug: workspaces.slug }).from(workspaces).where(eq(workspaces.ownerUserId, userId)).limit(1);
  if (personal[0]) redirect(`/app/${personal[0].slug}`);

  const workspaceId = createId();
  const workspaceSlug = `${slugify(displayName)}-${userId.slice(-6)}`;
  await db.transaction(async (tx) => {
    await tx.insert(workspaces).values({ id: workspaceId, type: "personal", name: `${displayName}'s workspace`, slug: workspaceSlug, ownerUserId: userId, status: "trial" });
    await tx.insert(workspaceMemberships).values({ id: createId(), workspaceId, userId, roleKey: "owner", status: "active", joinedAt: new Date() });
  });

  redirect(`/app/${workspaceSlug}`);
}

