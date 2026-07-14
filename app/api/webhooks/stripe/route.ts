import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { getDb } from "@/db";
import { billingCustomers, billingEvents, eventPromotionOrders, events, userNotifications, workspaceSubscriptions, workspaces } from "@/db/schema";
import { getStripe, planFromPriceId } from "@/lib/billing/stripe";
import { requireEnvironment } from "@/lib/env";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing Stripe signature" }, { status: 400 });
  const rawBody = await request.text();
  let event: Stripe.Event;
  try { event = getStripe().webhooks.constructEvent(rawBody, signature, requireEnvironment("STRIPE_WEBHOOK_SECRET")); }
  catch { return Response.json({ error: "Invalid Stripe signature" }, { status: 400 }); }

  const db = getDb();
  const inserted = await db.insert(billingEvents).values({ id: createId(), stripeEventId: event.id, eventType: event.type, payload: event.data.object as unknown as Record<string, unknown> }).onConflictDoNothing().returning({ id: billingEvents.id });
  if (!inserted.length) return Response.json({ received: true, duplicate: true });

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
    let workspaceId = subscription.metadata.workspaceId;
    if (!workspaceId) workspaceId = (await db.select({ workspaceId: billingCustomers.workspaceId }).from(billingCustomers).where(eq(billingCustomers.stripeCustomerId, customerId)).limit(1))[0]?.workspaceId;
    if (workspaceId) {
      const priceId = subscription.items.data[0]?.price.id;
      const periodEnd = subscription.items.data[0]?.current_period_end;
      await db.insert(workspaceSubscriptions).values({ id: createId(), workspaceId, stripeCustomerId: customerId, stripeSubscriptionId: subscription.id, planKey: subscription.metadata.planKey || planFromPriceId(priceId), status: subscription.status, seats: subscription.items.data[0]?.quantity ?? 1, currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null, cancelAtPeriodEnd: subscription.cancel_at_period_end }).onConflictDoUpdate({ target: workspaceSubscriptions.workspaceId, set: { stripeCustomerId: customerId, stripeSubscriptionId: subscription.id, planKey: subscription.metadata.planKey || planFromPriceId(priceId), status: subscription.status, seats: subscription.items.data[0]?.quantity ?? 1, currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null, cancelAtPeriodEnd: subscription.cancel_at_period_end, updatedAt: new Date() } });
      const workspaceStatus = ["active", "trialing"].includes(subscription.status) ? "active" : subscription.status === "past_due" ? "past_due" : subscription.status === "canceled" ? "suspended" : "active";
      await db.update(workspaces).set({ status: workspaceStatus, updatedAt: new Date() }).where(eq(workspaces.id, workspaceId));
      await db.update(billingEvents).set({ workspaceId }).where(eq(billingEvents.stripeEventId, event.id));
    }
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.metadata?.kind === "event_promotion" && session.metadata.orderId && session.payment_status === "paid") {
      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
      const [order] = await db.update(eventPromotionOrders).set({ status: "paid_pending_review", stripePaymentIntentId: paymentIntentId ?? null, updatedAt: new Date() }).where(eq(eventPromotionOrders.id, session.metadata.orderId)).returning();
      if (order) {
        const [promotedEvent] = await db.select({ title: events.title, createdByUserId: events.createdByUserId }).from(events).where(eq(events.id, order.eventId)).limit(1);
        if (promotedEvent) await db.insert(userNotifications).values({ id: createId(), userId: promotedEvent.createdByUserId, workspaceId: order.purchaserWorkspaceId, kind: "event_promotion_paid", title: "Promotion payment received", body: `${promotedEvent.title} is queued for platform review.`, targetUrl: `/events`, entityType: "event_promotion_order", entityId: order.id });
        await db.update(billingEvents).set({ workspaceId: order.purchaserWorkspaceId }).where(eq(billingEvents.stripeEventId, event.id));
      }
    }
  }
  if (event.type === "charge.refunded" || event.type === "refund.updated") {
    const object = event.data.object;
    const paymentIntent = object.payment_intent;
    const paymentIntentId = typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id;
    const refundCompleted = event.type === "charge.refunded" || object.status === "succeeded";
    if (paymentIntentId && refundCompleted) {
      const now = new Date();
      const [order] = await db.update(eventPromotionOrders).set({ status: "refunded", refundedAt: now, updatedAt: now }).where(eq(eventPromotionOrders.stripePaymentIntentId, paymentIntentId)).returning();
      if (order) {
        const [promotedEvent] = await db.select({ title: events.title, createdByUserId: events.createdByUserId }).from(events).where(eq(events.id, order.eventId)).limit(1);
        if (promotedEvent) await db.insert(userNotifications).values({ id: createId(), userId: promotedEvent.createdByUserId, workspaceId: order.purchaserWorkspaceId, kind: "event_promotion_refunded", title: "Promotion payment refunded", body: `The promotion payment for ${promotedEvent.title} has been refunded.`, targetUrl: "/events", entityType: "event_promotion_order", entityId: order.id });
        await db.update(billingEvents).set({ workspaceId: order.purchaserWorkspaceId }).where(eq(billingEvents.stripeEventId, event.id));
      }
    }
  }
  return Response.json({ received: true });
}
