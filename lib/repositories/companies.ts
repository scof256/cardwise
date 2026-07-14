import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { getDb } from "@/db";
import { directoryCompanies } from "@/db/schema";

export type NewDirectoryCompany = {
  companyName: string;
  tagline?: string | null;
  description?: string | null;
  industry?: string | null;
  category?: string | null;
  productsServicesSummary?: string | null;
  websiteUrl?: string | null;
  normalizedDomain?: string | null;
  physicalAddressSummary?: string | null;
  ownerUserId?: string | null;
  ownerTeamId?: string | null;
};

export function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase("en").replace(/\s+/g, " ");
}

export async function listCompanies(workspaceId: string, limit = 50) {
  return getDb().select().from(directoryCompanies).where(and(eq(directoryCompanies.workspaceId, workspaceId), eq(directoryCompanies.status, "active"), isNull(directoryCompanies.deletedAt))).orderBy(desc(directoryCompanies.createdAt)).limit(Math.min(limit, 100));
}

export async function getCompany(workspaceId: string, id: string) {
  const [company] = await getDb().select().from(directoryCompanies).where(and(eq(directoryCompanies.workspaceId, workspaceId), eq(directoryCompanies.id, id), isNull(directoryCompanies.deletedAt))).limit(1);
  return company ?? null;
}

export async function createCompany(workspaceId: string, actorUserId: string, input: NewDirectoryCompany) {
  const id = createId();
  const { companyName, ...details } = input;
  const [company] = await getDb().insert(directoryCompanies).values({ id, workspaceId, createdByUserId: actorUserId, companyName: companyName.trim(), normalizedName: normalizeSearchValue(companyName), ...details }).returning();
  return company;
}

export async function archiveCompany(workspaceId: string, id: string) {
  const [company] = await getDb().update(directoryCompanies).set({ status: "archived", updatedAt: new Date() }).where(and(eq(directoryCompanies.workspaceId, workspaceId), eq(directoryCompanies.id, id))).returning();
  return company ?? null;
}
