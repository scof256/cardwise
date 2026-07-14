import Link from "next/link";
import { ParticipantSharingControls } from "@/components/events/participant-sharing-controls";
import { listWorkspaceEventParticipations } from "@/lib/repositories/events";
import { eventCardVisibilitySchema } from "@/lib/validation/events";

export const dynamic = "force-dynamic";

export default async function ParticipatingEventsPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const participations = await listWorkspaceEventParticipations(workspaceSlug);
  return <main className="event-admin-page"><div className="event-admin-nav"><Link href={`/app/${workspaceSlug}/events`}>← Event workspace</Link><span>Shared by your team</span></div><div className="event-admin-heading"><div><span className="eyebrow">PARTICIPATING EVENTS</span><h1>Control every card you shared.</h1><p>Reduce shared fields or withdraw a submission at any time. Changes immediately update the public directory and event AI search.</p></div></div>{participations.length ? <div className="event-participation-list">{participations.map(({ participant, event, cards }) => { const visibility = eventCardVisibilitySchema.parse(cards[0]?.visibilityConfig ?? {}); return <article className="event-admin-panel" key={participant.id}><div className="event-panel-heading"><div><span className="participant-chip">{participant.participantType}</span><h2>{event.title}</h2><p>{participant.displayNameSnapshot} · {cards.length} card{cards.length === 1 ? "" : "s"} · {participant.status.replaceAll("_", " ")}</p></div><Link href={`/events/${event.slug}`}>View event</Link></div><ParticipantSharingControls workspaceSlug={workspaceSlug} participantId={participant.id} initialVisibility={visibility} initialStatus={participant.status} /></article>; })}</div> : <div className="event-admin-empty large"><span>◇</span><h2>No shared event cards</h2><p>When you accept an event invitation and submit cards, you can manage them here.</p><Link href="/events">Browse events</Link></div>}</main>;
}
