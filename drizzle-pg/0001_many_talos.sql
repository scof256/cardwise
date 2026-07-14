ALTER TABLE "business_cards" ADD COLUMN "review_draft" jsonb;--> statement-breakpoint
ALTER TABLE "directory_companies" ADD COLUMN "other_information" jsonb DEFAULT '[]'::jsonb NOT NULL;