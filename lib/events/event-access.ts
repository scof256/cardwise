import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { eventCollaborators, events } from "@/db/schema";
import { requireWorkspacePermission, type WorkspaceContext } from "@/lib/auth/workspace-context";

export async function requireEventManager(workspaceSlug: string, eventId: string): Promise<WorkspaceContext> {
  const context = await requireWorkspacePermission(workspaceSlug, "events:manage:own");
  const db = getDb();
  const [event] = await db.select({ ownerWorkspaceId: events.ownerWorkspaceId }).from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) throw new Error("Event not found.");
  if (event.ownerWorkspaceId === context.workspaceId) return context;

  const [collaborator] = await db
    .select({ id: eventCollaborators.id })
    .from(eventCollaborators)
    .where(and(eq(eventCollaborators.eventId, eventId), eq(eventCollaborators.userId, context.userId), eq(eventCollaborators.status, "active")))
    .limit(1);
  if (!collaborator) throw new Error("You do not have permission to manage this event.");
  return context;
}

export function canOpenPublicDirectory(event: { directoryAccess: string; moderationStatus: string; visibility: string }) {
  return event.moderationStatus === "approved" && event.visibility === "public" && event.directoryAccess === "public";
}
