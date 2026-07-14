import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import { auth } from "@clerk/nextjs/server";
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  addresses,
  auditEvents,
  businessCardImages,
  businessCards,
  contactMethods,
  contacts,
  directoryCompanies,
  eventActivityEvents,
  eventAccessGrants,
  eventInvitationUses,
  eventInvitations,
  eventParticipantCards,
  eventParticipants,
  eventPromotionOrders,
  events,
  productsServices,
  savedEventContacts,
  searchDocuments,
  userNotifications,
  users,
  workspaceMemberships,
  workspaces,
} from "@/db/schema";
import { requireWorkspacePermission } from "@/lib/auth/workspace-context";
import { requireEventManager } from "@/lib/events/event-access";
import { roleHasPermission } from "@/lib/auth/permissions";
import { demoEventDirectory, demoEvents, findDemoEvent, type EventDirectoryCard, type EventSummary } from "@/lib/events/demo-events";
import { hybridSearchEventDocuments, indexEventSearchDocument, removeEventSearchDocuments } from "@/lib/search/hybrid-search";
import type { EventCardVisibility, EventInput } from "@/lib/validation/events";

const hasDatabase = () => Boolean(process.env.DATABASE_URL);
const hashToken = (value: string) => createHash("sha256").update(value).digest("hex");
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

export type PublicEventDetails = EventSummary & {
  websiteUrl?: string;
  registrationUrl?: string;
  addressLine1?: string;
  isVirtual: boolean;
  chatEnabled: boolean;
  allowPublicCardPreviews: boolean;
};

async function currentDatabaseUserId() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;
  const [actor] = await getDb().select({ id: users.id }).from(users).where(eq(users.clerkUserId, clerkUserId)).limit(1);
  return actor?.id ?? null;
}

async function isOrganizerWorkspaceMember(ownerWorkspaceId: string, userId: string) {
  const [membership] = await getDb().select({ id: workspaceMemberships.id }).from(workspaceMemberships).where(and(eq(workspaceMemberships.workspaceId, ownerWorkspaceId), eq(workspaceMemberships.userId, userId), eq(workspaceMemberships.status, "active"))).limit(1);
  return Boolean(membership);
}

async function hasParticipantAccess(eventId: string, userId: string, requirePublished = false) {
  const participantStatuses = requirePublished ? ["published"] as const : ["pending_review", "changes_requested", "approved", "published"] as const;
  const [participant] = await getDb().select({ id: eventParticipants.id }).from(eventParticipants).where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.submittedByUserId, userId), inArray(eventParticipants.status, [...participantStatuses]))).limit(1);
  if (participant) return true;
  const now = new Date();
  const [grant] = await getDb().select({ id: eventAccessGrants.id }).from(eventAccessGrants).where(and(eq(eventAccessGrants.eventId, eventId), eq(eventAccessGrants.userId, userId), isNull(eventAccessGrants.revokedAt), or(isNull(eventAccessGrants.expiresAt), gte(eventAccessGrants.expiresAt, now))!)).limit(1);
  return Boolean(grant) && !requirePublished;
}

async function canAccessEvent(event: typeof events.$inferSelect) {
  if (["public", "unlisted"].includes(event.visibility)) return true;
  const userId = await currentDatabaseUserId();
  if (!userId) return false;
  if (await isOrganizerWorkspaceMember(event.ownerWorkspaceId, userId)) return true;
  return event.visibility === "invite_only" && hasParticipantAccess(event.id, userId);
}

async function canAccessDirectory(event: typeof events.$inferSelect) {
  if (event.directoryAccess === "disabled" || !(await canAccessEvent(event))) return false;
  if (event.directoryAccess === "public") return true;
  const userId = await currentDatabaseUserId();
  if (!userId) return false;
  if (await isOrganizerWorkspaceMember(event.ownerWorkspaceId, userId)) return true;
  if (event.directoryAccess === "signed_in") return true;
  return hasParticipantAccess(event.id, userId, true);
}

export async function canViewEventDirectory(slug: string) {
  if (!hasDatabase()) return Boolean(findDemoEvent(slug));
  const [event] = await getDb()
    .select()
    .from(events)
    .where(and(eq(events.slug, slug), eq(events.moderationStatus, "approved"), inArray(events.status, ["scheduled", "live", "completed"])))
    .limit(1);
  return Boolean(event && (await canAccessDirectory(event)));
}

export async function listPublicEvents(): Promise<EventSummary[]> {
  if (!hasDatabase()) return demoEvents;
  const db = getDb();
  const rows = await db
    .select({ event: events, organizerName: workspaces.name })
    .from(events)
    .innerJoin(workspaces, eq(workspaces.id, events.ownerWorkspaceId))
    .where(and(eq(events.moderationStatus, "approved"), eq(events.visibility, "public"), inArray(events.status, ["scheduled", "live", "completed"])))
    .orderBy(desc(events.startsAt))
    .limit(100);
  if (!rows.length) return [];

  const ids = rows.map(({ event }) => event.id);
  const participants = await db
    .select({ eventId: eventParticipants.eventId, companyId: eventParticipants.sourceCompanyId })
    .from(eventParticipants)
    .where(and(inArray(eventParticipants.eventId, ids), eq(eventParticipants.status, "published")));
  const now = new Date();
  const promotions = await db.select({ eventId: eventPromotionOrders.eventId }).from(eventPromotionOrders).where(and(inArray(eventPromotionOrders.eventId, ids), inArray(eventPromotionOrders.status, ["scheduled", "active"]), lte(eventPromotionOrders.scheduledStartAt, now), gte(eventPromotionOrders.scheduledEndAt, now)));
  const summaries = rows.map(({ event, organizerName }, index) => ({
    id: event.id,
    slug: event.slug,
    title: event.title,
    summary: event.summary,
    description: event.description,
    eventType: event.eventType,
    category: event.category ?? "Networking",
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    timezone: event.timezone,
    venueName: event.venueName ?? (event.isVirtual ? "Online" : "Venue to be announced"),
    city: event.city ?? "",
    country: event.country ?? "",
    isVirtual: event.isVirtual,
    status: event.status,
    moderationStatus: event.moderationStatus,
    visibility: event.visibility,
    directoryAccess: event.directoryAccess,
    participantCount: participants.filter((participant) => participant.eventId === event.id).length,
    companyCount: new Set(participants.filter((participant) => participant.eventId === event.id).map((participant) => participant.companyId).filter(Boolean)).size,
    sponsored: promotions.some((promotion) => promotion.eventId === event.id),
    organizerName,
    accent: (["coral", "navy", "green", "ochre"] as const)[index % 4],
  }));
  const statusRank = { live: 0, scheduled: 1, completed: 2, draft: 3, cancelled: 4, archived: 5 } as const;
  return summaries.sort((left, right) => {
    if (left.sponsored !== right.sponsored) return left.sponsored ? -1 : 1;
    const rank = statusRank[left.status] - statusRank[right.status];
    if (rank) return rank;
    const leftDate = new Date(left.startsAt).getTime();
    const rightDate = new Date(right.startsAt).getTime();
    return left.status === "completed" ? rightDate - leftDate : leftDate - rightDate;
  });
}

