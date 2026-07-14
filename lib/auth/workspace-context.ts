import "server-only";
import { auth } from "@clerk/nextjs/server";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { users, workspaceMemberships, workspaces } from "@/db/schema";
import { isClerkConfigured } from "@/lib/env";
import { roleHasPermission, type WorkspacePermission } from "./permissions";

export type WorkspaceContext = {
  clerkUserId: string;
  userId: string;
  workspaceId: string;
  workspaceSlug: string;
  workspaceName: string;
  workspaceType: "personal" | "organization";
  role: string;
  userName: string;
  userEmail: string;
};

export async function requireWorkspaceContext(workspaceSlug: string): Promise<WorkspaceContext> {
  if (!isClerkConfigured) throw new Error("Authentication is not configured.");
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthenticated");

  const db = getDb();
  const [actor] = await db.select({ id: users.id, userName: users.displayName, userEmail: users.primaryEmail }).from(users).where(eq(users.clerkUserId, clerkUserId)).limit(1);
  if (!actor) throw new Error("Complete onboarding before opening a workspace.");

  const [result] = await db
    .select({ workspaceId: workspaces.id, workspaceSlug: workspaces.slug, workspaceName: workspaces.name, workspaceType: workspaces.type, role: workspaceMemberships.roleKey })
    .from(workspaces)
    .innerJoin(workspaceMemberships, and(eq(workspaceMemberships.workspaceId, workspaces.id), eq(workspaceMemberships.userId, actor.id), eq(workspaceMemberships.status, "active")))
    .where(and(eq(workspaces.slug, workspaceSlug), inArray(workspaces.status, ["trial", "active", "past_due"])))
    .limit(1);

  if (!result) throw new Error("Workspace not found or membership is inactive.");
  return { clerkUserId, userId: actor.id, userName: actor.userName, userEmail: actor.userEmail, ...result };
}

export async function requireWorkspacePermission(workspaceSlug: string, permission: WorkspacePermission) {
  const context = await requireWorkspaceContext(workspaceSlug);
  if (!roleHasPermission(context.role, permission)) throw new Error(`Forbidden: ${permission}`);
  return context;
}

export function assertSameWorkspace(workspaceId: string, ...resources: Array<{ workspaceId: string } | null | undefined>) {
  if (resources.some((resource) => resource && resource.workspaceId !== workspaceId)) {
    throw new Error("Cross-workspace operation rejected.");
  }
}
