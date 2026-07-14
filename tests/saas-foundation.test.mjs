import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("uses the production Next.js stack with Supabase and no legacy vinext runtime", async () => {
  const packageJson = JSON.parse(await read("package.json"));
  assert.equal(packageJson.scripts.dev, "next dev");
  assert.equal(packageJson.scripts.build, "next build");
  assert.ok(packageJson.dependencies["@clerk/nextjs"]);
  assert.ok(packageJson.dependencies.postgres, "postgres driver for Supabase");
  assert.ok(packageJson.dependencies["@supabase/supabase-js"], "Supabase client for private image storage");
  assert.ok(packageJson.dependencies["drizzle-orm"], "drizzle-orm for Supabase");
  assert.ok(packageJson.dependencies.workflow);
  assert.equal(packageJson.dependencies.vinext, undefined);
  assert.equal(packageJson.dependencies["@neondatabase/serverless"], undefined, "legacy Neon driver removed");
  assert.equal(packageJson.dependencies["@vercel/blob"], undefined, "card images stay in Supabase Storage");
  assert.equal(packageJson.devDependencies.wrangler, undefined);
});

test("tenant repositories bind reads and writes to workspace id", async () => {
  const companies = await read("lib/repositories/companies.ts");
  assert.match(companies, /getCompany\(workspaceId: string, id: string\)/);
  assert.match(companies, /eq\(directoryCompanies\.workspaceId, workspaceId\)/);
  assert.match(companies, /archiveCompany\(workspaceId: string, id: string\)/);
  assert.doesNotMatch(companies, /getCompanyById\(id/);
});

test("private uploads use workspace-prefixed Supabase Storage paths and signed uploads", async () => {
  const storage = await read("lib/storage/supabase.ts");
  const upload = await read("app/api/uploads/business-card/route.ts");
  const migration = await read("supabase/migrations/20260714223442_configure_directory_media_bucket.sql");
  assert.match(storage, /workspaces\/\$\{workspaceId\}\/cards\/\$\{businessCardId\}/);
  assert.match(storage, /createSignedUploadUrl/);
  assert.match(storage, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(upload, /createPrivateUploadToken/);
  assert.match(upload, /privateObjectExists/);
  assert.match(upload, /requireWorkspacePermission/);
  assert.match(upload, /checksumSha256/);
  assert.match(migration, /'directory-media'/);
  assert.match(migration, /file_size_limit/);
  assert.match(migration, /allowed_mime_types/);
});

test("multimodal extraction is durable and strictly schema-driven", async () => {
  const workflow = await read("workflows/extract-business-card.ts");
  const schema = await read("lib/ai/business-card-schema.ts");
  const model = await read("lib/ai/extraction-model.ts");
  assert.match(workflow, /"use workflow"/);
  assert.match(workflow, /"use step"/);
  assert.match(workflow, /Output\.object\(\{ schema: businessCardExtractionSchema \}\)/);
  assert.match(workflow, /model: getExtractionModel\(\)/);
  assert.match(workflow, /type: "file", data: bytes, mediaType: image\.mimeType/);
  assert.match(workflow, /status: "awaiting_review"/);
  assert.match(model, /provider\.chat\(modelId\)/);
  assert.match(model, /process\.env\.OPENAI_BASE_URL/);
  assert.match(schema, /Never invent content/);
  assert.match(schema, /overallConfidence/);
  assert.match(schema, /otherInformation/);
});

test("card uploads never fall back to hard-coded extraction results", async () => {
  const home = await read("app/page.tsx");
  const client = await read("app/cardwise-app.tsx");
  assert.match(home, /redirect\(workspace \? `\/app\/\$\{workspace\.slug\}` : "\/onboarding"\)/);
  assert.match(client, /Sign in and open a workspace before uploading a card/);
  assert.doesNotMatch(client, /value="Kampala Print Studio"/);
  assert.doesNotMatch(client, /window\.setTimeout\(\(\) => onReview\(images\)/);
});

test("directory records render their authenticated original card images", async () => {
  const workspace = await read("app/app/[workspaceSlug]/page.tsx");
  const client = await read("app/cardwise-app.tsx");
  assert.match(workspace, /businessCardImages/);
  assert.match(workspace, /originalImages:/);
  assert.match(workspace, /\/api\/card-images\/\$\{image\.id\}/);
  assert.match(client, /company\.originalImages\?/);
  assert.match(client, /src=\{storedImage\}/);
});

test("directory cards support tenant-scoped persistent editing and privacy-safe deletion", async () => {
  const route = await read("app/api/directory-companies/[companyId]/route.ts");
  const client = await read("app/cardwise-app.tsx");
  const storage = await read("lib/storage/supabase.ts");
  assert.match(route, /requireWritableCompany/);
  assert.match(route, /directory:write:any/);
  assert.match(route, /directory:write:own/);
  assert.match(route, /export async function PATCH/);
  assert.match(route, /export async function DELETE/);
  assert.match(route, /directory_company\.updated/);
  assert.match(route, /directory_company\.deleted/);
  assert.match(route, /delete\(searchDocuments\)/);
  assert.match(route, /removePrivateObjects/);
  assert.match(storage, /\.remove\(uniquePathnames\)/);
  assert.match(client, /method: "PATCH"/);
  assert.match(client, /method: "DELETE"/);
  assert.match(client, /Delete permanently/);
});

test("billing and identity webhooks verify signatures and are idempotent", async () => {
  const clerk = await read("app/api/webhooks/clerk/route.ts");
  const stripe = await read("app/api/webhooks/stripe/route.ts");
  assert.match(clerk, /new Webhook/);
  assert.match(clerk, /onConflictDoNothing/);
  assert.match(stripe, /constructEvent/);
  assert.match(stripe, /onConflictDoNothing/);
  assert.match(stripe, /workspaceSubscriptions/);
});

test("public profile links store hashes rather than raw share tokens", async () => {
  const profiles = await read("app/api/digital-profiles/route.ts");
  const lookup = await read("lib/sharing/public-profile.ts");
  assert.match(profiles, /createHash\("sha256"\)\.update\(token\)/);
  assert.match(profiles, /tokenHash/);
  assert.match(lookup, /eq\(shareLinks\.tokenHash, tokenHash\)/);
});

test("directory chat streams tenant-scoped hybrid retrieval as OpenUI before the LLM", async () => {
  const route = await read("app/api/chat/route.ts");
  const client = await read("app/cardwise-app.tsx");
  const retrieval = await read("lib/search/hybrid-search.ts");
  const migration = await read("supabase/migrations/20260713153401_hybrid_business_card_search.sql");
  assert.match(route, /hybridSearchDocuments\(workspaceId, query/);
  assert.match(route, /createUIMessageStreamResponse/);
  assert.match(route, /type: "data-openui"/);
  assert.match(route, /model: getChatModel\(\)/);
  assert.match(client, /useChat<CardwiseUIMessage>/);
  assert.match(client, /DefaultChatTransport/);
  assert.match(client, /part\.type === "data-openui"/);
  assert.match(retrieval, /input_type: inputType/);
  assert.match(retrieval, /VOYAGE_RERANK_MODEL/);
  assert.match(retrieval, /apikey: serviceRoleKey/);
  assert.match(migration, /documents\.workspace_id = p_workspace_id/);
  assert.match(migration, /full outer join semantic/);
  assert.match(migration, /revoke all on function public\.hybrid_search_business_cards/);
});
