"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AccountControls } from "@/components/account-controls";
import { MessageResponse } from "@/components/ai-elements/message";
import { EventsHomeSection } from "@/components/events/events-home-section";
import { demoCompanies as companies, type Company } from "@/lib/demo-directory";
import type { CardwiseUIMessage, OpenUIDirectoryPayload } from "@/lib/ai/openui";
import type { EventSummary } from "@/lib/events/demo-events";

export type { Company } from "@/lib/demo-directory";

const nav = [
  ["overview", "Overview", "⌂"], ["upload", "Upload business card", "+"], ["companies", "All companies", "▦"],
  ["contacts", "All contacts", "◎"], ["chat", "AI chat", "✦"], ["search", "Search & filters", "⌕"],
  ["recent", "Recently added", "◷"], ["categories", "Categories", "◇"], ["duplicates", "Duplicate review", "⊞"],
];
nav.splice(4, 0, ["events", "Networking events", "◇"]);

type SidebarNotification = { id: string; title: string; copy: string; time: string; target: string };
const sidebarNotifications: SidebarNotification[] = [
  { id: "review", title: "3 cards need review", copy: "Check low-confidence fields before these records are added.", time: "Now", target: "recent" },
  { id: "duplicates", title: "6 possible duplicates", copy: "Matching company details are ready for your decision.", time: "Today", target: "duplicates" },
  { id: "extraction", title: "Card extraction complete", copy: "Your newest business card is ready to review.", time: "Yesterday", target: "recent" },
];

const searchStopWords = new Set(["a", "an", "and", "are", "at", "business", "businesses", "card", "cards", "companies", "company", "contact", "contacts", "find", "for", "from", "in", "is", "me", "of", "provider", "providers", "sell", "selling", "service", "services", "show", "supplier", "suppliers", "that", "the", "these", "which", "who", "with"]);

function searchableCompany(company: Company) {
  return `${company.name} ${company.contact} ${company.role} ${company.phone} ${company.email} ${company.site} ${company.location} ${company.category} ${company.services.join(" ")}`.toLowerCase();
}

function searchCompanies(items: Company[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return items;
  const tokens = normalized
    .replace(/[^a-z0-9+@.\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.replace(/(ing|ers|ies|s)$/i, ""))
    .filter((token) => token.length > 1 && !searchStopWords.has(token));
  if (!tokens.length) return items;
  return items.filter((company) => {
    const haystack = searchableCompany(company);
    return tokens.every((token) => haystack.includes(token) || haystack.replace(/[\s()+-]/g, "").includes(token.replace(/[\s()+-]/g, "")));
  });
}

function useEscape(close: () => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close]);
}

function Brand() {
  return <div className="brand"><span className="brand-mark"><i /><i /><i /></span><span>cardwise</span></div>;
}

function Confidence({ value }: { value: number }) {
  const low = value < 85;
  return <span className={`confidence ${low ? "low" : ""}`}><span />{value}% {low ? "review" : "confident"}</span>;
}

function CardArtwork({ company = companies[0], image, side = "front" }: { company?: Company; image?: string; side?: "front" | "back" }) {
  if (image) return <Image unoptimized width={640} height={360} className="uploaded-card-image" src={image} alt="Uploaded business card" />;
  if (side === "back") return <div className={`card-art card-art-back ${company.accent}`}><div className="card-art-company">{company.name}</div><p>{company.services.join(" · ")}</p><div className="card-art-details"><span>{company.site}</span><span>{company.location}</span></div><div className="card-art-bars"><i /><i /><i /></div></div>;
  return (
    <div className={`card-art ${company.accent}`}>
      <div className="card-art-logo">{company.initials}</div>
      <div className="card-art-company">{company.name}</div>
      <div className="card-art-person">{company.contact}</div>
      <div className="card-art-role">{company.role}</div>
      <div className="card-art-details"><span>{company.phone}</span><span>{company.email}</span><span>{company.site}</span></div>
      <div className="card-art-bars"><i /><i /><i /></div>
    </div>
  );
}

function CompanyCard({ company, onOpen, onCard }: { company: Company; onOpen: () => void; onCard: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  const runMenuAction = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  return (
    <article className={`company-card ${menuOpen ? "menu-open" : ""}`}>
      <div className="company-card-top">
        <div className={`company-logo ${company.accent}`}>{company.initials}</div>
        <div className="more-menu" ref={menuRef}>
          <button type="button" className="more-menu-trigger" aria-label={`More options for ${company.name}`} aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>•••</button>
          {menuOpen && <div className="more-menu-popover" role="menu"><button type="button" role="menuitem" onClick={() => runMenuAction(onOpen)}>View record</button><button type="button" role="menuitem" onClick={() => runMenuAction(onCard)}>Original card</button></div>}
        </div>
      </div>
      <div className="company-card-identity">
        <div className="category-pill">{company.category}</div>
        <h3>{company.name}</h3>
        <p className="contact-line">{company.contact} <span>·</span> {company.role}</p>
      </div>
      <div className="company-card-information">
        <div className="card-meta"><span>⌕</span>{company.location}</div>
        <div className="card-meta"><span>↗</span>{company.email}</div>
        <div className="services">{company.services.slice(0, 2).map((s) => <span key={s}>{s}</span>)}</div>
      </div>
      <div className="card-actions"><button onClick={onOpen}>View full record</button><button className="icon-btn" onClick={onCard} aria-label="View original business card">▣</button></div>
    </article>
  );
}

function Overview({ go, items = companies, events }: { go: (value: string) => void; items?: Company[]; events: EventSummary[] }) {
  const [selected, setSelected] = useState<Company | null>(null);
  const [card, setCard] = useState<Company | null>(null);
  return (
    <div className="page-shell">
      <section className="welcome">
        <div><div className="eyebrow">MONDAY, JULY 13</div><h1>Your business network,<br /><em>beautifully organized.</em></h1><p>Turn every card into searchable company intelligence.</p></div>
        <button className="primary hero-action" onClick={() => go("upload")}><span>＋</span> Add business card</button>
      </section>
      <section className="stats-grid">
        <div className="stat-card"><span className="stat-icon coral">▦</span><div><strong>{items.length}</strong><span>Companies</span></div><small>In this workspace</small></div>
        <div className="stat-card"><span className="stat-icon navy">◎</span><div><strong>{items.filter((item) => item.contact).length}</strong><span>Contacts</span></div><small>Primary contacts</small></div>
        <div className="stat-card"><span className="stat-icon green">✓</span><div><strong>92%</strong><span>Verified</span></div><small>21 need review</small></div>
        <div className="stat-card"><span className="stat-icon ochre">⊞</span><div><strong>6</strong><span>Duplicates</span></div><small>Ready to merge</small></div>
      </section>
      <EventsHomeSection events={events} />
      <section className="section-head"><div><span className="eyebrow">YOUR DIRECTORY</span><h2>Recently added</h2></div><button className="text-button" onClick={() => go("companies")}>View all companies →</button></section>
      <div className="company-grid">{items.slice(0, 3).map((c) => <CompanyCard key={c.id} company={c} onOpen={() => setSelected(c)} onCard={() => setCard(c)} />)}</div>
      {selected && <RecordModal company={selected} close={() => setSelected(null)} onViewCard={() => { setCard(selected); setSelected(null); }} />}
      {card && <CardModal company={card} close={() => setCard(null)} />}
    </div>
  );
}

function FloatingAIComposer({ value, onChange, onSubmit, showSuggestions = false }: { value: string; onChange: (value: string) => void; onSubmit: (value: string) => void; showSuggestions?: boolean }) {
  const suggestions = ["Printing services in Kampala", "Construction contacts", "Cards added last month"];
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const prompt = value.trim();
    if (prompt) onSubmit(prompt);
  };

  return (
    <div className="chat-composer global-ai-composer" aria-label="Ask Cardwise">
      {showSuggestions && <div className="suggestion-row" aria-label="Suggested questions">{suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => onSubmit(suggestion)}>{suggestion}</button>)}</div>}
      <form className="composer-form" onSubmit={submit}>
        <span className="composer-spark" aria-hidden="true">✦</span>
        <div className="composer-input-copy">
          <label htmlFor="global-ai-input">Ask Cardwise</label>
          <input id="global-ai-input" className="floating-ai-input" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Ask about a company, contact, service, phone number, or location…" autoComplete="off" />
        </div>
        <kbd aria-hidden="true">⌘ K</kbd>
        <button type="submit" disabled={!value.trim()} aria-label="Ask Cardwise">↑</button>
      </form>
      <small>Grounded in your saved cards using Supabase hybrid search and OpenUI results.</small>
    </div>
  );
}

