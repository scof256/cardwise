import { NextResponse } from "next/server";
import { submitParticipantCards } from "@/lib/repositories/events";
import { eventParticipantSubmissionSchema } from "@/lib/validation/events";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) { try { const { token } = await params; const limited = await enforceRateLimit(request, "event-invite-submit", { limit: 10, windowSeconds: 600 }); if (limited) return limited; const input = eventParticipantSubmissionSchema.parse(await request.json()); return NextResponse.json(await submitParticipantCards(token, input), { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to submit cards." }, { status: 400 }); } }
