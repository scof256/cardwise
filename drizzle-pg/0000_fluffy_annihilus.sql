CREATE EXTENSION IF NOT EXISTS "vector";--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "pg_trgm";--> statement-breakpoint
CREATE TYPE "public"."card_status" AS ENUM('uploading', 'queued', 'processing', 'awaiting_review', 'verified', 'failed', 'archived', 'merged');--> statement-breakpoint
CREATE TYPE "public"."contact_method_kind" AS ENUM('phone', 'email', 'website', 'linkedin', 'x', 'instagram', 'facebook', 'whatsapp', 'other');--> statement-breakpoint
CREATE TYPE "public"."extraction_status" AS ENUM('pending', 'running', 'succeeded', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."field_decision" AS ENUM('accepted', 'edited', 'rejected', 'unresolved');--> statement-breakpoint
CREATE TYPE "public"."generation_status" AS ENUM('pending', 'running', 'succeeded', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('invited', 'active', 'suspended', 'removed');--> statement-breakpoint
CREATE TYPE "public"."method_owner_type" AS ENUM('company', 'contact', 'digital_profile');--> statement-breakpoint
CREATE TYPE "public"."record_status" AS ENUM('active', 'archived', 'merged');--> statement-breakpoint
CREATE TYPE "public"."share_status" AS ENUM('active', 'disabled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'deletion_pending', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."workspace_status" AS ENUM('trial', 'active', 'past_due', 'suspended', 'deletion_pending', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."workspace_type" AS ENUM('personal', 'organization');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"actor_user_id" text,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"owner_type" "method_owner_type" NOT NULL,
	"owner_id" text NOT NULL,
	"line_1" text,
	"line_2" text,
	"city" text,
	"region" text,
	"postal_code" text,
	"country" text,
	"normalized_value" text NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_generations" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"feature" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"status" "generation_status" DEFAULT 'pending' NOT NULL,
	"prompt_hash" text,
	"usage" jsonb,
	"estimated_cost_usd" numeric(12, 6),
	"result_reference" text,
	"error_code" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text,
	"actor_user_id" text,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"ip_hash" text,
	"user_agent_hash" text,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_card_images" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"business_card_id" text NOT NULL,
	"side" text DEFAULT 'unknown' NOT NULL,
	"sort_order" integer NOT NULL,
	"blob_key" text NOT NULL,
	"sanitized_blob_key" text,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"checksum_sha256" text NOT NULL,
	"upload_status" text DEFAULT 'pending' NOT NULL,
	"validation_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"directory_company_id" text,
	"contact_id" text,
	"collected_by_user_id" text NOT NULL,
	"owner_user_id" text,
	"owner_team_id" text,
	"source" text DEFAULT 'file_upload' NOT NULL,
	"status" "card_status" DEFAULT 'uploading' NOT NULL,
	"verification_status" text DEFAULT 'unverified' NOT NULL,
	"overall_confidence" numeric(4, 3),
	"current_extraction_run_id" text,
	"captured_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"thread_id" text NOT NULL,
	"role" text NOT NULL,
	"parts" jsonb NOT NULL,
	"status" text DEFAULT 'complete' NOT NULL,
	"model_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_threads" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"scope" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_methods" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"owner_type" "method_owner_type" NOT NULL,
	"owner_id" text NOT NULL,
	"kind" "contact_method_kind" NOT NULL,
	"label" text,
	"display_value" text NOT NULL,
	"normalized_value" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"source_type" text,
	"source_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"directory_company_id" text,
	"full_name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"job_title" text,
	"department" text,
	"notes_summary" text,
	"avatar_blob_key" text,
	"relationship_status" text DEFAULT 'new' NOT NULL,
	"owner_user_id" text,
	"owner_team_id" text,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"merged_into_id" text,
	"created_by_user_id" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "digital_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"job_title" text,
	"company_name" text,
	"bio" text,
	"avatar_blob_key" text,
	"theme" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "directory_companies" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"company_name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"logo_blob_key" text,
	"tagline" text,
	"description" text,
	"industry" text,
	"category" text,
	"products_services_summary" text,
	"website_url" text,
	"normalized_domain" text,
	"physical_address_summary" text,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"merged_into_id" text,
	"owner_user_id" text,
	"owner_team_id" text,
	"created_by_user_id" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "duplicate_candidates" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"left_entity_id" text NOT NULL,
	"right_entity_id" text NOT NULL,
	"score" numeric(4, 3) NOT NULL,
	"matching_signals" jsonb NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"decided_by_user_id" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extracted_fields" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"extraction_run_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_temporary_key" text NOT NULL,
	"field_path" text NOT NULL,
	"display_value" text,
	"normalized_value" text,
	"typed_value" jsonb,
	"model_confidence" numeric(4, 3),
	"validation_confidence" numeric(4, 3),
	"conflict_state" text DEFAULT 'none' NOT NULL,
	"user_decision" "field_decision" DEFAULT 'unresolved' NOT NULL,
	"reviewed_value" jsonb,
	"reviewed_by_user_id" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extraction_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"business_card_id" text NOT NULL,
	"workflow_run_id" text,
	"generation_id" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"schema_version" text NOT NULL,
	"status" "extraction_status" DEFAULT 'pending' NOT NULL,
	"raw_structured_output" jsonb,
	"complete_unstructured_output" text,
	"usage" jsonb,
	"estimated_cost_usd" numeric(12, 6),
	"latency_ms" integer,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"error_code" text,
	"error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field_evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"extracted_field_id" text NOT NULL,
	"image_id" text NOT NULL,
	"text_as_seen" text,
	"side" text,
	"bounding_box" jsonb,
	"visual_reason" text,
	"confidence" numeric(4, 3),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_staff" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products_services" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "record_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"author_user_id" text NOT NULL,
	"body" text NOT NULL,
	"visibility" text DEFAULT 'workspace' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"chunk_type" text NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"content_hash" text NOT NULL,
	"model_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share_links" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"digital_profile_id" text,
	"entity_type" text,
	"entity_id" text,
	"token_hash" text NOT NULL,
	"status" "share_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"max_views" integer,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "share_links_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "share_views" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"share_link_id" text NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"referrer" text,
	"country" text,
	"user_agent_hash" text
);
--> statement-breakpoint
CREATE TABLE "taggings" (
	"workspace_id" text NOT NULL,
	"tag_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "taggings_tag_id_entity_type_entity_id_pk" PRIMARY KEY("tag_id","entity_type","entity_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"workspace_id" text NOT NULL,
	"team_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_members_team_id_user_id_pk" PRIMARY KEY("team_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text,
	"kind" text NOT NULL,
	"quantity" numeric(18, 4) NOT NULL,
	"unit" text NOT NULL,
	"source_type" text,
	"source_id" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"primary_email" text NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"locale" text DEFAULT 'en' NOT NULL,
	"timezone" text DEFAULT 'Africa/Kampala' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"payload_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"clerk_membership_id" text,
	"role_key" text NOT NULL,
	"department" text,
	"job_title" text,
	"manager_user_id" text,
	"status" "membership_status" DEFAULT 'active' NOT NULL,
	"joined_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_memberships_clerk_membership_id_unique" UNIQUE("clerk_membership_id")
);
--> statement-breakpoint
CREATE TABLE "workspace_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"plan_key" text NOT NULL,
	"status" text NOT NULL,
	"seats" integer DEFAULT 1 NOT NULL,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "workspace_type" NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"clerk_organization_id" text,
	"owner_user_id" text,
	"status" "workspace_status" DEFAULT 'trial' NOT NULL,
	"default_visibility" text DEFAULT 'private' NOT NULL,
	"retention_days" integer,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug"),
	CONSTRAINT "workspaces_clerk_organization_id_unique" UNIQUE("clerk_organization_id"),
	CONSTRAINT "workspace_identity_check" CHECK (("workspaces"."type" = 'personal' AND "workspaces"."owner_user_id" IS NOT NULL AND "workspaces"."clerk_organization_id" IS NULL) OR ("workspaces"."type" = 'organization' AND "workspaces"."clerk_organization_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_card_images" ADD CONSTRAINT "business_card_images_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_card_images" ADD CONSTRAINT "business_card_images_business_card_id_business_cards_id_fk" FOREIGN KEY ("business_card_id") REFERENCES "public"."business_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_cards" ADD CONSTRAINT "business_cards_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_cards" ADD CONSTRAINT "business_cards_directory_company_id_directory_companies_id_fk" FOREIGN KEY ("directory_company_id") REFERENCES "public"."directory_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_cards" ADD CONSTRAINT "business_cards_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_cards" ADD CONSTRAINT "business_cards_collected_by_user_id_users_id_fk" FOREIGN KEY ("collected_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_cards" ADD CONSTRAINT "business_cards_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_cards" ADD CONSTRAINT "business_cards_owner_team_id_teams_id_fk" FOREIGN KEY ("owner_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_thread_id_chat_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."chat_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_methods" ADD CONSTRAINT "contact_methods_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_directory_company_id_directory_companies_id_fk" FOREIGN KEY ("directory_company_id") REFERENCES "public"."directory_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_owner_team_id_teams_id_fk" FOREIGN KEY ("owner_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_profiles" ADD CONSTRAINT "digital_profiles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_profiles" ADD CONSTRAINT "digital_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "directory_companies" ADD CONSTRAINT "directory_companies_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "directory_companies" ADD CONSTRAINT "directory_companies_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "directory_companies" ADD CONSTRAINT "directory_companies_owner_team_id_teams_id_fk" FOREIGN KEY ("owner_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "directory_companies" ADD CONSTRAINT "directory_companies_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duplicate_candidates" ADD CONSTRAINT "duplicate_candidates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duplicate_candidates" ADD CONSTRAINT "duplicate_candidates_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_fields" ADD CONSTRAINT "extracted_fields_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_fields" ADD CONSTRAINT "extracted_fields_extraction_run_id_extraction_runs_id_fk" FOREIGN KEY ("extraction_run_id") REFERENCES "public"."extraction_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_fields" ADD CONSTRAINT "extracted_fields_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_runs" ADD CONSTRAINT "extraction_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_runs" ADD CONSTRAINT "extraction_runs_business_card_id_business_cards_id_fk" FOREIGN KEY ("business_card_id") REFERENCES "public"."business_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_evidence" ADD CONSTRAINT "field_evidence_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_evidence" ADD CONSTRAINT "field_evidence_extracted_field_id_extracted_fields_id_fk" FOREIGN KEY ("extracted_field_id") REFERENCES "public"."extracted_fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_evidence" ADD CONSTRAINT "field_evidence_image_id_business_card_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."business_card_images"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_staff" ADD CONSTRAINT "platform_staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_services" ADD CONSTRAINT "products_services_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_services" ADD CONSTRAINT "products_services_company_id_directory_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."directory_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_notes" ADD CONSTRAINT "record_notes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_notes" ADD CONSTRAINT "record_notes_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_documents" ADD CONSTRAINT "search_documents_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_digital_profile_id_digital_profiles_id_fk" FOREIGN KEY ("digital_profile_id") REFERENCES "public"."digital_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_views" ADD CONSTRAINT "share_views_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_views" ADD CONSTRAINT "share_views_share_link_id_share_links_id_fk" FOREIGN KEY ("share_link_id") REFERENCES "public"."share_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taggings" ADD CONSTRAINT "taggings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taggings" ADD CONSTRAINT "taggings_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD CONSTRAINT "usage_ledger_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD CONSTRAINT "usage_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_manager_user_id_users_id_fk" FOREIGN KEY ("manager_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_subscriptions" ADD CONSTRAINT "workspace_subscriptions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_workspace_created_idx" ON "activities" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "addresses_workspace_owner_idx" ON "addresses" USING btree ("workspace_id","owner_type","owner_id");--> statement-breakpoint
CREATE INDEX "addresses_workspace_city_idx" ON "addresses" USING btree ("workspace_id","city");--> statement-breakpoint
CREATE INDEX "ai_generations_workspace_feature_idx" ON "ai_generations" USING btree ("workspace_id","feature","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_workspace_created_idx" ON "audit_events" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "business_card_images_card_sort_uq" ON "business_card_images" USING btree ("business_card_id","sort_order");--> statement-breakpoint
CREATE INDEX "business_card_images_workspace_checksum_idx" ON "business_card_images" USING btree ("workspace_id","checksum_sha256");--> statement-breakpoint
CREATE INDEX "business_cards_workspace_status_idx" ON "business_cards" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "business_cards_workspace_collector_idx" ON "business_cards" USING btree ("workspace_id","collected_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_workspace_name_uq" ON "categories" USING btree ("workspace_id","normalized_name");--> statement-breakpoint
CREATE INDEX "chat_messages_workspace_thread_idx" ON "chat_messages" USING btree ("workspace_id","thread_id","created_at");--> statement-breakpoint
CREATE INDEX "chat_threads_workspace_user_idx" ON "chat_threads" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "contact_methods_workspace_value_idx" ON "contact_methods" USING btree ("workspace_id","normalized_value");--> statement-breakpoint
CREATE INDEX "contact_methods_workspace_owner_idx" ON "contact_methods" USING btree ("workspace_id","owner_type","owner_id");--> statement-breakpoint
CREATE INDEX "contacts_workspace_name_idx" ON "contacts" USING btree ("workspace_id","normalized_name");--> statement-breakpoint
CREATE INDEX "contacts_workspace_company_idx" ON "contacts" USING btree ("workspace_id","directory_company_id");--> statement-breakpoint
CREATE INDEX "contacts_workspace_owner_idx" ON "contacts" USING btree ("workspace_id","owner_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "digital_profiles_workspace_slug_uq" ON "digital_profiles" USING btree ("workspace_id","slug");--> statement-breakpoint
CREATE INDEX "digital_profiles_workspace_user_idx" ON "digital_profiles" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "directory_companies_workspace_name_idx" ON "directory_companies" USING btree ("workspace_id","normalized_name");--> statement-breakpoint
CREATE INDEX "directory_companies_workspace_domain_idx" ON "directory_companies" USING btree ("workspace_id","normalized_domain");--> statement-breakpoint
CREATE INDEX "directory_companies_workspace_status_idx" ON "directory_companies" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "duplicate_candidates_workspace_state_idx" ON "duplicate_candidates" USING btree ("workspace_id","state");--> statement-breakpoint
CREATE INDEX "extracted_fields_workspace_run_idx" ON "extracted_fields" USING btree ("workspace_id","extraction_run_id");--> statement-breakpoint
CREATE INDEX "extracted_fields_workspace_review_idx" ON "extracted_fields" USING btree ("workspace_id","user_decision");--> statement-breakpoint
CREATE INDEX "extraction_runs_workspace_card_idx" ON "extraction_runs" USING btree ("workspace_id","business_card_id");--> statement-breakpoint
CREATE UNIQUE INDEX "extraction_runs_generation_uq" ON "extraction_runs" USING btree ("generation_id");--> statement-breakpoint
CREATE INDEX "field_evidence_workspace_field_idx" ON "field_evidence" USING btree ("workspace_id","extracted_field_id");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_staff_user_uq" ON "platform_staff" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "products_services_workspace_company_idx" ON "products_services" USING btree ("workspace_id","company_id");--> statement-breakpoint
CREATE INDEX "record_notes_workspace_entity_idx" ON "record_notes" USING btree ("workspace_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "search_documents_workspace_entity_idx" ON "search_documents" USING btree ("workspace_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "share_links_workspace_idx" ON "share_links" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "share_views_workspace_link_idx" ON "share_views" USING btree ("workspace_id","share_link_id");--> statement-breakpoint
CREATE INDEX "taggings_workspace_entity_idx" ON "taggings" USING btree ("workspace_id","entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_workspace_name_uq" ON "tags" USING btree ("workspace_id","normalized_name");--> statement-breakpoint
CREATE INDEX "team_members_workspace_idx" ON "team_members" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_workspace_name_uq" ON "teams" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "usage_ledger_workspace_kind_idx" ON "usage_ledger" USING btree ("workspace_id","kind","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_provider_event_uq" ON "webhook_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_memberships_workspace_user_uq" ON "workspace_memberships" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "workspace_memberships_workspace_status_idx" ON "workspace_memberships" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_subscriptions_workspace_uq" ON "workspace_subscriptions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspaces_owner_idx" ON "workspaces" USING btree ("owner_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_one_personal_per_owner_uq" ON "workspaces" ("owner_user_id") WHERE "type" = 'personal' AND "status" <> 'deleted';--> statement-breakpoint
CREATE UNIQUE INDEX "contact_methods_one_primary_kind_uq" ON "contact_methods" ("workspace_id", "owner_type", "owner_id", "kind") WHERE "is_primary" = true;--> statement-breakpoint
CREATE INDEX "directory_companies_name_trgm_idx" ON "directory_companies" USING gin ("normalized_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "contacts_name_trgm_idx" ON "contacts" USING gin ("normalized_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "search_documents_embedding_hnsw_idx" ON "search_documents" USING hnsw ("embedding" vector_cosine_ops);