function Upload({ onReview, onCancel, workspaceSlug }: { onReview: (images: string[]) => void; onCancel: () => void; workspaceSlug?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const objectUrls = useRef(new Set<string>());
  useEffect(() => () => { objectUrls.current.forEach((url) => URL.revokeObjectURL(url)); objectUrls.current.clear(); }, []);
  const addFiles = (selected: FileList | null) => {
    if (!selected) return;
    const nextFiles = Array.from(selected).filter((file) => file.size <= 12 * 1024 * 1024).slice(0, 3 - files.length);
    setFiles((old) => [...old, ...nextFiles].slice(0, 3));
    const nextUrls = nextFiles.map((file) => URL.createObjectURL(file)); nextUrls.forEach((url) => objectUrls.current.add(url));
    setImages((old) => [...old, ...nextUrls].slice(0, 3));
  };
  const clearImages = () => {
    images.forEach((image) => { URL.revokeObjectURL(image); objectUrls.current.delete(image); });
    setImages([]); setFiles([]); setError("");
  };
  const analyze = async () => {
    setAnalyzing(true);
    setError("");
    if (!workspaceSlug) {
      window.setTimeout(() => onReview(images), 1400);
      return;
    }
    try {
      const createResponse = await fetch("/api/business-cards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceSlug, imageCount: files.length, source: "file_upload" }) });
      const created = await createResponse.json() as { cardId?: string; workspaceId?: string; imageIds?: string[]; error?: string };
      if (!createResponse.ok || !created.cardId || !created.workspaceId || !created.imageIds) throw new Error(created.error || "Could not create the card upload.");
      await Promise.all(files.map(async (file, index) => {
        const checksum = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()))).map((byte) => byte.toString(16).padStart(2, "0")).join("");
        const imageId = created.imageIds![index];
        const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const pathname = `workspaces/${created.workspaceId}/cards/${created.cardId}/${imageId}.${extension}`;
        const side = index === 0 ? "front" : index === 1 ? "back" : "additional";
        await upload(pathname, file, { access: "private", handleUploadUrl: "/api/uploads/business-card", clientPayload: JSON.stringify({ workspaceSlug, workspaceId: created.workspaceId, cardId: created.cardId, imageId, side, sortOrder: index, originalFilename: file.name, mimeType: file.type || "image/jpeg", byteSize: file.size, checksumSha256: checksum }) });
      }));
      const extractionResponse = await fetch(`/api/business-cards/${created.cardId}/extract`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceSlug }) });
      const extraction = await extractionResponse.json() as { error?: string };
      if (!extractionResponse.ok) throw new Error(extraction.error || "AI analysis could not be started.");
      for (let attempt = 0; attempt < 90; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
        const statusResponse = await fetch(`/api/business-cards/${created.cardId}?workspace=${encodeURIComponent(workspaceSlug)}`, { cache: "no-store" });
        const status = await statusResponse.json() as { card?: { status?: string }; extraction?: { errorMessage?: string } };
        if (status.card?.status === "awaiting_review") { window.location.assign(`/app/${workspaceSlug}/cards/${created.cardId}/review`); return; }
        if (status.card?.status === "failed") throw new Error(status.extraction?.errorMessage || "AI analysis failed. You can retry from the card record.");
      }
      throw new Error("Analysis is still running. The card is saved and can be reviewed from Recently Added.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed.");
      setAnalyzing(false);
    }
  };
  return (
    <div className="narrow-page upload-page">
      <div className="stepper"><span className="active"><b>1</b>Upload</span><i /><span><b>2</b>AI analysis</span><i /><span><b>3</b>Review & save</span></div>
      <div className="upload-title"><div className="eyebrow">NEW BUSINESS CARD</div><h1>Add a card to your directory</h1><p>Upload the front, back, or both sides. Cardwise reads layout, logos, visual hierarchy, and context—not just isolated text.</p></div>
      <div className="upload-layout">
        <section className="upload-panel">
          <div className="panel-head"><div><h2>Card images</h2><p>JPG, PNG, HEIC or WEBP · up to 12 MB each</p></div><span>{images.length}/3</span></div>
          <input ref={input} hidden type="file" accept="image/*" multiple onChange={(e) => addFiles(e.target.files)} />
          {images.length === 0 ? (
            <button className="drop-zone" onClick={() => input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}>
              <span className="upload-glyph">↑</span><strong>Drop card images here</strong><span>or click to browse from your device</span><small>TIP: For best results, use a well-lit, straight-on photo.</small>
            </button>
          ) : (
            <div className="image-slots">
              {images.map((image, i) => <div className="image-slot" key={image}><Image unoptimized width={420} height={240} src={image} alt={`Business card ${i + 1}`} /><span>{i === 0 ? "Front" : i === 1 ? "Back" : "Additional"}</span><button onClick={() => { URL.revokeObjectURL(image); objectUrls.current.delete(image); setImages(images.filter((_, n) => n !== i)); setFiles(files.filter((_, n) => n !== i)); }}>×</button></div>)}
              {images.length < 3 && <button className="add-side" onClick={() => input.current?.click()}><b>＋</b><span>Add {images.length === 1 ? "back side" : "another image"}</span></button>}
            </div>
          )}
          <div className="privacy-note"><span>◇</span><div><strong>Your cards stay private</strong><p>Images are encrypted in storage and only used to build your directory.</p></div></div>
        </section>
        <aside className="vision-panel"><span className="vision-icon">✦</span><h3>Vision-powered extraction</h3><p>Cardwise understands the card as a whole, using layout, typography, proximity, icons, and both sides together.</p><ul><li><span>✓</span>Separates company and person details</li><li><span>✓</span>Recognizes logos and categories</li><li><span>✓</span>Flags uncertain or conflicting fields</li><li><span>✓</span>Preserves every meaningful detail</li></ul></aside>
      </div>
      {error && <div className="upload-error" role="alert">{error}</div>}
      <div className="upload-footer"><button className="secondary" onClick={() => { clearImages(); onCancel(); }}>Cancel</button><button className="primary" disabled={!files.length || analyzing} onClick={analyze}>{analyzing ? <><span className="spinner" /> Uploading & analyzing…</> : <>Analyze with AI <span>✦</span></>}</button></div>
    </div>
  );
}

