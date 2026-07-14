import { notFound } from "next/navigation";
import Link from "next/link";
import { EventDirectoryClient } from "@/components/events/event-directory-client";
import { PublicEventHeader } from "@/components/events/public-event-header";
import { canViewEventDirectory, getPublicEvent, listPublicEventDirectory, recordEventActivity } from "@/lib/repositories/events";

export const dynamic = "force-dynamic";

export default async function EventDirectoryPage({ params, searchParams }: { params: Promise<{ eventSlug: string }>; searchParams: Promise<{ source?: string }> }) {
  const { eventSlug } = await params;
  const { source } = await searchParams;
  const event = await getPublicEvent(eventSlug);
  if (!event || !(await canViewEventDirectory(eventSlug))) notFound();
  const cards = await listPublicEventDirectory(eventSlug);
  await recordEventActivity(event.id, "directory_view");
  if (source === "qr") await recordEventActivity(event.id, "qr_scan");
  return <div className="public-events-page"><PublicEventHeader /><main className="event-directory-page"><div className="event-directory-heading"><div><Link href={`/events/${event.slug}`}>← Back to event</Link><span className="eyebrow">SHARED EVENT DIRECTORY</span><h1>{event.title}</h1><p>Search cards that participating companies and people explicitly chose to share for this event.</p></div><a className="event-qr-link" href={`/api/events/${event.slug}/qr`}><span>▦</span> Event QR</a></div><EventDirectoryClient cards={cards} eventSlug={event.slug} /><p className="event-privacy-note">Cardwise only displays approved fields shared for this event. Source cards remain private in their owner’s workspace.</p></main></div>;
}
