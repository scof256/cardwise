import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  vector,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const userStatus = pgEnum("user_status", ["active", "suspended", "deletion_pending", "deleted"]);
export const workspaceType = pgEnum("workspace_type", ["personal", "organization"]);
export const workspaceStatus = pgEnum("workspace_status", ["trial", "active", "past_due", "suspended", "deletion_pending", "deleted"]);
export const membershipStatus = pgEnum("membership_status", ["invited", "active", "suspended", "removed"]);
export const recordStatus = pgEnum("record_status", ["active", "archived", "merged"]);
export const cardStatus = pgEnum("card_status", ["uploading", "queued", "processing", "awaiting_review", "verified", "failed", "archived", "merged"]);
export const extractionStatus = pgEnum("extraction_status", ["pending", "running", "succeeded", "failed", "cancelled"]);
export const fieldDecision = pgEnum("field_decision", ["accepted", "edited", "rejected", "unresolved"]);
export const ownerType = pgEnum("method_owner_type", ["company", "contact", "digital_profile"]);
export const contactMethodKind = pgEnum("contact_method_kind", ["phone", "email", "website", "linkedin", "x", "instagram", "facebook", "whatsapp", "other"]);
export const shareStatus = pgEnum("share_status", ["active", "disabled", "expired"]);
export const generationStatus = pgEnum("generation_status", ["pending", "running", "succeeded", "failed", "cancelled"]);
export const eventStatus = pgEnum("event_status", ["draft", "scheduled", "live", "completed", "cancelled", "archived"]);
export const eventModerationStatus = pgEnum("event_moderation_status", ["not_submitted", "pending", "approved", "changes_requested", "rejected", "suspended"]);
export const eventVisibility = pgEnum("event_visibility", ["public", "unlisted", "workspace_only", "invite_only"]);
export const eventDirectoryAccess = pgEnum("event_directory_access", ["public", "signed_in", "approved_participants", "disabled"]);
export const eventParticipantType = pgEnum("event_participant_type", ["organizer", "sponsor", "exhibitor", "speaker", "company", "attendee"]);
export const eventParticipantStatus = pgEnum("event_participant_status", ["draft", "pending_review", "changes_requested", "approved", "rejected", "published", "withdrawn", "hidden"]);
export const attendanceStatus = pgEnum("attendance_status", ["unknown", "registered", "checked_in", "organizer_confirmed", "no_show"]);
export const eventInvitationStatus = pgEnum("event_invitation_status", ["active", "exhausted", "expired", "revoked"]);
export const eventPromotionStatus = pgEnum("event_promotion_status", ["pending_payment", "paid_pending_review", "scheduled", "active", "ended", "cancelled", "refunded"]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  primaryEmail: text("primary_email").notNull(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  locale: text("locale").default("en").notNull(),
  timezone: text("timezone").default("Africa/Kampala").notNull(),
  status: userStatus("status").default("active").notNull(),
  ...timestamps,
});

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  type: workspaceType("type").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  clerkOrganizationId: text("clerk_organization_id").unique(),
  ownerUserId: text("owner_user_id").references(() => users.id),
  status: workspaceStatus("status").default("trial").notNull(),
  defaultVisibility: text("default_visibility").default("private").notNull(),
  retentionDays: integer("retention_days"),
  settings: jsonb("settings").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  check("workspace_identity_check", sql`(${table.type} = 'personal' AND ${table.ownerUserId} IS NOT NULL AND ${table.clerkOrganizationId} IS NULL) OR (${table.type} = 'organization' AND ${table.clerkOrganizationId} IS NOT NULL)`),
  index("workspaces_owner_idx").on(table.ownerUserId),
]);

export const workspaceMemberships = pgTable("workspace_memberships", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clerkMembershipId: text("clerk_membership_id").unique(),
  roleKey: text("role_key").notNull(),
  department: text("department"),
  jobTitle: text("job_title"),
  managerUserId: text("manager_user_id").references(() => users.id),
  status: membershipStatus("status").default("active").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }),
  removedAt: timestamp("removed_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("workspace_memberships_workspace_user_uq").on(table.workspaceId, table.userId),
  index("workspace_memberships_workspace_status_idx").on(table.workspaceId, table.status),
]);

export const teams = pgTable("teams", {
  id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(), description: text("description"), createdByUserId: text("created_by_user_id").references(() => users.id), ...timestamps,
}, (table) => [uniqueIndex("teams_workspace_name_uq").on(table.workspaceId, table.name)]);

