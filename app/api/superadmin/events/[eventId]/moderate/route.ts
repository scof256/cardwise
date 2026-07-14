import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { events, userNotifications } from "@/db/schema";
import { requirePlatformStaff } from "@/lib/auth/superadmin";

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) { try { await requirePlatformStaff("events:moderate"); const { eventId } = await params; const { decision } = z.object({ decision: z.enum(["approve", "reject"]) }).parse(await request.json()); const now = new Date(); const [event] = await getDb().update(events).set(decision === "approve" ? { moderationStatus: "approved", status: "scheduled", publishedAt: now, moderationNotes: null, updatedAt: now } : { moderationStatus: "rejected", moderationNotes: "Rejected by platform moderation.", updatedAt: now }).where(eq(events.id, eventId)).returning(); if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 }); await getDb().insert(userNotifications).values({ id: createId(), userId: event.createdByUserId, workspaceId: event.ownerWorkspaceId, kind: `event_${decision}d`, title: decision === "approve" ? "Event approved" : "Event needs revision", body: decision === "approve" ? `${event.title} is now eligible for the public event marketplace.` : `${event.title} was not approved for public listing.`, targetUrl: `/events`, entityType: "event", entityId: event.id }); return NextResponse.json({ event }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to moderate event." }, { status: 400 }); } }
