"use client";
import { useState } from "react";

export function BillingControls({ workspaceSlug, hasCustomer }: { workspaceSlug: string; hasCustomer: boolean }) {
  const [busy, setBusy] = useState(""); const [error, setError] = useState("");
  const open = async (kind: "portal" | "checkout", plan?: "pro" | "business") => { setBusy(plan ?? kind); setError(""); try { const response = await fetch(`/api/billing/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceSlug, plan, seats: 5 }) }); const data = await response.json() as { url?: string; error?: string }; if (!response.ok || !data.url) throw new Error(data.error || "Billing is unavailable"); window.location.assign(data.url); } catch (caught) { setError(caught instanceof Error ? caught.message : "Billing is unavailable"); setBusy(""); } };
  return <div>{error && <div className="upload-error" role="alert">{error}</div>}<div className="billing-plans"><article><span className="eyebrow">INDIVIDUAL</span><h2>Pro</h2><p>Advanced extraction, AI chat, semantic search, and unlimited digital profiles.</p><button className="primary" disabled={Boolean(busy)} onClick={() => open("checkout", "pro")}>{busy === "pro" ? "Opening…" : "Choose Pro"}</button></article><article><span className="eyebrow">COMPANIES</span><h2>Business</h2><p>Team workspaces, sales ownership, manager dashboards, shared directory, and governance.</p><button className="primary" disabled={Boolean(busy)} onClick={() => open("checkout", "business")}>{busy === "business" ? "Opening…" : "Choose Business"}</button></article></div>{hasCustomer && <button className="secondary billing-portal" disabled={Boolean(busy)} onClick={() => open("portal")}>Manage existing subscription</button>}</div>;
}