export async function reconcileEventLifecycle(now = new Date()) {
  if (!hasDatabase()) return { eventsStarted: 0, eventsCompleted: 0, promotionsStarted: 0, promotionsEnded: 0 };
  const db = getDb();
  const started = await db.update(events).set({ status: "live", updatedAt: now }).where(and(eq(events.status, "scheduled"), eq(events.moderationStatus, "approved"), lte(events.startsAt, now), gte(events.endsAt, now))).returning();
  const completed = await db.update(events).set({ status: "completed", completedAt: now, updatedAt: now }).where(and(inArray(events.status, ["scheduled", "live"]), lte(events.endsAt, now))).returning();
  const promotionsStarted = await db.update(eventPromotionOrders).set({ status: "active", updatedAt: now }).where(and(eq(eventPromotionOrders.status, "scheduled"), lte(eventPromotionOrders.scheduledStartAt, now), gte(eventPromotionOrders.scheduledEndAt, now))).returning();
  const promotionsEnded = await db.update(eventPromotionOrders).set({ status: "ended", updatedAt: now }).where(and(inArray(eventPromotionOrders.status, ["scheduled", "active"]), lte(eventPromotionOrders.scheduledEndAt, now))).returning();
  const eventTransitions = [...started.map((event) => ({ event, status: "live" })), ...completed.map((event) => ({ event, status: "completed" }))];
  if (eventTransitions.length) {
    await db.insert(auditEvents).values(eventTransitions.map(({ event, status }) => ({ id: createId(), workspaceId: event.ownerWorkspaceId, action: `event.${status}`, entityType: "event", entityId: event.id, after: { status, reconciledAt: now.toISOString() } })));
    await db.insert(userNotifications).values(eventTransitions.map(({ event, status }) => ({ id: createId(), userId: event.createdByUserId, workspaceId: event.ownerWorkspaceId, kind: `event_${status}`, title: status === "live" ? "Your event is now live" : "Your event has ended", body: status === "live" ? `${event.title} is live and its approved directory is available.` : `${event.title} is complete. Its shared directory remains searchable according to your settings.`, targetUrl: `/events/${event.slug}`, entityType: "event", entityId: event.id })));
  }
  return { eventsStarted: started.length, eventsCompleted: completed.length, promotionsStarted: promotionsStarted.length, promotionsEnded: promotionsEnded.length };
}

export async function getPublicEvent(slug: string): Promise<PublicEventDetails | null> {
  if (!hasDatabase()) {
    const event = findDemoEvent(slug);
    return event ? { ...event, chatEnabled: true, allowPublicCardPreviews: true } : null;
  }
  const [record] = await getDb().select({ event: events, organizerName: workspaces.name }).from(events).innerJoin(workspaces, eq(workspaces.id, events.ownerWorkspaceId)).where(and(eq(events.slug, slug), eq(events.moderationStatus, "approved"), inArray(events.status, ["scheduled", "live", "completed"]))).limit(1);
  if (!record || !(await canAccessEvent(record.event))) return null;
  const participantRows = await getDb().select({ companyId: eventParticipants.sourceCompanyId }).from(eventParticipants).where(and(eq(eventParticipants.eventId, record.event.id), eq(eventParticipants.status, "published")));
  const now = new Date();
  const [promotion] = await getDb().select({ id: eventPromotionOrders.id }).from(eventPromotionOrders).where(and(eq(eventPromotionOrders.eventId, record.event.id), inArray(eventPromotionOrders.status, ["scheduled", "active"]), lte(eventPromotionOrders.scheduledStartAt, now), gte(eventPromotionOrders.scheduledEndAt, now))).limit(1);
  const event = record.event;
  return { id: event.id, slug: event.slug, title: event.title, summary: event.summary, description: event.description, eventType: event.eventType, category: event.category ?? "Networking", startsAt: event.startsAt.toISOString(), endsAt: event.endsAt.toISOString(), timezone: event.timezone, venueName: event.venueName ?? (event.isVirtual ? "Online" : "Venue to be announced"), city: event.city ?? "", country: event.country ?? "", isVirtual: event.isVirtual, status: event.status, moderationStatus: event.moderationStatus, visibility: event.visibility, directoryAccess: event.directoryAccess, participantCount: participantRows.length, companyCount: new Set(participantRows.map((participant) => participant.companyId).filter(Boolean)).size, sponsored: Boolean(promotion), organizerName: record.organizerName, accent: "coral", websiteUrl: event.websiteUrl ?? undefined, registrationUrl: event.registrationUrl ?? undefined, addressLine1: event.addressLine1 ?? undefined, chatEnabled: event.chatEnabled, allowPublicCardPreviews: event.allowPublicCardPreviews };
}

