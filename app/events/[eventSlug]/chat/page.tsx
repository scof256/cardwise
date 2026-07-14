import Link from "next/link";
import { notFound } from "next/navigation";
import { EventChat } from "@/components/events/event-chat";
import { getPublicEvent, listPublicEventDirectory } from "@/lib/repositories/events";

export const dynamic = "force-dynamic";

export default async function EventChatPage({ params, searchParams }: { params: Promise<{ eventSlug: string }>; searchParams: Promise<{ prompt?: string }> }) {
  const { eventSlug } = await params;
  const [{ prompt }, event, cards] = await Promise.all([searchParams, getPublicEvent(eventSlug), listPublicEventDirectory(eventSlug)]);
  if (!event || !event.chatEnabled) notFound();
  return <div className="public-events-page"><main className="event-chat-page"><Link className="event-chat-back" href={`/events/${eventSlug}`}>← Back to event</Link><EventChat eventSlug={eventSlug} eventTitle={event.title} cards={cards} initialPrompt={prompt?.slice(0, 240)} /></main></div>;
}
