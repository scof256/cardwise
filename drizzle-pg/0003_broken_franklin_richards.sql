CREATE TYPE "public"."attendance_status" AS ENUM('unknown', 'registered', 'checked_in', 'organizer_confirmed', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."event_directory_access" AS ENUM('public', 'signed_in', 'approved_participants', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."event_invitation_status" AS ENUM('active', 'exhausted', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."event_moderation_status" AS ENUM('not_submitted', 'pending', 'approved', 'changes_requested', 'rejected', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."event_participant_status" AS ENUM('draft', 'pending_review', 'changes_requested', 'approved', 'rejected', 'published', 'withdrawn', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."event_participant_type" AS ENUM('organizer', 'sponsor', 'exhibitor', 'speaker', 'company', 'attendee');--> statement-breakpoint
CREATE TYPE "public"."event_promotion_status" AS ENUM('pending_payment', 'paid_pending_review', 'scheduled', 'active', 'ended', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('draft', 'scheduled', 'live', 'completed', 'cancelled', 'archived');--> statement-breakpoint
CREATE TYPE "public"."event_visibility" AS ENUM('public', 'unlisted', 'workspace_only', 'invite_only');--> statement-breakpoint
CREATE TABLE "event_access_grants" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"user_id" text NOT NULL,
	"participant_id" text,
	"grant_type" text NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_activity_events" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"participant_id" text,
	"participant_card_id" text,
	"promotion_order_id" text,
	"event_type" text NOT NULL,
	"session_hash" text,
	"referrer_domain" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_collaborators" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"workspace_id" text,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"invited_by_user_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_invitation_uses" (
	"id" text PRIMARY KEY NOT NULL,
	"invitation_id" text NOT NULL,
	"event_id" text NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"participant_id" text,
	"ip_hash" text,
	"user_agent_hash" text,
	"used_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"invitation_type" "event_participant_type" NOT NULL,
	"invited_email" text,
	"allowed_email_domain" text,
	"invited_workspace_id" text,
	"max_uses" integer,
	"use_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"status" "event_invitation_status" DEFAULT 'active' NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_invitations_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "event_metrics_daily" (
	"event_id" text NOT NULL,
	"metric_date" text NOT NULL,
	"metric" text NOT NULL,
	"dimension" text DEFAULT 'all' NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_metrics_daily_event_id_metric_date_metric_dimension_pk" PRIMARY KEY("event_id","metric_date","metric","dimension")
);
--> statement-breakpoint
CREATE TABLE "event_participant_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"event_participant_id" text NOT NULL,
	"source_workspace_id" text NOT NULL,
	"source_business_card_id" text,
	"source_contact_id" text,
	"source_digital_profile_id" text,
	"display_name_snapshot" text NOT NULL,
	"job_title_snapshot" text,
	"company_name_snapshot" text NOT NULL,
	"phone_numbers_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"email_addresses_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"social_media_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"website_snapshot" text,
	"location_snapshot" text,
	"products_services_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"other_information_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"visibility_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"event_card_preview_blob_key" text,
	"snapshot_version" integer DEFAULT 1 NOT NULL,
	"status" "event_participant_status" DEFAULT 'pending_review' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"consented_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_participants" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"submitting_workspace_id" text NOT NULL,
	"submitted_by_user_id" text NOT NULL,
	"participant_type" "event_participant_type" NOT NULL,
	"source_company_id" text,
	"display_name_snapshot" text NOT NULL,
	"logo_blob_key_snapshot" text,
	"summary_snapshot" text,
	"category_snapshot" text,
	"industry_snapshot" text,
	"services_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"website_snapshot" text,
	"location_snapshot" text,
	"status" "event_participant_status" DEFAULT 'pending_review' NOT NULL,
	"attendance_status" "attendance_status" DEFAULT 'registered' NOT NULL,
	"consent_version" text NOT NULL,
	"consented_at" timestamp with time zone NOT NULL,
	"consented_by_user_id" text NOT NULL,
	"reviewed_by_user_id" text,
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"published_at" timestamp with time zone,
	"withdrawn_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_promotion_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"purchaser_workspace_id" text NOT NULL,
	"package_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"amount_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"status" "event_promotion_status" DEFAULT 'pending_payment' NOT NULL,
	"requested_start_at" timestamp with time zone,
	"scheduled_start_at" timestamp with time zone,
	"scheduled_end_at" timestamp with time zone,
	"reviewed_by_user_id" text,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_promotion_orders_stripe_checkout_session_id_unique" UNIQUE("stripe_checkout_session_id")
);
--> statement-breakpoint
CREATE TABLE "event_promotion_packages" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"placement" text NOT NULL,
	"duration_days" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"inventory_limit" integer,
	"rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_promotion_packages_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_workspace_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"description" text NOT NULL,
	"event_type" text NOT NULL,
	"category" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"timezone" text DEFAULT 'Africa/Kampala' NOT NULL,
	"venue_name" text,
	"address_line_1" text,
	"address_line_2" text,
	"city" text,
	"region" text,
	"country" text,
	"is_virtual" boolean DEFAULT false NOT NULL,
	"virtual_join_url" text,
	"website_url" text,
	"registration_url" text,
	"contact_name" text,
	"contact_email" text,
	"banner_blob_key" text,
	"logo_blob_key" text,
	"visibility" "event_visibility" DEFAULT 'public' NOT NULL,
	"directory_access" "event_directory_access" DEFAULT 'public' NOT NULL,
	"allow_company_submissions" boolean DEFAULT true NOT NULL,
	"allow_individual_submissions" boolean DEFAULT true NOT NULL,
	"allow_public_card_previews" boolean DEFAULT false NOT NULL,
	"chat_enabled" boolean DEFAULT true NOT NULL,
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"moderation_status" "event_moderation_status" DEFAULT 'not_submitted' NOT NULL,
	"moderation_notes" text,
	"published_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug"),
	CONSTRAINT "events_date_order_check" CHECK ("events"."ends_at" > "events"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "saved_event_contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"viewer_workspace_id" text NOT NULL,
	"saved_by_user_id" text NOT NULL,
	"event_id" text NOT NULL,
	"event_participant_card_id" text NOT NULL,
	"directory_company_id" text,
	"contact_id" text,
	"source_snapshot_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"target_url" text,
	"entity_type" text,
	"entity_id" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "search_documents" ALTER COLUMN "embedding" SET DATA TYPE vector(1024);--> statement-breakpoint
ALTER TABLE "search_documents" ADD COLUMN "event_id" text;--> statement-breakpoint
ALTER TABLE "event_access_grants" ADD CONSTRAINT "event_access_grants_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_access_grants" ADD CONSTRAINT "event_access_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_access_grants" ADD CONSTRAINT "event_access_grants_participant_id_event_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."event_participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_activity_events" ADD CONSTRAINT "event_activity_events_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_activity_events" ADD CONSTRAINT "event_activity_events_participant_id_event_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."event_participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_activity_events" ADD CONSTRAINT "event_activity_events_participant_card_id_event_participant_cards_id_fk" FOREIGN KEY ("participant_card_id") REFERENCES "public"."event_participant_cards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_activity_events" ADD CONSTRAINT "event_activity_events_promotion_order_id_event_promotion_orders_id_fk" FOREIGN KEY ("promotion_order_id") REFERENCES "public"."event_promotion_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_collaborators" ADD CONSTRAINT "event_collaborators_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_collaborators" ADD CONSTRAINT "event_collaborators_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_collaborators" ADD CONSTRAINT "event_collaborators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_collaborators" ADD CONSTRAINT "event_collaborators_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_invitation_uses" ADD CONSTRAINT "event_invitation_uses_invitation_id_event_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."event_invitations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_invitation_uses" ADD CONSTRAINT "event_invitation_uses_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_invitation_uses" ADD CONSTRAINT "event_invitation_uses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_invitation_uses" ADD CONSTRAINT "event_invitation_uses_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_invitation_uses" ADD CONSTRAINT "event_invitation_uses_participant_id_event_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."event_participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_invitations" ADD CONSTRAINT "event_invitations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_invitations" ADD CONSTRAINT "event_invitations_invited_workspace_id_workspaces_id_fk" FOREIGN KEY ("invited_workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_invitations" ADD CONSTRAINT "event_invitations_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_metrics_daily" ADD CONSTRAINT "event_metrics_daily_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participant_cards" ADD CONSTRAINT "event_participant_cards_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participant_cards" ADD CONSTRAINT "event_participant_cards_event_participant_id_event_participants_id_fk" FOREIGN KEY ("event_participant_id") REFERENCES "public"."event_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participant_cards" ADD CONSTRAINT "event_participant_cards_source_workspace_id_workspaces_id_fk" FOREIGN KEY ("source_workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participant_cards" ADD CONSTRAINT "event_participant_cards_source_business_card_id_business_cards_id_fk" FOREIGN KEY ("source_business_card_id") REFERENCES "public"."business_cards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participant_cards" ADD CONSTRAINT "event_participant_cards_source_contact_id_contacts_id_fk" FOREIGN KEY ("source_contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participant_cards" ADD CONSTRAINT "event_participant_cards_source_digital_profile_id_digital_profiles_id_fk" FOREIGN KEY ("source_digital_profile_id") REFERENCES "public"."digital_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_submitting_workspace_id_workspaces_id_fk" FOREIGN KEY ("submitting_workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_source_company_id_directory_companies_id_fk" FOREIGN KEY ("source_company_id") REFERENCES "public"."directory_companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_consented_by_user_id_users_id_fk" FOREIGN KEY ("consented_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_promotion_orders" ADD CONSTRAINT "event_promotion_orders_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_promotion_orders" ADD CONSTRAINT "event_promotion_orders_purchaser_workspace_id_workspaces_id_fk" FOREIGN KEY ("purchaser_workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_promotion_orders" ADD CONSTRAINT "event_promotion_orders_package_id_event_promotion_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."event_promotion_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_promotion_orders" ADD CONSTRAINT "event_promotion_orders_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_promotion_orders" ADD CONSTRAINT "event_promotion_orders_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_owner_workspace_id_workspaces_id_fk" FOREIGN KEY ("owner_workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_event_contacts" ADD CONSTRAINT "saved_event_contacts_viewer_workspace_id_workspaces_id_fk" FOREIGN KEY ("viewer_workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_event_contacts" ADD CONSTRAINT "saved_event_contacts_saved_by_user_id_users_id_fk" FOREIGN KEY ("saved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_event_contacts" ADD CONSTRAINT "saved_event_contacts_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_event_contacts" ADD CONSTRAINT "saved_event_contacts_event_participant_card_id_event_participant_cards_id_fk" FOREIGN KEY ("event_participant_card_id") REFERENCES "public"."event_participant_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_event_contacts" ADD CONSTRAINT "saved_event_contacts_directory_company_id_directory_companies_id_fk" FOREIGN KEY ("directory_company_id") REFERENCES "public"."directory_companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_event_contacts" ADD CONSTRAINT "saved_event_contacts_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "event_access_grants_event_user_uq" ON "event_access_grants" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "event_access_grants_user_idx" ON "event_access_grants" USING btree ("user_id","revoked_at");--> statement-breakpoint
CREATE INDEX "event_activity_event_time_idx" ON "event_activity_events" USING btree ("event_id","occurred_at");--> statement-breakpoint
CREATE INDEX "event_activity_type_time_idx" ON "event_activity_events" USING btree ("event_type","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "event_collaborators_event_user_uq" ON "event_collaborators" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "event_collaborators_workspace_idx" ON "event_collaborators" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "event_invitation_uses_invite_idx" ON "event_invitation_uses" USING btree ("invitation_id","used_at");--> statement-breakpoint
CREATE INDEX "event_invitation_uses_workspace_idx" ON "event_invitation_uses" USING btree ("workspace_id","used_at");--> statement-breakpoint
CREATE INDEX "event_invitations_event_status_idx" ON "event_invitations" USING btree ("event_id","status","expires_at");--> statement-breakpoint
CREATE INDEX "event_participant_cards_event_status_idx" ON "event_participant_cards" USING btree ("event_id","status");--> statement-breakpoint
CREATE INDEX "event_participant_cards_participant_sort_idx" ON "event_participant_cards" USING btree ("event_participant_id","sort_order");--> statement-breakpoint
CREATE INDEX "event_participant_cards_source_idx" ON "event_participant_cards" USING btree ("source_workspace_id","source_business_card_id");--> statement-breakpoint
CREATE INDEX "event_participants_event_status_idx" ON "event_participants" USING btree ("event_id","status");--> statement-breakpoint
CREATE INDEX "event_participants_workspace_status_idx" ON "event_participants" USING btree ("submitting_workspace_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "event_participants_event_source_company_uq" ON "event_participants" USING btree ("event_id","source_company_id") WHERE "event_participants"."source_company_id" is not null and "event_participants"."status" not in ('withdrawn', 'rejected');--> statement-breakpoint
CREATE INDEX "event_promotion_orders_event_status_idx" ON "event_promotion_orders" USING btree ("event_id","status");--> statement-breakpoint
CREATE INDEX "event_promotion_orders_schedule_idx" ON "event_promotion_orders" USING btree ("status","scheduled_start_at","scheduled_end_at");--> statement-breakpoint
CREATE INDEX "event_promotion_packages_placement_idx" ON "event_promotion_packages" USING btree ("placement","active");--> statement-breakpoint
CREATE INDEX "events_owner_status_start_idx" ON "events" USING btree ("owner_workspace_id","status","starts_at");--> statement-breakpoint
CREATE INDEX "events_marketplace_idx" ON "events" USING btree ("moderation_status","status","starts_at");--> statement-breakpoint
CREATE INDEX "events_city_start_idx" ON "events" USING btree ("city","starts_at");--> statement-breakpoint
CREATE INDEX "events_category_start_idx" ON "events" USING btree ("category","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_event_contacts_workspace_card_uq" ON "saved_event_contacts" USING btree ("viewer_workspace_id","event_participant_card_id");--> statement-breakpoint
CREATE INDEX "saved_event_contacts_event_idx" ON "saved_event_contacts" USING btree ("event_id","created_at");--> statement-breakpoint
CREATE INDEX "user_notifications_user_read_idx" ON "user_notifications" USING btree ("user_id","read_at","created_at");--> statement-breakpoint
CREATE INDEX "user_notifications_workspace_idx" ON "user_notifications" USING btree ("workspace_id","created_at");--> statement-breakpoint
ALTER TABLE "search_documents" ADD CONSTRAINT "search_documents_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "search_documents_event_entity_idx" ON "search_documents" USING btree ("event_id","entity_type","entity_id");