"use client";

import { useMemo, useRef, useState } from "react";

type Company = {
  id: number;
  name: string;
  initials: string;
  contact: string;
  role: string;
  phone: string;
  email: string;
  site: string;
  location: string;
  category: string;
  services: string[];
  accent: string;
  added: string;
};

const companies: Company[] = [
  { id: 1, name: "Kampala Print Studio", initials: "KP", contact: "Amina Nsubuga", role: "Creative Director", phone: "+256 772 410 882", email: "amina@kampalaprint.ug", site: "kampalaprint.ug", location: "Kampala, Uganda", category: "Printing & Design", services: ["Large format printing", "Brand identity", "Packaging"], accent: "coral", added: "Today, 10:42" },
  { id: 2, name: "BuildCore Africa", initials: "BC", contact: "Daniel Okello", role: "Projects Manager", phone: "+256 701 332 190", email: "daniel@buildcore.africa", site: "buildcore.africa", location: "Ntinda, Kampala", category: "Construction", services: ["Commercial construction", "Project planning"], accent: "navy", added: "Yesterday" },
  { id: 3, name: "Medline Solutions", initials: "MS", contact: "Grace Atim", role: "Business Development Lead", phone: "+256 758 920 114", email: "grace@medlinesolutions.co.ug", site: "medlinesolutions.co.ug", location: "Kololo, Kampala", category: "Medical Equipment", services: ["Diagnostic equipment", "Laboratory supplies"], accent: "green", added: "Jul 10, 2026" },
  { id: 4, name: "Harbor & Pine Advisory", initials: "HP", contact: "Isaac Mugisha", role: "Managing Partner", phone: "+256 783 006 220", email: "isaac@harborpine.com", site: "harborpine.com", location: "Entebbe, Uganda", category: "Consulting", services: ["Business strategy", "Financial advisory"], accent: "ochre", added: "Jul 8, 2026" },
];

const nav = [
  ["overview", "Overview", "⌂"], ["upload", "Upload business card", "+"], ["companies", "All companies", "▦"],
  ["contacts", "All contacts", "◎"], ["chat", "AI chat", "✦"], ["search", "Search & filters", "⌕"],
  ["recent", "Recently added", "◷"], ["categories", "Categories", "◇"], ["duplicates", "Duplicate review", "⊞"],
];

function Brand() {
  return <div className="brand"><span className="brand-mark"><i /><i /><i /></span><span>cardwise</span></div>;
}

function Confidence({ value }: { value: number }) {
  const low = value < 85;
  return <span className={`confidence ${low ? "low" : ""}`}><span />{value}% {low ? "review" : "confident"}</span>;
}

function CardArtwork({ company = companies[0], image }: { company?: Company; image?: string }) {
  if (image) return <img className="uploaded-card-image" src={image} alt="Uploaded business card" />;
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
  return (
    <article className="company-card">
      <div className="company-card-top">
        <div className={`company-logo ${company.accent}`}>{company.initials}</div>
        <button className="more" aria-label={`More options for ${company.name}`}>•••</button>
      </div>
      <div className="category-pill">{company.category}</div>
      <h3>{company.name}</h3>
      <p className="contact-line">{company.contact} <span>·</span> {company.role}</p>
      <div className="card-meta"><span>⌕</span>{company.location}</div>
      <div className="card-meta"><span>↗</span>{company.email}</div>
      <div className="services">{company.services.slice(0, 2).map((s) => <span key={s}>{s}</span>)}</div>
      <div className="card-actions"><button onClick={onOpen}>View full record</button><button className="icon-btn" onClick={onCard} aria-label="View original business card">▣</button></div>
    </article>
  );
}

