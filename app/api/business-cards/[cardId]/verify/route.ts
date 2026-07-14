import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";
import { getDb } from "@/db";
import { addresses, auditEvents, businessCards, contactMethods, contacts, directoryCompanies, duplicateCandidates, productsServices } from "@/db/schema";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";
import { roleHasPermission } from "@/lib/auth/permissions";
import { normalizeSearchValue } from "@/lib/repositories/companies";
import { buildCompanySearchContent, indexCompanySearchDocument } from "@/lib/search/hybrid-search";

const reviewSchema = z.object({
  workspaceSlug: z.string().min(1), verificationStatus: z.enum(["draft", "verified"]), companyName: z.string().trim().min(1).max(240), industry: z.string().max(160), category: z.string().max(160), website: z.string().max(500), tagline: z.string().max(500), description: z.string().max(4000), productsServices: z.string().max(6000), companyPhones: z.string().max(1000), companyEmails: z.string().max(2000), physicalAddress: z.string().max(2000), socialMedia: z.string().max(2000), fullName: z.string().max(240), jobTitle: z.string().max(240), department: z.string().max(240), contactPhones: z.string().max(1000), contactEmails: z.string().max(2000), otherInformation: z.string().max(12000),
});

const splitValues = (value: string) => value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
const normalizedDomain = (value: string) => {
  if (!value.trim()) return null;
  try { return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; }
};
const normalizePhone = (value: string) => parsePhoneNumberFromString(value, "UG")?.number ?? value.replace(/\D/g, "");
const parseOtherInformation = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => { const separator = line.indexOf(":"); return separator > 0 ? { label: line.slice(0, separator).trim(), value: line.slice(separator + 1).trim() } : { label: "Note", value: line }; });