export async function listPublicEventDirectory(slug: string, query = "", type = "all"): Promise<EventDirectoryCard[]> {
  if (!hasDatabase()) {
    const cards = demoEventDirectory[slug] ?? [];
    const needle = query.trim().toLowerCase();
    return cards.filter((card) => (type === "all" || card.participantType === type) && (!needle || [card.companyName, card.displayName, card.jobTitle, card.category, card.location, ...card.services].join(" ").toLowerCase().includes(needle)));
  }
  const [event] = await getDb().select().from(events).where(and(eq(events.slug, slug), eq(events.moderationStatus, "approved"), inArray(events.status, ["scheduled", "live", "completed"]))).limit(1);
  if (!event || !(await canAccessDirectory(event))) return [];
  const clauses = [eq(eventParticipantCards.eventId, event.id), eq(eventParticipantCards.status, "published"), isNull(eventParticipantCards.revokedAt), eq(eventParticipants.status, "published")];
  if (type !== "all") clauses.push(eq(eventParticipants.participantType, type as typeof eventParticipants.participantType.enumValues[number]));
  const needle = query.trim();
  if (needle) clauses.push(or(ilike(eventParticipantCards.displayNameSnapshot, `%${needle}%`), ilike(eventParticipantCards.companyNameSnapshot, `%${needle}%`), ilike(eventParticipantCards.jobTitleSnapshot, `%${needle}%`), ilike(eventParticipants.categorySnapshot, `%${needle}%`))!);
  const rows = await getDb().select({ card: eventParticipantCards, participant: eventParticipants }).from(eventParticipantCards).innerJoin(eventParticipants, eq(eventParticipants.id, eventParticipantCards.eventParticipantId)).where(and(...clauses)).orderBy(asc(eventParticipantCards.sortOrder));
  return rows.map(({ card, participant }) => {
    const visibility = card.visibilityConfig ?? {};
    return {
      id: card.id,
      participantId: participant.id,
      companyName: card.companyNameSnapshot,
      displayName: card.displayNameSnapshot,
      jobTitle: card.jobTitleSnapshot ?? "",
      email: visibility.email ? card.emailAddressesSnapshot[0] ?? "" : "",
      phone: visibility.phone ? card.phoneNumbersSnapshot[0] ?? "" : "",
      website: visibility.website ? card.websiteSnapshot ?? "" : "",
      location: visibility.location ? card.locationSnapshot ?? "" : "",
      category: participant.categorySnapshot ?? participant.industrySnapshot ?? "Business",
      services: visibility.productsServices ? card.productsServicesSnapshot : [],
      participantType: participant.participantType,
      attendanceStatus: participant.attendanceStatus,
      cardPreviewUrl: visibility.originalCardPreview && event.allowPublicCardPreviews ? `/api/events/${event.slug}/cards/${card.id}/preview` : undefined,
    };
  });
}

export async function searchPublicEventDirectory(slug: string, query: string, limit = 12): Promise<EventDirectoryCard[]> {
  const normalized = query.trim();
  if (!normalized) return (await listPublicEventDirectory(slug)).slice(0, limit);
  const publishedCards = await listPublicEventDirectory(slug);
  if (!publishedCards.length) return [];
  const event = await getPublicEvent(slug);
  const hybridConfigured = Boolean(process.env.VOYAGE_API_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (event && hasDatabase() && hybridConfigured) {
    try {
      const documents = await hybridSearchEventDocuments(event.id, normalized, limit);
      const byId = new Map(publishedCards.map((card) => [card.id, card]));
      const consentFiltered = documents.flatMap((document) => {
        const card = byId.get(document.entity_id);
        return card ? [card] : [];
      });
      if (consentFiltered.length) return consentFiltered;
    } catch (error) {
      console.error("Event hybrid search failed; using consent-filtered keyword search.", error);
    }
  }
  return (await listPublicEventDirectory(slug, normalized)).slice(0, limit);
}

export async function listWorkspaceEvents(workspaceSlug: string) {
  const context = await requireWorkspacePermission(workspaceSlug, "events:read");
  return getDb().select().from(events).where(eq(events.ownerWorkspaceId, context.workspaceId)).orderBy(desc(events.startsAt));
}

export async function getWorkspaceEvent(workspaceSlug: string, eventId: string) {
  await requireEventManager(workspaceSlug, eventId);
  const [event] = await getDb().select().from(events).where(eq(events.id, eventId)).limit(1);
  return event ?? null;
}

export async function listEventInvitations(workspaceSlug: string, eventId: string) {
  await requireEventManager(workspaceSlug, eventId);
  return getDb().select().from(eventInvitations).where(eq(eventInvitations.eventId, eventId)).orderBy(desc(eventInvitations.createdAt));
}

export async function createWorkspaceEvent(workspaceSlug: string, input: EventInput) {
  const context = await requireWorkspacePermission(workspaceSlug, "events:create");
  const id = createId();
  const slug = `${slugify(input.title) || "event"}-${id.slice(0, 7)}`;
  const [event] = await getDb().insert(events).values({
    id,
    ownerWorkspaceId: context.workspaceId,
    createdByUserId: context.userId,
    slug,
    title: input.title,
    summary: input.summary,
    description: input.description,
    eventType: input.eventType,
    category: input.category || null,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    timezone: input.timezone,
    venueName: input.venueName || null,
    addressLine1: input.addressLine1 || null,
    addressLine2: input.addressLine2 || null,
    city: input.city || null,
    region: input.region || null,
    country: input.country || null,
    isVirtual: input.isVirtual,
    virtualJoinUrl: input.virtualJoinUrl || null,
    websiteUrl: input.websiteUrl || null,
    registrationUrl: input.registrationUrl || null,
    contactName: input.contactName || null,
    contactEmail: input.contactEmail || null,
    visibility: input.visibility,
    directoryAccess: input.directoryAccess,
    allowCompanySubmissions: input.allowCompanySubmissions,
    allowIndividualSubmissions: input.allowIndividualSubmissions,
    allowPublicCardPreviews: input.allowPublicCardPreviews,
    chatEnabled: input.chatEnabled,
  }).returning();
  await getDb().insert(auditEvents).values({ id: createId(), workspaceId: context.workspaceId, actorUserId: context.userId, action: "event.created", entityType: "event", entityId: id, after: { title: input.title, slug } });
  return event;
}

export async function updateWorkspaceEvent(workspaceSlug: string, eventId: string, input: EventInput, expectedUpdatedAt?: Date) {
  const context = await requireEventManager(workspaceSlug, eventId);
  const [existing] = await getDb().select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!existing) throw new Error("Event not found.");
  if (["live", "completed", "cancelled", "archived"].includes(existing.status)) throw new Error("Live, completed, cancelled, or archived events cannot be edited from this form.");
  const now = new Date();
  const clauses = [eq(events.id, eventId)];
  if (expectedUpdatedAt) clauses.push(eq(events.updatedAt, expectedUpdatedAt));
  const [event] = await getDb().update(events).set({
    title: input.title,
    summary: input.summary,
    description: input.description,
    eventType: input.eventType,
    category: input.category || null,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    timezone: input.timezone,
    venueName: input.venueName || null,
    addressLine1: input.addressLine1 || null,
    addressLine2: input.addressLine2 || null,
    city: input.city || null,
    region: input.region || null,
    country: input.country || null,
    isVirtual: input.isVirtual,
    virtualJoinUrl: input.virtualJoinUrl || null,
    websiteUrl: input.websiteUrl || null,
    registrationUrl: input.registrationUrl || null,
    contactName: input.contactName || null,
    contactEmail: input.contactEmail || null,
    visibility: input.visibility,
    directoryAccess: input.directoryAccess,
    allowCompanySubmissions: input.allowCompanySubmissions,
    allowIndividualSubmissions: input.allowIndividualSubmissions,
    allowPublicCardPreviews: input.allowPublicCardPreviews,
    chatEnabled: input.chatEnabled,
    status: "draft",
    moderationStatus: "not_submitted",
    moderationNotes: null,
    publishedAt: null,
    updatedAt: now,
  }).where(and(...clauses)).returning();
  if (!event) throw new Error("This event changed in another session. Reload before saving again.");
  await getDb().insert(auditEvents).values({ id: createId(), workspaceId: context.workspaceId, actorUserId: context.userId, action: "event.updated", entityType: "event", entityId: event.id, before: { title: existing.title, moderationStatus: existing.moderationStatus, updatedAt: existing.updatedAt.toISOString() }, after: { title: event.title, moderationStatus: event.moderationStatus, updatedAt: event.updatedAt.toISOString() } });
  return event;
}

