import { escapeVCard, getPublicProfile } from "@/lib/sharing/public-profile";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const profile = await getPublicProfile(token);
  if (!profile) return new Response(null, { status: 404 });
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${escapeVCard(profile.displayName)}`, profile.companyName ? `ORG:${escapeVCard(profile.companyName)}` : null, profile.jobTitle ? `TITLE:${escapeVCard(profile.jobTitle)}` : null, ...profile.methods.filter((method) => method.kind === "phone").map((method) => `TEL${method.isPrimary ? ";TYPE=PREF" : ""}:${escapeVCard(method.displayValue)}`), ...profile.methods.filter((method) => method.kind === "email").map((method) => `EMAIL${method.isPrimary ? ";TYPE=PREF" : ""}:${escapeVCard(method.displayValue)}`), profile.bio ? `NOTE:${escapeVCard(profile.bio)}` : null, "END:VCARD"].filter(Boolean).join("\r\n");
  return new Response(lines, { headers: { "Content-Type": "text/vcard; charset=utf-8", "Content-Disposition": `attachment; filename="${profile.displayName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.vcf"`, "Cache-Control": "private, no-store" } });
}

