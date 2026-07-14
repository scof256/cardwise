import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicEventHeader } from "@/components/events/public-event-header";
import { SaveEventContact } from "@/components/events/save-event-contact";
import { getPublicEvent, listCurrentUserSaveWorkspaces, listPublicEventDirectory, recordEventActivity } from "@/lib/repositories/events";

export const dynamic = "force-dynamic";

export default async function SharedEventCardPage({ params }: { params: Promise<{ eventSlug: string; participantCardId: string }> }) {
  const { eventSlug, participantCardId } = await params;
  const [event, cards, workspaces] = await Promise.all([getPublicEvent(eventSlug), listPublicEventDirectory(eventSlug), listCurrentUserSaveWorkspaces()]);
  const card = cards.find((item) => item.id === participantCardId);
  if (!event || !card) notFound();
  await recordEventActivity(event.id, "participant_open", { participantCardId: card.id });
  return <div className="public-events-page"><PublicEventHeader /><main className="shared-event-card-page"><Link href={`/events/${eventSlug}/directory`}>← Back to {event.title}</Link><article className="shared-event-card"><div className="shared-event-card-brand"><span>{card.companyName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><small>{card.category}</small><strong>{card.companyName}</strong></div></div><div className="shared-event-person"><span className="participant-chip">{card.participantType}</span><h1>{card.displayName}</h1><p>{card.jobTitle}</p>{["checked_in", "organizer_confirmed"].includes(card.attendanceStatus) && <span className="attendance-verified">Attendance verified</span>}</div><dl>{card.email && <div><dt>Email</dt><dd><a href={`mailto:${card.email}`}>{card.email}</a></dd></div>}{card.phone && <div><dt>Phone</dt><dd><a href={`tel:${card.phone}`}>{card.phone}</a></dd></div>}{card.website && <div><dt>Website</dt><dd><a href={`https://${card.website.replace(/^https?:\/\//, "")}`}>{card.website}</a></dd></div>}{card.location && <div><dt>Location</dt><dd>{card.location}</dd></div>}</dl><div className="event-service-tags">{card.services.map((service) => <span key={service}>{service}</span>)}</div><div className="shared-event-card-actions"><SaveEventContact eventSlug={eventSlug} participantCardId={card.id} workspaces={workspaces} /><a className="outline" href={`/api/events/${eventSlug}/cards/${card.id}/vcard`}>Download vCard</a>{card.cardPreviewUrl && <a className="outline" href={card.cardPreviewUrl}>View shared card image</a>}{card.email && <a className="outline" href={`mailto:${card.email}`}>Send email</a>}</div><footer>Shared with consent for {event.title}. Details may be withdrawn by the card owner.</footer></article></main></div>;
}
