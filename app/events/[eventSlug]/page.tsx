import { notFound } from "next/navigation";
import Link from "next/link";
import { EventDirectoryClient } from "@/components/events/event-directory-client";
import { PublicEventHeader } from "@/components/events/public-event-header";
import { getPublicEvent, listPublicEventDirectory, recordEventActivity } from "@/lib/repositories/events";

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: Promise<{ eventSlug: string }> }) {
  const { eventSlug } = await params;
  const event = await getPublicEvent(eventSlug);
  if (!event) notFound();
  const cards = await listPublicEventDirectory(eventSlug);
  await recordEventActivity(event.id, "event_view");
  const start = new Date(event.startsAt);
  return <div className="public-events-page"><PublicEventHeader /><main>
    <section className={`event-detail-hero event-accent-${event.accent}`}><div className="event-detail-copy"><div className="event-card-badges">{event.sponsored && <span className="sponsored-badge">Featured event</span>}<span>{event.category}</span></div><h1>{event.title}</h1><p>{event.summary}</p><div className="event-detail-actions"><a href={event.registrationUrl || "#directory"}>{event.status === "completed" ? "Explore the directory" : "Register for event"}</a><Link className="outline" href={`/events/${event.slug}/directory`}>Search attendee cards</Link></div></div><aside><span>{start.toLocaleDateString("en-UG", { month: "short" }).toUpperCase()}</span><strong>{start.getDate()}</strong><small>{start.getFullYear()}</small></aside></section>
    <section className="event-facts"><div><span>Date and time</span><strong>{start.toLocaleString("en-UG", { dateStyle: "full", timeStyle: "short", timeZone: event.timezone })}</strong></div><div><span>Venue</span><strong>{[event.venueName, event.city, event.country].filter(Boolean).join(", ")}</strong></div><div><span>Shared directory</span><strong>{event.companyCount} companies · {event.participantCount} people</strong></div><div><span>Organizer</span><strong>{event.organizerName}</strong></div></section>
    <section className="event-story"><div><span className="eyebrow">ABOUT THE EVENT</span><h2>A useful network, not just a guest list.</h2></div><p>{event.description}</p></section>
    <section id="directory" className="event-directory-preview"><div className="events-market-title"><div><span className="eyebrow">PEOPLE AND COMPANIES</span><h2>Search the shared card directory</h2></div><div className="event-title-actions">{event.chatEnabled && <Link href={`/events/${event.slug}/chat`}>Ask event AI</Link>}<Link href={`/events/${event.slug}/directory`}>Open full directory →</Link></div></div><EventDirectoryClient cards={cards.slice(0, 6)} eventSlug={event.slug} /></section>
    <section className="event-share-callout"><div><span aria-hidden="true">◇</span><div><strong>Attending or exhibiting?</strong><p>Ask the organizer for a Cardwise invite link, then choose the verified cards your company wants to share.</p></div></div><Link href="/onboarding">Create your Cardwise workspace</Link></section>
  </main></div>;
}
