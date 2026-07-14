"use client";

import { useState } from "react";

type Participant = { id: string; displayNameSnapshot: string; participantType: string; status: string; attendanceStatus: string; createdAt: Date | string; reviewNotes: string | null };
type Invitation = { id: string; invitationType: string; invitedEmail: string | null; allowedEmailDomain: string | null; useCount: number; maxUses: number | null; status: string; createdAt: Date | string };

export function EventOrganizerConsole({ workspaceSlug, eventId, initialParticipants, initialInvitations }: { workspaceSlug: string; eventId: string; initialParticipants: Participant[]; initialInvitations: Invitation[] }) {
  const [participants, setParticipants] = useState(initialParticipants);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [newLink, setNewLink] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");

  async function createInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("invite"); setNotice("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/workspaces/${workspaceSlug}/events/${eventId}/invitations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invitationType: form.get("invitationType"), invitedEmail: form.get("invitedEmail"), allowedEmailDomain: form.get("allowedEmailDomain"), maxUses: Number(form.get("maxUses")) || null, expiresAt: form.get("expiresAt") || null }) });
    const result = await response.json(); setBusy("");
    if (!response.ok) { setNotice(result.error || "Could not create invitation."); return; }
    setNewLink(new URL(result.url, window.location.origin).toString());
    setInvitations((current) => [result.invitation, ...current]);
    event.currentTarget.reset();
  }

  async function revokeInvitation(invitationId: string) {
    setBusy(`invite:${invitationId}`); setNotice("");
    const response = await fetch(`/api/workspaces/${workspaceSlug}/events/${eventId}/invitations/${invitationId}`, { method: "DELETE" });
    const result = await response.json(); setBusy("");
    if (!response.ok) { setNotice(result.error || "Could not revoke invitation."); return; }
    setInvitations((current) => current.map((invitation) => invitation.id === invitationId ? { ...invitation, status: "revoked" } : invitation));
    setNotice("Invitation revoked. The link can no longer be used.");
  }

  async function updateParticipant(participantId: string, payload: Record<string, string>) {
    setBusy(participantId); setNotice("");
    const response = await fetch(`/api/workspaces/${workspaceSlug}/events/${eventId}/participants/${participantId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json(); setBusy("");
    if (!response.ok) { setNotice(result.error || "Could not update participant."); return; }
    setParticipants((current) => current.map((participant) => participant.id === participantId ? { ...participant, ...result.participant } : participant));
  }

  return <div className="event-console-grid">
    <section className="event-admin-panel">
      <div className="event-panel-heading"><div><span className="eyebrow">INVITE COMPANIES</span><h2>Create a secure contribution link</h2></div><span>{invitations.length} links</span></div>
      <form className="event-invite-form" onSubmit={createInvitation}><label>Invite as<select name="invitationType" defaultValue="exhibitor"><option value="sponsor">Sponsor</option><option value="exhibitor">Exhibitor</option><option value="speaker">Speaker</option><option value="company">Company</option><option value="attendee">Attendee</option></select></label><label>Email restriction<input name="invitedEmail" type="email" placeholder="Optional exact email" /></label><label>Domain restriction<input name="allowedEmailDomain" placeholder="Optional example.com" /></label><label>Maximum uses<input name="maxUses" type="number" min="1" placeholder="Unlimited" /></label><label>Expires<input name="expiresAt" type="datetime-local" /></label><button disabled={busy === "invite"}>{busy === "invite" ? "Creating…" : "Create invite link"}</button></form>
      {newLink && <div className="event-new-link"><span>New invitation — copy it now</span><div><input readOnly value={newLink} /><button type="button" onClick={() => { void navigator.clipboard.writeText(newLink); setNotice("Invitation link copied."); }}>Copy</button></div><small>For security, Cardwise stores only a hash and cannot reveal this token again.</small></div>}
      <div className="event-invitation-list">{invitations.slice(0, 12).map((invitation) => <div key={invitation.id}><span className="participant-chip">{invitation.invitationType}</span><div><strong>{invitation.invitedEmail || invitation.allowedEmailDomain || "Open restricted link"}</strong><small>{invitation.useCount}{invitation.maxUses ? ` of ${invitation.maxUses}` : ""} uses · {invitation.status}</small></div>{invitation.status === "active" && <button type="button" className="outline" onClick={() => void revokeInvitation(invitation.id)} disabled={Boolean(busy)}>{busy === `invite:${invitation.id}` ? "Revoking…" : "Revoke"}</button>}</div>)}</div>
    </section>
    <section className="event-admin-panel">
      <div className="event-panel-heading"><div><span className="eyebrow">MODERATION QUEUE</span><h2>Card submissions</h2></div><span>{participants.length} submissions</span></div>
      {participants.length ? <div className="event-participant-list">{participants.map((participant) => <article key={participant.id}><div><span className="participant-chip">{participant.participantType}</span><h3>{participant.displayNameSnapshot}</h3><p>Submitted {new Date(participant.createdAt).toLocaleDateString()} · {participant.status.replaceAll("_", " ")}</p></div><div className="participant-controls"><select aria-label={`Attendance for ${participant.displayNameSnapshot}`} value={participant.attendanceStatus} onChange={(event) => void updateParticipant(participant.id, { attendanceStatus: event.target.value })} disabled={busy === participant.id}><option value="registered">Registered</option><option value="checked_in">Checked in</option><option value="organizer_confirmed">Confirmed</option><option value="no_show">No show</option></select>{participant.status !== "published" && <button onClick={() => void updateParticipant(participant.id, { decision: "approved", reviewNotes: "Approved by organizer." })} disabled={busy === participant.id}>Approve</button>}<button className="outline" onClick={() => void updateParticipant(participant.id, { decision: "changes_requested", reviewNotes: "Please review the shared details and resubmit." })} disabled={busy === participant.id}>Request changes</button></div></article>)}</div> : <div className="event-admin-empty"><span>◇</span><h3>No submissions yet</h3><p>Create an invite link and send it to participating companies.</p></div>}
    </section>
    {notice && <div className="event-console-notice" role="status">{notice}</div>}
  </div>;
}
