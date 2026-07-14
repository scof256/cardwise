import "dotenv/config";
import { createHash } from "node:crypto";

const companies = [
  { id: "demo-kampala-print", name: "Kampala Print Studio", contact: "Amina Nsubuga", role: "Creative Director", phone: "+256 772 410 882", email: "amina@kampalaprint.ug", site: "kampalaprint.ug", location: "Kampala, Uganda", category: "Printing & Design", services: ["Large format printing", "Brand identity", "Packaging"], added: "Today, 10:42" },
  { id: "demo-buildcore", name: "BuildCore Africa", contact: "Daniel Okello", role: "Projects Manager", phone: "+256 701 332 190", email: "daniel@buildcore.africa", site: "buildcore.africa", location: "Ntinda, Kampala", category: "Construction", services: ["Commercial construction", "Project planning"], added: "Yesterday" },
  { id: "demo-medline", name: "Medline Solutions", contact: "Grace Atim", role: "Business Development Lead", phone: "+256 758 920 114", email: "grace@medlinesolutions.co.ug", site: "medlinesolutions.co.ug", location: "Kololo, Kampala", category: "Medical Equipment", services: ["Diagnostic equipment", "Laboratory supplies"], added: "Jul 10, 2026" },
  { id: "demo-harbor-pine", name: "Harbor & Pine Advisory", contact: "Isaac Mugisha", role: "Managing Partner", phone: "+256 783 006 220", email: "isaac@harborpine.com", site: "harborpine.com", location: "Entebbe, Uganda", category: "Consulting", services: ["Business strategy", "Financial advisory"], added: "Jul 8, 2026" },
];

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function content(company) {
  return [
    `Company: ${company.name}`,
    `Category: ${company.category}`,
    `Products and services: ${company.services.join(", ")}`,
    `Primary contact: ${company.contact}`,
    `Job title: ${company.role}`,
    `Phone: ${company.phone}`,
    `Email: ${company.email}`,
    `Website: ${company.site}`,
    `Address: ${company.location}`,
    `Date added: ${company.added}`,
  ].join("\n");
}

async function embedding(value) {
  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${required("VOYAGE_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ input: value, model: process.env.VOYAGE_EMBEDDING_MODEL ?? "voyage-4", input_type: "document", output_dimension: Number(process.env.VOYAGE_EMBEDDING_DIMENSIONS ?? 1024), output_dtype: "float", truncation: true }),
  });
  if (!response.ok) throw new Error(`Voyage embedding failed (${response.status})`);
  const payload = await response.json();
  return payload.data[0].embedding;
}

const key = required("SUPABASE_SERVICE_ROLE_KEY");
const url = required("NEXT_PUBLIC_SUPABASE_URL");
for (const company of companies) {
  const document = content(company);
  const response = await fetch(`${url}/rest/v1/search_documents?on_conflict=id`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      id: `company:${company.id}:profile`,
      workspace_id: "cardwise-preview",
      entity_type: "company",
      entity_id: company.id,
      chunk_type: "profile",
      content: document,
      embedding: await embedding(document),
      content_hash: createHash("sha256").update(document).digest("hex"),
      model_version: `${process.env.VOYAGE_EMBEDDING_MODEL ?? "voyage-4"}:${process.env.VOYAGE_EMBEDDING_DIMENSIONS ?? "1024"}`,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) throw new Error(`Supabase preview indexing failed (${response.status}): ${await response.text()}`);
}

console.log(`Indexed ${companies.length} preview companies.`);
