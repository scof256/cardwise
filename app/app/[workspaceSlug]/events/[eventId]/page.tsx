import Link from "next/link";
import { notFound } from "next/navigation";
import { EventOrganizerConsole } from "@/components/events/event-organizer-console";
import { getWorkspaceEvent, listEventInvitations, listEventParticipants } from "@/lib/repositories/events";

export const dynamic = "force-dynamic";

export default async function ManageEventPage({ params }: { params: Promise<{ workspaceSlug: string; eventId: string }> }) {
  const { workspaceSlug, eventId } = await params;
  const [event, participants, invitations] = await Promise.all([getWorkspaceEvent(workspaceSlug, eventId), listEventParticipants(workspaceSlug, eventId), listEventInvitations(workspaceSlug, eventId)]);
  if (!event) notFound();
  return <main className="event-admin-page"><div className="event-admin-nav"><Link href={`/app/${workspaceSlug}/events`}>← All events</Link><span>{event.title}</span></div><section className="event-admin-event-hero"><div><div className="event-card-badges"><span>{event.status}</span><span>{event.moderationStatus.replaceAll("_", " ")}</span></div><h1>{event.title}</h1><p>{event.summary}</p><div className="event-admin-event-links">{["draft", "scheduled"].includes(event.status) && <Link className="outline" href={`/app/${workspaceSlug}/events/${event.id}/edit`}>Edit event</Link>}{event.moderationStatus !== "pending" && <a href={`/api/workspaces/${workspaceSlug}/events/${event.id}/submit`}>Submit for review</a>}{event.moderationStatus === "approved" && <Link className="outline" href={`/events/${event.slug}`}>Open public page</Link>}</div></div><dl><div><dt>Starts</dt><dd>{event.startsAt.toLocaleString("en-UG", { dateStyle: "medium", timeStyle: "short" })}</dd></div><div><dt>Venue</dt><dd>{[event.venueName, event.city].filter(Boolean).join(", ")}</dd></div><div><dt>Directory</dt><dd>{event.directoryAccess.replaceAll("_", " ")}</dd></div></dl></section><nav className="event-admin-tabs" aria-label="Event management"><a href="#invitations">Invitations</a><a href="#participants">Participants</a><Link href={`/app/${workspaceSlug}/events/${eventId}/analytics`}>Analytics</Link><Link href={`/app/${workspaceSlug}/events/${eventId}/promotion`}>Promotion</Link></nav><EventOrganizerConsole workspaceSlug={workspaceSlug} eventId={eventId} initialParticipants={participants} initialInvitations={invitations} /></main>;
}
