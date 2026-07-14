import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return <main className="auth-page"><section className="auth-setup"><span className="eyebrow">SETUP REQUIRED</span><h1>Connect Clerk to enable registration</h1><p>Copy <code>.env.example</code> to <code>.env.local</code> and add your Clerk credentials.</p><Link href="/">Return to the product preview</Link></section></main>;
  return <main className="auth-page"><SignUp signInUrl="/sign-in" /></main>;
}