function Field({ label, value, confidence, wide, area }: { label: string; value: string; confidence: number; wide?: boolean; area?: boolean }) {
  const [content, setContent] = useState(value);
  return <label className={`review-field ${wide ? "wide" : ""}`}><span className="field-label">{label}<Confidence value={confidence} /></span>{area ? <textarea value={content} onChange={(e) => setContent(e.target.value)} /> : <input value={content} onChange={(e) => setContent(e.target.value)} />}</label>;
}

function Review({ images, saved, onDraft, onReplace }: { images: string[]; saved: () => void; onDraft: () => void; onReplace: () => void }) {
  const [side, setSide] = useState(0);
  return (
    <div className="review-page">
      <div className="review-heading"><div><div className="eyebrow">AI ANALYSIS COMPLETE</div><h1>Review extracted information</h1><p>We found 16 fields. Three need a quick check before saving.</p></div><div className="overall-score"><span>Overall confidence</span><strong>91%</strong><i><b /></i></div></div>
      <div className="review-layout">
        <aside className="card-preview-panel"><div className="preview-head"><h2>Original card</h2><span>{images.length || 1} image{images.length === 1 ? "" : "s"}</span></div><div className="large-card-preview"><CardArtwork image={images[side]} /></div>{images.length > 1 && <div className="side-tabs">{images.map((_, i) => <button key={i} className={side === i ? "active" : ""} onClick={() => setSide(i)}>{i === 0 ? "Front" : i === 1 ? "Back" : `Image ${i + 1}`}</button>)}</div>}<div className="image-quality"><span>✓</span><div><strong>Image quality: Excellent</strong><p>Sharp, well-lit, all edges visible</p></div></div><button className="secondary full" onClick={onReplace}>Replace image</button></aside>
        <main className="review-form">
          <section className="review-section"><div className="review-section-title"><span className="section-number">01</span><div><h2>Company</h2><p>Business identity and details</p></div></div><div className="field-grid"><Field label="Company name" value="Kampala Print Studio" confidence={98} /><Field label="Industry / category" value="Printing & Design" confidence={91} /><Field label="Website" value="kampalaprint.ug" confidence={96} /><Field label="Tagline" value="Ideas made tangible" confidence={82} /><Field wide label="Products & services" value="Large format printing, brand identity, packaging, signage" confidence={88} area /></div></section>
          <section className="review-section"><div className="review-section-title"><span className="section-number">02</span><div><h2>Contact person</h2><p>Individual details linked to this company</p></div></div><div className="field-grid"><Field label="Full name" value="Amina Nsubuga" confidence={97} /><Field label="Job title" value="Creative Director" confidence={94} /><Field label="Primary phone" value="+256 772 410 882" confidence={99} /><Field label="Primary email" value="amina@kampalaprint.ug" confidence={89} /></div></section>
          <section className="review-section"><div className="review-section-title"><span className="section-number">03</span><div><h2>Location & other information</h2><p>Additional context preserved by the model</p></div></div><div className="field-grid"><Field wide label="Physical address" value="Plot 14, Kira Road, Kamwokya, Kampala, Uganda" confidence={79} /><Field wide label="Other information" value="Opening hours: Mon–Sat, 8:00–18:00\nInstagram: @kampalaprintstudio\nQR code: WhatsApp catalogue link" confidence={86} area /></div></section>
        </main>
      </div>
      <div className="sticky-save"><div><span className="warning-dot">!</span><p><strong>3 fields need review</strong><br />Check highlighted confidence labels before saving.</p></div><div><button className="secondary" onClick={onDraft}>Save as draft</button><button className="primary" onClick={saved}>Save verified record <span>→</span></button></div></div>
    </div>
  );
}

type DirectoryProps = { title?: string; subtitle?: string; items?: Company[]; initialQuery?: string; initialCategory?: string; onAdd: () => void; onUpdate: (company: Company) => void };
function Directory({ title = "All companies", subtitle, items = companies, initialQuery = "", initialCategory = "All categories", onAdd, onUpdate }: DirectoryProps) {
  const [query, setQuery] = useState(initialQuery); const [selected, setSelected] = useState<Company | null>(null); const [card, setCard] = useState<Company | null>(null); const [filtersOpen, setFiltersOpen] = useState(false); const [category, setCategory] = useState(initialCategory); const [location, setLocation] = useState(""); const [sort, setSort] = useState<"recent" | "name">("recent"); const [view, setView] = useState<"grid" | "list">("grid");
  const filtered = useMemo(() => searchCompanies(items, query).filter((company) => category === "All categories" || company.category === category).filter((company) => !location.trim() || company.location.toLowerCase().includes(location.toLowerCase())).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : 0), [category, items, location, query, sort]);
  const categories = [...new Set(items.map((item) => item.category))]; const filterCount = Number(category !== "All categories") + Number(Boolean(location));
  return <div className="page-shell directory-page"><div className="page-title-row"><div><h1>{title}</h1><p>{subtitle ?? `${items.length} companies across ${categories.length} categories`}</p></div><button className="primary" onClick={onAdd}>＋ Add business card</button></div><div className="directory-tools"><div className="searchbox"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search companies, contacts or services" /></div><button className={`filter-button ${filtersOpen ? "active" : ""}`} onClick={() => setFiltersOpen((value) => !value)}>⊟ Filters {filterCount > 0 && <b>{filterCount}</b>}</button><button className={`view-toggle ${view === "grid" ? "active" : ""}`} onClick={() => setView("grid")} aria-label="Grid view">▦</button><button className={`view-toggle ${view === "list" ? "active" : ""}`} onClick={() => setView("list")} aria-label="List view">☷</button></div>{filtersOpen && <div className="directory-filter-panel"><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option>All categories</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></label><label>Location<input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City or district" /></label><button className="secondary" onClick={() => { setCategory("All categories"); setLocation(""); }}>Reset filters</button></div>} {(category !== "All categories" || location) && <div className="active-filters">{category !== "All categories" && <span>{category} <button aria-label="Remove category filter" onClick={() => setCategory("All categories")}>×</button></span>}{location && <span>Location: {location} <button aria-label="Remove location filter" onClick={() => setLocation("")}>×</button></span>}<button onClick={() => { setCategory("All categories"); setLocation(""); }}>Clear all</button></div>}<div className="results-line"><span>Showing {filtered.length} of {items.length} companies</span><button onClick={() => setSort((value) => value === "recent" ? "name" : "recent")}>Sort: {sort === "recent" ? "Recently added" : "Company name"}⌄</button></div>{filtered.length ? <div className={`company-grid directory-grid ${view === "list" ? "list-view" : ""}`}>{filtered.map((company) => <CompanyCard key={company.id} company={company} onOpen={() => setSelected(company)} onCard={() => setCard(company)} />)}</div> : <EmptyState title="No companies found" copy="Try a broader keyword or clear a filter." action="Clear search" onAction={() => { setQuery(""); setCategory("All categories"); setLocation(""); }} />}{selected && <RecordModal company={selected} close={() => setSelected(null)} onUpdate={(updated) => { onUpdate(updated); setSelected(updated); }} onViewCard={() => { setCard(selected); setSelected(null); }} />}{card && <CardModal company={card} close={() => setCard(null)} />}</div>;
}

