import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { listPublicEvents } from "@/lib/repositories/events";
import { isConfiguredSuperadmin } from "@/lib/auth/superadmin";
import { CardwiseApp } from "./cardwise-app";

export const metadata: Metadata = {
  title: "Cardwise — Business intelligence, from every card",
  description: "An AI-powered business card wallet, contact manager, and company directory.",
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const [events, session] = await Promise.all([listPublicEvents(), auth()]);
  return <CardwiseApp clerkEnabled={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)} initialEvents={events} isSuperadmin={isConfiguredSuperadmin(session.userId)} />;
}