export async function submitEventForReview(workspaceSlug: string, eventId: string) {
  const context = await requireEventManager(workspaceSlug, eventId);
  const [event] = await getDb().update(events).set({ moderationStatus: "pending", moderationNotes: null, updatedAt: new Date() }).where(and(eq(events.id, eventId), eq(events.ownerWorkspaceId, context.workspaceId))).returning();
  if (!event) throw new Error("Event not found.");
  return event;
}

export async function createEventInvitation(workspaceSlug: string, eventId: string, input: { invitationType: "sponsor" | "exhibitor" | "speaker" | "company" | "attendee"; invitedEmail?: string; allowedEmailDomain?: string; invitedWorkspaceId?: string; maxUses?: number | null; expiresAt?: Date | null }) {
  const context = await requireEventManager(workspaceSlug, eventId);
  const token = randomBytes(32).toString("base64url");
  const [invitation] = await getDb().insert(eventInvitations).values({ id: createId(), eventId, tokenHash: hashToken(token), invitationType: input.invitationType, invitedEmail: input.invitedEmail || null, allowedEmailDomain: input.allowedEmailDomain || null, invitedWorkspaceId: input.invitedWorkspaceId || null, maxUses: input.maxUses ?? null, expiresAt: input.expiresAt ?? null, createdByUserId: context.userId }).returning();
  return { invitation, token, url: `/join/event/${token}` };
}

export async function revokeEventInvitation(workspaceSlug: string, eventId: string, invitationId: string) {
  const context = await requireEventManager(workspaceSlug, eventId);
  const now = new Date();
  const [invitation] = await getDb().update(eventInvitations).set({ status: "revoked", updatedAt: now }).where(and(eq(eventInvitations.id, invitationId), eq(eventInvitations.eventId, eventId), eq(eventInvitations.status, "active"))).returning();
  if (!invitation) throw new Error("Active invitation not found.");
  await getDb().insert(auditEvents).values({ id: createId(), workspaceId: context.workspaceId, actorUserId: context.userId, action: "event.invitation_revoked", entityType: "event_invitation", entityId: invitation.id, after: { eventId, status: "revoked" } });
  return invitation;
}

export async function resolveEventInvitation(token: string) {
  if (!hasDatabase()) return null;
  const [row] = await getDb().select({ invitation: eventInvitations, event: events }).from(eventInvitations).innerJoin(events, eq(events.id, eventInvitations.eventId)).where(eq(eventInvitations.tokenHash, hashToken(token))).limit(1);
  if (!row || row.invitation.status !== "active" || (row.invitation.expiresAt && row.invitation.expiresAt < new Date()) || (row.invitation.maxUses && row.invitation.useCount >= row.invitation.maxUses)) return null;
  return row;
}

export async function listCurrentUserContributionOptions() {
  if (!hasDatabase()) return [];
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return [];
  const db = getDb();
  const memberships = await db.select({ workspaceId: workspaces.id, workspaceSlug: workspaces.slug, workspaceName: workspaces.name, role: workspaceMemberships.roleKey }).from(users).innerJoin(workspaceMemberships, and(eq(workspaceMemberships.userId, users.id), eq(workspaceMemberships.status, "active"))).innerJoin(workspaces, eq(workspaces.id, workspaceMemberships.workspaceId)).where(and(eq(users.clerkUserId, clerkUserId), inArray(workspaces.status, ["trial", "active", "past_due"])));
  const permitted = memberships.filter((membership) => roleHasPermission(membership.role, "events:submit:own"));
  if (!permitted.length) return [];
  const workspaceIds = permitted.map((membership) => membership.workspaceId);
  const [companies, cards] = await Promise.all([
    db.select({ id: directoryCompanies.id, workspaceId: directoryCompanies.workspaceId, name: directoryCompanies.companyName }).from(directoryCompanies).where(and(inArray(directoryCompanies.workspaceId, workspaceIds), eq(directoryCompanies.status, "active"), isNull(directoryCompanies.deletedAt))),
    db.select({ id: businessCards.id, workspaceId: businessCards.workspaceId, companyId: businessCards.directoryCompanyId, contactId: businessCards.contactId }).from(businessCards).where(and(inArray(businessCards.workspaceId, workspaceIds), eq(businessCards.status, "verified"))),
  ]);
  const contactIds = cards.map((card) => card.contactId).filter((id): id is string => Boolean(id));
  const people = contactIds.length ? await db.select({ id: contacts.id, fullName: contacts.fullName, jobTitle: contacts.jobTitle }).from(contacts).where(inArray(contacts.id, contactIds)) : [];
  return permitted.map((membership) => ({ ...membership, companies: companies.filter((company) => company.workspaceId === membership.workspaceId).map((company) => ({ id: company.id, name: company.name, cards: cards.filter((card) => card.workspaceId === membership.workspaceId && card.companyId === company.id).map((card) => { const person = people.find((item) => item.id === card.contactId); return { id: card.id, label: person ? `${person.fullName}${person.jobTitle ? ` · ${person.jobTitle}` : ""}` : company.name }; }) })).filter((company) => company.cards.length > 0) }));
}