function Contacts({ items = companies, onUpdate }: { items?: Company[]; onUpdate: (company: Company) => void }) {
  const [query, setQuery] = useState(""); const [selected, setSelected] = useState<Company | null>(null); const [card, setCard] = useState<Company | null>(null); const [editing, setEditing] = useState(false); const filtered = searchCompanies(items.filter((item) => item.contact), query);
  return <div className="page-shell"><div className="page-title-row"><div><h1>All contacts</h1><p>{items.filter((item) => item.contact).length} people connected to your company directory</p></div><button className="primary" onClick={() => setEditing(true)}>＋ Add contact</button></div><div className="searchbox contact-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search contacts, companies, phone or email" /></div><div className="contact-list"><div className="contact-list-head"><span>Contact</span><span>Company</span><span>Phone</span><span>Added</span><span /></div>{filtered.map((company) => <button className="contact-row" key={company.id} onClick={() => setSelected(company)}><div><span className={`avatar ${company.accent}`}>{company.contact.split(" ").map((part) => part[0]).join("")}</span><p><strong>{company.contact}</strong><small>{company.email}</small></p></div><div><strong>{company.name}</strong><small>{company.role}</small></div><span>{company.phone}</span><span>{company.added}</span><span>→</span></button>)}</div>{!filtered.length && <EmptyState title="No contacts found" copy="Try another name, company, email, or phone number." action="Clear search" onAction={() => setQuery("")} />}{selected && <RecordModal company={selected} close={() => setSelected(null)} onUpdate={(updated) => { onUpdate(updated); setSelected(updated); }} onViewCard={() => { setCard(selected); setSelected(null); }} />}{card && <CardModal company={card} close={() => setCard(null)} />}{editing && <ContactEditor items={items} close={() => setEditing(false)} onSave={(updated) => { onUpdate(updated); setEditing(false); }} />}</div>;
}

type ChatSession = {
  id: string;
  title: string;
  messages: CardwiseUIMessage[];
  createdAt: string;
  updatedAt: string;
};

function createChatSession(): ChatSession {
  const now = new Date().toISOString();
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { id, title: "New conversation", messages: [], createdAt: now, updatedAt: now };
}

function messageText(message: CardwiseUIMessage) {
  return message.parts.filter((part) => part.type === "text").map((part) => part.text).join("");
}

