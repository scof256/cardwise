import { NextResponse } from "next/server";
import { z } from "zod";
import { updateWorkspaceEvent } from "@/lib/repositories/events";
import { eventInputSchema } from "@/lib/validation/events";

export async function PATCH(request: Request, { params }: { params: Promise<{ workspaceSlug: string; eventId: string }> }) {
  try {
    const { workspaceSlug, eventId } = await params;
    const raw = await request.json() as Record<string, unknown>;
    const expectedUpdatedAt = raw.expectedUpdatedAt ? z.string().datetime().parse(raw.expectedUpdatedAt) : undefined;
    const eventValues = { ...raw };
    delete eventValues.expectedUpdatedAt;
    const input = eventInputSchema.parse(eventValues);
    const event = await updateWorkspaceEvent(workspaceSlug, eventId, input, expectedUpdatedAt ? new Date(expectedUpdatedAt) : undefined);
    return NextResponse.json({ event });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update event.";
    return NextResponse.json({ error: message }, { status: message.includes("another session") ? 409 : 400 });
  }
}
