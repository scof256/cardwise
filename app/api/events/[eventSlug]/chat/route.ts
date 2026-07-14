import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { z } from "zod";
import { getChatModel } from "@/lib/ai/chat-model";
import { canViewEventDirectory, getPublicEvent, recordEventActivity, searchPublicEventDirectory } from "@/lib/repositories/events";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const requestSchema = z.object({
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(["system", "user", "assistant"]),
    parts: z.array(z.unknown()),
  })).min(1).max(40),
});

function latestUserText(messages: z.infer<typeof requestSchema>["messages"]) {
  const message = [...messages].reverse().find((item) => item.role === "user");
  return (message?.parts as Array<{ type?: string; text?: string }> | undefined)
    ?.filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join(" ")
    .trim() ?? "";
}

export async function POST(request: Request, { params }: { params: Promise<{ eventSlug: string }> }) {
  const { eventSlug } = await params;
  const limited = await enforceRateLimit(request, `event-chat:${eventSlug}`, { limit: 20, windowSeconds: 60 });
  if (limited) return limited;
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid chat request." }, { status: 400 });

  const event = await getPublicEvent(eventSlug);
  if (!event || !event.chatEnabled) return Response.json({ error: "Event chat is unavailable." }, { status: 404 });
  if (!(await canViewEventDirectory(eventSlug))) return Response.json({ error: "You do not have access to this event directory." }, { status: 403 });

  const query = latestUserText(parsed.data.messages);
  const cards = await searchPublicEventDirectory(eventSlug, query, 12);
  await recordEventActivity(event.id, "event_chat_query", { messageCount: parsed.data.messages.length, resultCount: cards.length });

  const context = cards.map((card, index) => `${index + 1}. ${card.displayName} — ${card.jobTitle || "Representative"} at ${card.companyName}; type: ${card.participantType}; attendance: ${card.attendanceStatus}; category: ${card.category}; location: ${card.location || "not shared"}; services: ${card.services.join(", ") || "not shared"}; email: ${card.email || "not shared"}; phone: ${card.phone || "not shared"}; website: ${card.website || "not shared"}.`).join("\n");
  const result = streamText({
    model: getChatModel(),
    system: `You are the Cardwise guide for ${event.title}. Answer only from the approved event-directory context below. Never invent details, infer private fields, or claim attendance beyond the attendance status visible in context. If the answer is not present, say so clearly. Be concise and useful. Mention relevant company and contact names so the interface can show their shared cards.\n\nAPPROVED EVENT DIRECTORY:\n${context || "No approved cards matched this question."}`,
    messages: await convertToModelMessages(parsed.data.messages as UIMessage[]),
  });
  return result.toUIMessageStreamResponse({ headers: { "Cache-Control": "no-store" } });
}
