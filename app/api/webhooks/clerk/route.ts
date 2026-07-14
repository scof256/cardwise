import { createHash } from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { Webhook } from "svix";
import { getDb } from "@/db";
import { users, webhookEvents, workspaceMemberships, workspaces } from "@/db/schema";
import { requireEnvironment } from "@/lib/env";

type ClerkEvent = { type: string; data: Record<string, unknown> };
const string = (value: unknown) => typeof value === "string" ? value : "";
const object = (value: unknown) => value && typeof value === "object" ? value as Record<string, unknown> : {};
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 42) || "workspace";

export async function POST(request: Request) {
  const body = await request.text();
  const requestHeaders = await headers();
  const eventId = requestHeaders.get("svix-id");
  const timestamp = requestHeaders.get("svix-timestamp");
  const signature = requestHeaders.get("svix-signature");
  if (!eventId || !timestamp || !signature) return Response.json({ error: "Missing webhook signature" }, { status: 400 });

  let event: ClerkEvent;
  try {
    event = new Webhook(requireEnvironment("CLERK_WEBHOOK_SIGNING_SECRET")).verify(body, { "svix-id": eventId, "svix-timestamp": timestamp, "svix-signature": signature }) as ClerkEvent;
  } catch {
    return Response.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const db = getDb();
  const inserted = await db.insert(webhookEvents).values({ id: createId(), provider: "clerk", providerEventId: eventId, eventType: event.type, payloadHash: createHash("sha256").update(body).digest("hex") }).onConflictDoNothing().returning({ id: webhookEvents.id });
  if (!inserted.length) return Response.json({ received: true, duplicate: true });

  try {
    await applyClerkEvent(event);
    await db.update(webhookEvents).set({ status: "processed", processedAt: new Date(), attempts: 1, updatedAt: new Date() }).where(eq(webhookEvents.providerEventId, eventId));
    return Response.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Unknown webhook error";
    await db.update(webhookEvents).set({ status: "failed", lastError: message, attempts: 1, updatedAt: new Date() }).where(eq(webhookEvents.providerEventId, eventId));
    return Response.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

async function applyClerkEvent(event: ClerkEvent) {
  const db = getDb();
  const data = event.data;
  if (event.type === "user.created" || event.type === "user.updated") {
    const emails = Array.isArray(data.email_addresses) ? data.email_addresses.map(object) : [];
    const primaryEmail = emails.find((email) => string(email.id) === string(data.primary_email_address_id)) ?? emails[0] ?? {};
    const clerkUserId = string(data.id);
    await db.insert(users).values({ id: createId(), clerkUserId, primaryEmail: string(primaryEmail.email_address), displayName: `${string(data.first_name)} ${string(data.last_name)}`.trim() || string(data.username) || "Cardwise user", avatarUrl: string(data.image_url) || null }).onConflictDoUpdate({ target: users.clerkUserId, set: { primaryEmail: string(primaryEmail.email_address), displayName: `${string(data.first_name)} ${string(data.last_name)}`.trim() || string(data.username) || "Cardwise user", avatarUrl: string(data.image_url) || null, updatedAt: new Date() } });
  }
  if (event.type === "organization.created" || event.type === "organization.updated") {
    const clerkOrganizationId = string(data.id);
    await db.insert(workspaces).values({ id: createId(), type: "organization", name: string(data.name), slug: `${slugify(string(data.slug) || string(data.name))}-${clerkOrganizationId.slice(-5)}`, clerkOrganizationId, status: "trial" }).onConflictDoUpdate({ target: workspaces.clerkOrganizationId, set: { name: string(data.name), updatedAt: new Date() } });
  }
  if (event.type === "organizationMembership.created" || event.type === "organizationMembership.updated") {
    const organization = object(data.organization);
    const publicUserData = object(data.public_user_data);
    const [workspace] = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.clerkOrganizationId, string(organization.id))).limit(1);
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.clerkUserId, string(publicUserData.user_id))).limit(1);
    if (workspace && user) await db.insert(workspaceMemberships).values({ id: createId(), workspaceId: workspace.id, userId: user.id, clerkMembershipId: string(data.id), roleKey: string(data.role).replace(/^org:/, "") || "employee", status: "active", joinedAt: new Date() }).onConflictDoUpdate({ target: [workspaceMemberships.workspaceId, workspaceMemberships.userId], set: { roleKey: string(data.role).replace(/^org:/, "") || "employee", status: "active", updatedAt: new Date() } });
  }
  if (event.type === "organizationMembership.deleted") {
    await db.update(workspaceMemberships).set({ status: "removed", removedAt: new Date(), updatedAt: new Date() }).where(and(eq(workspaceMemberships.clerkMembershipId, string(data.id)), eq(workspaceMemberships.status, "active")));
  }
}

