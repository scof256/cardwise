import { NextResponse } from "next/server";
import { createEventInvitation, listEventInvitations } from "@/lib/repositories/events";
import { eventInvitationInputSchema } from "@/lib/validation/events";

export async function GET(_request: Request, { params }: { params: Promise<{ workspaceSlug: string; eventId: string }> }) { try { const { workspaceSlug, eventId } = await params; return NextResponse.json({ invitations: await listEventInvitations(workspaceSlug, eventId) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to list invitations." }, { status: 403 }); } }
export async function POST(request: Request, { params }: { params: Promise<{ workspaceSlug: string; eventId: string }> }) { try { const { workspaceSlug, eventId } = await params; const input = eventInvitationInputSchema.parse(await request.json()); return NextResponse.json(await createEventInvitation(workspaceSlug, eventId, input), { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create invitation." }, { status: 400 }); } }
