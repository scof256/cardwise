"use client";

import { useState } from "react";

type EventFormInitialValues = {
  id: string;
  updatedAt: string;
  title: string;
  summary: string;
  description: string;
  eventType: string;
  category: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  venueName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  country: string;
  isVirtual: boolean;
  virtualJoinUrl: string;
  websiteUrl: string;
  registrationUrl: string;
  contactName: string;
  contactEmail: string;
  visibility: "public" | "unlisted" | "workspace_only" | "invite_only";
  directoryAccess: "public" | "signed_in" | "approved_participants" | "disabled";
  allowCompanySubmissions: boolean;
  allowIndividualSubmissions: boolean;
  allowPublicCardPreviews: boolean;
  chatEnabled: boolean;
};

function localDateTime(value: string | undefined, fallback: Date) {
  const date = value ? new Date(value) : fallback;
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function CreateEventForm({ workspaceSlug, initialEvent }: { workspaceSlug: string; initialEvent?: EventFormInitialValues }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [nextWeek] = useState(() => new Date(Date.now() + 7 * 86400000));
  const defaultStart = localDateTime(initialEvent?.startsAt, nextWeek);
  const defaultEnd = localDateTime(initialEvent?.endsAt, new Date(nextWeek.getTime() + 6 * 3600000));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setError("");
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    const payload = { ...body, expectedUpdatedAt: initialEvent?.updatedAt, isVirtual: form.has("isVirtual"), allowCompanySubmissions: form.has("allowCompanySubmissions"), allowIndividualSubmissions: form.has("allowIndividualSubmissions"), allowPublicCardPreviews: form.has("allowPublicCardPreviews"), chatEnabled: form.has("chatEnabled") };
    const endpoint = initialEvent ? `/api/workspaces/${workspaceSlug}/events/${initialEvent.id}` : `/api/workspaces/${workspaceSlug}/events`;
    const response = await fetch(endpoint, { method: initialEvent ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error || `Could not ${initialEvent ? "update" : "create"} the event.`); setSubmitting(false); return; }
    window.location.assign(`/app/${workspaceSlug}/events/${result.event.id}`);
  }

  return <form className="event-admin-form" onSubmit={submit}>
    <section><div className="event-admin-section-title"><span>01</span><div><h2>Event identity</h2><p>What attendees will see in the public marketplace.</p></div></div><div className="event-form-grid"><label className="wide">Event title<input name="title" required minLength={3} defaultValue={initialEvent?.title} placeholder="East Africa Business Expo 2026" /></label><label>Event type<input name="eventType" required defaultValue={initialEvent?.eventType} placeholder="Business expo" /></label><label>Category<input name="category" defaultValue={initialEvent?.category} placeholder="Business & Trade" /></label><label className="wide">Short summary<textarea name="summary" required minLength={10} maxLength={320} defaultValue={initialEvent?.summary} placeholder="A clear one-sentence reason to attend." /></label><label className="wide">Full description<textarea name="description" required minLength={20} rows={6} defaultValue={initialEvent?.description} placeholder="Explain the audience, format, and networking value." /></label></div></section>
    <section><div className="event-admin-section-title"><span>02</span><div><h2>When and where</h2><p>Times are stored with the selected event timezone.</p></div></div><div className="event-form-grid"><label>Starts<input type="datetime-local" name="startsAt" defaultValue={defaultStart} required /></label><label>Ends<input type="datetime-local" name="endsAt" defaultValue={defaultEnd} required /></label><label>Timezone<input name="timezone" defaultValue={initialEvent?.timezone ?? "Africa/Kampala"} required /></label><label>Venue<input name="venueName" defaultValue={initialEvent?.venueName} placeholder="UMA Show Grounds" /></label><label>City<input name="city" defaultValue={initialEvent?.city} placeholder="Kampala" /></label><label>Region<input name="region" defaultValue={initialEvent?.region} placeholder="Central Region" /></label><label>Country<input name="country" defaultValue={initialEvent?.country ?? "Uganda"} /></label><label className="wide">Street address<input name="addressLine1" defaultValue={initialEvent?.addressLine1} placeholder="Venue street address" /></label><label className="wide">Address details<input name="addressLine2" defaultValue={initialEvent?.addressLine2} placeholder="Building, floor, or landmark" /></label><label className="event-checkbox wide"><input type="checkbox" name="isVirtual" defaultChecked={initialEvent?.isVirtual} /> This is a virtual event</label><label className="wide">Virtual event URL<input type="url" name="virtualJoinUrl" defaultValue={initialEvent?.virtualJoinUrl} placeholder="https://..." /></label></div></section>
    <section><div className="event-admin-section-title"><span>03</span><div><h2>Directory and sharing</h2><p>Control who can submit cards and who can open the final directory.</p></div></div><div className="event-form-grid"><label>Event visibility<select name="visibility" defaultValue={initialEvent?.visibility ?? "public"}><option value="public">Public marketplace</option><option value="unlisted">Anyone with link</option><option value="workspace_only">Workspace only</option><option value="invite_only">Invite only</option></select></label><label>Directory access<select name="directoryAccess" defaultValue={initialEvent?.directoryAccess ?? "public"}><option value="public">Public</option><option value="signed_in">Signed-in users</option><option value="approved_participants">Approved participants only</option><option value="disabled">Disabled</option></select></label><label>Registration URL<input type="url" name="registrationUrl" defaultValue={initialEvent?.registrationUrl} placeholder="https://..." /></label><label>Event website<input type="url" name="websiteUrl" defaultValue={initialEvent?.websiteUrl} placeholder="https://..." /></label><label>Organizer contact<input name="contactName" defaultValue={initialEvent?.contactName} placeholder="Public support name" /></label><label>Organizer email<input type="email" name="contactEmail" defaultValue={initialEvent?.contactEmail} placeholder="events@example.com" /></label><label className="event-checkbox wide"><input type="checkbox" name="allowCompanySubmissions" defaultChecked={initialEvent?.allowCompanySubmissions ?? true} /> Allow companies to submit cards</label><label className="event-checkbox wide"><input type="checkbox" name="allowIndividualSubmissions" defaultChecked={initialEvent?.allowIndividualSubmissions ?? true} /> Allow individuals to submit their own card</label><label className="event-checkbox wide"><input type="checkbox" name="allowPublicCardPreviews" defaultChecked={initialEvent?.allowPublicCardPreviews} /> Allow consented event-safe card previews</label><label className="event-checkbox wide"><input type="checkbox" name="chatEnabled" defaultChecked={initialEvent?.chatEnabled ?? true} /> Enable event-scoped AI search and chat</label></div></section>
    {initialEvent && <p className="event-edit-warning">Saving changes returns a previously approved public event to draft so the updated details can be reviewed again.</p>}
    {error && <p className="event-form-error" role="alert">{error}</p>}<div className="event-form-actions"><a href={initialEvent ? `/app/${workspaceSlug}/events/${initialEvent.id}` : `/app/${workspaceSlug}/events`}>Cancel</a><button type="submit" disabled={submitting}>{submitting ? "Saving…" : initialEvent ? "Save event changes" : "Create draft event"}</button></div>
  </form>;
}