function Overview({ go }: { go: (value: string) => void }) {
  const [menu, setMenu] = useState(false);
  return (
    <div className="page-shell">
      <section className="welcome">
        <div><div className="eyebrow">MONDAY, JULY 13</div><h1>Your business network,<br /><em>beautifully organized.</em></h1><p>Turn every card into searchable company intelligence.</p></div>
        <button className="primary hero-action" onClick={() => go("upload")}><span>＋</span> Add business card</button>
      </section>
      <section className="stats-grid">
        <div className="stat-card"><span className="stat-icon coral">▦</span><div><strong>248</strong><span>Companies</span></div><small>+12 this month</small></div>
        <div className="stat-card"><span className="stat-icon navy">◎</span><div><strong>316</strong><span>Contacts</span></div><small>+18 this month</small></div>
        <div className="stat-card"><span className="stat-icon green">✓</span><div><strong>92%</strong><span>Verified</span></div><small>21 need review</small></div>
        <div className="stat-card"><span className="stat-icon ochre">⊞</span><div><strong>6</strong><span>Duplicates</span></div><small>Ready to merge</small></div>
      </section>
      <section className="ai-search-block">
        <div className="spark">✦</div>
        <div className="ai-copy"><span>ASK YOUR DIRECTORY</span><h2>Who are you looking for?</h2><p>Search naturally across every company, contact, and business card.</p></div>
        <div className="ai-input"><input placeholder="e.g. Find printing companies in Kampala" /><button onClick={() => go("chat")}>Ask Cardwise <span>→</span></button></div>
        <div className="prompt-chips"><button onClick={() => go("chat")}>Construction contacts</button><button onClick={() => go("chat")}>Medical equipment suppliers</button><button onClick={() => go("chat")}>Cards added last month</button></div>
      </section>
      <section className="section-head"><div><span className="eyebrow">YOUR DIRECTORY</span><h2>Recently added</h2></div><button className="text-button" onClick={() => go("companies")}>View all companies →</button></section>
      <div className="company-grid">{companies.slice(0, 3).map((c) => <CompanyCard key={c.id} company={c} onOpen={() => setMenu(true)} onCard={() => setMenu(true)} />)}</div>
      {menu && <RecordModal company={companies[0]} close={() => setMenu(false)} />}
    </div>
  );
}

function Upload({ onReview }: { onReview: (images: string[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const next = Array.from(files).slice(0, 3).map((file) => URL.createObjectURL(file));
    setImages((old) => [...old, ...next].slice(0, 3));
  };
  const analyze = () => {
    setAnalyzing(true);
    window.setTimeout(() => onReview(images), 1400);
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
              {images.map((image, i) => <div className="image-slot" key={image}><img src={image} alt={`Business card ${i + 1}`} /><span>{i === 0 ? "Front" : i === 1 ? "Back" : "Additional"}</span><button onClick={() => setImages(images.filter((_, n) => n !== i))}>×</button></div>)}
              {images.length < 3 && <button className="add-side" onClick={() => input.current?.click()}><b>＋</b><span>Add {images.length === 1 ? "back side" : "another image"}</span></button>}
            </div>
          )}
          <div className="privacy-note"><span>◇</span><div><strong>Your cards stay private</strong><p>Images are encrypted in storage and only used to build your directory.</p></div></div>
        </section>
        <aside className="vision-panel"><span className="vision-icon">✦</span><h3>Vision-powered extraction</h3><p>Cardwise understands the card as a whole, using layout, typography, proximity, icons, and both sides together.</p><ul><li><span>✓</span>Separates company and person details</li><li><span>✓</span>Recognizes logos and categories</li><li><span>✓</span>Flags uncertain or conflicting fields</li><li><span>✓</span>Preserves every meaningful detail</li></ul></aside>
      </div>
      <div className="upload-footer"><button className="secondary" onClick={() => setImages([])}>Cancel</button><button className="primary" disabled={!images.length || analyzing} onClick={analyze}>{analyzing ? <><span className="spinner" /> Analyzing both sides…</> : <>Analyze with AI <span>✦</span></>}</button></div>
    </div>
  );
}

function Field({ label, value, confidence, wide, area }: { label: string; value: string; confidence: number; wide?: boolean; area?: boolean }) {
  const [content, setContent] = useState(value);
  return <label className={`review-field ${wide ? "wide" : ""}`}><span className="field-label">{label}<Confidence value={confidence} /></span>{area ? <textarea value={content} onChange={(e) => setContent(e.target.value)} /> : <input value={content} onChange={(e) => setContent(e.target.value)} />}</label>;
}

