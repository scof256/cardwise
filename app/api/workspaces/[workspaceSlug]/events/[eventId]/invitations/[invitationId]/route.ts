import { NextResponse } from "next/server";
import { revokeEventInvitation } from "@/lib/repositories/events";

export async function DELETE(_request: Request, { params }: { params: Promise<{ workspaceSlug: string; eventId: string; invitationId: string }> }) {
  try {
    const { workspaceSlug, eventId, invitationId } = await params;
    return NextResponse.json({ invitation: await revokeEventInvitation(workspaceSlug, eventId, invitationId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to revoke invitation." }, { status: 400 });
  }
}