export async function listCurrentUserSaveWorkspaces() {
  if (!hasDatabase()) return [];
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return [];
  const [actor] = await getDb().select({ id: users.id }).from(users).where(eq(users.clerkUserId, clerkUserId)).limit(1);
  if (!actor) return [];
  const memberships = await getDb().select({ workspaceId: workspaces.id, workspaceSlug: workspaces.slug, workspaceName: workspaces.name, role: workspaceMemberships.roleKey }).from(workspaceMemberships).innerJoin(workspaces, eq(workspaces.id, workspaceMemberships.workspaceId)).where(and(eq(workspaceMemberships.userId, actor.id), eq(workspaceMemberships.status, "active"), inArray(workspaces.status, ["trial", "active", "past_due"])));
  return memberships.filter((membership) => roleHasPermission(membership.role, "directory:write:own") || roleHasPermission(membership.role, "directory:write:any")).map(({ workspaceSlug, workspaceName }) => ({ workspaceSlug, workspaceName }));
}

export async function submitParticipantCards(token: string, input: { workspaceSlug: string; sourceCompanyId: string; businessCardIds: string[]; participantType: "sponsor" | "exhibitor" | "speaker" | "company" | "attendee"; visibility: EventCardVisibility; consentVersion: "event-sharing-v1" }) {
  const invite = await resolveEventInvitation(token);
  if (!invite) throw new Error("This invitation is invalid or has expired.");
  const context = await requireWorkspacePermission(input.workspaceSlug, "events:submit:own");
  if (invite.invitation.invitedWorkspaceId && invite.invitation.invitedWorkspaceId !== context.workspaceId) throw new Error("This invitation belongs to another workspace.");
  if (invite.invitation.invitedEmail && invite.invitation.invitedEmail.toLowerCase() !== context.userEmail.toLowerCase()) throw new Error("Sign in with the invited email address.");
  if (invite.invitation.allowedEmailDomain && !context.userEmail.toLowerCase().endsWith(`@${invite.invitation.allowedEmailDomain}`)) throw new Error("Your email domain is not permitted by this invitation.");
  if (input.participantType !== invite.invitation.invitationType && invite.invitation.invitationType !== "attendee") throw new Error("Participant type does not match this invitation.");

  const db = getDb();
  const [company] = await db.select().from(directoryCompanies).where(and(eq(directoryCompanies.id, input.sourceCompanyId), eq(directoryCompanies.workspaceId, context.workspaceId), eq(directoryCompanies.status, "active"))).limit(1);
  if (!company) throw new Error("Company not found in this workspace.");
  const cards = await db.select().from(businessCards).where(and(eq(businessCards.workspaceId, context.workspaceId), eq(businessCards.directoryCompanyId, company.id), inArray(businessCards.id, input.businessCardIds), eq(businessCards.status, "verified")));
  if (cards.length !== new Set(input.businessCardIds).size) throw new Error("Every selected card must be verified and belong to the selected company.");
  const contactIds = cards.map((card) => card.contactId).filter((id): id is string => Boolean(id));
  const [people, methods, services, locations] = await Promise.all([
    contactIds.length ? db.select().from(contacts).where(and(eq(contacts.workspaceId, context.workspaceId), inArray(contacts.id, contactIds))) : [],
    contactIds.length ? db.select().from(contactMethods).where(and(eq(contactMethods.workspaceId, context.workspaceId), eq(contactMethods.ownerType, "contact"), inArray(contactMethods.ownerId, contactIds))) : [],
    db.select().from(productsServices).where(and(eq(productsServices.workspaceId, context.workspaceId), eq(productsServices.companyId, company.id))),
    db.select().from(addresses).where(and(eq(addresses.workspaceId, context.workspaceId), eq(addresses.ownerType, "company"), eq(addresses.ownerId, company.id))),
  ]);
  const now = new Date();
  const participantId = createId();
  await db.transaction(async (tx) => {
    await tx.insert(eventParticipants).values({ id: participantId, eventId: invite.event.id, submittingWorkspaceId: context.workspaceId, submittedByUserId: context.userId, participantType: input.participantType, sourceCompanyId: company.id, displayNameSnapshot: company.companyName, logoBlobKeySnapshot: company.logoBlobKey, summarySnapshot: company.description ?? company.tagline, categorySnapshot: company.category, industrySnapshot: company.industry, servicesSnapshot: services.map((service) => service.name), websiteSnapshot: company.websiteUrl, locationSnapshot: locations[0]?.normalizedValue ?? company.physicalAddressSummary, consentVersion: input.consentVersion, consentedAt: now, consentedByUserId: context.userId });
    await tx.insert(eventAccessGrants).values({
      id: createId(),
      eventId: invite.event.id,
      userId: context.userId,
      participantId,
      grantType: "participant",
    }).onConflictDoUpdate({
      target: [eventAccessGrants.eventId, eventAccessGrants.userId],
      set: { participantId, grantType: "participant", revokedAt: null, expiresAt: null, updatedAt: now },
    });
    for (const [index, card] of cards.entries()) {
      const person = people.find((item) => item.id === card.contactId);
      const personMethods = methods.filter((method) => method.ownerId === person?.id);
      await tx.insert(eventParticipantCards).values({ id: createId(), eventId: invite.event.id, eventParticipantId: participantId, sourceWorkspaceId: context.workspaceId, sourceBusinessCardId: card.id, sourceContactId: person?.id ?? null, displayNameSnapshot: person?.fullName ?? company.companyName, jobTitleSnapshot: person?.jobTitle, companyNameSnapshot: company.companyName, phoneNumbersSnapshot: personMethods.filter((method) => method.kind === "phone").map((method) => method.displayValue), emailAddressesSnapshot: personMethods.filter((method) => method.kind === "email").map((method) => method.displayValue), socialMediaSnapshot: Object.fromEntries(personMethods.filter((method) => ["linkedin", "x", "instagram", "facebook", "whatsapp"].includes(method.kind)).map((method) => [method.kind, method.displayValue])), websiteSnapshot: company.websiteUrl, locationSnapshot: locations[0]?.normalizedValue ?? company.physicalAddressSummary, productsServicesSnapshot: services.map((service) => service.name), otherInformationSnapshot: company.otherInformation, visibilityConfig: input.visibility, sortOrder: index, consentedAt: now });
    }
    await tx.update(eventInvitations).set({ useCount: invite.invitation.useCount + 1, status: invite.invitation.maxUses && invite.invitation.useCount + 1 >= invite.invitation.maxUses ? "exhausted" : "active", updatedAt: now }).where(eq(eventInvitations.id, invite.invitation.id));
    await tx.insert(eventInvitationUses).values({ id: createId(), invitationId: invite.invitation.id, eventId: invite.event.id, userId: context.userId, workspaceId: context.workspaceId, participantId });
    await tx.insert(userNotifications).values({ id: createId(), userId: invite.event.createdByUserId, workspaceId: invite.event.ownerWorkspaceId, kind: "event_submission", title: "New event card submission", body: `${company.companyName} submitted ${cards.length} card${cards.length === 1 ? "" : "s"} to ${invite.event.title}.`, targetUrl: "/events", entityType: "event_participant", entityId: participantId });
  });
  return { participantId };
}

