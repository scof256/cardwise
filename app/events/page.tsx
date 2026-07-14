import type { Metadata } from "next";
import Link from "next/link";
import { EventCard } from "@/components/events/event-card";
import { PublicEventHeader } from "@/components/events/public-event-header";
import { listPublicEvents } from "@/lib/repositories/events";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Networking events | Cardwise", description: "Discover business networking events and search the cards shared by people who attended." };

type SearchParams = { q?: string | string[]; status?: string | string[]; city?: string | string[]; category?: string | string[]; mode?: string | string[]; from?: string | string[]; to?: string | string[] };
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";

export default async function EventsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [events, raw] = await Promise.all([listPublicEvents(), searchParams]);
  const filters = { q: first(raw.q).trim(), status: first(raw.status) || "all", city: first(raw.city), category: first(raw.category), mode: first(raw.mode) || "all", from: first(raw.from), to: first(raw.to) };
  const needle = filters.q.toLowerCase();
  const from = filters.from ? new Date(`${filters.from}T00:00:00`) : null;
  const to = filters.to ? new Date(`${filters.to}T23:59:59.999`) : null;
  const filtered = events.filter((event) => {
    const startsAt = new Date(event.startsAt);
    const statusMatch = filters.status === "all" || (filters.status === "upcoming" ? event.status === "scheduled" : event.status === filters.status);
    const textMatch = !needle || [event.title, event.summary, event.category, event.city, event.country, event.organizerName].join(" ").toLowerCase().includes(needle);
    return statusMatch && textMatch && (!filters.city || event.city === filters.city) && (!filters.category || event.category === filters.category) && (filters.mode === "all" || (filters.mode === "online" ? event.isVirtual : !event.isVirtual)) && (!from || startsAt >= from) && (!to || startsAt <= to);
  });
  const upcoming = filtered.filter((event) => event.status !== "completed");
  const past = filtered.filter((event) => event.status === "completed");
  const cities = [...new Set(events.map((event) => event.city).filter(Boolean))].sort();
  const categories = [...new Set(events.map((event) => event.category).filter(Boolean))].sort();

  return <div className="public-events-page"><PublicEventHeader /><main>
    <section className="events-market-hero"><span className="eyebrow">CARDWISE EVENTS</span><h1>Meet people before the handshake.<br /><em>Remember them after.</em></h1><p>Discover valuable business events and search the cards companies and attendees chose to share.</p><div className="events-market-search"><span aria-hidden="true">⌕</span><a href="#event-results">Browse events</a><a className="outline" href="/onboarding">Promote your event</a></div></section>
    <section className="events-market-filters" aria-labelledby="event-filter-title"><div><span className="eyebrow">FIND THE RIGHT ROOM</span><h2 id="event-filter-title">Search and filter events</h2></div><form method="get" action="/events"><label className="wide">Search<input name="q" defaultValue={filters.q} placeholder="Event, organizer, category, or city" /></label><label>Status<select name="status" defaultValue={filters.status}><option value="all">All public events</option><option value="upcoming">Upcoming</option><option value="live">Live now</option><option value="completed">Completed</option></select></label><label>City<select name="city" defaultValue={filters.city}><option value="">Every city</option>{cities.map((city) => <option key={city}>{city}</option>)}</select></label><label>Category<select name="category" defaultValue={filters.category}><option value="">Every category</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Format<select name="mode" defaultValue={filters.mode}><option value="all">Online and in-person</option><option value="in_person">In-person</option><option value="online">Online</option></select></label><label>From<input name="from" type="date" defaultValue={filters.from} /></label><label>To<input name="to" type="date" defaultValue={filters.to} /></label><div className="event-filter-actions"><button type="submit">Apply filters</button><Link href="/events">Clear</Link></div></form></section>
    <section id="event-results" className="events-market-section"><div className="events-market-title"><div><span className="eyebrow">PLAN AHEAD</span><h2>Upcoming and live events</h2></div><p>{upcoming.length} matching event{upcoming.length === 1 ? "" : "s"}</p></div>{upcoming.length ? <div className="events-market-grid">{upcoming.map((event) => <EventCard key={event.id} event={event} />)}</div> : <div className="event-admin-empty large"><span>◇</span><h3>No upcoming events match</h3><p>Clear a filter or list an event for this audience.</p><Link href="/onboarding">List your event</Link></div>}</section>
    <section className="events-value-strip"><div><strong>For attendees</strong><span>Find a company or person without carrying a stack of cards.</span></div><div><strong>For exhibitors</strong><span>Choose exactly which verified cards are visible at each event.</span></div><div><strong>For organizers</strong><span>Market the event, build a useful directory, and measure engagement.</span></div></section>
    {past.length > 0 && <section className="events-market-section past-events"><div className="events-market-title"><div><span className="eyebrow">KEEP NETWORKING</span><h2>Past event directories</h2></div><p>{past.length} searchable director{past.length === 1 ? "y" : "ies"}</p></div><div className="events-market-grid">{past.map((event) => <EventCard key={event.id} event={event} />)}</div></section>}
  </main><footer className="public-event-footer"><strong>cardwise events</strong><span>Business connections that remain useful after the room empties.</span></footer></div>;
}
