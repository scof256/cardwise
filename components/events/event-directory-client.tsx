"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { EventDirectoryCard } from "@/lib/events/demo-events";

const types = ["all", "sponsor", "exhibitor", "speaker", "company", "attendee"] as const;

export function EventDirectoryClient({ cards, eventSlug }: { cards: EventDirectoryCard[]; eventSlug: string }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<(typeof types)[number]>("all");
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return cards.filter((card) => (type === "all" || card.participantType === type) && (!needle || [card.companyName, card.displayName, card.jobTitle, card.category, card.location, ...card.services].join(" ").toLowerCase().includes(needle)));
  }, [cards, query, type]);
  useEffect(() => { if (query.trim().length < 2) return; const timer = window.setTimeout(() => { void fetch(`/api/events/${eventSlug}/activity`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType: "directory_search", metadata: { queryLength: query.trim().length, resultCount: results.length } }) }); }, 700); return () => window.clearTimeout(timer); }, [eventSlug, query, results.length]);

  return (
    <>
      <div className="event-directory-tools">
        <label className="event-search-field"><span aria-hidden="true">⌕</span><span className="sr-only">Search event directory</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a person, company, service, or location" /></label>
        <label className="event-filter-field"><span>Showing</span><select value={type} onChange={(event) => setType(event.target.value as typeof type)}>{types.map((value) => <option key={value} value={value}>{value === "all" ? "Everyone" : value === "company" ? "Companies" : `${value[0].toUpperCase()}${value.slice(1)}s`}</option>)}</select></label>
      </div>
      <p className="event-result-count">{results.length} shared card{results.length === 1 ? "" : "s"}</p>
      {results.length ? <div className="event-person-grid">{results.map((card) => (
        <article className="event-person-card" key={card.id}>
          <div className="event-person-top"><span className="event-person-avatar">{card.displayName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span className={`participant-chip participant-${card.participantType}`}>{card.participantType}</span></div>
          <span className="event-company-label">{card.companyName}</span>
          <h2>{card.displayName}</h2>
          <p className="event-role">{card.jobTitle || "Company representative"}</p>
          <p className="event-location">⌖ {card.location || "Location not shared"}</p>
          <div className="event-service-tags">{card.services.slice(0, 3).map((service) => <span key={service}>{service}</span>)}</div>
          <div className="event-person-actions"><Link href={`/events/${eventSlug}/directory/${card.id}`}>View shared card</Link>{card.email && <a href={`mailto:${card.email}`} aria-label={`Email ${card.displayName}`}>Email</a>}</div>
        </article>
      ))}</div> : <div className="event-empty"><span>⌕</span><h2>No shared cards match</h2><p>Try a broader company, service, or location.</p><button type="button" onClick={() => { setQuery(""); setType("all"); }}>Clear filters</button></div>}
    </>
  );
}
