"use client";

import { useState } from "react";
import Image from "next/image";
import type { BusinessCardExtraction } from "@/lib/ai/business-card-schema";

type ReviewEditorProps = { workspaceSlug: string; cardId: string; extraction: BusinessCardExtraction; imageUrls: Array<{ side: string; url: string }> };
type FieldProps = { label: string; value: string; confidence: number; onChange: (value: string) => void; wide?: boolean; area?: boolean };

function ReviewField({ label, value, confidence, onChange, wide, area }: FieldProps) {
  const low = confidence < 0.85;
  return <label className={`review-field ${wide ? "wide" : ""}`}><span className="field-label">{label}<span className={`confidence ${low ? "low" : ""}`}><span />{Math.round(confidence * 100)}% {low ? "review" : "confident"}</span></span>{area ? <textarea value={value} onChange={(event) => onChange(event.target.value)} /> : <input value={value} onChange={(event) => onChange(event.target.value)} />}</label>;
}

export function ReviewEditor({ workspaceSlug, cardId, extraction, imageUrls }: ReviewEditorProps) {
  const [side, setSide] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    companyName: extraction.company.name.value ?? "", industry: extraction.company.industry.value ?? "", category: extraction.company.category.value ?? "", website: extraction.company.website.value ?? "", tagline: extraction.company.tagline.value ?? "", description: extraction.company.description.value ?? "", productsServices: (extraction.company.productsServices.value ?? []).join(", "), companyPhones: (extraction.company.phoneNumbers.value ?? []).join(", "), companyEmails: (extraction.company.emailAddresses.value ?? []).join(", "), physicalAddress: extraction.company.physicalAddress.value ?? "", socialMedia: (extraction.company.socialMedia.value ?? []).join(", "),
    fullName: extraction.contact.fullName.value ?? "", jobTitle: extraction.contact.jobTitle.value ?? "", department: extraction.contact.department.value ?? "", contactPhones: (extraction.contact.phoneNumbers.value ?? []).join(", "), contactEmails: (extraction.contact.emailAddresses.value ?? []).join(", "),
    otherInformation: (extraction.otherInformation.value ?? []).map((item) => `${item.label}: ${item.value}`).join("\n"),
  });
  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));
  const reviewCount = [extraction.company.name, extraction.company.industry, extraction.company.category, extraction.company.website, extraction.company.tagline, extraction.company.description, extraction.company.productsServices, extraction.company.phoneNumbers, extraction.company.emailAddresses, extraction.company.socialMedia, extraction.contact.fullName, extraction.contact.jobTitle, extraction.contact.department, extraction.contact.phoneNumbers, extraction.contact.emailAddresses, extraction.company.physicalAddress, extraction.otherInformation].filter((field) => field.needsReview || field.confidence < .85).length;

  const save = async (verificationStatus: "draft" | "verified") => {
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/business-cards/${cardId}/verify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceSlug, verificationStatus, ...form }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "The reviewed record could not be saved.");
      window.location.assign(`/app/${workspaceSlug}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed."); setSaving(false);
    }
  };

  return <div className="review-page">
    <div className="review-heading"><div><div className="eyebrow">AI ANALYSIS COMPLETE</div><h1>Review extracted information</h1><p>Confirm every detail before it becomes part of the shared directory.</p></div><div className="overall-score"><span>Overall confidence</span><strong>{Math.round(extraction.overallConfidence * 100)}%</strong><i><b style={{ width: `${Math.round(extraction.overallConfidence * 100)}%` }} /></i></div></div>
    <div className="review-layout">
      <aside className="card-preview-panel"><div className="preview-head"><h2>Original card</h2><span>{imageUrls.length} image{imageUrls.length === 1 ? "" : "s"}</span></div><div className="large-card-preview">{imageUrls[side] && <Image unoptimized width={640} height={360} className="uploaded-card-image" src={imageUrls[side].url} alt={`${imageUrls[side].side} of original business card`} />}</div>{imageUrls.length > 1 && <div className="side-tabs">{imageUrls.map((image, index) => <button key={image.url} className={side === index ? "active" : ""} onClick={() => setSide(index)}>{image.side === "unknown" ? `Image ${index + 1}` : image.side}</button>)}</div>}<div className="image-quality"><span>✓</span><div><strong>Original securely stored</strong><p>Use it to verify every extracted value.</p></div></div></aside>
      <main className="review-form">
        <section className="review-section"><div className="review-section-title"><span className="section-number">01</span><div><h2>Company</h2><p>Business identity and every company-level contact detail</p></div></div><div className="field-grid"><ReviewField label="Company name" value={form.companyName} onChange={set("companyName")} confidence={extraction.company.name.confidence} /><ReviewField label="Industry" value={form.industry} onChange={set("industry")} confidence={extraction.company.industry.confidence} /><ReviewField label="Category" value={form.category} onChange={set("category")} confidence={extraction.company.category.confidence} /><ReviewField label="Website" value={form.website} onChange={set("website")} confidence={extraction.company.website.confidence} /><ReviewField label="Tagline" value={form.tagline} onChange={set("tagline")} confidence={extraction.company.tagline.confidence} /><ReviewField label="Company phone numbers" value={form.companyPhones} onChange={set("companyPhones")} confidence={extraction.company.phoneNumbers.confidence} /><ReviewField wide label="Company email addresses" value={form.companyEmails} onChange={set("companyEmails")} confidence={extraction.company.emailAddresses.confidence} /><ReviewField wide label="Social media & handles" value={form.socialMedia} onChange={set("socialMedia")} confidence={extraction.company.socialMedia.confidence} /><ReviewField wide area label="Company description" value={form.description} onChange={set("description")} confidence={extraction.company.description.confidence} /><ReviewField wide area label="Products & services" value={form.productsServices} onChange={set("productsServices")} confidence={extraction.company.productsServices.confidence} /></div></section>
        <section className="review-section"><div className="review-section-title"><span className="section-number">02</span><div><h2>Contact person</h2><p>Individual linked to the company</p></div></div><div className="field-grid"><ReviewField label="Full name" value={form.fullName} onChange={set("fullName")} confidence={extraction.contact.fullName.confidence} /><ReviewField label="Job title" value={form.jobTitle} onChange={set("jobTitle")} confidence={extraction.contact.jobTitle.confidence} /><ReviewField label="Department" value={form.department} onChange={set("department")} confidence={extraction.contact.department.confidence} /><ReviewField label="Phone numbers" value={form.contactPhones} onChange={set("contactPhones")} confidence={extraction.contact.phoneNumbers.confidence} /><ReviewField wide label="Email addresses" value={form.contactEmails} onChange={set("contactEmails")} confidence={extraction.contact.emailAddresses.confidence} /></div></section>
        <section className="review-section"><div className="review-section-title"><span className="section-number">03</span><div><h2>Location & other information</h2><p>Additional context preserved by the model</p></div></div><div className="field-grid"><ReviewField wide label="Physical address" value={form.physicalAddress} onChange={set("physicalAddress")} confidence={extraction.company.physicalAddress.confidence} /><ReviewField wide area label="Other information" value={form.otherInformation} onChange={set("otherInformation")} confidence={extraction.otherInformation.confidence} /></div></section>
      </main>
    </div>
    {error && <div className="upload-error" role="alert">{error}</div>}
    <div className="sticky-save"><div><span className="warning-dot">!</span><p><strong>{reviewCount} fields need review</strong><br />Low-confidence and conflicting values remain editable.</p></div><div><button className="secondary" disabled={saving} onClick={() => save("draft")}>Save as draft</button><button className="primary" disabled={saving || !form.companyName.trim()} onClick={() => save("verified")}>{saving ? "Saving…" : "Save verified record →"}</button></div></div>
  </div>;
}