export async function POST(request: Request, { params }: { params: Promise<{ cardId: string }> }) {
  const parsed = reviewSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Review data is invalid", details: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;
  const context = await requireWorkspaceContext(input.workspaceSlug);
  const { cardId } = await params;
  const [card] = await getDb().select().from(businessCards).where(and(eq(businessCards.id, cardId), eq(businessCards.workspaceId, context.workspaceId))).limit(1);
  if (!card) return Response.json({ error: "Card not found" }, { status: 404 });
  const canReviewAny = roleHasPermission(context.role, "cards:review:any");
  const canReviewOwn = roleHasPermission(context.role, "cards:review:own") && card.collectedByUserId === context.userId;
  if (!canReviewAny && !canReviewOwn) return Response.json({ error: "You do not have permission to review this card" }, { status: 403 });

  if (input.verificationStatus === "draft") {
    await getDb().update(businessCards).set({ reviewDraft: input, verificationStatus: "draft", updatedAt: new Date() }).where(and(eq(businessCards.id, cardId), eq(businessCards.workspaceId, context.workspaceId)));
    return Response.json({ cardId, status: "draft" });
  }

  const companyId = createId();
  const contactId = input.fullName.trim() ? createId() : null;
  const domain = normalizedDomain(input.website);
  const companyPhones = splitValues(input.companyPhones);
  const companyEmails = splitValues(input.companyEmails).map((email) => email.toLowerCase());
  const contactPhones = splitValues(input.contactPhones);
  const contactEmails = splitValues(input.contactEmails).map((email) => email.toLowerCase());
  const services = splitValues(input.productsServices);
  const possibleDuplicates = domain ? await getDb().select({ id: directoryCompanies.id, normalizedDomain: directoryCompanies.normalizedDomain }).from(directoryCompanies).where(and(eq(directoryCompanies.workspaceId, context.workspaceId), eq(directoryCompanies.normalizedDomain, domain), eq(directoryCompanies.status, "active"))).limit(5) : [];

  await getDb().transaction(async (tx) => {
    await tx.insert(directoryCompanies).values({ id: companyId, workspaceId: context.workspaceId, companyName: input.companyName, normalizedName: normalizeSearchValue(input.companyName), tagline: input.tagline || null, description: input.description || null, industry: input.industry || null, category: input.category || null, productsServicesSummary: services.join(", ") || null, websiteUrl: input.website || null, normalizedDomain: domain, physicalAddressSummary: input.physicalAddress || null, otherInformation: parseOtherInformation(input.otherInformation), ownerUserId: context.userId, createdByUserId: context.userId });
    if (contactId) await tx.insert(contacts).values({ id: contactId, workspaceId: context.workspaceId, directoryCompanyId: companyId, fullName: input.fullName.trim(), normalizedName: normalizeSearchValue(input.fullName), jobTitle: input.jobTitle || null, department: input.department || null, ownerUserId: context.userId, createdByUserId: context.userId });
    const methods = [
      ...companyPhones.map((value, index) => ({ id: createId(), workspaceId: context.workspaceId, ownerType: "company" as const, ownerId: companyId, kind: "phone" as const, displayValue: value, normalizedValue: normalizePhone(value), isPrimary: index === 0, sourceType: "business_card", sourceId: cardId })),
      ...companyEmails.map((value, index) => ({ id: createId(), workspaceId: context.workspaceId, ownerType: "company" as const, ownerId: companyId, kind: "email" as const, displayValue: value, normalizedValue: value, isPrimary: index === 0, sourceType: "business_card", sourceId: cardId })),
      ...(input.website ? [{ id: createId(), workspaceId: context.workspaceId, ownerType: "company" as const, ownerId: companyId, kind: "website" as const, displayValue: input.website, normalizedValue: domain ?? input.website.toLowerCase(), isPrimary: true, sourceType: "business_card", sourceId: cardId }] : []),
      ...(contactId ? contactPhones.map((value, index) => ({ id: createId(), workspaceId: context.workspaceId, ownerType: "contact" as const, ownerId: contactId, kind: "phone" as const, displayValue: value, normalizedValue: normalizePhone(value), isPrimary: index === 0, sourceType: "business_card", sourceId: cardId })) : []),
      ...(contactId ? contactEmails.map((value, index) => ({ id: createId(), workspaceId: context.workspaceId, ownerType: "contact" as const, ownerId: contactId, kind: "email" as const, displayValue: value, normalizedValue: value, isPrimary: index === 0, sourceType: "business_card", sourceId: cardId })) : []),
    ];
    if (methods.length) await tx.insert(contactMethods).values(methods);
    if (input.physicalAddress.trim()) await tx.insert(addresses).values({ id: createId(), workspaceId: context.workspaceId, ownerType: "company", ownerId: companyId, normalizedValue: normalizeSearchValue(input.physicalAddress), line1: input.physicalAddress, isPrimary: true });
    if (services.length) await tx.insert(productsServices).values(services.map((name) => ({ id: createId(), workspaceId: context.workspaceId, companyId, name, normalizedName: normalizeSearchValue(name) })));
    if (possibleDuplicates.length) await tx.insert(duplicateCandidates).values(possibleDuplicates.map((duplicate) => ({ id: createId(), workspaceId: context.workspaceId, entityType: "company", leftEntityId: duplicate.id, rightEntityId: companyId, score: "1.000", matchingSignals: { exactDomain: domain }, state: "pending" })));
    await tx.update(businessCards).set({ directoryCompanyId: companyId, contactId, status: "verified", verificationStatus: "verified", verifiedAt: new Date(), reviewDraft: null, updatedAt: new Date() }).where(and(eq(businessCards.id, cardId), eq(businessCards.workspaceId, context.workspaceId)));
    await tx.insert(auditEvents).values({ id: createId(), workspaceId: context.workspaceId, actorUserId: context.userId, action: "business_card.verified", entityType: "business_card", entityId: cardId, after: { companyId, contactId } });
  });

  let searchIndexed = false;
  let searchIndexWarning: string | undefined;
  try {
    const searchContent = buildCompanySearchContent({
      companyName: input.companyName,
      industry: input.industry,
      category: input.category,
      tagline: input.tagline,
      description: input.description,
      productsServices: services,
      website: input.website,
      phones: companyPhones,
      emails: companyEmails,
      physicalAddress: input.physicalAddress,
      socialMedia: input.socialMedia,
      contactName: input.fullName,
      jobTitle: input.jobTitle,
      department: input.department,
      contactPhones,
      contactEmails,
      otherInformation: input.otherInformation,
    });
    await indexCompanySearchDocument({ workspaceId: context.workspaceId, entityId: companyId, content: searchContent });
    searchIndexed = true;
  } catch (error) {
    searchIndexWarning = error instanceof Error ? error.message : "The record was saved but search indexing failed.";
  }

  return Response.json({ cardId, companyId, contactId, duplicateCandidates: possibleDuplicates.length, status: "verified", searchIndexed, searchIndexWarning });
}
