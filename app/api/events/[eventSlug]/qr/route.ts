import QRCode from "qrcode";
import { getPublicEvent } from "@/lib/repositories/events";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export async function GET(request: Request, { params }: { params: Promise<{ eventSlug: string }> }) {
  const { eventSlug } = await params;
  const limited = await enforceRateLimit(request, `event-qr:${eventSlug}`, { limit: 30, windowSeconds: 60 });
  if (limited) return limited;
  const event = await getPublicEvent(eventSlug);
  if (!event) return new Response("Event not found", { status: 404 });
  const url = new URL(`/events/${eventSlug}/directory?source=qr`, request.url).toString();
  const png = await QRCode.toBuffer(url, { type: "png", width: 720, margin: 3, color: { dark: "#173b32", light: "#fffdf8" } });
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Content-Disposition": `inline; filename="${eventSlug}-directory-qr.png"`, "Cache-Control": "public, max-age=3600" } });
}
