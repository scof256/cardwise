"use client";

import { useState } from "react";
import type { EventCardVisibility } from "@/lib/validation/events";

const sharingLabels: Record<keyof EventCardVisibility, string> = {
  phone: "Phone numbers",
  email: "Email addresses",
  website: "Website",
  location: "Location",
  socialMedia: "Social media",
  productsServices: "Products and services",
  otherInformation: "Other information",
  originalCardPreview: "Event-safe card image",
};

export function ParticipantSharingControls({ workspaceSlug, participantId, initialVisibility, initialStatus }: { workspaceSlug: string; participantId: string; initialVisibility: EventCardVisibility; initialStatus: string }) {
  const [visibility, setVisibility] = useState(initialVisibility);
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  async function mutate(body: unknown) {
    const response = await fetch(`/api/workspaces/${workspaceSlug}/events/participations/${participantId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json() as { participant?: { status: string }; error?: string };
    if (!response.ok) throw new Error(payload.error || "Unable to update sharing.");
    if (payload.participant) setStatus(payload.participant.status);
  }

  async function save() {
    setBusy("save"); setNotice("");
    try { await mutate({ action: "update_sharing", visibility }); setNotice("Sharing choices updated. Public search was refreshed."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Unable to update sharing."); }
    finally { setBusy(""); }
  }

  async function withdraw() {
    if (!window.confirm("Withdraw every card from this event? They will immediately disappear from the directory and AI search.")) return;
    setBusy("withdraw"); setNotice("");
    try { await mutate({ action: "withdraw" }); setNotice("Cards withdrawn from this event."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Unable to withdraw cards."); }
    finally { setBusy(""); }
  }

  const locked = ["withdrawn", "rejected", "hidden"].includes(status);
  return <div className="participant-sharing-controls"><div className="event-sharing-grid">{Object.entries(sharingLabels).map(([key, label]) => <label key={key}><span>{label}</span><input type="checkbox" checked={visibility[key as keyof EventCardVisibility]} disabled={locked || Boolean(busy)} onChange={(event) => setVisibility((current) => ({ ...current, [key]: event.target.checked }))} /></label>)}</div><div className="participant-sharing-actions"><button type="button" onClick={() => void save()} disabled={locked || Boolean(busy)}>{busy === "save" ? "Saving…" : "Save sharing choices"}</button><button type="button" className="danger outline" onClick={() => void withdraw()} disabled={locked || Boolean(busy)}>{busy === "withdraw" ? "Withdrawing…" : "Withdraw from event"}</button></div>{notice && <p role="status" className="event-console-notice">{notice}</p>}</div>;
}
