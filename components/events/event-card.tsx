import Link from "next/link";
import type { EventSummary } from "@/lib/events/demo-events";

const dateFormatter = new Intl.DateTimeFormat("en-UG", { day: "numeric", month: "short", year: "numeric" });

export function EventCard({ event, compact = false }: { event: EventSummary; compact?: boolean }) {
  const start = new Date(event.startsAt);
  const location = event.isVirtual ? "Online" : [event.venueName, event.city].filter(Boolean).join(", ");
  return (
    <article className={`event-card event-accent-${event.accent}${compact ? " event-card-compact" : ""}`}>
      <div className="event-card-visual" aria-label={dateFormatter.format(start)}>
        <span>{start.toLocaleDateString("en-UG", { month: "short" }).toUpperCase()}</span>
        <strong>{start.getDate()}</strong>
        <small>{event.category}</small>
      </div>
      <div className="event-card-content">
        <div className="event-card-badges">
          {event.sponsored && <span className="sponsored-badge">Featured</span>}
          <span>{event.status === "completed" ? "Past event" : event.status === "live" ? "Happening now" : "Upcoming"}</span>
        </div>
        <h3><Link href={`/events/${event.slug}`}>{event.title}</Link></h3>
        <p>{event.summary}</p>
        <dl>
          <div><dt>Date</dt><dd>{dateFormatter.format(start)}</dd></div>
          <div><dt>Place</dt><dd>{location || "To be announced"}</dd></div>
          <div><dt>Directory</dt><dd>{event.companyCount} companies · {event.participantCount} people</dd></div>
        </dl>
        <div className="event-card-footer"><span>By {event.organizerName}</span><Link className="event-link-button" href={`/events/${event.slug}`}>Explore event <span aria-hidden="true">→</span></Link></div>
      </div>
    </article>
  );
}