function Review({ images, saved }: { images: string[]; saved: () => void }) {
  const [side, setSide] = useState(0);
  return (
    <div className="review-page">
      <div className="review-heading"><div><div className="eyebrow">AI ANALYSIS COMPLETE</div><h1>Review extracted information</h1><p>We found 16 fields. Three need a quick check before saving.</p></div><div className="overall-score"><span>Overall confidence</span><strong>91%</strong><i><b /></i></div></div>
      <div className="review-layout">
        <aside className="card-preview-panel"><div className="preview-head"><h2>Original card</h2><span>{images.length || 1} image{images.length === 1 ? "" : "s"}</span></div><div className="large-card-preview"><CardArtwork image={images[side]} /></div>{images.length > 1 && <div className="side-tabs">{images.map((_, i) => <button key={i} className={side === i ? "active" : ""} onClick={() => setSide(i)}>{i === 0 ? "Front" : i === 1 ? "Back" : `Image ${i + 1}`}</button>)}</div>}<div className="image-quality"><span>✓</span><div><strong>Image quality: Excellent</strong><p>Sharp, well-lit, all edges visible</p></div></div><button className="secondary full">Replace image</button></aside>
        <main className="review-form">
          <section className="review-section"><div className="review-section-title"><span className="section-number">01</span><div><h2>Company</h2><p>Business identity and details</p></div></div><div className="field-grid"><Field label="Company name" value="Kampala Print Studio" confidence={98} /><Field label="Industry / category" value="Printing & Design" confidence={91} /><Field label="Website" value="kampalaprint.ug" confidence={96} /><Field label="Tagline" value="Ideas made tangible" confidence={82} /><Field wide label="Products & services" value="Large format printing, brand identity, packaging, signage" confidence={88} area /></div></section>
          <section className="review-section"><div className="review-section-title"><span className="section-number">02</span><div><h2>Contact person</h2><p>Individual details linked to this company</p></div></div><div className="field-grid"><Field label="Full name" value="Amina Nsubuga" confidence={97} /><Field label="Job title" value="Creative Director" confidence={94} /><Field label="Primary phone" value="+256 772 410 882" confidence={99} /><Field label="Primary email" value="amina@kampalaprint.ug" confidence={89} /></div></section>
          <section className="review-section"><div className="review-section-title"><span className="section-number">03</span><div><h2>Location & other information</h2><p>Additional context preserved by the model</p></div></div><div className="field-grid"><Field wide label="Physical address" value="Plot 14, Kira Road, Kamwokya, Kampala, Uganda" confidence={79} /><Field wide label="Other information" value="Opening hours: Mon–Sat, 8:00–18:00\nInstagram: @kampalaprintstudio\nQR code: WhatsApp catalogue link" confidence={86} area /></div></section>
        </main>
      </div>
      <div className="sticky-save"><div><span className="warning-dot">!</span><p><strong>3 fields need review</strong><br />Check highlighted confidence labels before saving.</p></div><div><button className="secondary">Save as draft</button><button className="primary" onClick={saved}>Save verified record <span>→</span></button></div></div>
    </div>
  );
}

