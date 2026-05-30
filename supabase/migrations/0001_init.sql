-- PrivacyOS initial schema
-- Multi-tenant by Supabase auth user. Every row is owned by a `user_id` and
-- guarded by row-level security so tenants can only ever see their own data.

-- ── Enums ─────────────────────────────────────────────────────────────────
create type subject_type as enum ('individual', 'executive', 'family_member', 'business');
create type risk_level   as enum ('low', 'medium', 'high', 'critical');
create type exposure_category as enum
  ('name','alias','email','phone','address','family','photo','username','employer','financial','credential');
create type exposure_source as enum
  ('data_broker','search_engine','social_media','forum','breach_db','dark_web','news','public_record','archive','ai_generated');
create type exposure_status as enum
  ('discovered','triaged','removal_requested','in_progress','removed','monitoring','reappeared');
create type case_type as enum
  ('data_broker_removal','reputation_recovery','deepfake_incident','impersonation_takedown','breach_response','legal_request');
create type case_status as enum ('open','in_progress','awaiting_response','escalated','resolved');
create type threat_kind as enum
  ('credential_leak','dark_web_mention','deepfake','impersonation','doxxing','location_exposure','negative_press');
create type agent_kind as enum
  ('discovery','privacy','legal','reputation','security','deepfake','executive','business');

-- ── Tables ────────────────────────────────────────────────────────────────
create table subjects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type         subject_type not null default 'individual',
  display_name text not null,
  emails       text[] not null default '{}',
  phones       text[] not null default '{}',
  usernames    text[] not null default '{}',
  organization text,
  created_at   timestamptz not null default now()
);

create table exposures (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id   uuid not null references subjects(id) on delete cascade,
  category     exposure_category not null,
  source       exposure_source not null,
  source_name  text not null,
  url          text,
  snippet      text not null default '',
  risk_level   risk_level not null,
  risk_score   int not null default 0,
  status       exposure_status not null default 'discovered',
  discovered_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);
create index exposures_subject_idx on exposures(subject_id);

create table threats (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id   uuid not null references subjects(id) on delete cascade,
  kind         threat_kind not null,
  title        text not null,
  detail       text not null default '',
  risk_level   risk_level not null,
  source       exposure_source not null,
  detected_at  timestamptz not null default now(),
  acknowledged boolean not null default false
);
create index threats_subject_idx on threats(subject_id);

create table cases (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id   uuid not null references subjects(id) on delete cascade,
  type         case_type not null,
  title        text not null,
  summary      text not null default '',
  status       case_status not null default 'open',
  risk_level   risk_level not null,
  assigned_agent agent_kind not null,
  related_exposure_ids uuid[] not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index cases_subject_idx on cases(subject_id);

-- Data-broker opt-out lifecycle, driven by the Privacy Agent.
create table removal_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id   uuid not null references subjects(id) on delete cascade,
  exposure_id  uuid references exposures(id) on delete set null,
  broker_name  text not null,
  status       exposure_status not null default 'removal_requested',
  submitted_at timestamptz not null default now(),
  next_check_at timestamptz,
  history      jsonb not null default '[]'
);
create index removal_requests_subject_idx on removal_requests(subject_id);

-- Recommendations emitted by agents for user approval.
create table recommendations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id   uuid not null references subjects(id) on delete cascade,
  agent        agent_kind not null,
  title        text not null,
  rationale    text not null default '',
  risk_level   risk_level not null,
  impact       int not null default 0,
  action_label text not null default 'Approve',
  approved     boolean not null default false,
  created_at   timestamptz not null default now()
);
create index recommendations_subject_idx on recommendations(subject_id);

-- Append-only audit log of every agent run (compliance requirement).
create table agent_runs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id  uuid not null references subjects(id) on delete cascade,
  agent       agent_kind not null,
  log         text[] not null default '{}',
  items_handled int not null default 0,
  ran_at      timestamptz not null default now()
);
create index agent_runs_subject_idx on agent_runs(subject_id);

-- ── Updated-at trigger for cases ─────────────────────────────────────────
create or replace function set_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger cases_updated_at before update on cases
  for each row execute function set_updated_at();

-- ── Row Level Security ───────────────────────────────────────────────────
alter table subjects          enable row level security;
alter table exposures         enable row level security;
alter table threats           enable row level security;
alter table cases             enable row level security;
alter table removal_requests  enable row level security;
alter table recommendations   enable row level security;
alter table agent_runs        enable row level security;

do $$
declare t text;
begin
  foreach t in array array['subjects','exposures','threats','cases','removal_requests','recommendations','agent_runs']
  loop
    execute format(
      'create policy %1$I_owner on %1$I for all using (user_id = auth.uid()) with check (user_id = auth.uid());',
      t
    );
  end loop;
end$$;
