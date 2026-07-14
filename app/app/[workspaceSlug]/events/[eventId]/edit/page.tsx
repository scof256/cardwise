import Link from "next/link";
import { notFound } from "next/navigation";
import { CreateEventForm } from "@/components/events/create-event-form";
import { getWorkspaceEvent } from "@/lib/repositories/events";

export const dynamic = "force-dynamic";

export default async function EditEventPage({ params }: { params: Promise<{ workspaceSlug: string; eventId: string }> }) {
  const { workspaceSlug, eventId } = await params;
  const event = await getWorkspaceEvent(workspaceSlug, eventId);
  if (!event) notFound();
  return <main className="event-admin-page narrow"><div className="event-admin-nav"><Link href={`/app/${workspaceSlug}/events/${eventId}`}>← Manage event</Link><span>Edit draft</span></div><div className="event-admin-heading"><div><span className="eyebrow">EDIT EVENT</span><h1>Keep the listing accurate.</h1><p>Update timing, venue, visibility, directory access, and organizer information. Public changes go through moderation again.</p></div></div><CreateEventForm workspaceSlug={workspaceSlug} initialEvent={{ id: event.id, updatedAt: event.updatedAt.toISOString(), title: event.title, summary: event.summary, description: event.description, eventType: event.eventType, category: event.category ?? "", startsAt: event.startsAt.toISOString(), endsAt: event.endsAt.toISOString(), timezone: event.timezone, venueName: event.venueName ?? "", addressLine1: event.addressLine1 ?? "", addressLine2: event.addressLine2 ?? "", city: event.city ?? "", region: event.region ?? "", country: event.country ?? "", isVirtual: event.isVirtual, virtualJoinUrl: event.virtualJoinUrl ?? "", websiteUrl: event.websiteUrl ?? "", registrationUrl: event.registrationUrl ?? "", contactName: event.contactName ?? "", contactEmail: event.contactEmail ?? "", visibility: event.visibility, directoryAccess: event.directoryAccess, allowCompanySubmissions: event.allowCompanySubmissions, allowIndividualSubmissions: event.allowIndividualSubmissions, allowPublicCardPreviews: event.allowPublicCardPreviews, chatEnabled: event.chatEnabled }} /></main>;
}