function AIChat({ workspaceSlug, items = companies, initialQuery = "", launchId = 0 }: { workspaceSlug?: string; items?: Company[]; initialQuery?: string; launchId?: number }) {
  const storageKey = `cardwise-chat-sessions:v1:${workspaceSlug || "personal-preview"}`;
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [launchPrompt, setLaunchPrompt] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [selected, setSelected] = useState<Company | null>(null);
  const [card, setCard] = useState<Company | null>(null);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      let stored: ChatSession[] = [];
      try {
        const value = window.localStorage.getItem(storageKey);
        stored = value ? JSON.parse(value) as ChatSession[] : [];
      } catch {
        stored = [];
      }
      const launchKey = `cardwise-chat-launch:${workspaceSlug || "personal-preview"}:${launchId}`;
      const isNewLaunch = Boolean(initialQuery.trim()) && window.sessionStorage.getItem(launchKey) !== "handled";
      if (isNewLaunch) {
        window.sessionStorage.setItem(launchKey, "handled");
        const next = createChatSession();
        setSessions([next, ...stored]);
        setActiveSessionId(next.id);
        setLaunchPrompt(initialQuery.trim());
      } else if (stored.length) {
        setSessions(stored);
        setActiveSessionId(stored[0].id);
      } else {
        const next = createChatSession();
        setSessions([next]);
        setActiveSessionId(next.id);
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(hydrationTimer);
  }, [initialQuery, launchId, storageKey, workspaceSlug]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKey, JSON.stringify(sessions.slice(0, 40)));
  }, [hydrated, sessions, storageKey]);

  const activeSession = sessions.find((session) => session.id === activeSessionId);
  const deleteRemoteHistory = (mode: "all" | "session", threadId?: string) => {
    if (!workspaceSlug) return;
    void fetch("/api/chat/history", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceSlug, mode, threadId }) });
  };
  const updateMessages = useCallback((id: string, messages: CardwiseUIMessage[]) => {
    setSessions((current) => current.map((session) => {
      if (session.id !== id) return session;
      const firstQuestion = messages.find((message) => message.role === "user");
      const title = session.title === "New conversation" && firstQuestion ? messageText(firstQuestion).slice(0, 52) : session.title;
      return { ...session, title: title || "New conversation", messages, updatedAt: new Date().toISOString() };
    }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }, []);
  const startNewChat = () => {
    const next = createChatSession();
    setSessions((current) => [next, ...current]);
    setActiveSessionId(next.id);
    setLaunchPrompt("");
    setHistoryOpen(false);
  };
  const deleteSession = (id: string) => {
    deleteRemoteHistory("session", id);
    setSessions((current) => {
      const remaining = current.filter((session) => session.id !== id);
      if (remaining.length) {
        if (activeSessionId === id) setActiveSessionId(remaining[0].id);
        return remaining;
      }
      const next = createChatSession();
      setActiveSessionId(next.id);
      return [next];
    });
  };
  const clearAllHistory = () => {
    if (!window.confirm("Clear every saved chat on this device? This cannot be undone.")) return;
    const next = createChatSession();
    deleteRemoteHistory("all");
    setSessions([next]);
    setActiveSessionId(next.id);
    setLaunchPrompt("");
  };
  const renameSession = (session: ChatSession) => {
    const title = window.prompt("Rename this conversation", session.title)?.trim();
    if (title) setSessions((current) => current.map((item) => item.id === session.id ? { ...item, title: title.slice(0, 80) } : item));
  };

  return (
    <div className="chat-page modern-chat-page">
      <div className="chat-hero">
        <span className="chat-spark">✦</span>
        <div><div className="eyebrow">ASK CARDWISE</div><h1>Search your network<br /><em>like you remember it.</em></h1></div>
        <div className="chat-header-actions">
          <button type="button" className="secondary" onClick={() => setHistoryOpen((value) => !value)} aria-expanded={historyOpen}>☰ <span>History</span></button>
          <button type="button" className="primary" onClick={startNewChat}>＋ New chat</button>
        </div>
      </div>
      <div className={`chat-workspace ${historyOpen ? "history-open" : ""}`}>
        {historyOpen && <aside className="chat-history" aria-label="Chat history">
          <div className="chat-history-head"><div><strong>Conversations</strong><small>Saved on this device</small></div><button type="button" onClick={startNewChat} aria-label="Start a new chat">＋</button></div>
          <div className="chat-session-list">
            {sessions.map((session) => <div className={`chat-session ${session.id === activeSessionId ? "active" : ""}`} key={session.id}>
              <button type="button" className="chat-session-main" onClick={() => { setActiveSessionId(session.id); setLaunchPrompt(""); }}>
                <span aria-hidden="true">✦</span><span><strong>{session.title}</strong><small>{session.messages.length ? `${session.messages.length} messages` : "No messages yet"}</small></span>
              </button>
              <div className="chat-session-actions"><button type="button" onClick={() => renameSession(session)} aria-label={`Rename ${session.title}`}>✎</button><button type="button" onClick={() => deleteSession(session.id)} aria-label={`Delete ${session.title}`}>×</button></div>
            </div>)}
          </div>
          <button type="button" className="clear-history-button" onClick={clearAllHistory}>♲ Clear all history</button>
        </aside>}
        <section className="chat-conversation" aria-label={activeSession?.title || "Conversation"}>
          {!hydrated || !activeSession ? <div className="chat-loading"><span className="spinner" /> Loading conversation…</div> : <ChatConversation key={activeSession.id} session={activeSession} workspaceSlug={workspaceSlug} items={items} initialPrompt={launchPrompt} onInitialPromptSent={() => setLaunchPrompt("")} onMessagesChange={updateMessages} onSelect={setSelected} onCard={setCard} />}
        </section>
      </div>
      {selected && <RecordModal company={selected} close={() => setSelected(null)} onViewCard={() => { setCard(selected); setSelected(null); }} />}
      {card && <CardModal company={card} close={() => setCard(null)} />}
    </div>
  );
}

function ChatConversation({ session, workspaceSlug, items, initialPrompt, onInitialPromptSent, onMessagesChange, onSelect, onCard }: { session: ChatSession; workspaceSlug?: string; items: Company[]; initialPrompt: string; onInitialPromptSent: () => void; onMessagesChange: (id: string, messages: CardwiseUIMessage[]) => void; onSelect: (company: Company) => void; onCard: (company: Company) => void }) {
  const [query, setQuery] = useState("");
  const initialQuerySent = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const transport = useMemo(() => new DefaultChatTransport<CardwiseUIMessage>({
    api: "/api/chat",
    prepareSendMessagesRequest: ({ messages }) => ({ body: { messages, workspaceSlug: workspaceSlug || null, threadId: session.id } }),
  }), [session.id, workspaceSlug]);
  const { messages, sendMessage, regenerate, stop, status, error, clearError, setMessages } = useChat<CardwiseUIMessage>({ id: session.id, messages: session.messages, transport });
  const loading = status === "submitted" || status === "streaming";

  useEffect(() => { onMessagesChange(session.id, messages); }, [messages, onMessagesChange, session.id]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: status === "streaming" ? "auto" : "smooth", block: "end" }); }, [messages, status]);
  useEffect(() => {
    if (!initialPrompt.trim() || initialQuerySent.current) return;
    initialQuerySent.current = true;
    onInitialPromptSent();
    void sendMessage({ text: initialPrompt.trim() });
  }, [initialPrompt, onInitialPromptSent, sendMessage]);

  const submit = async (value = query) => {
    const prompt = value.trim();
    if (!prompt || loading) return;
    setQuery("");
    clearError();
    await sendMessage({ text: prompt });
  };
  const clearConversation = () => {
    if (messages.length && !window.confirm("Clear the messages in this conversation?")) return;
    setMessages([]);
    if (workspaceSlug) void fetch("/api/chat/history", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceSlug, mode: "messages", threadId: session.id }) });
  };
  const companyFromOpenUI = (payload: OpenUIDirectoryPayload, index: number): Company => {
    const item = payload.components[index];
    const known = items.find((candidate) => String(candidate.id) === item.id);
    return known ?? { id: item.id, name: item.companyName, initials: item.companyName.split(" ").slice(0, 2).map((part) => part[0]).join(""), contact: item.contactPerson ?? "No contact listed", role: item.jobTitle ?? "", phone: item.phone ?? "", email: item.email ?? "", site: item.website ?? "", location: item.location ?? "Location not listed", category: item.category ?? "Uncategorized", services: item.productsServices, accent: ["coral", "navy", "green", "ochre"][index % 4], added: "Saved record" };
  };

  return <>
    <div className="conversation-toolbar"><div><strong>{session.title}</strong><small>Cardwise remembers messages in this conversation</small></div><button type="button" onClick={clearConversation} disabled={!messages.length || loading}>Clear conversation</button></div>
    <div className="chat-thread">
      {!messages.length && <div className="chat-empty-state"><span>✦</span><h2>What would you like to find?</h2><p>Ask in everyday language. Cardwise searches your saved directory, then answers with the matching original records.</p><div>{["Printing services in Kampala", "Who works in construction?", "Find a company by phone number"].map((prompt) => <button type="button" key={prompt} onClick={() => void submit(prompt)}>{prompt}</button>)}</div></div>}
      {messages.map((message, messageIndex) => {
        const text = messageText(message);
        if (message.role === "user") return <div className="user-message-wrap" key={message.id}><div className="user-message">{text}</div></div>;
        const openUIParts = message.parts.filter((part) => part.type === "data-openui");
        const openUI = openUIParts.length ? openUIParts[openUIParts.length - 1].data : null;
        const results = openUI ? openUI.components.map((_, index) => companyFromOpenUI(openUI, index)) : [];
        const isLast = messageIndex === messages.length - 1;
        return <div className="assistant-message" key={message.id}><div className="assistant-label"><span>✦</span>Cardwise</div><div aria-live={isLast ? "polite" : "off"}><MessageResponse className="ai-answer">{text || "Searching the directory and asking the AI…"}</MessageResponse></div>{openUI && <><div className="chat-results">{results.map((company) => <CompanyCard key={company.id} company={company} onOpen={() => onSelect(company)} onCard={() => onCard(company)} />)}</div><small>{openUI.protocol} · {openUI.retrieval.method} · {openUI.retrieval.documentCount} context records</small></>}<div className="message-actions"><button type="button" onClick={() => void navigator.clipboard.writeText(text)} disabled={!text}>⧉ Copy</button>{isLast && !loading && <button type="button" onClick={() => void regenerate({ messageId: message.id })}>↻ Try again</button>}</div></div>;
      })}
      {error && <div className="upload-error chat-error" role="alert"><span>{error.message || "The AI request failed."}</span><button type="button" onClick={() => void regenerate()}>Try again</button><button type="button" onClick={clearError}>Dismiss</button></div>}
      <div ref={endRef} />
    </div>
    <div className="chat-composer"><div className="suggestion-row"><button type="button" onClick={() => void submit("Show construction contacts")}>Show construction contacts</button><button type="button" onClick={() => void submit("Find cards added last month")}>Find cards added last month</button><button type="button" onClick={() => void submit("Medical equipment suppliers")}>Medical equipment suppliers</button></div><div><span>✦</span><textarea rows={1} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} placeholder="Message Cardwise…" aria-label="Message Cardwise" />{loading ? <button type="button" onClick={stop} aria-label="Stop generating">■</button> : <button type="button" onClick={() => void submit()} disabled={!query.trim()} aria-label="Send message">↑</button>}</div><small>Enter to send · Shift + Enter for a new line · Responses use Supabase hybrid search and your conversation history.</small></div>
  </>;
}

