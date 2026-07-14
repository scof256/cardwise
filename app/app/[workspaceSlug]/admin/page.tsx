import { and, count, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { businessCards, contacts, directoryCompanies, users, workspaceMemberships, workspaceSubscriptions } from "@/db/schema";
import { requireWorkspacePermission } from "@/lib/auth/workspace-context";

export const dynamic = "force-dynamic";

export default async function WorkspaceAdminPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const context = await requireWorkspacePermission(workspaceSlug, "workspace:manage");
  const db = getDb();
  const [[companyCount], [contactCount], [cardCount], members, [subscription]] = await Promise.all([
    db.select({ value: count() }).from(directoryCompanies).where(and(eq(directoryCompanies.workspaceId, context.workspaceId), eq(directoryCompanies.status, "active"))),
    db.select({ value: count() }).from(contacts).where(and(eq(contacts.workspaceId, context.workspaceId), eq(contacts.status, "active"))),
    db.select({ value: count() }).from(businessCards).where(eq(businessCards.workspaceId, context.workspaceId)),
    db.select({ id: workspaceMemberships.id, role: workspaceMemberships.roleKey, status: workspaceMemberships.status, name: users.displayName, email: users.primaryEmail }).from(workspaceMemberships).innerJoin(users, eq(users.id, workspaceMemberships.userId)).where(eq(workspaceMemberships.workspaceId, context.workspaceId)),
    db.select().from(workspaceSubscriptions).where(eq(workspaceSubscriptions.workspaceId, context.workspaceId)).limit(1),
  ]);
  return <main className="page-shell admin-dashboard"><div className="page-title-row"><div><span className="eyebrow">COMPANY ADMIN</span><h1>{context.workspaceName}</h1><p>People, usage, ownership, and subscription controls for this workspace.</p></div><a className="primary admin-link" href={`/app/${workspaceSlug}`}>Open directory</a></div><section className="stats-grid"><div className="stat-card"><span className="stat-icon coral">◇</span><div><strong>{companyCount.value}</strong><span>Companies</span></div></div><div className="stat-card"><span className="stat-icon navy">◎</span><div><strong>{contactCount.value}</strong><span>Contacts</span></div></div><div className="stat-card"><span className="stat-icon green">▣</span><div><strong>{cardCount.value}</strong><span>Cards collected</span></div></div><div className="stat-card"><span className="stat-icon ochre">◈</span><div><strong>{subscription?.planKey ?? "Free"}</strong><span>{subscription?.status ?? "Trial"}</span></div></div></section><section className="admin-panel"><div className="section-head compact"><div><span className="eyebrow">TEAM ACCESS</span><h2>Members</h2></div><a href={`/app/${workspaceSlug}/admin/billing`}>Billing & plans →</a></div><div className="contact-list"><div className="contact-list-head"><span>Member</span><span>Role</span><span>Status</span><span>Account</span><span /></div>{members.map((member) => <div className="contact-row" key={member.id}><div><span className="avatar green">{member.name.split(" ").map((part) => part[0]).slice(0,2).join("")}</span><p><strong>{member.name}</strong><small>{member.email}</small></p></div><strong>{member.role.replace(/_/g, " ")}</strong><span>{member.status}</span><span>Clerk managed</span><button aria-label={`Options for ${member.name}`}>•••</button></div>)}</div></section></main>;
}

