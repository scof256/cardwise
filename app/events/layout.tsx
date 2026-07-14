import { EventExperienceShell } from "@/components/events/event-experience-shell";
import { auth } from "@clerk/nextjs/server";
import { isConfiguredSuperadmin } from "@/lib/auth/superadmin";

export default async function EventsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return <EventExperienceShell clerkEnabled={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)} isSuperadmin={isConfiguredSuperadmin(session.userId)}>{children}</EventExperienceShell>;
}