function SearchFilters({ items = companies }: { items?: Company[] }) {
  const [keyword, setKeyword] = useState(""); const [category, setCategory] = useState("All categories"); const [location, setLocation] = useState(""); const [semantic, setSemantic] = useState(""); const [results, setResults] = useState(items); const [selected, setSelected] = useState<Company | null>(null); const [card, setCard] = useState<Company | null>(null); const categories = [...new Set(items.map((item) => item.category))];
  const apply = (semanticQuery = "") => { const searched = searchCompanies(items, semanticQuery || keyword); setResults(searched.filter((item) => category === "All categories" || item.category === category).filter((item) => !location.trim() || item.location.toLowerCase().includes(location.toLowerCase()))); };
  const reset = () => { setKeyword(""); setCategory("All categories"); setLocation(""); setSemantic(""); setResults(items); };
  return <div className="page-shell"><div className="page-title-row"><div><h1>Search & filters</h1><p>Find the right company or person with precise criteria</p></div></div><div className="advanced-search"><aside><div className="filter-section"><label>Keyword search</label><input value={keyword} onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") apply(); }} placeholder="Name, service, phone…" /></div><div className="filter-section"><label>Category</label><select value={category} onChange={(event) => setCategory(event.target.value)}><option>All categories</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></div><div className="filter-section"><label>Location</label><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City or district" /></div><div className="filter-section"><label>Date added</label><div className="date-pair"><input type="date" /><input type="date" /></div></div><label className="check"><input type="checkbox" defaultChecked /> Verified records only</label><button className="primary full" onClick={() => apply()}>Apply filters</button><button className="secondary full" onClick={reset}>Reset all</button></aside><main><div className="semantic-box"><span>✦</span><div><h2>Try a semantic search</h2><p>Describe what the business does, even if those exact words aren’t on the card.</p><div><input value={semantic} onChange={(event) => setSemantic(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") apply(semantic); }} placeholder="e.g. companies that can design and print product packaging" /><button onClick={() => apply(semantic)} disabled={!semantic.trim()}>Search meaning →</button></div></div></div><div className="section-head compact"><div><span className="eyebrow">MATCHES</span><h2>{results.length ? "Matching companies" : "No matches yet"}</h2></div><span>{results.length} results</span></div>{results.length ? <div className="company-grid search-results">{results.map((company) => <CompanyCard key={company.id} company={company} onOpen={() => setSelected(company)} onCard={() => setCard(company)} />)}</div> : <EmptyState title="No companies match those filters" copy="Reset the filters or try a broader description." action="Reset filters" onAction={reset} />}</main></div>{selected && <RecordModal company={selected} close={() => setSelected(null)} onViewCard={() => { setCard(selected); setSelected(null); }} />}{card && <CardModal company={card} close={() => setCard(null)} />}</div>;
}

function Duplicates({ onDone }: { onDone: (message: string) => void }) { const [status, setStatus] = useState<"review" | "separate" | "merged">("review"); if (status !== "review") return <div className="page-shell"><EmptyState title={status === "merged" ? "Records merged" : "Records kept separate"} copy="This duplicate suggestion has been resolved and removed from the review queue." action="Review another match" onAction={() => setStatus("review")} /></div>; return <div className="page-shell"><div className="page-title-row"><div><h1>Duplicate review</h1><p>6 possible matches found across your directory</p></div></div><div className="duplicate-card"><div className="duplicate-head"><div><span className="match-score">94% match</span><h2>Possible duplicate company</h2><p>Phone number and website match across both records.</p></div><span className="status-review">Needs review</span></div><div className="compare-grid"><div><small>EXISTING RECORD</small><div className="compare-company"><span className="company-logo coral">KP</span><div><h3>Kampala Print Studio Ltd</h3><p>Amina Nsubuga · Creative Director</p></div></div><ul><li><span>Phone</span>+256 772 410 882</li><li><span>Website</span>kampalaprint.ug</li><li><span>Location</span>Kamwokya, Kampala</li></ul></div><div className="match-divider"><span>=</span></div><div><small>NEWLY ADDED</small><div className="compare-company"><span className="company-logo coral">KP</span><div><h3>Kampala Print Studio</h3><p>Amina Nsubuga · Creative Director</p></div></div><ul><li><span>Phone</span>+256 772 410 882</li><li><span>Website</span>kampalaprint.ug</li><li><span>Location</span>Kira Rd, Kamwokya</li></ul></div></div><div className="duplicate-actions"><button className="secondary" onClick={() => { setStatus("separate"); onDone("Records kept as separate companies."); }}>Keep as separate</button><button className="primary" onClick={() => { setStatus("merged"); onDone("Duplicate records merged successfully."); }}>Review & merge →</button></div></div></div>; }

function Categories({ items = companies, onSelect, onManage }: { items?: Company[]; onSelect: (category: string) => void; onManage: () => void }) { const colors = ["coral", "navy", "green", "ochre"]; const categories = Object.entries(items.reduce<Record<string, number>>((counts, item) => ({ ...counts, [item.category]: (counts[item.category] ?? 0) + 1 }), {})).map(([name, count], index) => [name, count, colors[index % colors.length]] as const); return <div className="page-shell"><div className="page-title-row"><div><h1>Categories</h1><p>Browse {items.length} companies across {categories.length} business categories</p></div><button className="secondary" onClick={onManage}>Manage categories</button></div><div className="category-grid">{categories.map(([name, count, color]) => <button key={name} onClick={() => onSelect(name)}><span className={`category-symbol ${color}`}>◇</span><div><strong>{name}</strong><small>{count} companies</small></div><b>→</b></button>)}</div></div>; }

function Settings({ items, onSaved }: { items: Company[]; onSaved: (message: string) => void }) { const [preferences, setPreferences] = useState({ review: true, confidence: true, unstructured: true, original: true, chat: true }); const toggle = (key: keyof typeof preferences) => setPreferences((current) => ({ ...current, [key]: !current[key] })); const save = () => { localStorage.setItem("cardwise-preferences", JSON.stringify(preferences)); onSaved("Settings saved on this device."); }; const exportData = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(items, null, 2)], { type: "application/json" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "cardwise-directory.json"; anchor.click(); URL.revokeObjectURL(url); onSaved("Directory export prepared."); }; return <div className="page-shell"><div className="page-title-row"><div><h1>Settings</h1><p>Manage extraction, privacy, and directory preferences</p></div><button className="primary" onClick={save}>Save changes</button></div><div className="settings-grid"><section><div className="settings-title"><span>✦</span><div><h2>AI extraction</h2><p>Control how Cardwise understands new cards.</p></div></div><label><div><strong>Require review before saving</strong><small>Never add AI-extracted records directly to the directory.</small></div><input type="checkbox" checked={preferences.review} onChange={() => toggle("review")} /></label><label><div><strong>Flag fields below 85%</strong><small>Highlight uncertain or conflicting values.</small></div><input type="checkbox" checked={preferences.confidence} onChange={() => toggle("confidence")} /></label><label><div><strong>Preserve unstructured content</strong><small>Keep the complete model output for semantic search.</small></div><input type="checkbox" checked={preferences.unstructured} onChange={() => toggle("unstructured")} /></label></section><section><div className="settings-title"><span>◇</span><div><h2>Privacy & storage</h2><p>Original card images are encrypted and private.</p></div></div><label><div><strong>Store original quality</strong><small>Keep full-resolution front and back images.</small></div><input type="checkbox" checked={preferences.original} onChange={() => toggle("original")} /></label><label><div><strong>Use records in AI chat</strong><small>Make verified cards available to retrieval.</small></div><input type="checkbox" checked={preferences.chat} onChange={() => toggle("chat")} /></label><button className="secondary" onClick={exportData}>Export directory data</button></section></div></div>; }

function EmptyState({ title, copy, action, onAction }: { title: string; copy: string; action: string; onAction: () => void }) { return <section className="empty-state"><span>⌕</span><h2>{title}</h2><p>{copy}</p><button className="secondary" onClick={onAction}>{action}</button></section>; }

function ContactEditor({ items, close, onSave }: { items: Company[]; close: () => void; onSave: (company: Company) => void }) { const [companyId, setCompanyId] = useState(String(items[0]?.id ?? "")); const selected = items.find((item) => String(item.id) === companyId); const [name, setName] = useState(""); const [role, setRole] = useState(""); const [phone, setPhone] = useState(""); const [email, setEmail] = useState(""); useEscape(close); const submit = (event: React.FormEvent) => { event.preventDefault(); if (!selected || !name.trim()) return; onSave({ ...selected, contact: name.trim(), role: role.trim(), phone: phone.trim(), email: email.trim() }); }; return <div className="modal-layer" onMouseDown={close}><form className="form-modal" role="dialog" aria-modal="true" aria-labelledby="contact-editor-title" onMouseDown={(event) => event.stopPropagation()} onSubmit={submit}><button className="modal-close" type="button" aria-label="Close contact editor" onClick={close}>×</button><span className="eyebrow">CONTACT</span><h2 id="contact-editor-title">Add a company contact</h2><label>Company<select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>{items.map((item) => <option key={item.id} value={String(item.id)}>{item.name}</option>)}</select></label><label>Full name<input required value={name} onChange={(event) => setName(event.target.value)} /></label><label>Job title<input value={role} onChange={(event) => setRole(event.target.value)} /></label><label>Phone<input value={phone} onChange={(event) => setPhone(event.target.value)} /></label><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><button className="primary full" type="submit" disabled={!selected || !name.trim()}>Save contact</button></form></div>; }

function RecordModal({ company, close, onUpdate, onViewCard }: { company: Company; close: () => void; onUpdate?: (company: Company) => void; onViewCard?: () => void }) { const [editing, setEditing] = useState(false); const [draft, setDraft] = useState(company); useEscape(close); const save = (event: React.FormEvent) => { event.preventDefault(); onUpdate?.({ ...draft, initials: draft.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase() }); setEditing(false); }; return <div className="modal-layer" onMouseDown={close}><div className="record-modal" role="dialog" aria-modal="true" aria-labelledby="record-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" aria-label="Close record" onClick={close}>×</button><div className="record-hero"><span className={`company-logo large ${company.accent}`}>{company.initials}</span><div><span className="category-pill">{company.category}</span><h2 id="record-title">{company.name}</h2><p>{company.services.join(" · ")}</p></div></div>{editing ? <form className="record-edit-form" onSubmit={save}><label>Company name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label>Category<input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} /></label><label>Contact person<input value={draft.contact} onChange={(event) => setDraft({ ...draft, contact: event.target.value })} /></label><label>Job title<input value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })} /></label><label>Phone<input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></label><label>Email<input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label><label>Website<input value={draft.site} onChange={(event) => setDraft({ ...draft, site: event.target.value })} /></label><label>Location<input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} /></label><div><button className="secondary" type="button" onClick={() => { setDraft(company); setEditing(false); }}>Cancel</button><button className="primary" type="submit">Save record</button></div></form> : <div className="record-body"><section><h3>Primary contact</h3><div className="person-card"><span className={`avatar ${company.accent}`}>{company.contact.split(" ").map((part) => part[0]).join("")}</span><div><strong>{company.contact || "No contact listed"}</strong><p>{company.role}</p></div></div><dl><dt>Phone</dt><dd>{company.phone || "—"}</dd><dt>Email</dt><dd>{company.email || "—"}</dd><dt>Website</dt><dd>{company.site || "—"}</dd><dt>Location</dt><dd>{company.location || "—"}</dd></dl></section><section><h3>Original business card</h3><CardArtwork company={company} /><button className="secondary full" onClick={onViewCard}>View original images</button></section></div>}<div className="record-footer"><small>Verified record · Added {company.added}</small>{!editing && <button className="primary" onClick={() => setEditing(true)}>Edit record</button>}</div></div></div>; }

