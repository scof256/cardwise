"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AccountControls } from "@/components/account-controls";

const navigation = [
  { label: "Overview", icon: "⌂", href: "/?view=overview" },
  { label: "Upload business card", icon: "+", href: "/?view=upload" },
  { label: "All companies", icon: "▦", href: "/?view=companies" },
  { label: "All contacts", icon: "◎", href: "/?view=contacts" },
  { label: "Networking events", icon: "◇", href: "/events", eventSection: true },
  { label: "AI chat", icon: "✦", href: "/?view=chat" },
  { label: "Search & filters", icon: "⌕", href: "/?view=search" },
];

function Brand() {
  return <div className="brand"><span className="brand-mark"><i /><i /><i /></span><span>cardwise</span></div>;
}

function eventSlugFromPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  return parts[0] === "events" && parts[1] ? parts[1] : null;
}

export function EventExperienceShell({ children, clerkEnabled, isSuperadmin }: { children: React.ReactNode; clerkEnabled: boolean; isSuperadmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNav, setMobileNav] = useState(false);
  const [query, setQuery] = useState("");
  const eventSlug = eventSlugFromPath(pathname);
  const hasDedicatedComposer = pathname.endsWith("/chat");

  useEffect(() => {
    if (!mobileNav) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [mobileNav]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNav(false);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.querySelector<HTMLInputElement>("#event-global-ai-input")?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const navigate = (href: string) => {
    setMobileNav(false);
    router.push(href);
  };

  const ask = (event: React.FormEvent) => {
    event.preventDefault();
    const prompt = query.trim();
    if (!prompt) return;
    setQuery("");
    if (eventSlug) router.push(`/events/${eventSlug}/chat?prompt=${encodeURIComponent(prompt)}`);
    else router.push(`/?view=chat&prompt=${encodeURIComponent(prompt)}`);
  };

  return (
    <div className="app event-app-shell">
      {mobileNav && <button type="button" className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <aside id="event-application-sidebar" className={`sidebar ${mobileNav ? "open" : ""}`} aria-label="Cardwise navigation">
        <div className="sidebar-heading"><Brand /><button type="button" className="sidebar-close" aria-label="Close navigation menu" onClick={() => setMobileNav(false)}><span>Close</span><b aria-hidden="true">×</b></button></div>
        <p className="mobile-nav-guide">Choose where you want to go. Tap any section below.</p>
        <AccountControls clerkEnabled={clerkEnabled} placement="workspace" workspaceName="Personal workspace" />
        <nav aria-label="Main sections">
          <span className="nav-label">MAIN MENU</span>
          {navigation.map((item) => {
            const active = item.eventSection ? pathname.startsWith("/events") : false;
            return <button key={item.label} type="button" className={active ? "active" : ""} aria-current={active ? "page" : undefined} onClick={() => navigate(item.href)}><span aria-hidden="true">{item.icon}</span>{item.label}{active && <small className="nav-current">Current</small>}</button>;
          })}
          <span className="nav-label second">EVENT TOOLS</span>
          <button type="button" onClick={() => navigate("/events")}><span aria-hidden="true">◷</span>Upcoming events</button>
          <button type="button" onClick={() => navigate("/events?status=completed")}><span aria-hidden="true">✓</span>Past event directories</button>
          <button type="button" onClick={() => navigate("/onboarding")}><span aria-hidden="true">＋</span>Create or list an event</button>
          <button type="button" onClick={() => navigate("/?view=settings")}><span aria-hidden="true">⚙</span>Settings</button>
          {isSuperadmin && <button type="button" onClick={() => navigate("/superadmin")}><span aria-hidden="true">◆</span>Platform admin</button>}
        </nav>
        <div className="sidebar-bottom"><AccountControls clerkEnabled={clerkEnabled} placement="sidebar" /></div>
      </aside>
      <div className="main event-main">
        <div className="floating-page-actions" aria-label="Page actions">
          <button type="button" className="mobile-menu floating-menu" aria-label="Open navigation menu" aria-controls="event-application-sidebar" aria-expanded={mobileNav} onClick={() => setMobileNav((open) => !open)}><span aria-hidden="true">☰</span><strong>Menu</strong></button>
          <button type="button" className="floating-add-card" onClick={() => navigate("/?view=upload")}><span aria-hidden="true">＋</span><strong>Add card</strong></button>
        </div>
        {children}
      </div>
      {!hasDedicatedComposer && <div className="chat-composer global-ai-composer event-global-composer" aria-label={eventSlug ? "Ask about this event" : "Ask Cardwise"}>
        <form className="composer-form" onSubmit={ask}>
          <span className="composer-spark" aria-hidden="true">✦</span>
          <div className="composer-input-copy"><label htmlFor="event-global-ai-input">{eventSlug ? "Ask this event" : "Ask Cardwise"}</label><input id="event-global-ai-input" className="floating-ai-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={eventSlug ? "Find a person, company, service, or shared card…" : "Ask about a company, contact, service, or event…"} autoComplete="off" /></div>
          <kbd aria-hidden="true">⌘ K</kbd>
          <button type="submit" disabled={!query.trim()} aria-label="Send question">↑</button>
        </form>
        <small>{eventSlug ? "Grounded only in approved cards shared for this event." : "Search your network and public event directories with Cardwise AI."}</small>
      </div>}
    </div>
  );
}