async function requireParticipantContributor(workspaceSlug: string, participantId: string) {
  const context = await requireWorkspacePermission(workspaceSlug, "events:submit:own");
  const [record] = await getDb().select({ participant: eventParticipants, event: events }).from(eventParticipants).innerJoin(events, eq(events.id, eventParticipants.eventId)).where(eq(eventParticipants.id, participantId)).limit(1);
  if (!record || record.participant.submittingWorkspaceId !== context.workspaceId) throw new Error("Event submission not found in this workspace.");
  if (record.participant.submittedByUserId !== context.userId && !roleHasPermission(context.role, "events:submit:any")) throw new Error("You can update only your own event submissions.");
  return { context, ...record };
}

async function refreshParticipantSearchIndex(participant: typeof eventParticipants.$inferSelect, cards: Array<typeof eventParticipantCards.$inferSelect>, published: boolean) {
  if (!cards.length) return;
  const cardIds = cards.map((card) => card.id);
  await getDb().delete(searchDocuments).where(and(eq(searchDocuments.eventId, participant.eventId), eq(searchDocuments.entityType, "event_card"), inArray(searchDocuments.entityId, cardIds)));
  const searchConfigured = Boolean(process.env.VOYAGE_API_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!published) {
    if (searchConfigured) await removeEventSearchDocuments(participant.eventId, cardIds).catch((error) => console.error("Unable to remove event search documents.", error));
    return;
  }
  const indexedCards = cards.map((card) => {
    const visibility = card.visibilityConfig ?? {};
    const content = [
      `Company: ${card.companyNameSnapshot}`,
      `Contact: ${card.displayNameSnapshot}`,
      card.jobTitleSnapshot && `Job title: ${card.jobTitleSnapshot}`,
      `Event role: ${participant.participantType}`,
      participant.categorySnapshot && `Category: ${participant.categorySnapshot}`,
      participant.industrySnapshot && `Industry: ${participant.industrySnapshot}`,
      visibility.location && card.locationSnapshot && `Location: ${card.locationSnapshot}`,
      visibility.website && card.websiteSnapshot && `Website: ${card.websiteSnapshot}`,
      visibility.productsServices && card.productsServicesSnapshot.length > 0 && `Products and services: ${card.productsServicesSnapshot.join(", ")}`,
      visibility.email && card.emailAddressesSnapshot.length > 0 && `Email: ${card.emailAddressesSnapshot.join(", ")}`,
      visibility.phone && card.phoneNumbersSnapshot.length > 0 && `Phone: ${card.phoneNumbersSnapshot.join(", ")}`,
    ].filter(Boolean).join("\n");
    return { card, content };
  });
  await getDb().insert(searchDocuments).values(indexedCards.map(({ card, content }) => ({ id: `event:${participant.eventId}:${card.id}`, workspaceId: participant.submittingWorkspaceId, eventId: participant.eventId, entityType: "event_card", entityId: card.id, chunkType: "consent_snapshot", content, contentHash: createHash("sha256").update(content).digest("hex"), modelVersion: "event-snapshot-v1" })));
  if (searchConfigured) {
    const results = await Promise.allSettled(indexedCards.map(({ card, content }) => indexEventSearchDocument({ workspaceId: participant.submittingWorkspaceId, eventId: participant.eventId, entityId: card.id, content })));
    results.filter((result) => result.status === "rejected").forEach((result) => console.error("Unable to embed an event search document.", result.reason));
  }
}

export async function listWorkspaceEventParticipations(workspaceSlug: string) {
  const context = await requireWorkspacePermission(workspaceSlug, "events:read");
  const clauses = [eq(eventParticipants.submittingWorkspaceId, context.workspaceId)];
  if (!roleHasPermission(context.role, "events:submit:any")) clauses.push(eq(eventParticipants.submittedByUserId, context.userId));
  const rows = await getDb().select({ participant: eventParticipants, event: events }).from(eventParticipants).innerJoin(events, eq(events.id, eventParticipants.eventId)).where(and(...clauses)).orderBy(desc(eventParticipants.updatedAt));
  if (!rows.length) return [];
  const cards = await getDb().select().from(eventParticipantCards).where(inArray(eventParticipantCards.eventParticipantId, rows.map((row) => row.participant.id))).orderBy(asc(eventParticipantCards.sortOrder));
  return rows.map((row) => ({ ...row, cards: cards.filter((card) => card.eventParticipantId === row.participant.id) }));
}

