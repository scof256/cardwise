import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublicEvent, recordEventActivity } from "@/lib/repositories/events";
import { enforceRateLimit } from "@/lib/security/rate-limit";

const schema = z.object({ eventType: z.enum(["directory_search", "event_view", "directory_view", "card_open", "card_preview_open", "contact_save", "event_chat_query", "qr_scan", "registration_click"]), metadata: z.record(z.string(), z.unknown()).optional().default({}) });
export async function POST(request: Request, { params }: { params: Promise<{ eventSlug: string }> }) { try { const { eventSlug } = await params; const limited = await enforceRateLimit(request, `event-activity:${eventSlug}`, { limit: 120, windowSeconds: 60 }); if (limited) return limited; const event = await getPublicEvent(eventSlug); if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 }); const input = schema.parse(await request.json()); await recordEventActivity(event.id, input.eventType, input.metadata); return NextResponse.json({ recorded: true }); } catch { return NextResponse.json({ recorded: false }, { status: 400 }); } }
