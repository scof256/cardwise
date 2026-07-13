import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const companies = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyName: text("company_name").notNull(),
  logoUrl: text("logo_url"),
  tagline: text("tagline"),
  description: text("description"),
  industry: text("industry"),
  category: text("category"),
  productsServices: text("products_services", { mode: "json" }).$type<string[]>(),
  website: text("website"),
  phoneNumbers: text("phone_numbers", { mode: "json" }).$type<string[]>(),
  emailAddresses: text("email_addresses", { mode: "json" }).$type<string[]>(),
  physicalAddress: text("physical_address"),
  socialMedia: text("social_media", { mode: "json" }).$type<Record<string, string>>(),
  otherInformation: text("other_information", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const contacts = sqliteTable("contacts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull().references(() => companies.id),
  fullName: text("full_name").notNull(),
  jobTitle: text("job_title"),
  phoneNumbers: text("phone_numbers", { mode: "json" }).$type<string[]>(),
  emailAddresses: text("email_addresses", { mode: "json" }).$type<string[]>(),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const businessCards = sqliteTable("business_cards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull().references(() => companies.id),
  contactId: integer("contact_id").references(() => contacts.id),
  frontImageUrl: text("front_image_url"),
  backImageUrl: text("back_image_url"),
  additionalImageUrls: text("additional_image_urls", { mode: "json" }).$type<string[]>(),
  visionModelOutput: text("vision_model_output", { mode: "json" }).$type<Record<string, unknown>>(),
  extractedUnstructuredContent: text("extracted_unstructured_content"),
  fieldConfidenceScores: text("field_confidence_scores", { mode: "json" }).$type<Record<string, number>>(),
  overallConfidenceScore: integer("overall_confidence_score"),
  verificationStatus: text("verification_status", { enum: ["pending", "verified", "needs_review"] }).notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
