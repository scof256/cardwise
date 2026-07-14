import { NextResponse } from "next/server";
import { submitEventForReview } from "@/lib/repositories/events";

async function submit({ workspaceSlug, eventId }: { workspaceSlug: string; eventId: string }) {
  try { return NextResponse.json({ event: await submitEventForReview(workspaceSlug, eventId) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to submit event." }, { status: 400 }); }
}
export async function POST(_request: Request, { params }: { params: Promise<{ workspaceSlug: string; eventId: string }> }) { return submit(await params); }
export async function GET(request: Request, { params }: { params: Promise<{ workspaceSlug: string; eventId: string }> }) { const values = await params; const response = await submit(values); if (!response.ok) return response; return NextResponse.redirect(new URL(`/app/${values.workspaceSlug}/events/${values.eventId}`, request.url)); }