export const teamMembers = pgTable("team_members", {
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  teamId: text("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").default("member").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.teamId, table.userId] }), index("team_members_workspace_idx").on(table.workspaceId)]);

export const directoryCompanies = pgTable("directory_companies", {
  id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  companyName: text("company_name").notNull(), normalizedName: text("normalized_name").notNull(), logoBlobKey: text("logo_blob_key"),
  tagline: text("tagline"), description: text("description"), industry: text("industry"), category: text("category"), productsServicesSummary: text("products_services_summary"),
  otherInformation: jsonb("other_information").$type<Array<{ label: string; value: string }>>().default([]).notNull(),
  websiteUrl: text("website_url"), normalizedDomain: text("normalized_domain"), physicalAddressSummary: text("physical_address_summary"),
  status: recordStatus("status").default("active").notNull(), mergedIntoId: text("merged_into_id"), ownerUserId: text("owner_user_id").references(() => users.id),
  ownerTeamId: text("owner_team_id").references(() => teams.id), createdByUserId: text("created_by_user_id").notNull().references(() => users.id), deletedAt: timestamp("deleted_at", { withTimezone: true }), ...timestamps,
}, (table) => [index("directory_companies_workspace_name_idx").on(table.workspaceId, table.normalizedName), index("directory_companies_workspace_domain_idx").on(table.workspaceId, table.normalizedDomain), index("directory_companies_workspace_status_idx").on(table.workspaceId, table.status)]);

export const contacts = pgTable("contacts", {
  id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  directoryCompanyId: text("directory_company_id").references(() => directoryCompanies.id), fullName: text("full_name").notNull(), normalizedName: text("normalized_name").notNull(),
  jobTitle: text("job_title"), department: text("department"), notesSummary: text("notes_summary"), avatarBlobKey: text("avatar_blob_key"),
  relationshipStatus: text("relationship_status").default("new").notNull(), ownerUserId: text("owner_user_id").references(() => users.id), ownerTeamId: text("owner_team_id").references(() => teams.id),
  status: recordStatus("status").default("active").notNull(), mergedIntoId: text("merged_into_id"), createdByUserId: text("created_by_user_id").notNull().references(() => users.id), deletedAt: timestamp("deleted_at", { withTimezone: true }), ...timestamps,
}, (table) => [index("contacts_workspace_name_idx").on(table.workspaceId, table.normalizedName), index("contacts_workspace_company_idx").on(table.workspaceId, table.directoryCompanyId), index("contacts_workspace_owner_idx").on(table.workspaceId, table.ownerUserId)]);

export const contactMethods = pgTable("contact_methods", {
  id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  ownerType: ownerType("owner_type").notNull(), ownerId: text("owner_id").notNull(), kind: contactMethodKind("kind").notNull(), label: text("label"),
  displayValue: text("display_value").notNull(), normalizedValue: text("normalized_value").notNull(), isPrimary: boolean("is_primary").default(false).notNull(), isVerified: boolean("is_verified").default(false).notNull(),
  sourceType: text("source_type"), sourceId: text("source_id"), ...timestamps,
}, (table) => [index("contact_methods_workspace_value_idx").on(table.workspaceId, table.normalizedValue), index("contact_methods_workspace_owner_idx").on(table.workspaceId, table.ownerType, table.ownerId)]);

export const addresses = pgTable("addresses", {
  id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), ownerType: ownerType("owner_type").notNull(), ownerId: text("owner_id").notNull(),
  line1: text("line_1"), line2: text("line_2"), city: text("city"), region: text("region"), postalCode: text("postal_code"), country: text("country"), normalizedValue: text("normalized_value").notNull(), latitude: numeric("latitude", { precision: 10, scale: 7 }), longitude: numeric("longitude", { precision: 10, scale: 7 }), isPrimary: boolean("is_primary").default(false).notNull(), ...timestamps,
}, (table) => [index("addresses_workspace_owner_idx").on(table.workspaceId, table.ownerType, table.ownerId), index("addresses_workspace_city_idx").on(table.workspaceId, table.city)]);

