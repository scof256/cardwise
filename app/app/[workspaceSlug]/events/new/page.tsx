import Link from "next/link";
import { CreateEventForm } from "@/components/events/create-event-form";
import { requireWorkspacePermission } from "@/lib/auth/workspace-context";

export const dynamic = "force-dynamic";

export default async function NewEventPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  await requireWorkspacePermission(workspaceSlug, "events:create");
  return <main className="event-admin-page narrow"><div className="event-admin-nav"><Link href={`/app/${workspaceSlug}/events`}>← All events</Link><span>New event draft</span></div><div className="event-admin-heading"><div><span className="eyebrow">CREATE EVENT</span><h1>Build an event people can keep using.</h1><p>You can preview the listing, invite companies, and submit it for platform review after saving the draft.</p></div></div><CreateEventForm workspaceSlug={workspaceSlug} /></main>;
}
