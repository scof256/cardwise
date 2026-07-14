import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("event migration creates the complete consent and monetization model with RLS", async () => {
  const migration = await read("supabase/migrations/20260714005838_networking_events.sql");
  for (const table of ["events", "event_invitations", "event_participants", "event_participant_cards", "event_access_grants", "saved_event_contacts", "event_promotion_orders", "event_activity_events", "user_notifications"]) {
    assert.match(migration, new RegExp(`create table[^;]*${table}`, "i"), `${table} should be created`);
    assert.match(migration, new RegExp(`alter table (?:public\\.)?${table} enable row level security`, "i"), `${table} should have RLS enabled`);
  }
  assert.match(migration, /revoke all on public\.events[\s\S]*from anon, authenticated/i);
  assert.match(migration, /grant all on public\.events[\s\S]*to service_role/i);
});

test("event invitations store a hash and expose the raw token only once", async () => {
  const repository = await read("lib/repositories/events.ts");
  assert.match(repository, /randomBytes\(32\)\.toString\("base64url"\)/);
  assert.match(repository, /tokenHash: hashToken\(token\)/);
  assert.doesNotMatch(repository, /token:\s*text\("token"\)/);
});

test("event directory applies field visibility before returning public records", async () => {
  const repository = await read("lib/repositories/events.ts");
  assert.match(repository, /visibility\.email \? card\.emailAddressesSnapshot/);
  assert.match(repository, /visibility\.phone \? card\.phoneNumbersSnapshot/);
  assert.match(repository, /visibility\.productsServices \? card\.productsServicesSnapshot/);
  assert.match(repository, /isNull\(eventParticipantCards\.revokedAt\)/);
});

test("event promotion is paid through Stripe and still requires platform review", async () => {
  const promotion = await read("lib/events/promotions.ts");
  const webhook = await read("app/api/webhooks/stripe/route.ts");
  const moderation = await read("app/api/superadmin/event-promotions/[orderId]/moderate/route.ts");
  assert.match(promotion, /mode: "payment"/);
  assert.match(promotion, /inventoryLimit/);
  assert.match(promotion, /paid_pending_review", "scheduled", "active/);
  assert.match(webhook, /paid_pending_review/);
  assert.match(webhook, /charge\.refunded/);
  assert.match(webhook, /event_promotion_refunded/);
  assert.match(moderation, /requirePlatformStaff\("events:moderate"\)/);
  assert.match(moderation, /event-promotion-refund:/);
  assert.match(moderation, /status: refunded \? "refunded" : "cancelled"/);
});

test("event chat uses only the access-checked hybrid event directory", async () => {
  const route = await read("app/api/events/[eventSlug]/chat/route.ts");
  assert.match(route, /canViewEventDirectory\(eventSlug\)/);
  assert.match(route, /searchPublicEventDirectory\(eventSlug, query, 12\)/);
  assert.match(route, /Never invent details, infer private fields/);
  assert.match(route, /toUIMessageStreamResponse/);
});

test("homepage and application navigation expose networking events", async () => {
  const application = await read("app/cardwise-app.tsx");
  assert.match(application, /EventsHomeSection/);
  assert.match(application, /Networking events/);
  assert.match(application, /active === "events"/);
});

test("event pages share the application navigation and permanent AI entry point", async () => {
  const layout = await read("app/events/layout.tsx");
  const shell = await read("components/events/event-experience-shell.tsx");
  assert.match(layout, /EventExperienceShell/);
  assert.match(shell, /Cardwise navigation/);
  assert.match(shell, /global-ai-composer event-global-composer/);
  assert.match(shell, /Find a person, company, service, or shared card/);
  assert.match(shell, /sidebar-scrim/);
});

test("invite-only and approved-participant directories are enforced server side", async () => {
  const repository = await read("lib/repositories/events.ts");
  assert.match(repository, /event\.visibility === "invite_only"/);
  assert.match(repository, /event\.directoryAccess === "signed_in"/);
  assert.match(repository, /hasParticipantAccess\(event\.id, userId, true\)/);
  assert.match(repository, /tx\.insert\(eventAccessGrants\)/);
});

test("event retrieval uses an event-scoped hybrid RPC and excludes stale consent", async () => {
  const migration = await read("supabase/migrations/20260714005838_networking_events.sql");
  const repository = await read("lib/repositories/events.ts");
  assert.match(migration, /hybrid_search_event_cards/);
  assert.match(migration, /documents\.event_id = p_event_id/);
  assert.match(repository, /const byId = new Map\(publishedCards/);
  assert.match(repository, /consentFiltered/);
});

test("Clerk superadmin bootstrap is explicit and server-only", async () => {
  const access = await read("lib/auth/superadmin.ts");
  const example = await read(".env.example");
  assert.match(access, /SUPERADMIN_CLERK_USER_IDS/);
  assert.match(access, /isConfiguredSuperadmin/);
  assert.match(example, /SUPERADMIN_CLERK_USER_IDS=/);
  assert.doesNotMatch(access, /NEXT_PUBLIC_SUPERADMIN/);
});

test("event QR visits and consented image previews are measured separately", async () => {
  const qr = await read("app/api/events/[eventSlug]/qr/route.ts");
  const directory = await read("app/events/[eventSlug]/directory/page.tsx");
  const preview = await read("app/api/events/[eventSlug]/cards/[participantCardId]/preview/route.ts");
  assert.match(qr, /directory\?source=qr/);
  assert.match(directory, /source === "qr"/);
  assert.match(directory, /"qr_scan"/);
  assert.match(preview, /"card_preview_open"/);
});
