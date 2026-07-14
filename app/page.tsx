import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { users, workspaceMemberships, workspaces } from "@/db/schema";
import { listPublicEvents } from "@/lib/repositories/events";
import { isConfiguredSuperadmin } from "@/lib/auth/superadmin";
import { CardwiseApp } from "./cardwise-app";

export const metadata: Metadata = {
  title: "Cardwise — Business intelligence, from every card",
  description: "An AI-powered business card wallet, contact manager, and company directory.",
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  if (session.userId && process.env.DATABASE_URL) {
    const [workspace] = await getDb()
      .select({ slug: workspaces.slug })
      .from(users)
      .innerJoin(workspaceMemberships, and(eq(workspaceMemberships.userId, users.id), eq(workspaceMemberships.status, "active")))
      .innerJoin(workspaces, and(eq(workspaces.id, workspaceMemberships.workspaceId), inArray(workspaces.status, ["trial", "active", "past_due"])))
      .where(eq(users.clerkUserId, session.userId))
      .limit(1);
    redirect(workspace ? `/app/${workspace.slug}` : "/onboarding");
  }

  const events = await listPublicEvents();
  return <CardwiseApp clerkEnabled={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)} initialEvents={events} isSuperadmin={isConfiguredSuperadmin(session.userId)} />;
}
