import { createHash } from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { shareLinks, shareViews } from "@/db/schema";
import { getPublicProfile } from "@/lib/sharing/public-profile";
import { eq, sql } from "drizzle-orm";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function PublicProfilePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const profile = await getPublicProfile(token);
  if (!profile) notFound();
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent") ?? "";
  await getDb().transaction(async (tx) => {
    await tx.insert(shareViews).values({ id: createId(), workspaceId: profile.workspaceId, shareLinkId: profile.linkId, referrer: requestHeaders.get("referer"), country: requestHeaders.get("x-vercel-ip-country"), userAgentHash: createHash("sha256").update(userAgent).digest("hex") });
    await tx.update(shareLinks).set({ viewCount: sql`${shareLinks.viewCount} + 1`, updatedAt: new Date() }).where(eq(shareLinks.id, profile.linkId));
  });
  const phones = profile.methods.filter((method) => method.kind === "phone");
  const emails = profile.methods.filter((method) => method.kind === "email");
  return <main className="public-profile-page"><article className="public-profile-card"><div className="public-profile-brand"><span className="brand-mark"><i /><i /><i /></span><span>cardwise</span></div><div className="public-profile-avatar">{profile.displayName.split(" ").slice(0, 2).map((part) => part[0]).join("")}</div><span className="eyebrow">DIGITAL BUSINESS CARD</span><h1>{profile.displayName}</h1><h2>{profile.jobTitle}{profile.companyName ? ` · ${profile.companyName}` : ""}</h2>{profile.bio && <p>{profile.bio}</p>}<div className="public-profile-methods">{phones.map((method) => <a key={method.id} href={`tel:${method.displayValue}`}>{method.displayValue}</a>)}{emails.map((method) => <a key={method.id} href={`mailto:${method.displayValue}`}>{method.displayValue}</a>)}</div><div className="public-profile-actions"><a className="primary" href={`/api/share/${token}/vcard`}>Save contact</a><Image unoptimized width={96} height={96} src={`/api/share/${token}/qr`} alt="QR code for this digital business card" /></div><small>Shared securely with Cardwise</small></article></main>;
}
