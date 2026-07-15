import { z } from "zod";

const evidenceSchema = z.object({
  imageIndex: z.number().int().min(0),
  side: z.enum(["front", "back", "additional", "unknown"]),
  textAsSeen: z.string().nullable(),
  visualReason: z.string().nullable(),
  boundingBox: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), width: z.number().min(0).max(1), height: z.number().min(0).max(1) }).nullable(),
});

const extractedValue = <T extends z.ZodTypeAny>(valueSchema: T) => z.object({
  value: valueSchema.nullable(),
  confidence: z.number().min(0).max(1),
  needsReview: z.boolean(),
  conflict: z.string().nullable(),
  evidence: z.array(evidenceSchema),
});

const stringField = extractedValue(z.string());
const stringListField = extractedValue(z.array(z.string()));
const exhaustiveContactListField = extractedValue(
  z.array(z.string()).describe("Every distinct value visible on every supplied card image. Include secondary, WhatsApp, office, mobile, and alternate values."),
);

export const businessCardExtractionSchema = z.object({
  schemaVersion: z.literal("1.0"),
  cardSummary: z.string(),
  company: z.object({
    name: stringField,
    tagline: stringField,
    description: stringField,
    industry: stringField,
    category: stringField,
    productsServices: stringListField,
    website: stringField,
    phoneNumbers: exhaustiveContactListField,
    emailAddresses: exhaustiveContactListField,
    physicalAddress: stringField,
    socialMedia: stringListField,
    logoDescription: stringField,
  }),
  contact: z.object({
    fullName: stringField,
    jobTitle: stringField,
    department: stringField,
    phoneNumbers: exhaustiveContactListField,
    emailAddresses: exhaustiveContactListField,
  }),
  otherInformation: extractedValue(z.array(z.object({ label: z.string(), value: z.string() }))),
  qrCodes: extractedValue(z.array(z.object({ content: z.string(), kind: z.string().nullable() }))),
  completeUnstructuredContent: z.string(),
  overallConfidence: z.number().min(0).max(1),
  reviewReasons: z.array(z.string()),
});

export type BusinessCardExtraction = z.infer<typeof businessCardExtractionSchema>;

export const BUSINESS_CARD_SCHEMA_VERSION = "1.0";
export const BUSINESS_CARD_PROMPT_VERSION = "2026-07-15.2";

export const businessCardExtractionInstructions = `You are a meticulous multimodal business-card analyst. Analyze every supplied image as one card record, including front, back, and additional images together.

Before mapping fields, perform an exhaustive visual transcription pass over every text region. Then verify that every distinct phone number, WhatsApp number, email address, website, social handle, street address, person name, title, product, service, slogan, and miscellaneous note from that transcription appears in the structured result. Never keep only the first contact value when multiple values are visible. Preserve labels such as Mobile, Office, WhatsApp, Direct, Tel, and Fax in otherInformation when they add meaning.

Understand layout, font size, proximity, icons, logos, and visual hierarchy. Separate company identity from the individual contact. Assign a contact method to the person or company suggested by its placement; if ownership is genuinely ambiguous, retain it rather than dropping it and explain the ambiguity in conflict/reviewReasons. Deduplicate exact repeated values within a field, but do not discard alternate values. Preserve meaningful content that does not fit primary fields in otherInformation.

Never invent content. Use null only when a value is not clearly visible or reasonably inferable. Confidence must reflect legibility, layout ambiguity, and conflicts between images. Mark uncertain or conflicting fields for review. Evidence imageIndex refers to the input image order and bounding boxes are normalized 0..1. completeUnstructuredContent must be a faithful, line-by-line transcription of all legible content across all images. Return only data that matches the requested schema.`;
