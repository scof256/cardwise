import { NextResponse } from "next/server";
import { z } from "zod";
import { canViewEventDirectory, getPublicEvent, recordEventActivity, searchPublicEventDirectory } from "@/lib/repositories/events";
import { enforceRateLimit } from "@/lib/security/rate-limit";

const querySchema = z.object({
  q: z.string().trim().min(1).max(240),
  limit: z.coerce.number().int().min(1).max(24).default(12),
});

export async function GET(request: Request, { params }: { params: Promise<{ eventSlug: string }> }) {
  const { eventSlug } = await params;
  const limited = await enforceRateLimit(request, `event-search:${eventSlug}`, { limit: 60, windowSeconds: 60 });
  if (limited) return limited;
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ q: url.searchParams.get("q") ?? "", limit: url.searchParams.get("limit") ?? 12 });
  if (!parsed.success) return NextResponse.json({ error: "Enter a search between 1 and 240 characters." }, { status: 400 });
  const event = await getPublicEvent(eventSlug);
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  if (!(await canViewEventDirectory(eventSlug))) return NextResponse.json({ error: "You do not have access to this event directory." }, { status: 403 });
  const cards = await searchPublicEventDirectory(eventSlug, parsed.data.q, parsed.data.limit);
  await recordEventActivity(event.id, "search", { resultCount: cards.length });
  return NextResponse.json({ component: "event-directory-summary", event: { id: event.id, slug: event.slug, title: event.title }, query: parsed.data.q, cards }, { headers: { "Cache-Control": "private, no-store" } });
}