export async function updateParticipantSharing(workspaceSlug: string, participantId: string, visibility: EventCardVisibility) {
  const { context, participant, event } = await requireParticipantContributor(workspaceSlug, participantId);
  if (["withdrawn", "rejected", "hidden"].includes(participant.status)) throw new Error("This submission can no longer be updated.");
  const now = new Date();
  await getDb().update(eventParticipantCards).set({ visibilityConfig: visibility, snapshotVersion: sql`${eventParticipantCards.snapshotVersion} + 1`, consentedAt: now, updatedAt: now }).where(and(eq(eventParticipantCards.eventParticipantId, participant.id), eq(eventParticipantCards.sourceWorkspaceId, context.workspaceId), isNull(eventParticipantCards.revokedAt)));
  const [updated] = await getDb().update(eventParticipants).set({ status: participant.status === "changes_requested" ? "pending_review" : participant.status, consentedAt: now, consentedByUserId: context.userId, updatedAt: now }).where(eq(eventParticipants.id, participant.id)).returning();
  const cards = await getDb().select().from(eventParticipantCards).where(eq(eventParticipantCards.eventParticipantId, participant.id));
  await refreshParticipantSearchIndex(updated, cards, updated.status === "published");
  await getDb().insert(auditEvents).values({ id: createId(), workspaceId: context.workspaceId, actorUserId: context.userId, action: "event.participant_sharing_updated", entityType: "event_participant", entityId: participant.id, after: { visibility, snapshotVersions: cards.map((card) => card.snapshotVersion) } });
  await getDb().insert(userNotifications).values({ id: createId(), userId: event.createdByUserId, workspaceId: event.ownerWorkspaceId, kind: "event_submission_updated", title: "Event sharing choices updated", body: `${participant.displayNameSnapshot} updated the fields shared with ${event.title}.`, targetUrl: `/events/${event.slug}`, entityType: "event_participant", entityId: participant.id });
  return updated;
}

export async function withdrawEventParticipant(workspaceSlug: string, participantId: string) {
  const { context, participant, event } = await requireParticipantContributor(workspaceSlug, participantId);
  if (participant.status === "withdrawn") return participant;
  const now = new Date();
  const cards = await getDb().select().from(eventParticipantCards).where(eq(eventParticipantCards.eventParticipantId, participant.id));
  const [updated] = await getDb().update(eventParticipants).set({ status: "withdrawn", withdrawnAt: now, publishedAt: null, updatedAt: now }).where(eq(eventParticipants.id, participant.id)).returning();
  await getDb().update(eventParticipantCards).set({ status: "withdrawn", revokedAt: now, publishedAt: null, updatedAt: now }).where(eq(eventParticipantCards.eventParticipantId, participant.id));
  await refreshParticipantSearchIndex(updated, cards, false);
  await getDb().insert(auditEvents).values({ id: createId(), workspaceId: context.workspaceId, actorUserId: context.userId, action: "event.participant_withdrawn", entityType: "event_participant", entityId: participant.id, before: { status: participant.status }, after: { status: "withdrawn" } });
  await getDb().insert(userNotifications).values({ id: createId(), userId: event.createdByUserId, workspaceId: event.ownerWorkspaceId, kind: "event_submission_withdrawn", title: "Event cards withdrawn", body: `${participant.displayNameSnapshot} withdrew shared cards from ${event.title}.`, targetUrl: `/events`, entityType: "event_participant", entityId: participant.id });
  return updated;
}

export async function listEventParticipants(workspaceSlug: string, eventId: string) {
  await requireEventManager(workspaceSlug, eventId);
  return getDb().select().from(eventParticipants).where(eq(eventParticipants.eventId, eventId)).orderBy(desc(eventParticipants.createdAt));
}

