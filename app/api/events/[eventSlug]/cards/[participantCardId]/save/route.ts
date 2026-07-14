import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublicEvent, saveEventContact } from "@/lib/repositories/events";

const bodySchema = z.object({ workspaceSlug: z.string().trim().min(1).max(120) }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ eventSlug: string; participantCardId: string }> }) {
  try {
    const { eventSlug, participantCardId } = await params;
    const { workspaceSlug } = bodySchema.parse(await request.json());
    const event = await getPublicEvent(eventSlug);
    if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
    return NextResponse.json(await saveEventContact(workspaceSlug, event.id, participantCardId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save contact.";
    return NextResponse.json({ error: message }, { status: message === "Unauthenticated" ? 401 : 400 });
  }
}
