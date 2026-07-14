import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { billingCustomers } from "@/db/schema";
import { requireWorkspacePermission } from "@/lib/auth/workspace-context";
import { getStripe } from "@/lib/billing/stripe";

export async function POST(request: Request) {
  const parsed = z.object({ workspaceSlug: z.string().min(1) }).safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid portal request" }, { status: 400 });
  const context = await requireWorkspacePermission(parsed.data.workspaceSlug, "billing:manage");
  const [customer] = await getDb().select().from(billingCustomers).where(eq(billingCustomers.workspaceId, context.workspaceId)).limit(1);
  if (!customer) return Response.json({ error: "No billing account exists yet" }, { status: 404 });
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const session = await getStripe().billingPortal.sessions.create({ customer: customer.stripeCustomerId, return_url: `${origin}/app/${context.workspaceSlug}/admin/billing` });
  return Response.json({ url: session.url });
}

