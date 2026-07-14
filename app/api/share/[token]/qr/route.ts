import QRCode from "qrcode";
import { getPublicProfile } from "@/lib/sharing/public-profile";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!await getPublicProfile(token)) return new Response(null, { status: 404 });
  const shareUrl = `${new URL(request.url).origin}/p/${token}`;
  const png = await QRCode.toBuffer(shareUrl, { type: "png", width: 640, margin: 2, color: { dark: "#173b32", light: "#fffdf8" }, errorCorrectionLevel: "H" });
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300" } });
}

