import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { chatMessages, chatThreads } from "@/db/schema";
import { requireWorkspacePermission } from "@/lib/auth/workspace-context";

export const runtime = "nodejs";

const deleteSchema = z.object({
  workspaceSlug: z.string().min(1),
  mode: z.enum(["all", "session", "messages"]),
  threadId: z.string().min(8).max(128).optional(),
}).superRefine((value, context) => {
  if (value.mode !== "all" && !value.threadId) context.addIssue({ code: "custom", message: "A thread ID is required." });
});

export async function DELETE(request: Request) {
  const parsed = deleteSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid history request." }, { status: 400 });
  const context = await requireWorkspacePermission(parsed.data.workspaceSlug, "directory:read");
  const db = getDb();

  if (parsed.data.mode === "all") {
    await db.delete(chatThreads).where(and(eq(chatThreads.workspaceId, context.workspaceId), eq(chatThreads.userId, context.userId)));
    return Response.json({ ok: true });
  }

  const [thread] = await db.select({ id: chatThreads.id }).from(chatThreads).where(and(eq(chatThreads.id, parsed.data.threadId!), eq(chatThreads.workspaceId, context.workspaceId), eq(chatThreads.userId, context.userId))).limit(1);
  if (!thread) return Response.json({ error: "Chat session not found." }, { status: 404 });

  if (parsed.data.mode === "session") {
    await db.delete(chatThreads).where(and(eq(chatThreads.id, thread.id), eq(chatThreads.workspaceId, context.workspaceId), eq(chatThreads.userId, context.userId)));
  } else {
    await db.delete(chatMessages).where(and(eq(chatMessages.threadId, thread.id), eq(chatMessages.workspaceId, context.workspaceId)));
    await db.update(chatThreads).set({ updatedAt: new Date() }).where(and(eq(chatThreads.id, thread.id), eq(chatThreads.workspaceId, context.workspaceId), eq(chatThreads.userId, context.userId)));
  }

  return Response.json({ ok: true });
}
