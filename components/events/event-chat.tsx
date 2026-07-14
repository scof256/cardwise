"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageResponse } from "@/components/ai-elements/message";
import type { EventDirectoryCard } from "@/lib/events/demo-events";

function messageText(parts: Array<{ type: string; text?: string }>) {
  return parts.filter((part) => part.type === "text").map((part) => part.text ?? "").join("");
}

export function EventChat({ eventSlug, eventTitle, cards, initialPrompt = "" }: { eventSlug: string; eventTitle: string; cards: EventDirectoryCard[]; initialPrompt?: string }) {
  const [input, setInput] = useState("");
  const [matches, setMatches] = useState<EventDirectoryCard[]>([]);
  const transport = useMemo(() => new DefaultChatTransport({ api: `/api/events/${eventSlug}/chat` }), [eventSlug]);
  const { messages, sendMessage, status, error, stop } = useChat({ transport });
  const busy = status === "streaming" || status === "submitted";
  const initialPromptSent = useRef(false);

  const loadMatches = useCallback(async (query: string) => {
    try {
      const response = await fetch(`/api/events/${eventSlug}/search?q=${encodeURIComponent(query)}&limit=6`, { cache: "no-store" });
      if (!response.ok) throw new Error("Search unavailable");
      const payload = await response.json() as { cards?: EventDirectoryCard[] };
      setMatches(payload.cards ?? []);
    } catch {
      const tokens = query.toLowerCase().split(/\W+/).filter((token) => token.length > 2);
      const fallback = cards.map((card) => ({ card, score: tokens.filter((token) => [card.companyName, card.displayName, card.jobTitle, card.category, card.location, ...card.services].join(" ").toLowerCase().includes(token)).length })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 6).map((item) => item.card);
      setMatches(fallback);
    }
  }, [cards, eventSlug]);

  const ask = useCallback((value: string) => {
    if (!value || busy) return;
    setInput("");
    setMatches([]);
    void Promise.all([sendMessage({ text: value }), loadMatches(value)]);
  }, [busy, loadMatches, sendMessage]);

  useEffect(() => {
    if (!initialPrompt.trim() || initialPromptSent.current) return;
    initialPromptSent.current = true;
    ask(initialPrompt.trim());
  }, [ask, initialPrompt]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    ask(input.trim());
  }

  const suggestions = ["Who provides printing services?", "Show construction contacts", "Which companies are in Kampala?", "Find medical equipment suppliers"];

  return (
    <div className="event-chat-shell">
      <div className="event-chat-intro"><span>✦</span><div><small>ASK THIS EVENT</small><h1>Search the room,<br /><em>even after it ends.</em></h1><p>Answers use only approved fields shared for {eventTitle}.</p></div></div>
      <div className="event-chat-suggestions">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => ask(suggestion)} disabled={busy}>{suggestion}</button>)}</div>
      <div className="event-chat-thread" aria-live="polite">
        {messages.length === 0 && <div className="event-chat-empty"><span>◇</span><h2>Ask about people, companies, or services</h2><p>The model receives hybrid-search results filtered to this event and each participant&apos;s sharing choices.</p></div>}
        {messages.map((message, index) => {
          const text = messageText(message.parts as Array<{ type: string; text?: string }>);
          const lastAssistant = message.role === "assistant" && index === messages.length - 1;
          return <div className={`event-chat-message ${message.role}`} key={message.id}>{message.role === "assistant" ? <><div className="event-chat-label">✦ Cardwise event guide</div><MessageResponse>{text || "Searching approved event cards…"}</MessageResponse>{lastAssistant && matches.length > 0 && <div className="event-chat-results">{matches.map((card) => <article key={card.id}><span className="participant-chip">{card.participantType}</span><strong>{card.companyName}</strong><h3>{card.displayName}</h3><p>{card.jobTitle}</p><div>{card.services.slice(0, 2).map((service) => <span key={service}>{service}</span>)}</div><Link href={`/events/${eventSlug}/directory/${card.id}`}>View shared card →</Link></article>)}</div>}</> : <p>{text}</p>}</div>;
        })}
        {error && <p className="event-form-error">{error.message}</p>}
      </div>
      <form className="event-chat-composer" onSubmit={submit}><label><span className="sr-only">Ask about this event directory</span><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask which company, person, or service was at this event…" /></label>{busy ? <button type="button" onClick={() => void stop()} aria-label="Stop answer">■</button> : <button type="submit" disabled={!input.trim()} aria-label="Send question">↑</button>}<small>AI can make mistakes. Open a shared card to verify important details.</small></form>
    </div>
  );
}