export const categories = pgTable("categories", { id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), name: text("name").notNull(), normalizedName: text("normalized_name").notNull(), color: text("color"), ...timestamps }, (t) => [uniqueIndex("categories_workspace_name_uq").on(t.workspaceId, t.normalizedName)]);
export const productsServices = pgTable("products_services", { id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), companyId: text("company_id").notNull().references(() => directoryCompanies.id, { onDelete: "cascade" }), name: text("name").notNull(), normalizedName: text("normalized_name").notNull(), description: text("description"), ...timestamps }, (t) => [index("products_services_workspace_company_idx").on(t.workspaceId, t.companyId)]);
export const tags = pgTable("tags", { id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), name: text("name").notNull(), normalizedName: text("normalized_name").notNull(), ...timestamps }, (t) => [uniqueIndex("tags_workspace_name_uq").on(t.workspaceId, t.normalizedName)]);
export const taggings = pgTable("taggings", { workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }), entityType: text("entity_type").notNull(), entityId: text("entity_id").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() }, (t) => [primaryKey({ columns: [t.tagId, t.entityType, t.entityId] }), index("taggings_workspace_entity_idx").on(t.workspaceId, t.entityType, t.entityId)]);

export const businessCards = pgTable("business_cards", {
  id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), directoryCompanyId: text("directory_company_id").references(() => directoryCompanies.id), contactId: text("contact_id").references(() => contacts.id),
  collectedByUserId: text("collected_by_user_id").notNull().references(() => users.id), ownerUserId: text("owner_user_id").references(() => users.id), ownerTeamId: text("owner_team_id").references(() => teams.id),
  source: text("source").default("file_upload").notNull(), status: cardStatus("status").default("uploading").notNull(), verificationStatus: text("verification_status").default("unverified").notNull(), overallConfidence: numeric("overall_confidence", { precision: 4, scale: 3 }), currentExtractionRunId: text("current_extraction_run_id"),
  reviewDraft: jsonb("review_draft").$type<Record<string, unknown>>(),
  capturedAt: timestamp("captured_at", { withTimezone: true }), verifiedAt: timestamp("verified_at", { withTimezone: true }), ...timestamps,
}, (t) => [index("business_cards_workspace_status_idx").on(t.workspaceId, t.status), index("business_cards_workspace_collector_idx").on(t.workspaceId, t.collectedByUserId)]);

export const businessCardImages = pgTable("business_card_images", {
  id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), businessCardId: text("business_card_id").notNull().references(() => businessCards.id, { onDelete: "cascade" }), side: text("side").default("unknown").notNull(), sortOrder: integer("sort_order").notNull(),
  blobKey: text("blob_key").notNull(), sanitizedBlobKey: text("sanitized_blob_key"), originalFilename: text("original_filename").notNull(), mimeType: text("mime_type").notNull(), byteSize: integer("byte_size").notNull(), width: integer("width"), height: integer("height"), checksumSha256: text("checksum_sha256").notNull(), uploadStatus: text("upload_status").default("pending").notNull(), validationStatus: text("validation_status").default("pending").notNull(), ...timestamps,
}, (t) => [uniqueIndex("business_card_images_card_sort_uq").on(t.businessCardId, t.sortOrder), index("business_card_images_workspace_checksum_idx").on(t.workspaceId, t.checksumSha256)]);

export const extractionRuns = pgTable("extraction_runs", {
  id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), businessCardId: text("business_card_id").notNull().references(() => businessCards.id, { onDelete: "cascade" }), workflowRunId: text("workflow_run_id"), generationId: text("generation_id").notNull(), provider: text("provider").notNull(), model: text("model").notNull(), promptVersion: text("prompt_version").notNull(), schemaVersion: text("schema_version").notNull(), status: extractionStatus("status").default("pending").notNull(), rawStructuredOutput: jsonb("raw_structured_output").$type<Record<string, unknown>>(), completeUnstructuredOutput: text("complete_unstructured_output"), usage: jsonb("usage").$type<Record<string, number>>(), estimatedCostUsd: numeric("estimated_cost_usd", { precision: 12, scale: 6 }), latencyMs: integer("latency_ms"), retryCount: integer("retry_count").default(0).notNull(), errorCode: text("error_code"), errorMessage: text("error_message"), startedAt: timestamp("started_at", { withTimezone: true }), completedAt: timestamp("completed_at", { withTimezone: true }), ...timestamps,
}, (t) => [index("extraction_runs_workspace_card_idx").on(t.workspaceId, t.businessCardId), uniqueIndex("extraction_runs_generation_uq").on(t.generationId)]);

