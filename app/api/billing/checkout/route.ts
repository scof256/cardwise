import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { billingCustomers, users } from "@/db/schema";
import { requireWorkspacePermission } from "@/lib/auth/workspace-context";
import { getStripe } from "@/lib/billing/stripe";

const schema = z.object({ workspaceSlug: z.string().min(1), plan: z.enum(["pro", "business"]), seats: z.number().int().min(1).max(500).default(1) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid checkout request" }, { status: 400 });
  const context = await requireWorkspacePermission(parsed.data.workspaceSlug, "billing:manage");
  const priceId = parsed.data.plan === "business" ? process.env.STRIPE_PRICE_BUSINESS : process.env.STRIPE_PRICE_PRO;
  if (!priceId) return Response.json({ error: "This billing plan is not configured" }, { status: 503 });
  const db = getDb();
  let [customer] = await db.select().from(billingCustomers).where(eq(billingCustomers.workspaceId, context.workspaceId)).limit(1);
  if (!customer) {
    const [actor] = await db.select({ email: users.primaryEmail }).from(users).where(eq(users.id, context.userId)).limit(1);
    const stripeCustomer = await getStripe().customers.create({ email: actor?.email, name: context.workspaceName, metadata: { workspaceId: context.workspaceId, workspaceSlug: context.workspaceSlug } });
    [customer] = await db.insert(billingCustomers).values({ id: createId(), workspaceId: context.workspaceId, stripeCustomerId: stripeCustomer.id, billingEmail: actor?.email }).returning();
  }
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const session = await getStripe().checkout.sessions.create({ mode: "subscription", customer: customer.stripeCustomerId, line_items: [{ price: priceId, quantity: parsed.data.plan === "business" ? parsed.data.seats : 1 }], allow_promotion_codes: true, success_url: `${origin}/app/${context.workspaceSlug}/admin/billing?checkout=success`, cancel_url: `${origin}/app/${context.workspaceSlug}/admin/billing?checkout=cancelled`, subscription_data: { metadata: { workspaceId: context.workspaceId, planKey: parsed.data.plan } }, metadata: { workspaceId: context.workspaceId, planKey: parsed.data.plan } });
  return Response.json({ url: session.url });
}

