-- Networking events, consent-safe participant cards, promotions, and analytics.
-- All writes are server-authorized through Clerk workspace permissions. The
-- underlying tables are deliberately not exposed to anon/authenticated roles.

do $$ begin create type public.event_status as enum ('draft','scheduled','live','completed','cancelled','archived'); exception when duplicate_object then null; end $$;
do $$ begin create type public.event_moderation_status as enum ('not_submitted','pending','approved','changes_requested','rejected','suspended'); exception when duplicate_object then null; end $$;
do $$ begin create type public.event_visibility as enum ('public','unlisted','workspace_only','invite_only'); exception when duplicate_object then null; end $$;
do $$ begin create type public.event_directory_access as enum ('public','signed_in','approved_participants','disabled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.event_participant_type as enum ('organizer','sponsor','exhibitor','speaker','company','attendee'); exception when duplicate_object then null; end $$;
do $$ begin create type public.event_participant_status as enum ('draft','pending_review','changes_requested','approved','rejected','published','withdrawn','hidden'); exception when duplicate_object then null; end $$;
do $$ begin create type public.attendance_status as enum ('unknown','registered','checked_in','organizer_confirmed','no_show'); exception when duplicate_object then null; end $$;
do $$ begin create type public.event_invitation_status as enum ('active','exhausted','expired','revoked'); exception when duplicate_object then null; end $$;
do $$ begin create type public.event_promotion_status as enum ('pending_payment','paid_pending_review','scheduled','active','ended','cancelled','refunded'); exception when duplicate_object then null; end $$;

create table if not exists public.events (
  id text primary key,
  owner_workspace_id text not null references public.workspaces(id) on delete cascade,
  created_by_user_id text not null references public.users(id),
  slug text not null unique,
  title text not null,
  summary text not null,
  description text not null,
  event_type text not null,
  category text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'Africa/Kampala',
  venue_name text,
  address_line_1 text,
  address_line_2 text,
  city text,
  region text,
  country text,
  is_virtual boolean not null default false,
  virtual_join_url text,
  website_url text,
  registration_url text,
  contact_name text,
  contact_email text,
  banner_blob_key text,
  logo_blob_key text,
  visibility public.event_visibility not null default 'public',
  directory_access public.event_directory_access not null default 'public',
  allow_company_submissions boolean not null default true,
  allow_individual_submissions boolean not null default true,
  allow_public_card_previews boolean not null default false,
  chat_enabled boolean not null default true,
  status public.event_status not null default 'draft',
  moderation_status public.event_moderation_status not null default 'not_submitted',
  moderation_notes text,
  published_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_date_order_check check (ends_at > starts_at)
);
create index if not exists events_owner_status_start_idx on public.events(owner_workspace_id,status,starts_at);
create index if not exists events_marketplace_idx on public.events(moderation_status,status,starts_at);
create index if not exists events_city_start_idx on public.events(city,starts_at);
create index if not exists events_category_start_idx on public.events(category,starts_at);

create table if not exists public.event_collaborators (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  workspace_id text references public.workspaces(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  role text not null,
  invited_by_user_id text not null references public.users(id),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id,user_id)
);
create index if not exists event_collaborators_workspace_idx on public.event_collaborators(workspace_id,status);

create table if not exists public.event_invitations (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  token_hash text not null unique,
  invitation_type public.event_participant_type not null,
  invited_email text,
  allowed_email_domain text,
  invited_workspace_id text references public.workspaces(id) on delete set null,
  max_uses integer,
  use_count integer not null default 0,
  expires_at timestamptz,
  status public.event_invitation_status not null default 'active',
  created_by_user_id text not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_invitations_use_count_check check (use_count >= 0),
  constraint event_invitations_max_uses_check check (max_uses is null or max_uses > 0)
);
create index if not exists event_invitations_event_status_idx on public.event_invitations(event_id,status,expires_at);

create table if not exists public.event_participants (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  submitting_workspace_id text not null references public.workspaces(id) on delete cascade,
  submitted_by_user_id text not null references public.users(id),
  participant_type public.event_participant_type not null,
  source_company_id text references public.directory_companies(id) on delete set null,
  display_name_snapshot text not null,
  logo_blob_key_snapshot text,
  summary_snapshot text,
  category_snapshot text,
  industry_snapshot text,
  services_snapshot jsonb not null default '[]'::jsonb,
  website_snapshot text,
  location_snapshot text,
  status public.event_participant_status not null default 'pending_review',
  attendance_status public.attendance_status not null default 'registered',
  consent_version text not null,
  consented_at timestamptz not null,
  consented_by_user_id text not null references public.users(id),
  reviewed_by_user_id text references public.users(id),
  reviewed_at timestamptz,
  review_notes text,
  published_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists event_participants_event_status_idx on public.event_participants(event_id,status);
create index if not exists event_participants_workspace_status_idx on public.event_participants(submitting_workspace_id,status);
create unique index if not exists event_participants_event_source_company_uq on public.event_participants(event_id,source_company_id) where source_company_id is not null and status not in ('withdrawn','rejected');

create table if not exists public.event_participant_cards (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  event_participant_id text not null references public.event_participants(id) on delete cascade,
  source_workspace_id text not null references public.workspaces(id) on delete cascade,
  source_business_card_id text references public.business_cards(id) on delete set null,
  source_contact_id text references public.contacts(id) on delete set null,
  source_digital_profile_id text references public.digital_profiles(id) on delete set null,
  display_name_snapshot text not null,
  job_title_snapshot text,
  company_name_snapshot text not null,
  phone_numbers_snapshot jsonb not null default '[]'::jsonb,
  email_addresses_snapshot jsonb not null default '[]'::jsonb,
  social_media_snapshot jsonb not null default '{}'::jsonb,
  website_snapshot text,
  location_snapshot text,
  products_services_snapshot jsonb not null default '[]'::jsonb,
  other_information_snapshot jsonb not null default '[]'::jsonb,
  visibility_config jsonb not null default '{}'::jsonb,
  event_card_preview_blob_key text,
  snapshot_version integer not null default 1,
  status public.event_participant_status not null default 'pending_review',
  sort_order integer not null default 0,
  consented_at timestamptz not null,
  revoked_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_participant_cards_snapshot_version_check check (snapshot_version > 0)
);
create index if not exists event_participant_cards_event_status_idx on public.event_participant_cards(event_id,status);
create index if not exists event_participant_cards_participant_sort_idx on public.event_participant_cards(event_participant_id,sort_order);
create index if not exists event_participant_cards_source_idx on public.event_participant_cards(source_workspace_id,source_business_card_id);

create table if not exists public.event_invitation_uses (
  id text primary key,
  invitation_id text not null references public.event_invitations(id) on delete cascade,
  event_id text not null references public.events(id) on delete cascade,
  user_id text not null references public.users(id),
  workspace_id text not null references public.workspaces(id),
  participant_id text references public.event_participants(id) on delete set null,
  ip_hash text,
  user_agent_hash text,
  used_at timestamptz not null default now()
);
create index if not exists event_invitation_uses_invite_idx on public.event_invitation_uses(invitation_id,used_at);
create index if not exists event_invitation_uses_workspace_idx on public.event_invitation_uses(workspace_id,used_at);

create table if not exists public.event_access_grants (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  participant_id text references public.event_participants(id) on delete set null,
  grant_type text not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id,user_id)
);
create index if not exists event_access_grants_user_idx on public.event_access_grants(user_id,revoked_at);

create table if not exists public.saved_event_contacts (
  id text primary key,
  viewer_workspace_id text not null references public.workspaces(id) on delete cascade,
  saved_by_user_id text not null references public.users(id),
  event_id text not null references public.events(id) on delete cascade,
  event_participant_card_id text not null references public.event_participant_cards(id) on delete cascade,
  directory_company_id text references public.directory_companies(id) on delete set null,
  contact_id text references public.contacts(id) on delete set null,
  source_snapshot_version integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(viewer_workspace_id,event_participant_card_id)
);
create index if not exists saved_event_contacts_event_idx on public.saved_event_contacts(event_id,created_at);

create table if not exists public.event_promotion_packages (
  id text primary key,
  key text not null unique,
  name text not null,
  description text,
  placement text not null,
  duration_days integer not null,
  price_cents integer not null,
  currency text not null default 'usd',
  inventory_limit integer,
  rules jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_promotion_packages_duration_check check (duration_days > 0),
  constraint event_promotion_packages_price_check check (price_cents >= 0)
);
create index if not exists event_promotion_packages_placement_idx on public.event_promotion_packages(placement,active);

create table if not exists public.event_promotion_orders (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  purchaser_workspace_id text not null references public.workspaces(id) on delete cascade,
  package_id text not null references public.event_promotion_packages(id),
  created_by_user_id text not null references public.users(id),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  amount_cents integer not null,
  currency text not null,
  status public.event_promotion_status not null default 'pending_payment',
  requested_start_at timestamptz,
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz,
  reviewed_by_user_id text references public.users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_promotion_orders_amount_check check (amount_cents >= 0),
  constraint event_promotion_orders_schedule_check check (scheduled_end_at is null or scheduled_start_at is null or scheduled_end_at > scheduled_start_at)
);
create index if not exists event_promotion_orders_event_status_idx on public.event_promotion_orders(event_id,status);
create index if not exists event_promotion_orders_schedule_idx on public.event_promotion_orders(status,scheduled_start_at,scheduled_end_at);

create table if not exists public.event_activity_events (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  participant_id text references public.event_participants(id) on delete set null,
  participant_card_id text references public.event_participant_cards(id) on delete set null,
  promotion_order_id text references public.event_promotion_orders(id) on delete set null,
  event_type text not null,
  session_hash text,
  referrer_domain text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists event_activity_event_time_idx on public.event_activity_events(event_id,occurred_at);
create index if not exists event_activity_type_time_idx on public.event_activity_events(event_type,occurred_at);

create table if not exists public.event_metrics_daily (
  event_id text not null references public.events(id) on delete cascade,
  metric_date text not null,
  metric text not null,
  dimension text not null default 'all',
  quantity integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key(event_id,metric_date,metric,dimension)
);

create table if not exists public.user_notifications (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  workspace_id text references public.workspaces(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  target_url text,
  entity_type text,
  entity_id text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists user_notifications_user_read_idx on public.user_notifications(user_id,read_at,created_at);
create index if not exists user_notifications_workspace_idx on public.user_notifications(workspace_id,created_at);

alter table public.search_documents add column if not exists event_id text references public.events(id) on delete cascade;
create index if not exists search_documents_event_entity_idx on public.search_documents(event_id,entity_type,entity_id);

create or replace function public.hybrid_search_event_cards(
  p_event_id text,
  query_text text,
  query_embedding extensions.vector(1024),
  match_count integer default 12,
  full_text_weight double precision default 1,
  semantic_weight double precision default 1,
  rrf_k integer default 50
)
returns table (
  document_id text,
  entity_type text,
  entity_id text,
  chunk_type text,
  content text,
  hybrid_score double precision
)
language sql
stable
set search_path = ''
as $$
  with full_text as (
    select documents.id,
      row_number() over (order by ts_rank_cd(documents.fts, websearch_to_tsquery('english', query_text)) desc) as rank_ix
    from public.search_documents as documents
    where documents.event_id = p_event_id
      and documents.entity_type = 'event_card'
      and documents.fts @@ websearch_to_tsquery('english', query_text)
    order by rank_ix
    limit least(match_count * 3, 60)
  ), semantic as (
    select documents.id,
      row_number() over (order by documents.embedding operator(extensions.<=>) query_embedding) as rank_ix
    from public.search_documents as documents
    where documents.event_id = p_event_id
      and documents.entity_type = 'event_card'
      and documents.embedding is not null
    order by documents.embedding operator(extensions.<=>) query_embedding
    limit least(match_count * 3, 60)
  ), fused as (
    select coalesce(full_text.id, semantic.id) as id,
      coalesce(full_text_weight / (rrf_k + full_text.rank_ix), 0.0) +
      coalesce(semantic_weight / (rrf_k + semantic.rank_ix), 0.0) as score
    from full_text
    full outer join semantic on full_text.id = semantic.id
  )
  select documents.id, documents.entity_type, documents.entity_id, documents.chunk_type,
    documents.content, fused.score
  from fused
  join public.search_documents as documents on documents.id = fused.id
  where documents.event_id = p_event_id
    and documents.entity_type = 'event_card'
  order by fused.score desc
  limit least(match_count, 30);
$$;

revoke all on function public.hybrid_search_event_cards(text,text,extensions.vector,integer,double precision,double precision,integer) from public, anon, authenticated;
grant execute on function public.hybrid_search_event_cards(text,text,extensions.vector,integer,double precision,double precision,integer) to service_role;

alter table public.events enable row level security;
alter table public.event_collaborators enable row level security;
alter table public.event_invitations enable row level security;
alter table public.event_participants enable row level security;
alter table public.event_participant_cards enable row level security;
alter table public.event_invitation_uses enable row level security;
alter table public.event_access_grants enable row level security;
alter table public.saved_event_contacts enable row level security;
alter table public.event_promotion_packages enable row level security;
alter table public.event_promotion_orders enable row level security;
alter table public.event_activity_events enable row level security;
alter table public.event_metrics_daily enable row level security;
alter table public.user_notifications enable row level security;

revoke all on public.events, public.event_collaborators, public.event_invitations,
  public.event_participants, public.event_participant_cards, public.event_invitation_uses,
  public.event_access_grants, public.saved_event_contacts, public.event_promotion_packages,
  public.event_promotion_orders, public.event_activity_events, public.event_metrics_daily,
  public.user_notifications from anon, authenticated;

grant all on public.events, public.event_collaborators, public.event_invitations,
  public.event_participants, public.event_participant_cards, public.event_invitation_uses,
  public.event_access_grants, public.saved_event_contacts, public.event_promotion_packages,
  public.event_promotion_orders, public.event_activity_events, public.event_metrics_daily,
  public.user_notifications to service_role;

insert into public.event_promotion_packages (id,key,name,description,placement,duration_days,price_cents,currency,inventory_limit,rules)
values
  ('event_pkg_standard','standard-listing','Standard listing','Public events directory placement.','events_index',30,2500,'usd',null,'{}'::jsonb),
  ('event_pkg_featured','featured-event','Featured event','Boosted placement in the events directory.','events_index',14,7500,'usd',20,'{}'::jsonb),
  ('event_pkg_homepage','homepage-feature','Homepage feature','Featured placement in the Cardwise homepage events section.','homepage',7,15000,'usd',3,'{}'::jsonb)
on conflict (key) do nothing;
