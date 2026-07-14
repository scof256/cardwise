import { createPersonalWorkspace } from "./actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function OnboardingPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.DATABASE_URL) {
    return <main className="auth-page"><section className="auth-setup"><span className="eyebrow">SAAS SETUP</span><h1>Connect identity and database services</h1><p>Clerk and Neon environment variables are required before tenant onboarding can create durable accounts.</p><Link href="/">Open the interface preview</Link></section></main>;
  }

  return <main className="auth-page"><section className="auth-setup"><span className="eyebrow">WELCOME TO CARDWISE</span><h1>Create your first workspace</h1><p>Start personally. You can also create or join a company workspace through Clerk Organizations after onboarding.</p><form action={createPersonalWorkspace}><button className="primary" type="submit">Create personal workspace →</button></form></section></main>;
}
