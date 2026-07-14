import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { JoinEventForm } from "@/components/events/join-event-form";
import { PublicEventHeader } from "@/components/events/public-event-header";
import { listCurrentUserContributionOptions, resolveEventInvitation } from "@/lib/repositories/events";

export const dynamic = "force-dynamic";

export default async function JoinEventPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params; const invite = await resolveEventInvitation(token); if (!invite) notFound(); const session = await auth();
  return <div className="public-events-page"><PublicEventHeader /><main className="event-join-page"><div className="event-join-heading"><span className="participant-chip">{invite.invitation.invitationType} invitation</span><h1>Share selected cards with<br /><em>{invite.event.title}</em></h1><p>{invite.event.summary}</p></div>{session.userId ? <JoinEventForm token={token} invitationType={invite.invitation.invitationType === "organizer" ? "attendee" : invite.invitation.invitationType} options={await listCurrentUserContributionOptions()} /> : <div className="event-signin-gate"><span>◇</span><h2>Sign in to choose cards</h2><p>The invitation is valid. Cardwise needs to confirm which workspaces and verified cards you are authorized to share.</p><Link href={`/sign-in?redirect_url=${encodeURIComponent(`/join/event/${token}`)}`}>Sign in and continue</Link><small>New to Cardwise? <Link href={`/sign-up?redirect_url=${encodeURIComponent(`/join/event/${token}`)}`}>Create an account</Link></small></div>}</main></div>;
}
