import { createId } from "@paralleldrive/cuid2";
import { and, eq, inArray } from "drizzle-orm";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  addresses,
  auditEvents,
  businessCardImages,
  businessCards,
  contactMethods,
  contacts,
  directoryCompanies,
  productsServices,
  searchDocuments,
} from "@/db/schema";
import { getDb } from "@/db";
import { roleHasPermission } from "@/lib/auth/permissions";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";
import { normalizeSearchValue } from "@/lib/repositories/companies";
import { buildCompanySearchContent, indexCompanySearchDocument } from "@/lib/search/hybrid-search";
import { removePrivateObjects } from "@/lib/storage/supabase";

export const runtime = "nodejs";

const updateCompanySchema = z.object({
  workspaceSlug: z.string().trim().min(1).max(160),
  name: z.string().trim().min(1).max(240),
  industry: z.string().trim().max(160),
  category: z.string().trim().max(160),
  tagline: z.string().trim().max(500),
  description: z.string().trim().max(4000),
  contact: z.string().trim().max(240),
  role: z.string().trim().max(160),
  department: z.string().trim().max(240),
  companyPhones: z.string().max(1000),
  companyEmails: z.string().max(2000),
  contactPhones: z.string().max(1000),
  contactEmails: z.string().max(2000),
  socialMedia: z.string().max(2000),
  otherInformation: z.string().max(12000),
  site: z.string().trim().max(500),
  location: z.string().trim().max(500),
});
const deleteCompanySchema = z.object({ workspaceSlug: z.string().trim().min(1).max(160) });

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function normalizePhone(value: string) {
  return value ? (parsePhoneNumberFromString(value)?.number ?? value.replace(/[^\d+]/g, "")) : "";
}

const splitValues = (value: string) => [...new Set(value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean))];
const parseOtherInformation = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
  const separator = line.indexOf(":");
  return separator > 0 ? { label: line.slice(0, separator).trim(), value: line.slice(separator + 1).trim() } : { label: "Note", value: line };
});
const inferSocialKind = (value: string) => {
  const normalized = value.toLowerCase();
  if (normalized.includes("linkedin")) return "linkedin" as const;
  if (normalized.includes("instagram")) return "instagram" as const;
  if (normalized.includes("facebook")) return "facebook" as const;
  if (normalized.includes("whatsapp") || normalized.includes("wa.me")) return "whatsapp" as const;
  if (normalized.includes("twitter") || /(^|\W)x\.com/i.test(normalized)) return "x" as const;
  return "other" as const;
};

function normalizeDomain(value: string) {
  if (!value) return "";
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return value.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? "";
  }
}

async function requireWritableCompany(workspaceSlug: string, companyId: string) {
  const context = await requireWorkspaceContext(workspaceSlug);
  const db = getDb();
  const [company] = await db
    .select()
    .from(directoryCompanies)
    .where(
      and(
        eq(directoryCompanies.workspaceId, context.workspaceId),
        eq(directoryCompanies.id, companyId),
        eq(directoryCompanies.status, "active"),
      ),
    )
    .limit(1);

  if (!company || company.deletedAt) throw new ApiError("Card record not found.", 404);

  const canWriteAny = roleHasPermission(context.role, "directory:write:any");
  const canWriteOwn =
    roleHasPermission(context.role, "directory:write:own") &&
    (company.ownerUserId === context.userId || company.createdByUserId === context.userId);
  if (!canWriteAny && !canWriteOwn) throw new ApiError("You do not have permission to change this card.", 403);

  return { context, company };
}

function errorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: error.issues[0]?.message ?? "The card details are invalid." }, { status: 400 });
  }
  if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "The card could not be changed." },
    { status: 500 },
  );
}

