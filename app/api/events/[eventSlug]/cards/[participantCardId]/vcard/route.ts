import { getPublicEvent, listPublicEventDirectory, recordEventActivity } from "@/lib/repositories/events";
import { enforceRateLimit } from "@/lib/security/rate-limit";

const escapeVCard = (value: string) => value.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");

export async function GET(request: Request, { params }: { params: Promise<{ eventSlug: string; participantCardId: string }> }) {
  const { eventSlug, participantCardId } = await params;
  const limited = await enforceRateLimit(request, `event-vcard:${eventSlug}`, { limit: 60, windowSeconds: 60 });
  if (limited) return limited;
  const [event, cards] = await Promise.all([getPublicEvent(eventSlug), listPublicEventDirectory(eventSlug)]);
  const card = cards.find((item) => item.id === participantCardId);
  if (!event || !card) return new Response("Shared card not found", { status: 404 });
  await recordEventActivity(event.id, "contact_save", { participantCardId: card.id, method: "vcard" });
  const name = card.displayName.trim().split(/\s+/);
  const family = name.length > 1 ? name.pop()! : "";
  const given = name.join(" ");
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `N:${escapeVCard(family)};${escapeVCard(given)};;;`, `FN:${escapeVCard(card.displayName)}`, `ORG:${escapeVCard(card.companyName)}`, card.jobTitle && `TITLE:${escapeVCard(card.jobTitle)}`, card.email && `EMAIL;TYPE=INTERNET:${escapeVCard(card.email)}`, card.phone && `TEL;TYPE=WORK:${escapeVCard(card.phone)}`, card.website && `URL:${escapeVCard(card.website)}`, card.location && `ADR;TYPE=WORK:;;${escapeVCard(card.location)};;;;`, `NOTE:${escapeVCard(`Shared through ${event.title} on Cardwise`)}`, "END:VCARD"].filter(Boolean).join("\r\n");
  return new Response(lines, { headers: { "Content-Type": "text/vcard; charset=utf-8", "Content-Disposition": `attachment; filename="${card.displayName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.vcf"` } });
}
