import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { and, count, eq, gte, inArray, isNull, or } from "drizzle-orm";
import { getDb } from "@/db";
import { eventPromotionOrders, eventPromotionPackages, events } from "@/db/schema";
import { roleHasPermission } from "@/lib/auth/permissions";
import { requireEventManager } from "@/lib/events/event-access";
import { getStripe } from "@/lib/billing/stripe";

export const fallbackPromotionPackages = [
  { id: "featured-week", key: "featured-week", name: "Featured event", description: "Priority placement in the event marketplace for seven days.", placement: "events_featured", durationDays: 7, priceCents: 9900, currency: "usd", inventoryLimit: null, active: true },
  { id: "homepage-week", key: "homepage-week", name: "Homepage spotlight", description: "A sponsored event card in the Cardwise homepage event section for seven days.", placement: "homepage_events", durationDays: 7, priceCents: 19900, currency: "usd", inventoryLimit: 6, active: true },
  { id: "launch-bundle", key: "launch-bundle", name: "Event launch bundle", description: "Homepage spotlight and priority marketplace placement for fourteen days.", placement: "homepage_and_events", durationDays: 14, priceCents: 29900, currency: "usd", inventoryLimit: 4, active: true },
];

export async function listPromotionPackages() {
  if (!process.env.DATABASE_URL) return fallbackPromotionPackages;
  return getDb().select().from(eventPromotionPackages).where(eq(eventPromotionPackages.active, true));
}

export async function createEventPromotionCheckout(workspaceSlug: string, eventId: string, packageId: string, origin: string) {
  const context = await requireEventManager(workspaceSlug, eventId);
  if (!roleHasPermission(context.role, "events:promotion:purchase")) throw new Error("Only a workspace owner or billing administrator can purchase promotion.");
  const db = getDb();
  const [[event], [promotionPackage]] = await Promise.all([db.select().from(events).where(and(eq(events.id, eventId), eq(events.ownerWorkspaceId, context.workspaceId))).limit(1), db.select().from(eventPromotionPackages).where(and(eq(eventPromotionPackages.id, packageId), eq(eventPromotionPackages.active, true))).limit(1)]);
  if (!event || !promotionPackage) throw new Error("Event or promotion package not found.");
  if (promotionPackage.inventoryLimit) {
    const [inventory] = await db.select({ value: count() }).from(eventPromotionOrders).innerJoin(eventPromotionPackages, eq(eventPromotionPackages.id, eventPromotionOrders.packageId)).where(and(eq(eventPromotionPackages.placement, promotionPackage.placement), inArray(eventPromotionOrders.status, ["paid_pending_review", "scheduled", "active"]), or(isNull(eventPromotionOrders.scheduledEndAt), gte(eventPromotionOrders.scheduledEndAt, new Date()))!));
    if (inventory.value >= promotionPackage.inventoryLimit) throw new Error("This promotion placement is sold out for the selected period.");
  }
  const orderId = createId();
  await db.insert(eventPromotionOrders).values({ id: orderId, eventId, purchaserWorkspaceId: context.workspaceId, packageId, createdByUserId: context.userId, amountCents: promotionPackage.priceCents, currency: promotionPackage.currency });
  try {
    const session = await getStripe().checkout.sessions.create({ mode: "payment", line_items: [{ price_data: { currency: promotionPackage.currency, unit_amount: promotionPackage.priceCents, product_data: { name: `${promotionPackage.name} — ${event.title}`, description: promotionPackage.description ?? undefined } }, quantity: 1 }], success_url: `${origin}/app/${workspaceSlug}/events/${eventId}/promotion?payment=success`, cancel_url: `${origin}/app/${workspaceSlug}/events/${eventId}/promotion?payment=cancelled`, client_reference_id: orderId, metadata: { kind: "event_promotion", orderId, workspaceId: context.workspaceId, eventId, packageId }, payment_intent_data: { metadata: { kind: "event_promotion", orderId, eventId } } });
    await db.update(eventPromotionOrders).set({ stripeCheckoutSessionId: session.id, updatedAt: new Date() }).where(eq(eventPromotionOrders.id, orderId));
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return session.url;
  } catch (error) {
    await db.update(eventPromotionOrders).set({ status: "cancelled", updatedAt: new Date() }).where(eq(eventPromotionOrders.id, orderId));
    throw error;
  }
}