function Directory({ title = "All companies", subtitle = "248 companies across 32 categories", items = companies }: { title?: string; subtitle?: string; items?: Company[] }) {
  const [query, setQuery] = useState(""); const [selected, setSelected] = useState<Company | null>(null); const [card, setCard] = useState<Company | null>(null);
  const filtered = items.filter((c) => `${c.name} ${c.contact} ${c.category} ${c.location}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="page-shell directory-page"><div className="page-title-row"><div><h1>{title}</h1><p>{subtitle}</p></div><button className="primary">＋ Add business card</button></div><div className="directory-tools"><div className="searchbox"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search companies, contacts or services" /></div><button className="filter-button">⊟ Filters <b>2</b></button><button className="view-toggle">▦</button><button className="view-toggle muted">☷</button></div><div className="active-filters"><span>Location: Kampala <button>×</button></span><span>Verified only <button>×</button></span><button>Clear all</button></div><div className="results-line"><span>Showing {filtered.length} of 248 companies</span><button>Sort: Recently added⌄</button></div><div className="company-grid directory-grid">{filtered.map((c) => <CompanyCard key={c.id} company={c} onOpen={() => setSelected(c)} onCard={() => setCard(c)} />)}</div>{selected && <RecordModal company={selected} close={() => setSelected(null)} />}{card && <CardModal company={card} close={() => setCard(null)} />}</div>;
}

function Contacts() {
  return <div className="page-shell"><div className="page-title-row"><div><h1>All contacts</h1><p>316 people connected to your company directory</p></div><button className="primary">＋ Add contact</button></div><div className="contact-list"><div className="contact-list-head"><span>Contact</span><span>Company</span><span>Phone</span><span>Added</span><span /></div>{companies.map((c) => <div className="contact-row" key={c.id}><div><span className={`avatar ${c.accent}`}>{c.contact.split(" ").map(x => x[0]).join("")}</span><p><strong>{c.contact}</strong><small>{c.email}</small></p></div><div><strong>{c.name}</strong><small>{c.role}</small></div><span>{c.phone}</span><span>{c.added}</span><button>•••</button></div>)}</div></div>;
}

function AIChat() {
  const [query, setQuery] = useState("Which printing companies are in Kampala?"); const [asked, setAsked] = useState(true); const [selected, setSelected] = useState<Company | null>(null);
  const submit = () => { if (query.trim()) setAsked(true); };
  return <div className="chat-page"><div className="chat-hero"><span className="chat-spark">✦</span><div><div className="eyebrow">ASK CARDWISE</div><h1>Search your network<br /><em>like you remember it.</em></h1></div></div><div className="chat-thread">{asked && <><div className="user-message">{query}</div><div className="assistant-message"><div className="assistant-label"><span>✦</span>Cardwise</div><p>I found <strong>2 companies</strong> in your directory that match printing services in Kampala.</p><div className="chat-results">{companies.filter(c => c.category.includes("Printing") || c.id === 4).map(c => <CompanyCard key={c.id} company={c} onOpen={() => setSelected(c)} onCard={() => setSelected(c)} />)}</div><small>Based on company categories, products & services, and card content.</small></div></>}</div><div className="chat-composer"><div className="suggestion-row"><button onClick={() => setQuery("Show construction contacts")}>Show construction contacts</button><button onClick={() => setQuery("Find cards added last month")}>Find cards added last month</button><button onClick={() => setQuery("Medical equipment suppliers")}>Medical equipment suppliers</button></div><div><span>✦</span><input value={query} onChange={(e) => { setQuery(e.target.value); setAsked(false); }} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Ask about any company or contact…" /><button onClick={submit}>↑</button></div><small>Cardwise searches verified records and original card context.</small></div>{selected && <RecordModal company={selected} close={() => setSelected(null)} />}</div>;
}

function SearchFilters() {
  const [category, setCategory] = useState("All categories");
  return <div className="page-shell"><div className="page-title-row"><div><h1>Search & filters</h1><p>Find the right company or person with precise criteria</p></div></div><div className="advanced-search"><aside><div className="filter-section"><label>Keyword search</label><input placeholder="Name, service, phone…" /></div><div className="filter-section"><label>Category</label><select value={category} onChange={e => setCategory(e.target.value)}><option>All categories</option><option>Printing & Design</option><option>Construction</option><option>Medical Equipment</option></select></div><div className="filter-section"><label>Location</label><input placeholder="City or district" defaultValue="Kampala" /></div><div className="filter-section"><label>Date added</label><div className="date-pair"><input type="date" /><input type="date" /></div></div><label className="check"><input type="checkbox" defaultChecked /> Verified records only</label><button className="primary full">Apply filters</button><button className="secondary full">Reset all</button></aside><main><div className="semantic-box"><span>✦</span><div><h2>Try a semantic search</h2><p>Describe what the business does, even if those exact words aren’t on the card.</p><div><input placeholder="e.g. companies that can design and print product packaging" /><button>Search meaning →</button></div></div></div><div className="section-head compact"><div><span className="eyebrow">MATCHES</span><h2>Companies in Kampala</h2></div><span>3 results</span></div><div className="company-grid search-results">{companies.slice(0, 3).map(c => <CompanyCard key={c.id} company={c} onOpen={() => {}} onCard={() => {}} />)}</div></main></div></div>;
}

function Duplicates() {
  return <div className="page-shell"><div className="page-title-row"><div><h1>Duplicate review</h1><p>6 possible matches found across your directory</p></div></div><div className="duplicate-card"><div className="duplicate-head"><div><span className="match-score">94% match</span><h2>Possible duplicate company</h2><p>Phone number and website match across both records.</p></div><span className="status-review">Needs review</span></div><div className="compare-grid"><div><small>EXISTING RECORD</small><div className="compare-company"><span className="company-logo coral">KP</span><div><h3>Kampala Print Studio Ltd</h3><p>Amina Nsubuga · Creative Director</p></div></div><ul><li><span>Phone</span>+256 772 410 882</li><li><span>Website</span>kampalaprint.ug</li><li><span>Location</span>Kamwokya, Kampala</li></ul></div><div className="match-divider"><span>=</span></div><div><small>NEWLY ADDED</small><div className="compare-company"><span className="company-logo coral">KP</span><div><h3>Kampala Print Studio</h3><p>Amina Nsubuga · Creative Director</p></div></div><ul><li><span>Phone</span>+256 772 410 882</li><li><span>Website</span>kampalaprint.ug</li><li><span>Location</span>Kira Rd, Kamwokya</li></ul></div></div><div className="duplicate-actions"><button className="secondary">Keep as separate</button><button className="primary">Review & merge →</button></div></div></div>;
}

function Categories() { const cats = [["Printing & Design", 28, "coral"], ["Construction", 24, "navy"], ["Medical Equipment", 19, "green"], ["Consulting", 36, "ochre"], ["Technology", 31, "navy"], ["Hospitality", 17, "coral"]]; return <div className="page-shell"><div className="page-title-row"><div><h1>Categories</h1><p>Browse 248 companies across 32 business categories</p></div><button className="secondary">Manage categories</button></div><div className="category-grid">{cats.map(([name, count, color]) => <button key={String(name)}><span className={`category-symbol ${color}`}>◇</span><div><strong>{name}</strong><small>{count} companies</small></div><b>→</b></button>)}</div></div>; }

function Settings() {
  return <div className="page-shell"><div className="page-title-row"><div><h1>Settings</h1><p>Manage extraction, privacy, and directory preferences</p></div><button className="primary">Save changes</button></div><div className="settings-grid"><section><div className="settings-title"><span>✦</span><div><h2>AI extraction</h2><p>Control how Cardwise understands new cards.</p></div></div><label><div><strong>Require review before saving</strong><small>Never add AI-extracted records directly to the directory.</small></div><input type="checkbox" defaultChecked /></label><label><div><strong>Flag fields below 85%</strong><small>Highlight uncertain or conflicting values.</small></div><input type="checkbox" defaultChecked /></label><label><div><strong>Preserve unstructured content</strong><small>Keep the complete model output for semantic search.</small></div><input type="checkbox" defaultChecked /></label></section><section><div className="settings-title"><span>◇</span><div><h2>Privacy & storage</h2><p>Original card images are encrypted and private.</p></div></div><label><div><strong>Store original quality</strong><small>Keep full-resolution front and back images.</small></div><input type="checkbox" defaultChecked /></label><label><div><strong>Use records in AI chat</strong><small>Make verified cards available to retrieval.</small></div><input type="checkbox" defaultChecked /></label><button className="secondary">Export directory data</button></section></div></div>;
}

function RecordModal({ company, close }: { company: Company; close: () => void }) {
  return <div className="modal-layer" onMouseDown={close}><div className="record-modal" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={close}>×</button><div className="record-hero"><span className={`company-logo large ${company.accent}`}>{company.initials}</span><div><span className="category-pill">{company.category}</span><h2>{company.name}</h2><p>{company.services.join(" · ")}</p></div></div><div className="record-body"><section><h3>Primary contact</h3><div className="person-card"><span className={`avatar ${company.accent}`}>{company.contact.split(" ").map(x => x[0]).join("")}</span><div><strong>{company.contact}</strong><p>{company.role}</p></div></div><dl><dt>Phone</dt><dd>{company.phone}</dd><dt>Email</dt><dd>{company.email}</dd><dt>Website</dt><dd>{company.site}</dd><dt>Location</dt><dd>{company.location}</dd></dl></section><section><h3>Original business card</h3><CardArtwork company={company} /><button className="secondary full">View original images</button></section></div><div className="record-footer"><small>Verified record · Added {company.added}</small><button className="primary">Edit record</button></div></div></div>;
}

function CardModal({ company, close }: { company: Company; close: () => void }) { return <div className="modal-layer" onMouseDown={close}><div className="card-modal" onMouseDown={e => e.stopPropagation()}><div className="modal-title"><div><span className="eyebrow">ORIGINAL CARD</span><h2>{company.name}</h2></div><button onClick={close}>×</button></div><CardArtwork company={company} /><div className="side-tabs"><button className="active">Front</button><button>Back</button></div><p>Stored securely · Original quality · Added {company.added}</p></div></div>; }

export function CardwiseApp() {
  const [active, setActive] = useState("overview"); const [images, setImages] = useState<string[]>([]); const [toast, setToast] = useState(false); const [mobileNav, setMobileNav] = useState(false);
  const content = useMemo(() => {
    if (active === "overview") return <Overview go={setActive} />;
    if (active === "upload") return <Upload onReview={(imgs) => { setImages(imgs); setActive("review"); }} />;
    if (active === "review") return <Review images={images} saved={() => { setToast(true); setActive("companies"); window.setTimeout(() => setToast(false), 3200); }} />;
    if (active === "companies") return <Directory />;
    if (active === "contacts") return <Contacts />;
    if (active === "chat") return <AIChat />;
    if (active === "search") return <SearchFilters />;
    if (active === "recent") return <Directory title="Recently added" subtitle="38 cards added in the last 30 days" />;
    if (active === "categories") return <Categories />;
    if (active === "duplicates") return <Duplicates />;
    if (active === "settings") return <Settings />;
    return <Overview go={setActive} />;
  }, [active, images]);
  return <div className="app"><aside className={`sidebar ${mobileNav ? "open" : ""}`}><Brand /><nav><span className="nav-label">WORKSPACE</span>{nav.slice(0, 6).map(([id, label, icon]) => <button key={id} className={active === id ? "active" : ""} onClick={() => { setActive(id); setMobileNav(false); }}><span>{icon}</span>{label}{id === "duplicates" && <b>6</b>}</button>)}<span className="nav-label second">ORGANIZE</span>{nav.slice(6).map(([id, label, icon]) => <button key={id} className={active === id ? "active" : ""} onClick={() => { setActive(id); setMobileNav(false); }}><span>{icon}</span>{label}{id === "duplicates" && <b>6</b>}</button>)}</nav><div className="sidebar-bottom"><button onClick={() => setActive("settings")}><span>⚙</span>Settings</button><div className="user"><span>AN</span><div><strong>Alex Namanya</strong><small>alex@studio.ug</small></div><button>⌄</button></div></div></aside><main className="main"><header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)}>☰</button><div className="global-search"><span>⌕</span><input placeholder="Search your entire directory" /><kbd>⌘ K</kbd></div><div className="top-actions"><button className="help">?</button><button className="notification">○<i /></button><button className="top-add" onClick={() => setActive("upload")}>＋ <span>Add card</span></button></div></header>{content}</main>{toast && <div className="toast"><span>✓</span><div><strong>Record saved</strong><p>Kampala Print Studio is now searchable.</p></div></div>}</div>;
}
