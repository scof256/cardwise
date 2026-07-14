import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);

// Authentication is initialized here; every protected page, action, and API
// performs its own resource-aware authorization on the server.
const authenticatedProxy = clerkMiddleware();

function setupProxy() {
  return NextResponse.next();
}

const proxy = clerkConfigured ? authenticatedProxy : setupProxy;
export default proxy;

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
