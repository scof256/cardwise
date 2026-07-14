# Cardwise Networking Events and Attendee Directory Plan

## 1. Product objective

Add a networking-events marketplace to Cardwise where:

- Event organizers create and manage upcoming, live, and completed events.
- Companies receive an invitation link and choose which verified business cards or digital profiles they want to attach to the event.
- Individuals can attach their own card or digital profile when the event permits individual participation.
- Event visitors can open an event, search the companies and people who participated, view the cards those participants intentionally shared, and save useful contacts to their own Cardwise workspace.
- Completed events remain useful as searchable, permission-aware directories of the people and companies that were actually approved or checked in.
- Event organizers can pay Cardwise to promote an event on the application homepage and public events directory.
- Superadmins moderate public events, promotions, disputes, and refunds.

This feature must extend the existing multi-tenant Company, Contact, BusinessCard, DigitalProfile, Clerk workspace, Supabase Postgres, hybrid-search, OpenUI, and Stripe foundations. It must not create a separate event-only contact system.

## 2. Product principles

1. **Link canonical records; publish safe snapshots.** A participating company selects an existing card or profile. Cardwise maintains the canonical relationship, but the public event directory reads an event-specific snapshot containing only the fields the participant consented to share.
2. **Do not give organizers access to another workspace.** Organizers may approve, reject, order, or hide a submitted event profile, but they cannot open the source company's private Cardwise directory.
3. **Participation is not attendance.** A submitted card means “participating” or “registered.” Only check-in or organizer confirmation allows the UI to say “attended.”
4. **Original card images remain private by default.** A participant must explicitly enable an event-safe card preview. Cardwise should publish a sanitized event preview, not expose the private storage key.
5. **Promotion and event truth are separate.** Payment can improve event placement, but it cannot automatically approve misleading event content or change who attended.
6. **Paid placement must be labelled.** Every boosted event shows “Sponsored” or “Featured.” Organic relevance and event-directory search results must not be secretly reordered by payment.
7. **Revocation must work.** A company can withdraw its event submission or disable shared fields. Public results and search indexes must be updated promptly.
8. **Mobile-first event discovery.** A visitor should be able to scan an event QR code, search attendees, open a card, and save a contact without learning the rest of Cardwise first.

## 3. Personas and roles

### 3.1 Event organizer

- Creates the event.
- Owns the event through a Cardwise workspace.
- Configures dates, location, description, visibility, registration link, directory access, and participant rules.
- Invites companies, exhibitors, speakers, sponsors, or individual attendees.
- Reviews submissions and confirms check-ins.
- Purchases promotion.
- Views event analytics.

### 3.2 Participating company administrator

- Opens a secure invitation link.
- Selects the correct Clerk organization/workspace.
- Selects one or more existing company cards or employee digital profiles.
- Chooses which fields and images are shared.
- Submits the participation record for organizer approval.
- Can update or withdraw it later.

### 3.3 Employee or individual attendee

- Accepts an invitation intended for an individual.
- Shares their own verified card or personal digital profile.
- Cannot share another employee's card unless their workspace role grants that permission.

### 3.4 Event visitor

- Browses public events or opens an event QR/link.
- Searches by company, person, category, service, location, or job title.
- Opens OpenUI result cards and event-safe card previews.
- Saves a contact to a personal or company workspace when signed in.
- Can be asked to sign in only when the organizer made the directory attendee-only.

### 3.5 Cardwise superadmin

- Reviews public-event submissions and paid promotion requests.
- Approves, rejects, pauses, refunds, or removes event promotions.
- Handles reports and fraudulent events.
- Configures promotion packages, inventory, prices, currencies, duration, and homepage placement.
- Sees platform-level event and revenue analytics.

## 4. Information architecture and navigation

### 4.1 Workspace sidebar

Add **Events** to the main sidebar, near AI Chat and Search. It opens the workspace event area and can show a small badge for pending invitations or submissions.

Workspace event navigation:

- Event overview
- My events
- Invitations
- Participating events
- Saved event contacts
- Event analytics, permission-gated

### 4.2 Public routes

