import { eq } from "drizzle-orm";
import { BillingControls } from "@/components/billing-controls";
import { getDb } from "@/db";
import { billingCustomers, workspaceSubscriptions } from "@/db/schema";
import { requireWorkspacePermission } from "@/lib/auth/workspace-context";

export const dynamic = "force-dynamic";
export default async function BillingPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params; const context = await requireWorkspacePermission(workspaceSlug, "billing:manage");
  const [[customer], [subscription]] = await Promise.all([getDb().select().from(billingCustomers).where(eq(billingCustomers.workspaceId, context.workspaceId)).limit(1), getDb().select().from(workspaceSubscriptions).where(eq(workspaceSubscriptions.workspaceId, context.workspaceId)).limit(1)]);
  return <main className="page-shell"><div className="page-title-row"><div><span className="eyebrow">BILLING</span><h1>Plans & subscription</h1><p>Current plan: {subscription?.planKey ?? "Free trial"} · {subscription?.status ?? "not subscribed"}</p></div><a href={`/app/${workspaceSlug}/admin`}>← Company dashboard</a></div><BillingControls workspaceSlug={workspaceSlug} hasCustomer={Boolean(customer)} /></main>;
}