export const extractedFields = pgTable("extracted_fields", {
  id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), extractionRunId: text("extraction_run_id").notNull().references(() => extractionRuns.id, { onDelete: "cascade" }), entityType: text("entity_type").notNull(), entityTemporaryKey: text("entity_temporary_key").notNull(), fieldPath: text("field_path").notNull(), displayValue: text("display_value"), normalizedValue: text("normalized_value"), typedValue: jsonb("typed_value"), modelConfidence: numeric("model_confidence", { precision: 4, scale: 3 }), validationConfidence: numeric("validation_confidence", { precision: 4, scale: 3 }), conflictState: text("conflict_state").default("none").notNull(), userDecision: fieldDecision("user_decision").default("unresolved").notNull(), reviewedValue: jsonb("reviewed_value"), reviewedByUserId: text("reviewed_by_user_id").references(() => users.id), reviewedAt: timestamp("reviewed_at", { withTimezone: true }), ...timestamps,
}, (t) => [index("extracted_fields_workspace_run_idx").on(t.workspaceId, t.extractionRunId), index("extracted_fields_workspace_review_idx").on(t.workspaceId, t.userDecision)]);

export const fieldEvidence = pgTable("field_evidence", { id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), extractedFieldId: text("extracted_field_id").notNull().references(() => extractedFields.id, { onDelete: "cascade" }), imageId: text("image_id").notNull().references(() => businessCardImages.id, { onDelete: "cascade" }), textAsSeen: text("text_as_seen"), side: text("side"), boundingBox: jsonb("bounding_box").$type<{ x: number; y: number; width: number; height: number }>(), visualReason: text("visual_reason"), confidence: numeric("confidence", { precision: 4, scale: 3 }), ...timestamps }, (t) => [index("field_evidence_workspace_field_idx").on(t.workspaceId, t.extractedFieldId)]);