- `/events` — public event marketplace with upcoming, live, and completed tabs.
- `/events/[eventSlug]` — event landing page.
- `/events/[eventSlug]/directory` — event company and attendee directory.
- `/events/[eventSlug]/directory/[participantCardId]` — event-safe full record/card preview.
- `/events/[eventSlug]/chat` — event-scoped AI search, if enabled.
- `/join/event/[token]` — secure company/individual contribution flow.
- `/events/[eventSlug]/qr` — printable/shareable event directory QR endpoint or page.

### 4.3 Authenticated workspace routes

- `/app/[workspaceSlug]/events`
- `/app/[workspaceSlug]/events/new`
- `/app/[workspaceSlug]/events/[eventId]`
- `/app/[workspaceSlug]/events/[eventId]/edit`
- `/app/[workspaceSlug]/events/[eventId]/participants`
- `/app/[workspaceSlug]/events/[eventId]/invitations`
- `/app/[workspaceSlug]/events/[eventId]/promotion`
- `/app/[workspaceSlug]/events/[eventId]/analytics`
- `/app/[workspaceSlug]/events/invitations`

### 4.4 Superadmin routes

- `/superadmin/events`
- `/superadmin/events/[eventId]`
- `/superadmin/event-promotions`
- `/superadmin/event-promotion-packages`
- `/superadmin/event-reports`

## 5. Homepage section

Add a **Networking events** section to the application overview homepage after the stats/AI discovery area and before “Recently added.” It should feel like part of the existing Cardwise design.

### 5.1 Section layout

- Eyebrow: `NETWORKING EVENTS`
- Heading: `Meet the people behind the cards.`
- Supporting text: `Discover upcoming events and search the companies and contacts from events you attended.`
- Primary CTA: `Browse events`
- Secondary organizer CTA: `List your event`

### 5.2 Event cards

Show a responsive row of up to three event cards:

- Banner or organizer logo
- Event name
- Date and local timezone
- Venue/city or “Online”
- Event category
- Status badge: Upcoming, Live, Completed
- Number of published companies and people
- Short description
- `View event` button
- `Explore directory` button for live/completed events with an available directory
- Clearly labelled `Sponsored` badge when paid placement applies

### 5.3 Homepage selection rules

1. One active sponsored slot, if inventory and moderation allow it.
2. The remaining cards use organic ranking: live events first, then soonest upcoming, then recently completed events with useful directories.
3. Never show draft, rejected, cancelled, expired, or unmoderated public events.
4. Avoid showing the same event twice.
5. Provide designed empty states such as “No upcoming events yet” with a `Create the first event` CTA.

### 5.4 Existing app integration

The current overview is rendered from the large client component in `app/cardwise-app.tsx`. Do not add all event logic to that file. Build a dedicated `EventsHomeSection` component and pass server-fetched event summaries into the overview. Longer term, move workspace navigation to route-based pages so event pages can be Server Components with small interactive client islands.

## 6. Event lifecycle

Keep event lifecycle, moderation lifecycle, and promotion lifecycle separate.

### 6.1 Event status

- `draft`
- `scheduled`
- `live`
- `completed`
- `cancelled`
- `archived`

Suggested transitions:

- Draft → Scheduled after required fields and moderation are approved.
- Scheduled → Live automatically at `starts_at`, or manually by an organizer.
- Live → Completed automatically after `ends_at`, or manually.
- Draft/Scheduled/Live → Cancelled with a required reason.
- Completed/Cancelled → Archived after the retention period.

Use a scheduled job to reconcile status based on dates. Do not depend only on a visitor loading the page.

### 6.2 Moderation status

- `not_submitted`
- `pending`
- `approved`
- `changes_requested`
- `rejected`
- `suspended`

Only approved events can enter the public marketplace. Private organization events may use a lighter review policy, controlled by platform settings.

### 6.3 Promotion status

- `not_requested`
- `pending_payment`
- `paid_pending_review`
- `scheduled`
- `active`
- `ended`
- `cancelled`
- `refunded`

## 7. Participation and invitation workflow

### 7.1 Organizer creates an event

1. Organizer selects `Create event`.
2. App verifies `events:create` in the current workspace.
3. Organizer enters event details, event contact, directory rules, participant types, and visibility.
4. Event saves as draft.
5. Organizer previews the public landing page.
6. Organizer submits the event for moderation when public discovery is requested.

### 7.2 Organizer invites a company

