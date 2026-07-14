import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { eventPromotionOrders, eventPromotionPackages, events, userNotifications } from "@/db/schema";
import { getStripe } from "@/lib/billing/stripe";
import { requirePlatformStaff } from "@/lib/auth/superadmin";

const decisionSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  reason: z.string().trim().max(500).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const staff = await requirePlatformStaff("events:moderate");
    const { orderId } = await params;
    const { decision, reason } = decisionSchema.parse(await request.json());
    const [record] = await getDb().select({ order: eventPromotionOrders, durationDays: eventPromotionPackages.durationDays, eventTitle: events.title, eventOwnerUserId: events.createdByUserId }).from(eventPromotionOrders).innerJoin(eventPromotionPackages, eq(eventPromotionPackages.id, eventPromotionOrders.packageId)).innerJoin(events, eq(events.id, eventPromotionOrders.eventId)).where(eq(eventPromotionOrders.id, orderId)).limit(1);
    if (!record) return NextResponse.json({ error: "Promotion order not found." }, { status: 404 });
    if (record.order.status !== "paid_pending_review") return NextResponse.json({ error: "This promotion is no longer awaiting review." }, { status: 409 });

    const now = new Date();
    let update: Partial<typeof eventPromotionOrders.$inferInsert>;
    let notificationTitle: string;
    let notificationBody: string;

    if (decision === "approve") {
      const end = new Date(now.getTime() + record.durationDays * 86400000);
      update = { status: "scheduled", scheduledStartAt: now, scheduledEndAt: end, reviewedByUserId: staff.userId, reviewedAt: now, updatedAt: now };
      notificationTitle = "Promotion scheduled";
      notificationBody = `${record.eventTitle} promotion is scheduled through ${end.toLocaleDateString()}.`;
    } else {
      const rejectionReason = reason || "Rejected by platform moderation.";
      if (record.order.stripePaymentIntentId) {
        const refund = await getStripe().refunds.create({ payment_intent: record.order.stripePaymentIntentId, reason: "requested_by_customer", metadata: { kind: "event_promotion_refund", orderId } }, { idempotencyKey: `event-promotion-refund:${orderId}` });
        const refunded = refund.status === "succeeded";
        update = { status: refunded ? "refunded" : "cancelled", rejectionReason, refundedAt: refunded ? now : null, reviewedByUserId: staff.userId, reviewedAt: now, updatedAt: now };
        notificationTitle = refunded ? "Promotion rejected and refunded" : "Promotion not approved";
        notificationBody = refunded ? `${record.eventTitle} was not approved for promotion. The payment refund has been issued.` : `${record.eventTitle} was not approved. The payment refund is being processed.`;
      } else {
        update = { status: "cancelled", rejectionReason, reviewedByUserId: staff.userId, reviewedAt: now, updatedAt: now };
        notificationTitle = "Promotion not approved";
        notificationBody = `${record.eventTitle} was not approved. No settled payment was attached to this order.`;
      }
    }

    const [order] = await getDb().update(eventPromotionOrders).set(update).where(eq(eventPromotionOrders.id, orderId)).returning();
    await getDb().insert(userNotifications).values({ id: createId(), userId: record.eventOwnerUserId, workspaceId: record.order.purchaserWorkspaceId, kind: `event_promotion_${decision}d`, title: notificationTitle, body: notificationBody, targetUrl: "/events", entityType: "event_promotion_order", entityId: orderId });
    return NextResponse.json({ order });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to moderate promotion." }, { status: 400 });
  }
}
