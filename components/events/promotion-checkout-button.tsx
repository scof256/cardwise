"use client";

import { useState } from "react";

export function PromotionCheckoutButton({ workspaceSlug, eventId, packageId }: { workspaceSlug: string; eventId: string; packageId: string }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function checkout() { setBusy(true); setError(""); const response = await fetch(`/api/workspaces/${workspaceSlug}/events/${eventId}/promotion-checkout`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packageId }) }); const result = await response.json(); if (!response.ok) { setError(result.error || "Checkout could not start."); setBusy(false); return; } window.location.assign(result.url); }
  return <div><button type="button" onClick={() => void checkout()} disabled={busy}>{busy ? "Opening secure checkout…" : "Choose package"}</button>{error && <small className="event-form-error">{error}</small>}</div>;
}