1. Organizer chooses `Invite companies`.
2. They can create a generic invite, email-specific invite, domain-restricted invite, or direct workspace invite.
3. Server creates a random token and stores only its hash.
4. Link can expire, have a maximum number of uses, and be revoked.
5. Organizer copies the link, downloads its QR code, or sends it by email in a later email phase.

### 7.3 Company contributes cards

1. Recipient opens `/join/event/[token]`.
2. Page shows event identity, organizer, dates, requested participant type, what will be public, and token expiry.
3. User signs in or creates a Clerk account.
4. User selects the company workspace they represent.
5. Server verifies the invite restrictions and workspace membership.
6. User searches existing verified cards, contacts, and digital profiles.
7. User selects the company plus one or more people/cards.
8. User chooses shared fields per card: name, title, phone, email, website, services, social links, location, and event-safe card image.
9. User sees an exact public preview and accepts a consent statement.
10. Submission enters `pending_review` unless the organizer enabled trusted auto-approval for that invited workspace.
11. Organizer receives a notification.

If no suitable record exists, offer `Upload a new card`, complete the existing vision/review workflow, then return to the event submission without losing progress.

### 7.4 Organizer reviews participants

- Approve, reject, request changes, or hide a participant.
- Assign badges such as Exhibitor, Speaker, Sponsor, Organizer, Attendee.
- Reorder featured exhibitors without changing attendee search relevance.
- Mark a participant as checked in via search, QR, or attendee list.
- Bulk approve trusted submissions.
- Export a permission-aware CSV that excludes fields participants did not share.

### 7.5 Visitor uses the directory

1. Visitor opens the event page or scans the event QR.
2. Visitor selects `Explore companies and people`.
3. Directory shows only approved, published, non-withdrawn participant snapshots.
4. Visitor searches or filters.
5. Results render as OpenUI company/contact cards.
6. Visitor opens the event-safe card image or full shared profile.
7. Signed-in visitor can save the contact to a chosen workspace with source attribution to the event.

### 7.6 Completed events

- Preserve the event landing page and directory according to retention settings.
- Show `Attended` only for checked-in or organizer-confirmed records.
- Keep `Participated` for approved records without check-in evidence.
- Continue supporting search and AI chat while the directory is published.
- Let participants withdraw or reduce shared fields after the event.

## 8. Data model

Add the following Drizzle schema definitions and Supabase migration. Use text/CUID identifiers to match the existing schema. All timestamps use timezone-aware columns.

### 8.1 Enums

- `event_status`: draft, scheduled, live, completed, cancelled, archived
- `event_moderation_status`: not_submitted, pending, approved, changes_requested, rejected, suspended
- `event_visibility`: public, unlisted, workspace_only, invite_only
- `event_directory_access`: public, signed_in, approved_participants, disabled
- `event_participant_type`: organizer, sponsor, exhibitor, speaker, company, attendee
- `event_participant_status`: draft, pending_review, changes_requested, approved, rejected, published, withdrawn, hidden
- `attendance_status`: unknown, registered, checked_in, organizer_confirmed, no_show
- `event_invitation_status`: active, exhausted, expired, revoked
- `event_promotion_status`: pending_payment, paid_pending_review, scheduled, active, ended, cancelled, refunded

### 8.2 `events`

Fields:

- `id`
- `owner_workspace_id` → workspaces
- `created_by_user_id` → users
- `slug`, globally unique
- `title`
- `summary`
- `description`
- `event_type`
- `category`
- `starts_at`, `ends_at`, `timezone`
- `venue_name`
- `address_line_1`, `address_line_2`, `city`, `region`, `country`
- `is_virtual`, `virtual_join_url` (never expose unless access permits)
- `website_url`, `registration_url`
- `contact_name`, `contact_email` (private management fields)
- `banner_blob_key`, `logo_blob_key`
- `visibility`
- `directory_access`
- `allow_company_submissions`
- `allow_individual_submissions`
- `allow_public_card_previews`
- `chat_enabled`
- `status`
- `moderation_status`
- `moderation_notes`
- `published_at`, `completed_at`, `cancelled_at`
- `settings` JSONB for non-security display preferences
- standard timestamps

Indexes and constraints:

- Unique normalized slug.
- `owner_workspace_id, status, starts_at`.
- `moderation_status, status, starts_at` for marketplace queries.
- `city, starts_at` and `category, starts_at` for filters.
- Check `ends_at > starts_at`.
- Check virtual events have an appropriate URL before publication.

