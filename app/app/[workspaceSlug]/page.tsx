import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { CardwiseApp, type Company } from "@/app/cardwise-app";
import { getDb } from "@/db";
import { addresses, contactMethods, contacts, productsServices } from "@/db/schema";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";
import { isConfiguredSuperadmin } from "@/lib/auth/superadmin";
import { listCompanies } from "@/lib/repositories/companies";
import { listPublicEvents } from "@/lib/repositories/events";

export const dynamic = "force-dynamic";

export default async function WorkspacePage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const context = await requireWorkspaceContext(workspaceSlug);
  const [records, publicEvents, session] = await Promise.all([
    listCompanies(context.workspaceId, 100),
    listPublicEvents(),
    auth(),
  ]);
  const ids = records.map((record) => record.id);
  const [people, methods, services, locations] = ids.length ? await Promise.all([
    getDb().select().from(contacts).where(and(eq(contacts.workspaceId, context.workspaceId), inArray(contacts.directoryCompanyId, ids), eq(contacts.status, "active"))),
    getDb().select().from(contactMethods).where(and(eq(contactMethods.workspaceId, context.workspaceId), eq(contactMethods.ownerType, "company"), inArray(contactMethods.ownerId, ids))),
    getDb().select().from(productsServices).where(and(eq(productsServices.workspaceId, context.workspaceId), inArray(productsServices.companyId, ids))),
    getDb().select().from(addresses).where(and(eq(addresses.workspaceId, context.workspaceId), eq(addresses.ownerType, "company"), inArray(addresses.ownerId, ids))),
  ]) : [[], [], [], []];
  const peopleIds = people.map((person) => person.id);
  const peopleMethods = peopleIds.length ? await getDb().select().from(contactMethods).where(and(eq(contactMethods.workspaceId, context.workspaceId), eq(contactMethods.ownerType, "contact"), inArray(contactMethods.ownerId, peopleIds))) : [];
  const colors = ["coral", "navy", "green", "ochre"];
  const initialCompanies: Company[] = records.map((record, index) => {
    const person = people.find((item) => item.directoryCompanyId === record.id);
    const companyMethod = (kind: "phone" | "email" | "website") => methods.find((method) => method.ownerId === record.id && method.kind === kind && method.isPrimary) ?? methods.find((method) => method.ownerId === record.id && method.kind === kind);
    const personMethod = (kind: "phone" | "email") => person ? (peopleMethods.find((method) => method.ownerId === person.id && method.kind === kind && method.isPrimary) ?? peopleMethods.find((method) => method.ownerId === person.id && method.kind === kind)) : undefined;
    return { id: record.id, name: record.companyName, initials: record.companyName.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase(), contact: person?.fullName ?? "", role: person?.jobTitle ?? "", phone: personMethod("phone")?.displayValue ?? companyMethod("phone")?.displayValue ?? "", email: personMethod("email")?.displayValue ?? companyMethod("email")?.displayValue ?? "", site: companyMethod("website")?.displayValue ?? record.websiteUrl ?? "", location: locations.find((location) => location.ownerId === record.id)?.line1 ?? record.physicalAddressSummary ?? "", category: record.category ?? record.industry ?? "Uncategorized", services: services.filter((service) => service.companyId === record.id).map((service) => service.name), accent: colors[index % colors.length], added: record.createdAt.toLocaleDateString() };
  });
  return <CardwiseApp workspaceSlug={workspaceSlug} workspaceName={context.workspaceName} initialCompanies={initialCompanies} initialEvents={publicEvents} clerkEnabled={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)} isSuperadmin={isConfiguredSuperadmin(session.userId)} />;
}