function CardModal({ company, close }: { company: Company; close: () => void }) { const [side, setSide] = useState<"front" | "back">("front"); useEscape(close); return <div className="modal-layer" onMouseDown={close}><div className="card-modal" role="dialog" aria-modal="true" aria-labelledby="card-modal-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-title"><div><span className="eyebrow">ORIGINAL CARD</span><h2 id="card-modal-title">{company.name}</h2></div><button onClick={close} aria-label="Close original card">×</button></div><CardArtwork company={company} side={side} /><div className="side-tabs"><button className={side === "front" ? "active" : ""} onClick={() => setSide("front")}>Front</button><button className={side === "back" ? "active" : ""} onClick={() => setSide("back")}>Back</button></div><p>Stored securely · Original quality · Added {company.added}</p></div></div>; }

function HelpModal({ close }: { close: () => void }) { useEscape(close); return <div className="modal-layer" onMouseDown={close}><section className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" aria-label="Close help" onClick={close}>×</button><span className="eyebrow">CARDWISE HELP</span><h2 id="help-title">What would you like to do?</h2><div className="help-grid"><article><strong>Upload a card</strong><p>Add front and back images, then review every extracted field.</p></article><article><strong>Search naturally</strong><p>Ask for a service, place, company, contact, phone, or email.</p></article><article><strong>Review originals</strong><p>Open any record and compare it with the stored card images.</p></article></div></section></div>; }

type CardwiseAppProps = { workspaceSlug?: string; workspaceName?: string; initialCompanies?: Company[]; initialEvents?: EventSummary[]; clerkEnabled?: boolean; isSuperadmin?: boolean };
export function CardwiseApp({ workspaceSlug, workspaceName = "Personal workspace", initialCompanies, initialEvents = [], clerkEnabled = false, isSuperadmin = false }: CardwiseAppProps = {}) {
  const [active, setActive] = useState("overview"); const [images, setImages] = useState<string[]>([]); const [toast, setToast] = useState(""); const [mobileNav, setMobileNav] = useState(false); const [helpOpen, setHelpOpen] = useState(false); const [notificationsOpen, setNotificationsOpen] = useState(false); const [notificationItems, setNotificationItems] = useState<SidebarNotification[]>(sidebarNotifications); const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]); const [chatPrompt, setChatPrompt] = useState(""); const [chatRequestId, setChatRequestId] = useState(0); const [directoryQuery, setDirectoryQuery] = useState(""); const [directoryCategory, setDirectoryCategory] = useState("All categories"); const [globalAiQuery, setGlobalAiQuery] = useState(""); const [workspaceCompanies, setWorkspaceCompanies] = useState(initialCompanies ?? companies);
  useEffect(() => { if (!mobileNav) return; const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = previous; }; }, [mobileNav]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedView = params.get("view");
    const permittedViews = new Set(["overview", "upload", "companies", "contacts", "events", "chat", "search", "recent", "categories", "duplicates", "settings"]);
    if (requestedView && permittedViews.has(requestedView)) window.setTimeout(() => setActive(requestedView), 0);
    const requestedPrompt = params.get("prompt")?.trim();
    if (requestedView === "chat" && requestedPrompt) {
      window.setTimeout(() => {
        setChatPrompt(requestedPrompt);
        setChatRequestId((value) => value + 1);
      }, 0);
    }
  }, []);
  useEffect(() => { const onKeyDown = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); document.querySelector<HTMLInputElement | HTMLTextAreaElement>(".floating-ai-input, .chat-composer textarea")?.focus(); } if (event.key === "Escape") setMobileNav(false); }; window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown); }, []);
  useEffect(() => { if (!workspaceSlug) return; const controller = new AbortController(); void fetch(`/api/notifications?workspace=${encodeURIComponent(workspaceSlug)}`, { signal: controller.signal }).then((response) => response.ok ? response.json() : Promise.reject()).then((result: { notifications: Array<{ id: string; title: string; body: string; targetUrl: string | null; readAt: string | null; createdAt: string }> }) => { setNotificationItems(result.notifications.map((item) => ({ id: item.id, title: item.title, copy: item.body, target: item.targetUrl || "overview", time: new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) }))); setReadNotificationIds(result.notifications.filter((item) => item.readAt).map((item) => item.id)); }).catch(() => undefined); return () => controller.abort(); }, [workspaceSlug]);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 3200); };
  const navigate = (page: string) => { setActive(page); setMobileNav(false); };
  const unreadNotificationCount = notificationItems.filter((notification) => !readNotificationIds.includes(notification.id)).length;
  const openNotification = (notification: SidebarNotification) => {
    setReadNotificationIds((current) => current.includes(notification.id) ? current : [...current, notification.id]);
    if (workspaceSlug) void fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceSlug, notificationId: notification.id }) });
    setNotificationsOpen(false);
    if (notification.target.startsWith("/")) window.location.assign(notification.target); else navigate(notification.target);
  };
  const updateCompany = (updated: Company) => { setWorkspaceCompanies((current) => current.map((company) => company.id === updated.id ? updated : company)); notify(`${updated.name} was updated.`); };
  const ask = (query: string) => { setChatPrompt(query); setChatRequestId((value) => value + 1); setGlobalAiQuery(""); navigate("chat"); };
  let content: React.ReactNode;
  if (active === "overview") content = <Overview go={navigate} items={workspaceCompanies} events={initialEvents} />;
  else if (active === "upload") content = <Upload workspaceSlug={workspaceSlug} onCancel={() => navigate("overview")} onReview={(uploadedImages) => { setImages(uploadedImages); navigate("review"); }} />;
  else if (active === "review") content = <Review images={images} onReplace={() => navigate("upload")} onDraft={() => { notify("Draft saved for later review."); navigate("recent"); }} saved={() => { notify("Verified record saved and indexed."); navigate("companies"); }} />;
  else if (active === "companies") content = <Directory key={`${directoryQuery}:${directoryCategory}`} items={workspaceCompanies} initialQuery={directoryQuery} initialCategory={directoryCategory} subtitle={`${workspaceCompanies.length} companies in this workspace`} onAdd={() => navigate("upload")} onUpdate={updateCompany} />;
  else if (active === "contacts") content = <Contacts items={workspaceCompanies} onUpdate={updateCompany} />;
  else if (active === "events") content = <div className="page-shell"><div className="page-title-row"><div><h1>Networking events</h1><p>Discover events and the verified cards people chose to share.</p></div><a className="primary admin-link" href={workspaceSlug ? `/app/${workspaceSlug}/events` : "/events"}>{workspaceSlug ? "Manage events" : "Browse all events"}</a></div><EventsHomeSection events={initialEvents} /></div>;
  else if (active === "chat") content = <AIChat key={`${chatRequestId}:${chatPrompt || "default-chat"}`} workspaceSlug={workspaceSlug} items={workspaceCompanies} initialQuery={chatPrompt} launchId={chatRequestId} />;
  else if (active === "search") content = <SearchFilters items={workspaceCompanies} />;
  else if (active === "recent") content = <Directory title="Recently added" subtitle={`${workspaceCompanies.length} saved companies`} items={workspaceCompanies} onAdd={() => navigate("upload")} onUpdate={updateCompany} />;
  else if (active === "categories") content = <Categories items={workspaceCompanies} onManage={() => navigate("settings")} onSelect={(category) => { setDirectoryCategory(category); setDirectoryQuery(""); navigate("companies"); }} />;
  else if (active === "duplicates") content = <Duplicates onDone={notify} />;
  else if (active === "settings") content = <Settings items={workspaceCompanies} onSaved={notify} />;
  else content = <Overview go={navigate} items={workspaceCompanies} events={initialEvents} />;
  return (
    <div className="app">
      {mobileNav && <button type="button" className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <aside id="application-sidebar" className={`sidebar ${mobileNav ? "open" : ""}`} aria-label="Application navigation">
        <div className="sidebar-heading">
          <Brand />
          <button type="button" className="sidebar-close" aria-label="Close navigation menu" onClick={() => setMobileNav(false)}><span>Close</span><b aria-hidden="true">×</b></button>
        </div>
        <p className="mobile-nav-guide" id="mobile-navigation-guide">Choose where you want to go. Tap any section below.</p>
        <AccountControls clerkEnabled={clerkEnabled} placement="workspace" workspaceName={workspaceName} />
        <nav aria-label="Workspace sections" aria-describedby="mobile-navigation-guide">
          <span className="nav-label">MAIN MENU</span>
          {nav.slice(0, 7).map(([id, label, icon]) => (
            <button key={id} type="button" className={active === id ? "active" : ""} aria-current={active === id ? "page" : undefined} onClick={() => navigate(id)}>
              <span aria-hidden="true">{icon}</span>{label}{active === id && <small className="nav-current">Current</small>}{id === "duplicates" && <b>6</b>}
            </button>
          ))}
          <button type="button" className={`notification-nav-button ${notificationsOpen ? "active" : ""}`} aria-expanded={notificationsOpen} aria-controls="sidebar-notifications" onClick={() => setNotificationsOpen((open) => !open)}>
            <span aria-hidden="true">♢</span>Notifications{unreadNotificationCount > 0 && <b aria-label={`${unreadNotificationCount} unread notifications`}>{unreadNotificationCount}</b>}
          </button>
          {notificationsOpen && <section id="sidebar-notifications" className="sidebar-notifications" aria-label="Notifications">
            <div className="sidebar-notifications-head"><div><strong>Notifications</strong><small>{unreadNotificationCount ? `${unreadNotificationCount} unread` : "You’re all caught up"}</small></div>{unreadNotificationCount > 0 && <button type="button" onClick={() => { setReadNotificationIds(notificationItems.map((notification) => notification.id)); if (workspaceSlug) void fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceSlug, all: true }) }); }}>Mark all read</button>}</div>
            <div className="sidebar-notification-list">{notificationItems.map((notification) => {
              const read = readNotificationIds.includes(notification.id);
              return <button type="button" key={notification.id} className={read ? "read" : "unread"} onClick={() => openNotification(notification)}><span className="notification-status" aria-hidden="true" /><span className="notification-copy"><strong>{notification.title}</strong><small>{notification.copy}</small><time>{notification.time}</time></span></button>;
            })}</div>
          </section>}
          <span className="nav-label second">ORGANIZE YOUR DIRECTORY</span>
          {nav.slice(7).map(([id, label, icon]) => (
            <button key={id} type="button" className={active === id ? "active" : ""} aria-current={active === id ? "page" : undefined} onClick={() => navigate(id)}>
              <span aria-hidden="true">{icon}</span>{label}{active === id && <small className="nav-current">Current</small>}{id === "duplicates" && <b>6</b>}
            </button>
          ))}
          <button type="button" className={active === "settings" ? "active" : ""} aria-current={active === "settings" ? "page" : undefined} onClick={() => navigate("settings")}>
            <span aria-hidden="true">⚙</span>Settings{active === "settings" && <small className="nav-current">Current</small>}
          </button>
          {isSuperadmin && <button type="button" onClick={() => window.location.assign("/superadmin")}><span aria-hidden="true">◆</span>Platform admin</button>}
          <button type="button" aria-haspopup="dialog" onClick={() => { setHelpOpen(true); setMobileNav(false); }}><span aria-hidden="true">?</span>Help & support</button>
        </nav>
        <div className="sidebar-bottom">
          <AccountControls clerkEnabled={clerkEnabled} placement="sidebar" />
        </div>
      </aside>
      <main className="main">
        <div className="floating-page-actions" aria-label="Page actions">
          <button type="button" className="mobile-menu floating-menu" aria-label="Open navigation menu" aria-controls="application-sidebar" aria-expanded={mobileNav} onClick={() => setMobileNav((value) => !value)}><span aria-hidden="true">☰</span><strong>Menu</strong></button>
          <button type="button" className="floating-add-card" onClick={() => navigate("upload")}><span aria-hidden="true">＋</span><strong>Add card</strong></button>
        </div>
        {content}
      </main>
      {active !== "chat" && <FloatingAIComposer value={globalAiQuery} onChange={setGlobalAiQuery} onSubmit={ask} showSuggestions={active === "overview"} />}
      {helpOpen && <HelpModal close={() => setHelpOpen(false)} />}
      {toast && <div className="toast" role="status"><span>✓</span><div><strong>Done</strong><p>{toast}</p></div></div>}
    </div>
  );
}