### 8.3 `event_collaborators`

Supports co-hosts without making them members of the organizer's workspace.

- `id`, `event_id`, `workspace_id`, `user_id`
- `role`: manager, moderator, check_in_staff, analyst
- `invited_by_user_id`, `status`, timestamps
- Unique event/user pair

### 8.4 `event_invitations`

- `id`, `event_id`
- `token_hash`, unique; never store raw token
- `invitation_type`: company, individual, speaker, sponsor, exhibitor
- Optional `invited_email`, `allowed_email_domain`, `invited_workspace_id`
- `max_uses`, `use_count`
- `expires_at`, `status`
- `created_by_user_id`, timestamps

Add an index on `event_id, status, expires_at`.

### 8.5 `event_invitation_uses`

- `id`, `invitation_id`, `event_id`
- `user_id`, `workspace_id`
- `participant_id`
- `used_at`
- Hashed IP/user-agent metadata for fraud analysis, not raw values

### 8.6 `event_participants`

This is the company/individual participation envelope.

- `id`, `event_id`
- `submitting_workspace_id`
- `submitted_by_user_id`
- `participant_type`
- Optional `source_company_id`
- `display_name_snapshot`
- `logo_blob_key_snapshot`
- `summary_snapshot`
- `category_snapshot`, `industry_snapshot`, `services_snapshot`
- `website_snapshot`, `location_snapshot`
- `status`, `attendance_status`
- `consent_version`, `consented_at`, `consented_by_user_id`
- `reviewed_by_user_id`, `reviewed_at`, `review_notes`
- `published_at`, `withdrawn_at`
- timestamps

Constraints:

- Unique active participation per event/source company where a source company exists.
- Every source identifier must belong to `submitting_workspace_id` when the submission is created.
- Organizer reads the snapshot, not the private source record.

### 8.7 `event_participant_cards`

Allows one company to share several employee cards.

- `id`, `event_id`, `event_participant_id`
- `source_workspace_id`
- Optional `source_business_card_id`, `source_contact_id`, `source_digital_profile_id`
- `display_name_snapshot`, `job_title_snapshot`, `company_name_snapshot`
- `phone_numbers_snapshot`, `email_addresses_snapshot`, `social_media_snapshot` JSONB
- `website_snapshot`, `location_snapshot`
- `products_services_snapshot`, `other_information_snapshot` JSONB
- `visibility_config` JSONB validated with a strict Zod schema
- `event_card_preview_blob_key` for a sanitized consented preview
- `snapshot_version`
- `status`, `sort_order`
- `consented_at`, `revoked_at`, `published_at`
- timestamps

Use `ON DELETE SET NULL` for optional canonical source references. A privacy deletion or revoked consent must trigger removal of the public snapshot and event preview, not leave it permanently available.

### 8.8 `event_access_grants`

For signed-in or approved-participant directories:

- `id`, `event_id`, `user_id`
- Optional `participant_id`
- `grant_type`: organizer, participant, attendee, visitor_pass
- `expires_at`, `revoked_at`, timestamps
- Unique active event/user grant

### 8.9 `saved_event_contacts`

- `id`
- `viewer_workspace_id`, `saved_by_user_id`
- `event_id`, `event_participant_card_id`
- Optional newly created local `directory_company_id`, `contact_id`
- `source_snapshot_version`
- timestamps

Saving should create a local relationship/reference with event attribution. It must not silently grant future access to private updates from the source company.

### 8.10 Promotion tables

`event_promotion_packages`:

- `id`, `key`, `name`, `description`
- `placement`: events_index, homepage, category, city, spotlight
- `duration_days`
- `price_cents`, `currency`
- `inventory_limit`
- `rules` JSONB
- `active`, timestamps

`event_promotion_orders`:

- `id`, `event_id`, `purchaser_workspace_id`, `package_id`
- `stripe_checkout_session_id`, unique
- Optional `stripe_payment_intent_id`
- `amount_cents`, `currency`
- `status`
- `requested_start_at`, `scheduled_start_at`, `scheduled_end_at`
- `reviewed_by_user_id`, `reviewed_at`, `rejection_reason`
- `refunded_at`, timestamps

### 8.11 Analytics tables

`event_activity_events` for limited raw events:

