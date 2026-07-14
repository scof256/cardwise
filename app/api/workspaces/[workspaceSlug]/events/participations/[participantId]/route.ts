import { NextResponse } from "next/server";
import { z } from "zod";
import { eventCardVisibilitySchema } from "@/lib/validation/events";
import { updateParticipantSharing, withdrawEventParticipant } from "@/lib/repositories/events";

const inputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("update_sharing"), visibility: eventCardVisibilitySchema }).strict(),
  z.object({ action: z.literal("withdraw") }).strict(),
]);

export async function PATCH(request: Request, { params }: { params: Promise<{ workspaceSlug: string; participantId: string }> }) {
  try {
    const { workspaceSlug, participantId } = await params;
    const input = inputSchema.parse(await request.json());
    const participant = input.action === "withdraw"
      ? await withdrawEventParticipant(workspaceSlug, participantId)
      : await updateParticipantSharing(workspaceSlug, participantId, input.visibility);
    return NextResponse.json({ participant });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update event sharing." }, { status: 400 });
  }
}
