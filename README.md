# Cardwise SaaS

AI-powered business-card wallet, contact manager, company directory, and team sales-intelligence platform.

## Stack

- Next.js 16 App Router and React 19
- Clerk authentication and Organizations
- PostgreSQL with Drizzle ORM for application records
- Supabase Postgres full-text search and pgvector for tenant-scoped hybrid retrieval
- Private Supabase Storage for business-card images
- Vercel Workflow for durable extraction
- AI SDK structured multimodal extraction and directory-chat retrieval
- Stripe subscriptions and customer portal
- Upstash Redis dependencies ready for rate limits and distributed locks

## Local setup

1. Copy `.env.example` to `.env.local` and configure the services you want to exercise.
2. Install dependencies with `npm install`.
3. Generate migrations with `npm run db:generate` if the schema changes.
4. Apply checked-in migrations to a development database with `npm run db:migrate`.
5. Link the Supabase project and run `npx supabase db push` to install the hybrid-search RPC and indexes.
6. Start the app with `npm run dev` and open `http://localhost:3000`.

Without external credentials, the public product preview and auth setup guidance still render. Durable account, upload, AI, and billing workflows intentionally require their real service credentials; there are no simulated production credentials.

## Required service configuration

- In Clerk, enable Organizations, configure the workspace roles from the implementation plan, and point a signing webhook at `/api/webhooks/clerk`.
- Point `DATABASE_URL` at the PostgreSQL database containing the application schema.
- Configure the Supabase URL and server-only service-role key, then apply `supabase/migrations`.
- Configure Voyage embeddings and reranking. The checked-in hybrid-search migration uses 1,024-dimensional `voyage-4` vectors.
- Create a private Supabase Storage bucket (the default name is `directory-media`) and set `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only; the browser uploads with short-lived signed tokens.
- Configure the OpenAI-compatible chat endpoint/model variables. Retrieved Supabase records are passed to this model as grounded context.
- Create Stripe Pro and Business prices, then point a signing webhook at `/api/webhooks/stripe`.

## Commands

- `npm run dev` — local Next.js server
- `npm run build` — production build, including workflow compilation
- `npm run typecheck` — strict TypeScript check
- `npm run lint` — ESLint and React/Next rules
- `npm test` — SaaS architecture and security-contract tests
- `npm run db:generate` — generate PostgreSQL migrations
- `npm run db:migrate` — apply migrations using `.env.local`

## Security invariants

- All tenant resources are scoped by a server-resolved `workspaceId`.
- Authorization is repeated in pages, actions, and API handlers rather than relying on the proxy alone.
- Card images use private workspace-prefixed blob paths and authenticated streaming routes.
- Clerk and Stripe webhooks verify signatures and persist event IDs for idempotency.
- Public share URLs store only SHA-256 token hashes.
- AI generations and extraction runs are persisted before execution and updated on success or failure.

The complete implementation blueprint remains at `../cardwise-saas-implementation-plan.md`.