export async function moderateEventParticipant(workspaceSlug: string, eventId: string, participantId: string, decision: "approved" | "changes_requested" | "rejected" | "hidden", reviewNotes: string) {
  const context = await requireEventManager(workspaceSlug, eventId);
  const published = decision === "approved";
  const participantStatus = published ? "published" : decision;
  const now = new Date();
  const [participant] = await getDb().update(eventParticipants).set({ status: participantStatus, reviewNotes, reviewedAt: now, reviewedByUserId: context.userId, publishedAt: published ? now : null, updatedAt: now }).where(and(eq(eventParticipants.id, participantId), eq(eventParticipants.eventId, eventId))).returning();
  if (!participant) throw new Error("Participant not found.");
  await getDb().update(eventParticipantCards).set({ status: participantStatus, publishedAt: published ? now : null, updatedAt: now }).where(and(eq(eventParticipantCards.eventId, eventId), eq(eventParticipantCards.eventParticipantId, participantId)));
  const cards = await getDb().select().from(eventParticipantCards).where(and(eq(eventParticipantCards.eventId, eventId), eq(eventParticipantCards.eventParticipantId, participantId)));
  if (cards.length) {
    const cardIds = cards.map((card) => card.id);
    await getDb().delete(searchDocuments).where(and(eq(searchDocuments.eventId, eventId), eq(searchDocuments.entityType, "event_card"), inArray(searchDocuments.entityId, cardIds)));
    const searchConfigured = Boolean(process.env.VOYAGE_API_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
    if (!published) {
      if (searchConfigured) await removeEventSearchDocuments(eventId, cardIds).catch((error) => console.error("Unable to remove event search documents.", error));
    } else {
      const indexedCards = cards.map((card) => {
        const visibility = card.visibilityConfig ?? {};
        const content = [
          `Company: ${card.companyNameSnapshot}`,
          `Contact: ${card.displayNameSnapshot}`,
          card.jobTitleSnapshot && `Job title: ${card.jobTitleSnapshot}`,
          `Event role: ${participant.participantType}`,
          participant.categorySnapshot && `Category: ${participant.categorySnapshot}`,
          participant.industrySnapshot && `Industry: ${participant.industrySnapshot}`,
          visibility.location && card.locationSnapshot && `Location: ${card.locationSnapshot}`,
          visibility.website && card.websiteSnapshot && `Website: ${card.websiteSnapshot}`,
          visibility.productsServices && card.productsServicesSnapshot.length > 0 && `Products and services: ${card.productsServicesSnapshot.join(", ")}`,
          visibility.email && card.emailAddressesSnapshot.length > 0 && `Email: ${card.emailAddressesSnapshot.join(", ")}`,
          visibility.phone && card.phoneNumbersSnapshot.length > 0 && `Phone: ${card.phoneNumbersSnapshot.join(", ")}`,
        ].filter(Boolean).join("\n");
        return { card, content };
      });
      await getDb().insert(searchDocuments).values(indexedCards.map(({ card, content }) => ({ id: `event:${eventId}:${card.id}`, workspaceId: participant.submittingWorkspaceId, eventId, entityType: "event_card", entityId: card.id, chunkType: "consent_snapshot", content, contentHash: createHash("sha256").update(content).digest("hex"), modelVersion: "event-snapshot-v1" })));
      if (searchConfigured) {
        const results = await Promise.allSettled(indexedCards.map(({ card, content }) => indexEventSearchDocument({ workspaceId: participant.submittingWorkspaceId, eventId, entityId: card.id, content })));
        results.filter((result) => result.status === "rejected").forEach((result) => console.error("Unable to embed an event search document.", result.reason));
      }
    }
  }
  await getDb().insert(userNotifications).values({ id: createId(), userId: participant.submittedByUserId, workspaceId: participant.submittingWorkspaceId, kind: `event_submission_${decision}`, title: published ? "Event submission approved" : "Event submission updated", body: reviewNotes || (published ? "Your cards are now visible in the event directory." : `The organizer marked your submission as ${decision.replaceAll("_", " ")}.`), targetUrl: `/events`, entityType: "event_participant", entityId: participant.id });
  return participant;
}

export async function updateParticipantAttendance(workspaceSlug: string, eventId: string, participantId: string, status: "registered" | "checked_in" | "organizer_confirmed" | "no_show") {
  await requireEventManager(workspaceSlug, eventId);
  const [participant] = await getDb().update(eventParticipants).set({ attendanceStatus: status, updatedAt: new Date() }).where(and(eq(eventParticipants.id, participantId), eq(eventParticipants.eventId, eventId))).returning();
  if (!participant) throw new Error("Participant not found.");
  return participant;
}

export async function recordEventActivity(eventId: string, eventType: string, metadata: Record<string, unknown> = {}) {
  if (!hasDatabase()) return;
  await getDb().insert(eventActivityEvents).values({ id: createId(), eventId, eventType, metadata });
}

export async function saveEventContact(workspaceSlug: string, eventId: string, participantCardId: string) {
  const context = await requireWorkspacePermission(workspaceSlug, "directory:write:own");
  const [card] = await getDb().select({ card: eventParticipantCards, participant: eventParticipants }).from(eventParticipantCards).innerJoin(eventParticipants, eq(eventParticipants.id, eventParticipantCards.eventParticipantId)).where(and(eq(eventParticipantCards.id, participantCardId), eq(eventParticipantCards.eventId, eventId), eq(eventParticipantCards.status, "published"), eq(eventParticipants.status, "published"))).limit(1);
  if (!card) throw new Error("Published event contact not found.");
  const [created] = await getDb().insert(savedEventContacts).values({ id: createId(), viewerWorkspaceId: context.workspaceId, savedByUserId: context.userId, eventId, eventParticipantCardId: participantCardId, sourceSnapshotVersion: card.card.snapshotVersion }).onConflictDoNothing().returning();
  const saved = created ?? (await getDb().select().from(savedEventContacts).where(and(eq(savedEventContacts.viewerWorkspaceId, context.workspaceId), eq(savedEventContacts.eventParticipantCardId, participantCardId))).limit(1))[0];
  if (created) await recordEventActivity(eventId, "contact_save", { participantCardId });
  return { saved, alreadySaved: !created };
}

export async function listEventActivity(workspaceSlug: string, eventId: string, from = new Date(Date.now() - 30 * 86400000), to = new Date()) {
  await requireEventManager(workspaceSlug, eventId);
  return getDb().select().from(eventActivityEvents).where(and(eq(eventActivityEvents.eventId, eventId), gte(eventActivityEvents.occurredAt, from), lte(eventActivityEvents.occurredAt, to))).orderBy(desc(eventActivityEvents.occurredAt));
}

export async function getPublicEventCardPreview(slug: string, participantCardId: string) {
  if (!hasDatabase()) return null;
  const event = await getPublicEvent(slug);
  if (!event || !event.allowPublicCardPreviews || !(await canViewEventDirectory(slug))) return null;
  const [row] = await getDb().select({ card: eventParticipantCards }).from(eventParticipantCards).innerJoin(eventParticipants, eq(eventParticipants.id, eventParticipantCards.eventParticipantId)).where(and(eq(eventParticipantCards.eventId, event.id), eq(eventParticipantCards.id, participantCardId), eq(eventParticipantCards.status, "published"), eq(eventParticipants.status, "published"), isNull(eventParticipantCards.revokedAt))).limit(1);
  if (!row || !row.card.visibilityConfig?.originalCardPreview || !row.card.sourceBusinessCardId) return null;
  const [image] = await getDb().select().from(businessCardImages).where(and(eq(businessCardImages.businessCardId, row.card.sourceBusinessCardId), eq(businessCardImages.workspaceId, row.card.sourceWorkspaceId), eq(businessCardImages.validationStatus, "valid"))).orderBy(asc(businessCardImages.sortOrder)).limit(1);
  return image?.sanitizedBlobKey ? { blobKey: image.sanitizedBlobKey, mimeType: image.mimeType, filename: image.originalFilename, byteSize: image.byteSize } : null;
}