- event_view, directory_view, search, participant_open, card_preview_open, contact_save, QR_scan, registration_click
- Event, participant, promotion, hashed session, referrer domain, timestamp
- Do not store search text indefinitely if it may contain personal data; redact or aggregate it.

`event_metrics_daily` for organizer-facing aggregates:

- `event_id`, date, metric, dimension, quantity
- Primary key across event/date/metric/dimension

## 9. Permissions and tenant isolation

Add permissions to `lib/auth/permissions.ts`:

- `events:read`
- `events:create`
- `events:manage:any`
- `events:manage:own`
- `events:participants:manage`
- `events:submit:any`
- `events:submit:own`
- `events:analytics:any`
- `events:analytics:own`
- `events:promotion:purchase`

Suggested workspace mapping:

- Owner: all event permissions.
- Admin: all except promotion purchase if billing is intentionally owner-only.
- Sales manager: read, create, manage own, participant management, submit any, analytics own.
- Sales rep: read, submit own, manage own events they created if desired.
- Employee: read and submit own.
- Viewer: read workspace-visible events.
- Billing admin: read and promotion purchase, but not edit event content.

Add platform permissions:

- `events:moderate`
- `events:suspend`
- `event_promotions:manage`
- `event_promotions:refund`
- `event_reports:read`

Every server mutation must call `requireWorkspacePermission`. Every query must include the relevant workspace predicate. Because event submissions cross workspace boundaries, add explicit helpers such as:

- `requireEventOrganizer(eventId, context)`
- `requireParticipantWorkspace(participantId, context)`
- `requireEventAccess(eventId, actorOrToken)`
- `assertEventSourceBelongsToWorkspace(sourceIds, workspaceId)`

Do not weaken the existing `assertSameWorkspace` helper to permit arbitrary cross-workspace reads.

## 10. Supabase and data security

1. Keep event write tables server-only through Drizzle repositories and Next.js Server Actions/Route Handlers.
2. Enable RLS on all new tables in an exposed schema. If the current app does not send a Clerk-compatible JWT to the Supabase Data API, do not invent permissive `authenticated` policies. Revoke direct Data API access and serve public event data through audited Next.js endpoints.
3. Never expose the service-role key or database credentials to the browser.
4. Public endpoints select only event snapshot fields. They must never join and return the source workspace's private card/contact tables.
5. Store invitation tokens as hashes. Compare hashes server-side and use constant-time comparison where practical.
6. Rate-limit event views, token validation, invitation use, public search, AI chat, and QR endpoints.
7. Use signed/private storage access for original images. Copy or generate an event-safe preview only after explicit consent.
8. Verify event ownership again inside every Server Action/Route Handler; Clerk proxy protection alone is not authorization.
9. Write audit events for event creation, publication, participant approval, attendance confirmation, consent change, withdrawal, promotion activation, and refund.
10. Add indexes on every workspace/event/source column used by authorization policies or tenant filters.

