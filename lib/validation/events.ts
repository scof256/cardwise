import { z } from "zod";

const optionalUrl = z.union([z.literal(""), z.string().url().max(1000)]).optional().transform((value) => value || undefined);

export const eventInputSchema = z.object({
  title: z.string().trim().min(3).max(180),
  summary: z.string().trim().min(10).max(320),
  description: z.string().trim().min(20).max(12000),
  eventType: z.string().trim().min(2).max(100),
  category: z.string().trim().max(120).optional().default(""),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  timezone: z.string().trim().min(1).max(100).default("Africa/Kampala"),
  venueName: z.string().trim().max(240).optional().default(""),
  addressLine1: z.string().trim().max(300).optional().default(""),
  addressLine2: z.string().trim().max(300).optional().default(""),
  city: z.string().trim().max(140).optional().default(""),
  region: z.string().trim().max(140).optional().default(""),
  country: z.string().trim().max(140).optional().default(""),
  isVirtual: z.boolean().default(false),
  virtualJoinUrl: optionalUrl,
  websiteUrl: optionalUrl,
  registrationUrl: optionalUrl,
  contactName: z.string().trim().max(180).optional().default(""),
  contactEmail: z.union([z.literal(""), z.string().email().max(320)]).optional().default(""),
  visibility: z.enum(["public", "unlisted", "workspace_only", "invite_only"]).default("public"),
  directoryAccess: z.enum(["public", "signed_in", "approved_participants", "disabled"]).default("public"),
  allowCompanySubmissions: z.boolean().default(true),
  allowIndividualSubmissions: z.boolean().default(true),
  allowPublicCardPreviews: z.boolean().default(false),
  chatEnabled: z.boolean().default(true),
}).strict().superRefine((value, context) => {
  if (value.endsAt <= value.startsAt) context.addIssue({ code: "custom", path: ["endsAt"], message: "The event must end after it starts." });
  if (!value.isVirtual && !value.venueName && !value.city) context.addIssue({ code: "custom", path: ["venueName"], message: "Add a venue or city for an in-person event." });
});

export const eventInvitationInputSchema = z.object({
  invitationType: z.enum(["sponsor", "exhibitor", "speaker", "company", "attendee"]),
  invitedEmail: z.union([z.literal(""), z.string().email().max(320)]).optional().default(""),
  allowedEmailDomain: z.string().trim().toLowerCase().max(253).regex(/^$|^[a-z0-9.-]+\.[a-z]{2,}$/i, "Enter a valid email domain.").optional().default(""),
  invitedWorkspaceId: z.string().trim().max(128).optional(),
  maxUses: z.number().int().min(1).max(10000).nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
}).strict();

export const eventCardVisibilitySchema = z.object({
  phone: z.boolean().default(false),
  email: z.boolean().default(true),
  website: z.boolean().default(true),
  location: z.boolean().default(true),
  socialMedia: z.boolean().default(true),
  productsServices: z.boolean().default(true),
  otherInformation: z.boolean().default(false),
  originalCardPreview: z.boolean().default(false),
}).strict();

export const eventParticipantSubmissionSchema = z.object({
  workspaceSlug: z.string().trim().min(1).max(120),
  sourceCompanyId: z.string().trim().min(1).max(128),
  businessCardIds: z.array(z.string().trim().min(1).max(128)).min(1).max(30),
  participantType: z.enum(["sponsor", "exhibitor", "speaker", "company", "attendee"]),
  visibility: eventCardVisibilitySchema,
  consentVersion: z.literal("event-sharing-v1"),
}).strict();

export const participantModerationSchema = z.object({
  workspaceSlug: z.string().trim().min(1).max(120),
  decision: z.enum(["approved", "changes_requested", "rejected", "hidden"]),
  reviewNotes: z.string().trim().max(3000).optional().default(""),
}).strict();

export const attendanceUpdateSchema = z.object({
  workspaceSlug: z.string().trim().min(1).max(120),
  attendanceStatus: z.enum(["registered", "checked_in", "organizer_confirmed", "no_show"]),
}).strict();

export const eventSearchSchema = z.object({
  query: z.string().trim().max(500).default(""),
  category: z.string().trim().max(120).optional(),
  city: z.string().trim().max(140).optional(),
  participantType: z.enum(["organizer", "sponsor", "exhibitor", "speaker", "company", "attendee"]).optional(),
  attendance: z.enum(["all", "confirmed"]).default("all"),
  limit: z.number().int().min(1).max(100).default(30),
}).strict();

export type EventInput = z.infer<typeof eventInputSchema>;
export type EventCardVisibility = z.infer<typeof eventCardVisibilitySchema>;

