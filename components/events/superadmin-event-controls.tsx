"use client";

import { useState } from "react";

export function SuperadminEventControls({ endpoint }: { endpoint: string }) { const [busy, setBusy] = useState(""); const [done, setDone] = useState(""); async function act(decision: string) { setBusy(decision); const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }) }); setBusy(""); if (response.ok) { setDone(decision); window.location.reload(); } else setDone("error"); } return <div className="superadmin-event-actions">{done === "error" && <small>Action failed</small>}<button disabled={Boolean(busy)} onClick={() => void act("approve")}>{busy === "approve" ? "Working…" : "Approve"}</button><button className="danger" disabled={Boolean(busy)} onClick={() => void act("reject")}>Reject</button></div>; }
