import { NextResponse } from "next/server";
import { moderateEventParticipant, updateParticipantAttendance } from "@/lib/repositories/events";
import { attendanceUpdateSchema, participantModerationSchema } from "@/lib/validation/events";

export async function PATCH(request: Request, { params }: { params: Promise<{ workspaceSlug: string; eventId: string; participantId: string }> }) {
  try { const { workspaceSlug, eventId, participantId } = await params; const body = await request.json(); if (body.attendanceStatus) { const input = attendanceUpdateSchema.parse({ ...body, workspaceSlug }); return NextResponse.json({ participant: await updateParticipantAttendance(workspaceSlug, eventId, participantId, input.attendanceStatus) }); } const input = participantModerationSchema.parse({ ...body, workspaceSlug }); return NextResponse.json({ participant: await moderateEventParticipant(workspaceSlug, eventId, participantId, input.decision, input.reviewNotes) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update participant." }, { status: 400 }); }
}
