import { NextResponse } from "next/server";
import { createWorkspaceEvent, listWorkspaceEvents } from "@/lib/repositories/events";
import { eventInputSchema } from "@/lib/validation/events";

export async function GET(_request: Request, { params }: { params: Promise<{ workspaceSlug: string }> }) {
  try { const { workspaceSlug } = await params; return NextResponse.json({ events: await listWorkspaceEvents(workspaceSlug) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to list events." }, { status: 403 }); }
}

export async function POST(request: Request, { params }: { params: Promise<{ workspaceSlug: string }> }) {
  try { const { workspaceSlug } = await params; const parsed = eventInputSchema.parse(await request.json()); const event = await createWorkspaceEvent(workspaceSlug, parsed); return NextResponse.json({ event }, { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create event." }, { status: 400 }); }
}
