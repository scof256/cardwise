import Link from "next/link";
import type { EventSummary } from "@/lib/events/demo-events";
import { EventCard } from "./event-card";

export function EventsHomeSection({ events }: { events: EventSummary[] }) {
  const sponsored = events.find((event) => event.sponsored);
  const selection = [...(sponsored ? [sponsored] : []), ...events.filter((event) => event.id !== sponsored?.id && !event.sponsored)].slice(0, 2);
  return (
    <section className="home-events" aria-labelledby="home-events-title">
      <div className="section-head event-section-head"><div><span className="eyebrow">MEET YOUR NEXT CONNECTION</span><h2 id="home-events-title">Networking events</h2></div><Link className="event-text-link" href="/events">See all events →</Link></div>
      <p className="home-events-intro">Discover upcoming events, then search the verified cards shared by companies and people who attended.</p>
      {selection.length ? <div className="home-event-grid">{selection.map((event) => <EventCard key={event.id} event={event} compact />)}</div> : <div className="event-admin-empty home-events-empty"><span aria-hidden="true">◇</span><h3>No public events yet</h3><p>Create the first event, invite companies, and publish a useful directory for everyone who attended.</p><Link href="/onboarding">Create the first event</Link></div>}
    </section>
  );
}