Supabase reference: [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## 11. API and server-action contracts

Use Server Actions for authenticated forms and Route Handlers for public/token endpoints, large uploads, QR generation, search streaming, and webhooks.

Suggested endpoints:

- `POST /api/events` — create draft event.
- `PATCH /api/events/[eventId]` — update event with optimistic version check.
- `POST /api/events/[eventId]/submit-moderation`
- `POST /api/events/[eventId]/invitations`
- `POST /api/events/[eventId]/invitations/[invitationId]/revoke`
- `GET /api/event-invitations/[token]` — safe invitation preview.
- `POST /api/event-invitations/[token]/submit`
- `PATCH /api/events/[eventId]/participants/[participantId]`
- `POST /api/events/[eventId]/participants/[participantId]/approve`
- `POST /api/events/[eventId]/participants/[participantId]/check-in`
- `POST /api/events/[eventId]/participants/[participantId]/withdraw`
- `GET /api/events/[eventSlug]/directory`
- `POST /api/events/[eventSlug]/search`
- `POST /api/events/[eventSlug]/chat`
- `POST /api/events/[eventId]/save-contact`
- `POST /api/billing/events/checkout`
- Extend `/api/webhooks/stripe` for promotion order fulfillment and refunds.

Every input uses Zod with length limits, URL validation, enum validation, date ordering, and stripped unknown fields. Mutations return structured errors suitable for inline form feedback.

## 12. Search, semantic retrieval, and AI chat

### 12.1 Keyword and semantic search

Extend `search_documents` with nullable `event_id`, or create a dedicated `event_search_documents` table if the existing hybrid RPC is too company-specific. Index published event participant snapshots, not private canonical records.

Each event card document should include only consented fields:

- Company and contact display name
- Job title
- Category and industry
- Shared location
- Products/services
- Tagline and description
- Shared social handles and other approved information
- Event role/badge

Update the hybrid search function to require an `event_id` for event directory searches. It must never retrieve documents from another event merely because the semantic score is high.

### 12.2 Event-scoped AI chat

Use the existing chat thread scope JSON:

```json
{
  "type": "event",
  "eventId": "event_id",
  "eventSlug": "event_slug"
}
```

Example questions:

- “Which companies at this event provide logistics services?”
- “Show medical equipment suppliers who attended.”
- “Who from construction companies checked in?”
- “Find exhibitors located in Kampala.”
- “Show the original event-safe card for this person.”

The retrieval pipeline must filter by event, publication status, consent status, and directory access before embedding/reranking. Results return OpenUI cards with event badges and a link to the event-safe card preview.

## 13. OpenUI event components

Add structured OpenUI component types:

- `event-result-card`
- `event-participant-company-card`
- `event-contact-card`
- `event-directory-summary`

`event-result-card` fields:

- Event name, image, status, date, venue/location
- Organizer
- Category
- Published company/person counts
- Sponsored/featured disclosure
- `View event` and `Explore directory` actions

Participant cards reuse the existing company/contact visual language, adding:

- Event role badge
- Attendance badge only when verified
- `View shared card`
- `Save contact`
- `View company at event`

## 14. Paid event promotion

### 14.1 Recommended MVP business model

Allow organizers to create and privately manage events without paying. Charge for public marketing placement. This reduces adoption friction while preserving a clear revenue product.

Configurable packages:

- **Standard listing** — public events directory placement.
- **Featured event** — boosted events directory placement for a fixed period.
- **Homepage feature** — one of the homepage event cards for a fixed inventory window.
- **Category/city spotlight** — sponsored placement in a relevant filter page.
- **Post-event directory extension** — optional longer public archive/analytics period.

Do not hard-code prices in components. Superadmin-configured packages are the source of truth. Support currency as package data so deployment can use the currencies supported by the connected Stripe account.

### 14.2 Purchase workflow

1. Organizer chooses a package and requested date range.
2. Server verifies event ownership, event eligibility, package activity, inventory, amount, and currency.
3. Server creates an `event_promotion_order` in `pending_payment`.
4. Server creates a one-time Stripe Checkout Session with `eventId`, `promotionOrderId`, `workspaceId`, and `packageKey` in metadata.
5. Stripe-hosted Checkout handles payment.
6. The success page shows “Payment received; promotion is being confirmed,” not “Promotion active.”
7. Only a verified, idempotent Stripe webhook changes the order to paid.
8. Superadmin moderation schedules or activates the promotion.
9. Refund/cancellation webhooks end placement and update the order.

Use the existing lazy `getStripe()` client and idempotent billing event storage. Extend the webhook without trusting redirect query parameters. Stripe requires raw-body signature verification for webhooks.

Stripe references: [Checkout](https://docs.stripe.com/payments/checkout) and [Webhooks](https://docs.stripe.com/webhooks).

### 14.3 Inventory and fairness

- Homepage slots have explicit start/end times and inventory limits.
- Prevent overlapping purchases beyond configured inventory.
- Paid events still require moderation.
- Sponsored cards are labelled.
- Within an event directory, participant search remains based on relevance and filters, not organizer payment.
- Define refund rules for rejected, cancelled, rescheduled, and platform-suspended events.

## 15. Notifications

Replace the current static notification examples incrementally with database-backed event notifications:

- Event invitation received
- Participant submission received
- Submission approved/rejected/changes requested
- Event starts soon
- Event cancelled/rescheduled
- Directory published
- Promotion payment succeeded/failed/refunded
- Promotion approved and scheduled
- Participant withdrew a card

Notifications should appear in the existing scrollable sidebar notification tray. Store read state per user. Email notifications can be a later phase.

## 16. Organizer analytics

Organizer dashboard metrics:

- Event page views
- Directory views
- QR scans
- Searches
- Unique participant opens
- Event-safe card preview opens
- Contacts saved
- Registration-link clicks
- Published companies, people, checked-in attendees
- Search terms/topics in privacy-safe aggregates
- Promotion impressions, clicks, and conversion rate

Superadmin metrics:

- Events created/published/completed
- Organizer activation rate
- Participant submission rate
- Promotion revenue, refunds, and package utilization
- Homepage inventory utilization
- Reports and moderation turnaround

## 17. Component and file plan

Do not expand `app/cardwise-app.tsx` with the whole feature. Add focused modules:

```text
app/
  events/
    page.tsx
    [eventSlug]/page.tsx
    [eventSlug]/directory/page.tsx
    [eventSlug]/directory/[participantCardId]/page.tsx
    [eventSlug]/chat/page.tsx
  join/event/[token]/page.tsx
  app/[workspaceSlug]/events/
    page.tsx
    new/page.tsx
    [eventId]/page.tsx
    [eventId]/edit/page.tsx
    [eventId]/participants/page.tsx
    [eventId]/invitations/page.tsx
    [eventId]/promotion/page.tsx
    [eventId]/analytics/page.tsx
  api/events/...
  api/billing/events/checkout/route.ts
components/events/
  events-home-section.tsx
  event-card.tsx
  event-form.tsx
  event-directory.tsx
  participant-card-picker.tsx
  participant-consent-preview.tsx
  invitation-manager.tsx
  event-analytics.tsx
lib/
  repositories/events.ts
  repositories/event-participants.ts
  auth/event-access.ts
  validation/events.ts
  search/event-hybrid-search.ts
  billing/event-promotions.ts
db/schema/index.ts
supabase/migrations/<generated>_networking_events.sql
```

Default to Server Components for event pages and data loading. Use client components only for search inputs, filters, card selection, consent controls, carousels, and optimistic moderation actions.

## 18. Implementation phases

### Phase 0 — Confirm product rules

- Decide public vs invite-only defaults.
- Decide whether event creation is free and promotion is paid; recommended: yes.
- Define participant types and who can claim attendance.
- Define default post-event retention.
- Approve consent language and refund policy.
- Decide initial promotion packages, inventory, and currency.

Exit criteria: written decisions exist and no schema field depends on an unanswered product choice.

### Phase 1 — Schema, permissions, and repositories

- Create the migration with `supabase migration new networking_events`; do not invent a migration timestamp.
- Add enums/tables/indexes/constraints.
- Mirror the schema in Drizzle.
- Add workspace permissions and platform permissions.
- Implement tenant-safe event and participant repositories.
- Add audit events.
- Enable RLS/revoke direct API access as appropriate.
- Run database/security advisors and migration verification.

Exit criteria: repository tests prove organizer and participant workspaces cannot read each other's canonical directories.

### Phase 2 — Organizer event MVP

- Workspace Events navigation.
- Event list with Upcoming, Live, Completed, Draft tabs.
- Create/edit/preview flows.
- Event management dashboard.
- Moderation submission.
- Designed loading, empty, error, and permission-denied states.

Exit criteria: an authorized organizer can create a draft, submit it, and publish after approval.

### Phase 3 — Invitations and card contribution

- Secure hashed invite tokens.
- Invitation management and QR generation.
- Join page with Clerk authentication.
- Workspace selection.
- Existing-card/profile picker.
- Upload-new-card return flow.
- Field-level consent preview.
- Organizer participant moderation.
- Withdraw/update flow.

Exit criteria: Company B can submit selected cards to an event owned by Company A without Company A reading Company B's private records.

### Phase 4 — Event landing page and directory

- Public/unlisted/invite-only event landing.
- Upcoming/live/completed presentation.
- Event directory with OpenUI cards.
- Event-safe card viewer.
- Mobile QR-to-directory flow.
- Save contact with event attribution.
- Checked-in vs participating labels.

Exit criteria: a mobile visitor can scan, search, open a shared card, and save a contact.

### Phase 5 — Homepage and discovery

- Networking Events homepage section.
- Public `/events` marketplace.
- Date, city, category, online, upcoming, live, and completed filters.
- Organic ranking.
- Sponsored disclosure UI, initially with test data only.

Exit criteria: approved upcoming and completed events appear in correct order with no private events leaked.

### Phase 6 — Paid promotion

- Promotion packages and superadmin CRUD.
- Inventory checks.
- One-time Stripe Checkout.
- Extend idempotent webhook processing.
- Promotion moderation/scheduling.
- Sponsored rendering.
- Cancellation/refund handling.

Exit criteria: a paid success redirect alone cannot activate promotion; only the signed webhook plus moderation can.

### Phase 7 — Event search and AI chat

- Event-scoped search documents.
- Event-filtered hybrid RPC.
- Reranking.
- Event chat thread scope.
- OpenUI event/contact results.
- Consent withdrawal de-indexing.

Exit criteria: every retrieved record belongs to the requested event and is currently published/consented.

### Phase 8 — Analytics, notifications, and superadmin

- Event activity ingestion and daily aggregates.
- Organizer analytics.
- Database-backed sidebar notifications.
- Superadmin events, promotions, reports, and revenue dashboards.
- Abuse reporting and suspension.

Exit criteria: event owners see only their analytics; superadmins have audited platform access.

### Phase 9 — Hardening and launch

- Accessibility audit.
- Mobile/desktop browser test matrix.
- Load tests for popular event directories.
- Rate-limit tests.
- RLS and cross-tenant security tests.
- Token expiry/revocation tests.
- Stripe webhook replay/idempotency tests.
- Image privacy and signed URL tests.
- Search isolation tests.
- Data deletion/consent withdrawal tests.
- Backup and rollback rehearsal.
- Monitoring dashboards and alerts.

## 19. Required automated tests

### Unit tests

- Event lifecycle transitions.
- Permission matrix.
- Invitation token hash/expiry/use limits.
- Visibility-config validation.
- Promotion eligibility/inventory.
- Search document creation from consented fields only.

### Repository/integration tests

- Organizer workspace can manage its event.
- Non-organizer workspace cannot edit the event.
- Participant workspace can edit only its own submission.
- Organizer sees snapshot but cannot read source private records.
- Public queries return only approved published records.
- Withdrawn/revoked records disappear from directory and search.
- Completed event distinguishes checked-in from merely registered.
- Saving an event contact creates correct local attribution.

### Payment tests

- Checkout price comes from server package data.
- Checkout metadata contains event/order/workspace identifiers.
- Invalid signature is rejected.
- Duplicate webhook does not duplicate fulfillment.
- Success redirect without webhook does not activate promotion.
- Refund/cancellation ends active placement.

### End-to-end tests

1. Organizer creates event and invitation.
2. Different company signs in and attaches two cards.
3. Organizer approves one and requests changes on one.
4. Visitor scans QR and sees only the approved card.
5. Visitor searches by service and saves contact.
6. Organizer sees analytics increment.
7. Company withdraws card and visitor can no longer retrieve it.
8. Organizer purchases promotion; signed webhook and superadmin approval activate sponsored homepage placement.

## 20. MVP boundary

Include in the first production release:

- Organizer event creation
- Upcoming/live/completed events
- Secure invitation links
- Company and individual card submission
- Consent-safe participant snapshots
- Organizer approval
- Public or invite-only event directory
- Keyword search
- Homepage event section
- One paid featured-event package
- Superadmin moderation
- Basic views/opens/saves analytics

Defer until after validated usage:

- Ticket sales or event registration processing
- Complex seating and agenda management
- Automated email campaigns
- Badge printing
- Calendar integrations
- Native mobile apps
- Dynamic ad auctions
- Sponsor lead exports beyond consented fields
- Advanced event recommendation ML

This keeps Cardwise focused on its unique advantage: turning event participation into a permission-aware, searchable directory of real business cards and contacts.

## 21. Definition of done

The feature is complete when:

- Events appear as a first-class workspace section and homepage discovery section.
- Organizers can create, publish, manage, and promote events.
- Companies can securely select and submit specific cards through an invitation link.
- Organizers cannot access contributor workspaces outside the shared snapshots.
- Visitors can browse upcoming and completed events and search approved participants.
- Results render as OpenUI cards with access to consented event-safe card previews.
- Event-scoped AI chat retrieves only published records from that event.
- Participants can update or withdraw shared information.
- Paid placement is activated only through verified Stripe events and superadmin approval.
- All cross-tenant, payment, token, privacy, mobile, and accessibility tests pass.