export async function PATCH(request: Request, { params }: { params: Promise<{ companyId: string }> }) {
  try {
    const input = updateCompanySchema.parse(await request.json());
    const { companyId } = await params;
    const { context, company } = await requireWritableCompany(input.workspaceSlug, companyId);
    const db = getDb();
    const now = new Date();
    const companyPhones = splitValues(input.companyPhones);
    const companyEmails = splitValues(input.companyEmails).map((email) => email.toLowerCase());
    const contactPhones = splitValues(input.contactPhones);
    const contactEmails = splitValues(input.contactEmails).map((email) => email.toLowerCase());
    const socialMedia = splitValues(input.socialMedia);
    const otherInformation = parseOtherInformation(input.otherInformation);
    const labelForValue = (value: string) => {
      const comparable = value.replace(/\D/g, "") || value.toLowerCase();
      return otherInformation.find((item) => (item.value.replace(/\D/g, "") || item.value.toLowerCase()) === comparable)?.label ?? null;
    };
    const [primaryContact] = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.workspaceId, context.workspaceId),
          eq(contacts.directoryCompanyId, companyId),
          eq(contacts.status, "active"),
        ),
      )
      .limit(1);
    let savedContactId: string | null = primaryContact?.id ?? null;

    await db.transaction(async (tx) => {
      await tx
        .update(directoryCompanies)
        .set({
          companyName: input.name,
          normalizedName: normalizeSearchValue(input.name),
          industry: input.industry || null,
          category: input.category || null,
          tagline: input.tagline || null,
          description: input.description || null,
          websiteUrl: input.site || null,
          normalizedDomain: normalizeDomain(input.site) || null,
          physicalAddressSummary: input.location || null,
          otherInformation,
          updatedAt: now,
        })
        .where(and(eq(directoryCompanies.workspaceId, context.workspaceId), eq(directoryCompanies.id, companyId)));

      if (input.contact) {
        if (primaryContact) {
          await tx
            .update(contacts)
            .set({
              fullName: input.contact,
              normalizedName: normalizeSearchValue(input.contact),
              jobTitle: input.role || null,
              department: input.department || null,
              updatedAt: now,
            })
            .where(eq(contacts.id, primaryContact.id));
        } else {
          savedContactId = createId();
          await tx.insert(contacts).values({
            id: savedContactId,
            workspaceId: context.workspaceId,
            directoryCompanyId: companyId,
            fullName: input.contact,
            normalizedName: normalizeSearchValue(input.contact),
            jobTitle: input.role || null,
            department: input.department || null,
            ownerUserId: company.ownerUserId,
            createdByUserId: context.userId,
          });
          await tx
            .update(businessCards)
            .set({ contactId: savedContactId, updatedAt: now })
            .where(
              and(
                eq(businessCards.workspaceId, context.workspaceId),
                eq(businessCards.directoryCompanyId, companyId),
              ),
            );
        }
      } else if (primaryContact) {
        await tx
          .update(contacts)
          .set({ status: "archived", deletedAt: now, updatedAt: now })
          .where(eq(contacts.id, primaryContact.id));
        await tx
          .delete(contactMethods)
          .where(
            and(
              eq(contactMethods.workspaceId, context.workspaceId),
              eq(contactMethods.ownerType, "contact"),
              eq(contactMethods.ownerId, primaryContact.id),
            ),
          );
        savedContactId = null;
      }

      await tx
        .delete(contactMethods)
        .where(
          and(
            eq(contactMethods.workspaceId, context.workspaceId),
            eq(contactMethods.ownerType, "company"),
            eq(contactMethods.ownerId, companyId),
            inArray(contactMethods.kind, ["phone", "email", "website", "linkedin", "x", "instagram", "facebook", "whatsapp", "other"]),
          ),
        );

      if (savedContactId) {
        await tx
          .delete(contactMethods)
          .where(
            and(
              eq(contactMethods.workspaceId, context.workspaceId),
              eq(contactMethods.ownerType, "contact"),
              eq(contactMethods.ownerId, savedContactId),
              inArray(contactMethods.kind, ["phone", "email"]),
            ),
          );
      }

      const contactMethodOwnerId = savedContactId;
      const methods = [
        ...companyPhones.map((value, index) => ({ id: createId(), workspaceId: context.workspaceId, ownerType: "company" as const, ownerId: companyId, kind: "phone" as const, label: labelForValue(value), displayValue: value, normalizedValue: normalizePhone(value), isPrimary: index === 0, isVerified: false, sourceType: "manual" })),
        ...companyEmails.map((value, index) => ({ id: createId(), workspaceId: context.workspaceId, ownerType: "company" as const, ownerId: companyId, kind: "email" as const, displayValue: value, normalizedValue: value, isPrimary: index === 0, isVerified: false, sourceType: "manual" })),
        ...(input.site ? [{ id: createId(), workspaceId: context.workspaceId, ownerType: "company" as const, ownerId: companyId, kind: "website" as const, displayValue: input.site, normalizedValue: normalizeDomain(input.site), isPrimary: true, isVerified: false, sourceType: "manual" }] : []),
        ...socialMedia.map((value, index) => ({ id: createId(), workspaceId: context.workspaceId, ownerType: "company" as const, ownerId: companyId, kind: inferSocialKind(value), displayValue: value, normalizedValue: value.toLowerCase(), isPrimary: index === 0, isVerified: false, sourceType: "manual" })),
        ...(contactMethodOwnerId ? contactPhones.map((value, index) => ({ id: createId(), workspaceId: context.workspaceId, ownerType: "contact" as const, ownerId: contactMethodOwnerId, kind: "phone" as const, label: labelForValue(value), displayValue: value, normalizedValue: normalizePhone(value), isPrimary: index === 0, isVerified: false, sourceType: "manual" })) : []),
        ...(contactMethodOwnerId ? contactEmails.map((value, index) => ({ id: createId(), workspaceId: context.workspaceId, ownerType: "contact" as const, ownerId: contactMethodOwnerId, kind: "email" as const, displayValue: value, normalizedValue: value, isPrimary: index === 0, isVerified: false, sourceType: "manual" })) : []),
      ];
      if (methods.length) await tx.insert(contactMethods).values(methods);

      await tx
        .delete(addresses)
        .where(
          and(
            eq(addresses.workspaceId, context.workspaceId),
            eq(addresses.ownerType, "company"),
            eq(addresses.ownerId, companyId),
          ),
        );
      if (input.location) {
        await tx.insert(addresses).values({
          id: createId(),
          workspaceId: context.workspaceId,
          ownerType: "company",
          ownerId: companyId,
          line1: input.location,
          normalizedValue: normalizeSearchValue(input.location),
          isPrimary: true,
        });
      }

      await tx.insert(auditEvents).values({
        id: createId(),
        workspaceId: context.workspaceId,
        actorUserId: context.userId,
        action: "directory_company.updated",
        entityType: "company",
        entityId: companyId,
        before: {
          companyName: company.companyName,
          category: company.category,
          websiteUrl: company.websiteUrl,
          physicalAddressSummary: company.physicalAddressSummary,
        },
        after: {
          companyName: input.name,
          industry: input.industry || null,
          category: input.category || null,
          tagline: input.tagline || null,
          description: input.description || null,
          websiteUrl: input.site || null,
          physicalAddressSummary: input.location || null,
          companyPhones,
          companyEmails,
          contactPhones,
          contactEmails,
          socialMedia,
          otherInformation,
        },
      });
    });

    let searchIndexWarning: string | null = null;
    try {
      const services = await db
        .select({ name: productsServices.name })
        .from(productsServices)
        .where(
          and(
            eq(productsServices.workspaceId, context.workspaceId),
            eq(productsServices.companyId, companyId),
          ),
        );
      await indexCompanySearchDocument({
        workspaceId: context.workspaceId,
        entityId: companyId,
        content: buildCompanySearchContent({
          companyName: input.name,
          industry: input.industry || null,
          category: input.category || null,
          tagline: input.tagline || null,
          description: input.description || null,
          website: input.site || null,
          physicalAddress: input.location || null,
          otherInformation: otherInformation.map((item) => `${item.label}: ${item.value}`).join("\n"),
          productsServices: services.map((service) => service.name),
          phones: companyPhones,
          emails: companyEmails,
          socialMedia: socialMedia.join(", "),
          contactName: input.contact || null,
          jobTitle: input.role || null,
          department: input.department || null,
          contactPhones,
          contactEmails,
        }),
      });
    } catch (error) {
      searchIndexWarning = error instanceof Error ? error.message : "Search indexing failed.";
    }

    return NextResponse.json({
      company: {
        id: companyId,
        name: input.name,
        initials: input.name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((word) => word[0]?.toUpperCase())
          .join(""),
        category: input.category,
        industry: input.industry,
        tagline: input.tagline,
        description: input.description,
        contact: input.contact,
        role: input.role,
        department: input.department,
        companyPhones,
        companyEmails,
        contactPhones,
        contactEmails,
        phone: contactPhones[0] ?? companyPhones[0] ?? "",
        email: contactEmails[0] ?? companyEmails[0] ?? "",
        socialMedia,
        otherInformation,
        site: input.site,
        location: input.location,
      },
      searchIndexWarning,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ companyId: string }> }) {
  try {
    const input = deleteCompanySchema.parse(await request.json());
    const { companyId } = await params;
    const { context, company } = await requireWritableCompany(input.workspaceSlug, companyId);
    const db = getDb();
    const now = new Date();
    const linkedCards = await db
      .select({ id: businessCards.id })
      .from(businessCards)
      .where(
        and(
          eq(businessCards.workspaceId, context.workspaceId),
          eq(businessCards.directoryCompanyId, companyId),
        ),
      );
    const cardIds = linkedCards.map((card) => card.id);
    const linkedImages =
      cardIds.length > 0
        ? await db
            .select({ blobKey: businessCardImages.blobKey, sanitizedBlobKey: businessCardImages.sanitizedBlobKey })
            .from(businessCardImages)
            .where(
              and(
                eq(businessCardImages.workspaceId, context.workspaceId),
                inArray(businessCardImages.businessCardId, cardIds),
              ),
            )
        : [];

    await db.transaction(async (tx) => {
      await tx
        .update(directoryCompanies)
        .set({ status: "archived", deletedAt: now, updatedAt: now })
        .where(and(eq(directoryCompanies.workspaceId, context.workspaceId), eq(directoryCompanies.id, companyId)));
      await tx
        .update(contacts)
        .set({ status: "archived", deletedAt: now, updatedAt: now })
        .where(
          and(
            eq(contacts.workspaceId, context.workspaceId),
            eq(contacts.directoryCompanyId, companyId),
            eq(contacts.status, "active"),
          ),
        );
      await tx
        .delete(searchDocuments)
        .where(
          and(
            eq(searchDocuments.workspaceId, context.workspaceId),
            eq(searchDocuments.entityType, "company"),
            eq(searchDocuments.entityId, companyId),
          ),
        );
      await tx.insert(auditEvents).values({
        id: createId(),
        workspaceId: context.workspaceId,
        actorUserId: context.userId,
        action: "directory_company.deleted",
        entityType: "company",
        entityId: companyId,
        before: { companyName: company.companyName, status: company.status, linkedBusinessCards: cardIds.length },
        after: { status: "archived", deletedAt: now.toISOString() },
      });
    });

    let cleanupWarning: string | null = null;
    try {
      await removePrivateObjects(
        linkedImages.flatMap((image) => [image.sanitizedBlobKey, image.blobKey].filter((key): key is string => Boolean(key))),
      );
      if (cardIds.length > 0) {
        await db
          .delete(businessCards)
          .where(
            and(eq(businessCards.workspaceId, context.workspaceId), inArray(businessCards.id, cardIds)),
          );
      }
    } catch (error) {
      cleanupWarning = error instanceof Error ? error.message : "Original image cleanup failed.";
    }

    return NextResponse.json({ deleted: true, cleanupWarning });
  } catch (error) {
    return errorResponse(error);
  }
}
