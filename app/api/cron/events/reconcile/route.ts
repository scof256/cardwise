import { reconcileEventLifecycle } from "@/lib/repositories/events";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const result = await reconcileEventLifecycle();
  return Response.json({ ok: true, reconciledAt: new Date().toISOString(), ...result }, { headers: { "Cache-Control": "no-store" } });
}
