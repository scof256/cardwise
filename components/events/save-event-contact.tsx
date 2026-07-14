"use client";

import { useState } from "react";
import Link from "next/link";

type WorkspaceOption = { workspaceSlug: string; workspaceName: string };

export function SaveEventContact({ eventSlug, participantCardId, workspaces }: { eventSlug: string; participantCardId: string; workspaces: WorkspaceOption[] }) {
  const [workspaceSlug, setWorkspaceSlug] = useState(workspaces[0]?.workspaceSlug ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  if (!workspaces.length) return <Link href={`/sign-in?redirect_url=${encodeURIComponent(`/events/${eventSlug}/directory/${participantCardId}`)}`}>Sign in to save</Link>;
  async function save() {
    setBusy(true); setNotice("");
    const response = await fetch(`/api/events/${eventSlug}/cards/${participantCardId}/save`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceSlug }) });
    const payload = await response.json() as { alreadySaved?: boolean; error?: string };
    setBusy(false);
    setNotice(response.ok ? (payload.alreadySaved ? "Already saved in this workspace." : "Saved with event attribution.") : (payload.error || "Unable to save contact."));
  }
  return <div className="save-event-contact">{workspaces.length > 1 && <select aria-label="Workspace for saved contact" value={workspaceSlug} onChange={(event) => setWorkspaceSlug(event.target.value)}>{workspaces.map((workspace) => <option value={workspace.workspaceSlug} key={workspace.workspaceSlug}>{workspace.workspaceName}</option>)}</select>}<button type="button" onClick={() => void save()} disabled={busy}>{busy ? "Saving…" : "Save to Cardwise"}</button>{notice && <small role="status">{notice}</small>}</div>;
}
