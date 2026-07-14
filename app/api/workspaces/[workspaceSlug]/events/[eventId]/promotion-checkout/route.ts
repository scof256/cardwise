import { NextResponse } from "next/server";
import { z } from "zod";
import { createEventPromotionCheckout } from "@/lib/events/promotions";

export async function POST(request: Request, { params }: { params: Promise<{ workspaceSlug: string; eventId: string }> }) { try { const { workspaceSlug, eventId } = await params; const { packageId } = z.object({ packageId: z.string().min(1).max(128) }).parse(await request.json()); const origin = new URL(request.url).origin; return NextResponse.json({ url: await createEventPromotionCheckout(workspaceSlug, eventId, packageId, origin) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to start checkout." }, { status: 400 }); } }
