import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return <AuthSetup />;
  return <main className="auth-page"><SignIn signUpUrl="/sign-up" /></main>;
}

function AuthSetup() {
  return <main className="auth-page"><section className="auth-setup"><span className="eyebrow">SETUP REQUIRED</span><h1>Connect Clerk to enable accounts</h1><p>Add the Clerk keys from <code>.env.example</code> to <code>.env.local</code>, then restart the app.</p><Link href="/">Return to the product preview</Link></section></main>;
}