export const digitalProfiles = pgTable("digital_profiles", { id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), userId: text("user_id").notNull().references(() => users.id), slug: text("slug").notNull(), displayName: text("display_name").notNull(), jobTitle: text("job_title"), companyName: text("company_name"), bio: text("bio"), avatarBlobKey: text("avatar_blob_key"), theme: jsonb("theme").$type<Record<string, unknown>>().default({}).notNull(), isPublished: boolean("is_published").default(false).notNull(), ...timestamps }, (t) => [uniqueIndex("digital_profiles_workspace_slug_uq").on(t.workspaceId, t.slug), index("digital_profiles_workspace_user_idx").on(t.workspaceId, t.userId)]);
export const shareLinks = pgTable("share_links", { id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), digitalProfileId: text("digital_profile_id").references(() => digitalProfiles.id), entityType: text("entity_type"), entityId: text("entity_id"), tokenHash: text("token_hash").notNull().unique(), status: shareStatus("status").default("active").notNull(), expiresAt: timestamp("expires_at", { withTimezone: true }), maxViews: integer("max_views"), viewCount: integer("view_count").default(0).notNull(), createdByUserId: text("created_by_user_id").notNull().references(() => users.id), ...timestamps }, (t) => [index("share_links_workspace_idx").on(t.workspaceId, t.status)]);
export const shareViews = pgTable("share_views", { id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), shareLinkId: text("share_link_id").notNull().references(() => shareLinks.id, { onDelete: "cascade" }), viewedAt: timestamp("viewed_at", { withTimezone: true }).defaultNow().notNull(), referrer: text("referrer"), country: text("country"), userAgentHash: text("user_agent_hash") }, (t) => [index("share_views_workspace_link_idx").on(t.workspaceId, t.shareLinkId)]);

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  ownerWorkspaceId: text("owner_workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  createdByUserId: text("created_by_user_id").notNull().references(() => users.id),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  description: text("description").notNull(),
  eventType: text("event_type").notNull(),
  category: text("category"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  timezone: text("timezone").default("Africa/Kampala").notNull(),
  venueName: text("venue_name"),
  addressLine1: text("address_line_1"),
  addressLine2: text("address_line_2"),
  city: text("city"),
  region: text("region"),
  country: text("country"),
  isVirtual: boolean("is_virtual").default(false).notNull(),
  virtualJoinUrl: text("virtual_join_url"),
  websiteUrl: text("website_url"),
  registrationUrl: text("registration_url"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  bannerBlobKey: text("banner_blob_key"),
  logoBlobKey: text("logo_blob_key"),
  visibility: eventVisibility("visibility").default("public").notNull(),
  directoryAccess: eventDirectoryAccess("directory_access").default("public").notNull(),
  allowCompanySubmissions: boolean("allow_company_submissions").default(true).notNull(),
  allowIndividualSubmissions: boolean("allow_individual_submissions").default(true).notNull(),
  allowPublicCardPreviews: boolean("allow_public_card_previews").default(false).notNull(),
  chatEnabled: boolean("chat_enabled").default(true).notNull(),
  status: eventStatus("status").default("draft").notNull(),
  moderationStatus: eventModerationStatus("moderation_status").default("not_submitted").notNull(),
  moderationNotes: text("moderation_notes"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  settings: jsonb("settings").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (t) => [
  check("events_date_order_check", sql`${t.endsAt} > ${t.startsAt}`),
  index("events_owner_status_start_idx").on(t.ownerWorkspaceId, t.status, t.startsAt),
  index("events_marketplace_idx").on(t.moderationStatus, t.status, t.startsAt),
  index("events_city_start_idx").on(t.city, t.startsAt),
  index("events_category_start_idx").on(t.category, t.startsAt),
]);

export const eventCollaborators = pgTable("event_collaborators", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  invitedByUserId: text("invited_by_user_id").notNull().references(() => users.id),
  status: text("status").default("active").notNull(),
  ...timestamps,
}, (t) => [uniqueIndex("event_collaborators_event_user_uq").on(t.eventId, t.userId), index("event_collaborators_workspace_idx").on(t.workspaceId, t.status)]);

export const eventInvitations = pgTable("event_invitations", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  invitationType: eventParticipantType("invitation_type").notNull(),
  invitedEmail: text("invited_email"),
  allowedEmailDomain: text("allowed_email_domain"),
  invitedWorkspaceId: text("invited_workspace_id").references(() => workspaces.id, { onDelete: "set null" }),
  maxUses: integer("max_uses"),
  useCount: integer("use_count").default(0).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  status: eventInvitationStatus("status").default("active").notNull(),
  createdByUserId: text("created_by_user_id").notNull().references(() => users.id),
  ...timestamps,
}, (t) => [index("event_invitations_event_status_idx").on(t.eventId, t.status, t.expiresAt)]);

export const eventParticipants = pgTable("event_participants", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  submittingWorkspaceId: text("submitting_workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  submittedByUserId: text("submitted_by_user_id").notNull().references(() => users.id),
  participantType: eventParticipantType("participant_type").notNull(),
  sourceCompanyId: text("source_company_id").references(() => directoryCompanies.id, { onDelete: "set null" }),
  displayNameSnapshot: text("display_name_snapshot").notNull(),
  logoBlobKeySnapshot: text("logo_blob_key_snapshot"),
  summarySnapshot: text("summary_snapshot"),
  categorySnapshot: text("category_snapshot"),
  industrySnapshot: text("industry_snapshot"),
  servicesSnapshot: jsonb("services_snapshot").$type<string[]>().default([]).notNull(),
  websiteSnapshot: text("website_snapshot"),
  locationSnapshot: text("location_snapshot"),
  status: eventParticipantStatus("status").default("pending_review").notNull(),
  attendanceStatus: attendanceStatus("attendance_status").default("registered").notNull(),
  consentVersion: text("consent_version").notNull(),
  consentedAt: timestamp("consented_at", { withTimezone: true }).notNull(),
  consentedByUserId: text("consented_by_user_id").notNull().references(() => users.id),
  reviewedByUserId: text("reviewed_by_user_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewNotes: text("review_notes"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
  ...timestamps,
}, (t) => [
  index("event_participants_event_status_idx").on(t.eventId, t.status),
  index("event_participants_workspace_status_idx").on(t.submittingWorkspaceId, t.status),
  uniqueIndex("event_participants_event_source_company_uq")
    .on(t.eventId, t.sourceCompanyId)
    .where(sql`${t.sourceCompanyId} is not null and ${t.status} not in ('withdrawn', 'rejected')`),
]);

export const eventParticipantCards = pgTable("event_participant_cards", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  eventParticipantId: text("event_participant_id").notNull().references(() => eventParticipants.id, { onDelete: "cascade" }),
  sourceWorkspaceId: text("source_workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  sourceBusinessCardId: text("source_business_card_id").references(() => businessCards.id, { onDelete: "set null" }),
  sourceContactId: text("source_contact_id").references(() => contacts.id, { onDelete: "set null" }),
  sourceDigitalProfileId: text("source_digital_profile_id").references(() => digitalProfiles.id, { onDelete: "set null" }),
  displayNameSnapshot: text("display_name_snapshot").notNull(),
  jobTitleSnapshot: text("job_title_snapshot"),
  companyNameSnapshot: text("company_name_snapshot").notNull(),
  phoneNumbersSnapshot: jsonb("phone_numbers_snapshot").$type<string[]>().default([]).notNull(),
  emailAddressesSnapshot: jsonb("email_addresses_snapshot").$type<string[]>().default([]).notNull(),
  socialMediaSnapshot: jsonb("social_media_snapshot").$type<Record<string, string>>().default({}).notNull(),
  websiteSnapshot: text("website_snapshot"),
  locationSnapshot: text("location_snapshot"),
  productsServicesSnapshot: jsonb("products_services_snapshot").$type<string[]>().default([]).notNull(),
  otherInformationSnapshot: jsonb("other_information_snapshot").$type<Array<{ label: string; value: string }>>().default([]).notNull(),
  visibilityConfig: jsonb("visibility_config").$type<Record<string, boolean>>().default({}).notNull(),
  eventCardPreviewBlobKey: text("event_card_preview_blob_key"),
  snapshotVersion: integer("snapshot_version").default(1).notNull(),
  status: eventParticipantStatus("status").default("pending_review").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  consentedAt: timestamp("consented_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  ...timestamps,
}, (t) => [index("event_participant_cards_event_status_idx").on(t.eventId, t.status), index("event_participant_cards_participant_sort_idx").on(t.eventParticipantId, t.sortOrder), index("event_participant_cards_source_idx").on(t.sourceWorkspaceId, t.sourceBusinessCardId)]);

export const eventInvitationUses = pgTable("event_invitation_uses", {
  id: text("id").primaryKey(),
  invitationId: text("invitation_id").notNull().references(() => eventInvitations.id, { onDelete: "cascade" }),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
  participantId: text("participant_id").references(() => eventParticipants.id, { onDelete: "set null" }),
  ipHash: text("ip_hash"),
  userAgentHash: text("user_agent_hash"),
  usedAt: timestamp("used_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("event_invitation_uses_invite_idx").on(t.invitationId, t.usedAt), index("event_invitation_uses_workspace_idx").on(t.workspaceId, t.usedAt)]);

export const eventAccessGrants = pgTable("event_access_grants", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  participantId: text("participant_id").references(() => eventParticipants.id, { onDelete: "set null" }),
  grantType: text("grant_type").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  ...timestamps,
}, (t) => [uniqueIndex("event_access_grants_event_user_uq").on(t.eventId, t.userId), index("event_access_grants_user_idx").on(t.userId, t.revokedAt)]);

export const savedEventContacts = pgTable("saved_event_contacts", {
  id: text("id").primaryKey(),
  viewerWorkspaceId: text("viewer_workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  savedByUserId: text("saved_by_user_id").notNull().references(() => users.id),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  eventParticipantCardId: text("event_participant_card_id").notNull().references(() => eventParticipantCards.id, { onDelete: "cascade" }),
  directoryCompanyId: text("directory_company_id").references(() => directoryCompanies.id, { onDelete: "set null" }),
  contactId: text("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  sourceSnapshotVersion: integer("source_snapshot_version").notNull(),
  ...timestamps,
}, (t) => [uniqueIndex("saved_event_contacts_workspace_card_uq").on(t.viewerWorkspaceId, t.eventParticipantCardId), index("saved_event_contacts_event_idx").on(t.eventId, t.createdAt)]);

export const eventPromotionPackages = pgTable("event_promotion_packages", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  placement: text("placement").notNull(),
  durationDays: integer("duration_days").notNull(),
  priceCents: integer("price_cents").notNull(),
  currency: text("currency").default("usd").notNull(),
  inventoryLimit: integer("inventory_limit"),
  rules: jsonb("rules").$type<Record<string, unknown>>().default({}).notNull(),
  active: boolean("active").default(true).notNull(),
  ...timestamps,
}, (t) => [index("event_promotion_packages_placement_idx").on(t.placement, t.active)]);

export const eventPromotionOrders = pgTable("event_promotion_orders", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  purchaserWorkspaceId: text("purchaser_workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  packageId: text("package_id").notNull().references(() => eventPromotionPackages.id),
  createdByUserId: text("created_by_user_id").notNull().references(() => users.id),
  stripeCheckoutSessionId: text("stripe_checkout_session_id").unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull(),
  status: eventPromotionStatus("status").default("pending_payment").notNull(),
  requestedStartAt: timestamp("requested_start_at", { withTimezone: true }),
  scheduledStartAt: timestamp("scheduled_start_at", { withTimezone: true }),
  scheduledEndAt: timestamp("scheduled_end_at", { withTimezone: true }),
  reviewedByUserId: text("reviewed_by_user_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  refundedAt: timestamp("refunded_at", { withTimezone: true }),
  ...timestamps,
}, (t) => [index("event_promotion_orders_event_status_idx").on(t.eventId, t.status), index("event_promotion_orders_schedule_idx").on(t.status, t.scheduledStartAt, t.scheduledEndAt)]);

export const eventActivityEvents = pgTable("event_activity_events", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  participantId: text("participant_id").references(() => eventParticipants.id, { onDelete: "set null" }),
  participantCardId: text("participant_card_id").references(() => eventParticipantCards.id, { onDelete: "set null" }),
  promotionOrderId: text("promotion_order_id").references(() => eventPromotionOrders.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(),
  sessionHash: text("session_hash"),
  referrerDomain: text("referrer_domain"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("event_activity_event_time_idx").on(t.eventId, t.occurredAt), index("event_activity_type_time_idx").on(t.eventType, t.occurredAt)]);

export const eventMetricsDaily = pgTable("event_metrics_daily", {
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  metricDate: text("metric_date").notNull(),
  metric: text("metric").notNull(),
  dimension: text("dimension").default("all").notNull(),
  quantity: integer("quantity").default(0).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.eventId, t.metricDate, t.metric, t.dimension] })]);

export const userNotifications = pgTable("user_notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  targetUrl: text("target_url"),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("user_notifications_user_read_idx").on(t.userId, t.readAt, t.createdAt), index("user_notifications_workspace_idx").on(t.workspaceId, t.createdAt)]);

export const searchDocuments = pgTable("search_documents", { id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), eventId: text("event_id").references(() => events.id, { onDelete: "cascade" }), entityType: text("entity_type").notNull(), entityId: text("entity_id").notNull(), chunkType: text("chunk_type").notNull(), content: text("content").notNull(), embedding: vector("embedding", { dimensions: 1024 }), contentHash: text("content_hash").notNull(), modelVersion: text("model_version"), ...timestamps }, (t) => [index("search_documents_workspace_entity_idx").on(t.workspaceId, t.entityType, t.entityId), index("search_documents_event_entity_idx").on(t.eventId, t.entityType, t.entityId)]);
export const chatThreads = pgTable("chat_threads", { id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), userId: text("user_id").notNull().references(() => users.id), title: text("title").notNull(), scope: jsonb("scope").$type<Record<string, unknown>>().default({}).notNull(), ...timestamps }, (t) => [index("chat_threads_workspace_user_idx").on(t.workspaceId, t.userId)]);
export const chatMessages = pgTable("chat_messages", { id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), threadId: text("thread_id").notNull().references(() => chatThreads.id, { onDelete: "cascade" }), role: text("role").notNull(), parts: jsonb("parts").$type<unknown[]>().notNull(), status: text("status").default("complete").notNull(), modelMetadata: jsonb("model_metadata").$type<Record<string, unknown>>(), ...timestamps }, (t) => [index("chat_messages_workspace_thread_idx").on(t.workspaceId, t.threadId, t.createdAt)]);
export const aiGenerations = pgTable("ai_generations", { id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), userId: text("user_id").notNull().references(() => users.id), feature: text("feature").notNull(), provider: text("provider").notNull(), model: text("model").notNull(), status: generationStatus("status").default("pending").notNull(), promptHash: text("prompt_hash"), usage: jsonb("usage").$type<Record<string, number>>(), estimatedCostUsd: numeric("estimated_cost_usd", { precision: 12, scale: 6 }), resultReference: text("result_reference"), errorCode: text("error_code"), startedAt: timestamp("started_at", { withTimezone: true }), completedAt: timestamp("completed_at", { withTimezone: true }), ...timestamps }, (t) => [index("ai_generations_workspace_feature_idx").on(t.workspaceId, t.feature, t.createdAt)]);
export const usageLedger = pgTable("usage_ledger", { id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), userId: text("user_id").references(() => users.id), kind: text("kind").notNull(), quantity: numeric("quantity", { precision: 18, scale: 4 }).notNull(), unit: text("unit").notNull(), sourceType: text("source_type"), sourceId: text("source_id"), occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(), metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull() }, (t) => [index("usage_ledger_workspace_kind_idx").on(t.workspaceId, t.kind, t.occurredAt)]);

export const duplicateCandidates = pgTable("duplicate_candidates", { id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), entityType: text("entity_type").notNull(), leftEntityId: text("left_entity_id").notNull(), rightEntityId: text("right_entity_id").notNull(), score: numeric("score", { precision: 4, scale: 3 }).notNull(), matchingSignals: jsonb("matching_signals").$type<Record<string, unknown>>().notNull(), state: text("state").default("pending").notNull(), decidedByUserId: text("decided_by_user_id").references(() => users.id), decidedAt: timestamp("decided_at", { withTimezone: true }), ...timestamps }, (t) => [index("duplicate_candidates_workspace_state_idx").on(t.workspaceId, t.state)]);
export const recordNotes = pgTable("record_notes", { id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), entityType: text("entity_type").notNull(), entityId: text("entity_id").notNull(), authorUserId: text("author_user_id").notNull().references(() => users.id), body: text("body").notNull(), visibility: text("visibility").default("workspace").notNull(), ...timestamps }, (t) => [index("record_notes_workspace_entity_idx").on(t.workspaceId, t.entityType, t.entityId)]);
export const activities = pgTable("activities", { id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), actorUserId: text("actor_user_id").references(() => users.id), action: text("action").notNull(), entityType: text("entity_type"), entityId: text("entity_id"), metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() }, (t) => [index("activities_workspace_created_idx").on(t.workspaceId, t.createdAt)]);
export const auditEvents = pgTable("audit_events", { id: text("id").primaryKey(), workspaceId: text("workspace_id").references(() => workspaces.id), actorUserId: text("actor_user_id").references(() => users.id), action: text("action").notNull(), entityType: text("entity_type"), entityId: text("entity_id"), ipHash: text("ip_hash"), userAgentHash: text("user_agent_hash"), before: jsonb("before"), after: jsonb("after"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() }, (t) => [index("audit_events_workspace_created_idx").on(t.workspaceId, t.createdAt)]);
export const webhookEvents = pgTable("webhook_events", { id: text("id").primaryKey(), provider: text("provider").notNull(), providerEventId: text("provider_event_id").notNull(), eventType: text("event_type").notNull(), status: text("status").default("received").notNull(), payloadHash: text("payload_hash").notNull(), attempts: integer("attempts").default(0).notNull(), lastError: text("last_error"), processedAt: timestamp("processed_at", { withTimezone: true }), ...timestamps }, (t) => [uniqueIndex("webhook_events_provider_event_uq").on(t.provider, t.providerEventId)]);
export const platformStaff = pgTable("platform_staff", { id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id), role: text("role").notNull(), permissions: jsonb("permissions").$type<string[]>().default([]).notNull(), active: boolean("active").default(true).notNull(), ...timestamps }, (t) => [uniqueIndex("platform_staff_user_uq").on(t.userId)]);
export const workspaceSubscriptions = pgTable("workspace_subscriptions", { id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), stripeCustomerId: text("stripe_customer_id"), stripeSubscriptionId: text("stripe_subscription_id").unique(), planKey: text("plan_key").notNull(), status: text("status").notNull(), seats: integer("seats").default(1).notNull(), currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }), cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(), ...timestamps }, (t) => [uniqueIndex("workspace_subscriptions_workspace_uq").on(t.workspaceId)]);
export const plans = pgTable("plans", { id: text("id").primaryKey(), key: text("key").notNull().unique(), name: text("name").notNull(), description: text("description"), active: boolean("active").default(true).notNull(), monthlyPriceCents: integer("monthly_price_cents").notNull(), currency: text("currency").default("usd").notNull(), ...timestamps });
export const planEntitlements = pgTable("plan_entitlements", { planId: text("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }), key: text("key").notNull(), value: jsonb("value").notNull() }, (t) => [primaryKey({ columns: [t.planId, t.key] })]);
export const billingCustomers = pgTable("billing_customers", { id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), stripeCustomerId: text("stripe_customer_id").notNull().unique(), billingEmail: text("billing_email"), ...timestamps }, (t) => [uniqueIndex("billing_customers_workspace_uq").on(t.workspaceId)]);
export const billingEvents = pgTable("billing_events", { id: text("id").primaryKey(), workspaceId: text("workspace_id").references(() => workspaces.id), stripeEventId: text("stripe_event_id").notNull().unique(), eventType: text("event_type").notNull(), payload: jsonb("payload").$type<Record<string, unknown>>(), processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() }, (t) => [index("billing_events_workspace_created_idx").on(t.workspaceId, t.createdAt)]);
export const usageCounters = pgTable("usage_counters", { workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), periodKey: text("period_key").notNull(), metric: text("metric").notNull(), quantity: numeric("quantity", { precision: 18, scale: 4 }).default("0").notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull() }, (t) => [primaryKey({ columns: [t.workspaceId, t.periodKey, t.metric] })]);
