-- PrivacyOS suite expansion: ReputationOS, ExecutiveOS, BusinessOS, legal,
-- reporting, scoring snapshots, notifications and the extended agent layer.
-- Every table is user-owned and guarded by RLS, mirroring 0001.

-- ── Enums ─────────────────────────────────────────────────────────────────
create type mention_channel  as enum ('search','news','blog','review','forum','social');
create type sentiment_label   as enum ('positive','neutral','negative','mixed');
create type incident_status   as enum ('open','investigating','evidence_gathered','takedown_requested','resolved','dismissed');
create type legal_request_type as enum ('gdpr_erasure','ccpa_delete','broker_optout','defamation_complaint','platform_abuse','privacy_violation');
create type legal_request_status as enum ('draft','ready','submitted','acknowledged','completed','rejected','escalated');
create type report_type       as enum ('privacy','executive','business','threat','compliance','risk','board');
create type notification_kind as enum ('alert','incident','report_ready','removal_update','recommendation','system');
create type score_kind        as enum ('privacy','identity','reputation','executive','business','overall');
create type agent_action_kind as enum ('scan','analyze','remove','draft_legal','monitor','escalate','report');
create type domain_risk_kind  as enum ('typosquat','expired_cert','spoof_mx','phishing','dns_takeover','exposed_subdomain');

-- ── Organizations (BusinessOS tenancy) ───────────────────────────────────
create table organizations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null,
  primary_domain text,
  employee_count int default 0,
  created_at  timestamptz not null default now()
);

create table executive_profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id  uuid references subjects(id) on delete cascade,
  title       text,
  protection_tier text not null default 'executive',
  threat_level risk_level not null default 'medium',
  created_at  timestamptz not null default now()
);

create table family_profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id  uuid references subjects(id) on delete cascade,
  display_name text not null,
  relation    text not null,
  is_minor    boolean not null default false,
  risk_level  risk_level not null default 'low',
  exposures_count int not null default 0,
  created_at  timestamptz not null default now()
);

-- ── ReputationOS ──────────────────────────────────────────────────────────
create table mentions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id  uuid references subjects(id) on delete cascade,
  channel     mention_channel not null,
  source_name text not null,
  url         text,
  title       text not null,
  excerpt     text not null default '',
  sentiment   sentiment_label not null default 'neutral',
  sentiment_score numeric(4,3) not null default 0,  -- -1..1
  search_rank int,
  is_defamatory boolean not null default false,
  detected_at timestamptz not null default now()
);
create index mentions_subject_idx on mentions(subject_id);
create index mentions_channel_idx on mentions(channel);

create table sentiment_records (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id  uuid references subjects(id) on delete cascade,
  recorded_on date not null default current_date,
  positive    int not null default 0,
  neutral     int not null default 0,
  negative    int not null default 0,
  net_score   numeric(4,3) not null default 0
);
create index sentiment_subject_idx on sentiment_records(subject_id);

-- ── ExecutiveOS incidents ─────────────────────────────────────────────────
create table incidents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id  uuid references subjects(id) on delete cascade,
  kind        threat_kind not null,
  title       text not null,
  detail      text not null default '',
  risk_level  risk_level not null,
  status      incident_status not null default 'open',
  evidence    jsonb not null default '[]',
  detected_at timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index incidents_subject_idx on incidents(subject_id);
create index incidents_kind_idx on incidents(kind);

create table travel_alerts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id  uuid references subjects(id) on delete cascade,
  destination text not null,
  travel_date date,
  risk_level  risk_level not null default 'low',
  advisory    text not null default '',
  created_at  timestamptz not null default now()
);
create index travel_alerts_subject_idx on travel_alerts(subject_id);

-- ── BusinessOS ──────────────────────────────────────────────────────────--
create table domains (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  org_id      uuid references organizations(id) on delete cascade,
  domain      text not null,
  is_primary  boolean not null default false,
  monitored_since timestamptz not null default now()
);
create index domains_org_idx on domains(org_id);

create table domain_risks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  domain_id   uuid references domains(id) on delete cascade,
  kind        domain_risk_kind not null,
  detail      text not null default '',
  risk_level  risk_level not null,
  detected_at timestamptz not null default now(),
  resolved    boolean not null default false
);
create index domain_risks_domain_idx on domain_risks(domain_id);

create table employee_exposures (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  org_id      uuid references organizations(id) on delete cascade,
  employee_email text not null,
  employee_name  text,
  exposure_type  text not null,
  risk_level  risk_level not null,
  source      exposure_source not null,
  detected_at timestamptz not null default now()
);
create index employee_exposures_org_idx on employee_exposures(org_id);

create table credential_leaks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  org_id      uuid references organizations(id) on delete cascade,
  subject_id  uuid references subjects(id) on delete cascade,
  account     text not null,
  breach_name text not null,
  data_classes text[] not null default '{}',
  pwn_count   bigint default 0,
  risk_level  risk_level not null,
  leaked_at   date,
  detected_at timestamptz not null default now()
);
create index credential_leaks_org_idx on credential_leaks(org_id);

create table third_party_risks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  org_id      uuid references organizations(id) on delete cascade,
  vendor_name text not null,
  category    text not null default 'vendor',
  risk_score  int not null default 0,
  risk_level  risk_level not null,
  findings    text not null default '',
  assessed_at timestamptz not null default now()
);
create index third_party_risks_org_idx on third_party_risks(org_id);

-- ── Legal automation ──────────────────────────────────────────────────────
create table legal_templates (
  id          uuid primary key default gen_random_uuid(),
  type        legal_request_type not null,
  jurisdiction text not null default 'EU',
  name        text not null,
  body        text not null
);

create table legal_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id  uuid references subjects(id) on delete cascade,
  exposure_id uuid references exposures(id) on delete set null,
  type        legal_request_type not null,
  recipient   text not null,
  status      legal_request_status not null default 'draft',
  body        text not null default '',
  submitted_at timestamptz,
  responded_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index legal_requests_subject_idx on legal_requests(subject_id);

-- ── Reporting, notifications, scores, audit, agent layer ──────────────────
create table reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id  uuid references subjects(id) on delete cascade,
  type        report_type not null,
  title       text not null,
  period_start date,
  period_end   date,
  format      text not null default 'html',
  payload     jsonb not null default '{}',
  generated_at timestamptz not null default now()
);
create index reports_subject_idx on reports(subject_id);

create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind        notification_kind not null,
  title       text not null,
  body        text not null default '',
  risk_level  risk_level,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on notifications(user_id, read);

create table score_snapshots (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id  uuid references subjects(id) on delete cascade,
  kind        score_kind not null,
  value       int not null,
  taken_at    timestamptz not null default now()
);
create index score_snapshots_subject_idx on score_snapshots(subject_id, kind);

create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  actor       text not null default 'system',
  action      text not null,
  entity      text,
  entity_id   uuid,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index audit_logs_user_idx on audit_logs(user_id, created_at);

create table agent_actions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id  uuid references subjects(id) on delete cascade,
  agent       agent_kind not null,
  kind        agent_action_kind not null,
  summary     text not null,
  status      text not null default 'completed',
  created_at  timestamptz not null default now()
);
create index agent_actions_subject_idx on agent_actions(subject_id);

create table agent_findings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id  uuid references subjects(id) on delete cascade,
  agent       agent_kind not null,
  finding     text not null,
  risk_level  risk_level not null default 'low',
  created_at  timestamptz not null default now()
);
create index agent_findings_subject_idx on agent_findings(subject_id);

create table agent_tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id  uuid references subjects(id) on delete cascade,
  agent       agent_kind not null,
  description text not null,
  status      text not null default 'queued',
  scheduled_for timestamptz,
  created_at  timestamptz not null default now()
);
create index agent_tasks_subject_idx on agent_tasks(subject_id, status);

-- ── updated_at triggers ───────────────────────────────────────────────────
create trigger incidents_updated_at before update on incidents
  for each row execute function set_updated_at();
create trigger legal_requests_updated_at before update on legal_requests
  for each row execute function set_updated_at();

-- ── Row Level Security ─────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'organizations','executive_profiles','family_profiles','mentions','sentiment_records',
    'incidents','travel_alerts','domains','domain_risks','employee_exposures','credential_leaks',
    'third_party_risks','legal_requests','reports','notifications','score_snapshots',
    'audit_logs','agent_actions','agent_findings','agent_tasks'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
    execute format(
      'create policy %1$I_owner on %1$I for all using (user_id = auth.uid()) with check (user_id = auth.uid());',
      t
    );
  end loop;
end$$;

-- Legal templates are shared catalog data (read-only to all authenticated users).
alter table legal_templates enable row level security;
create policy legal_templates_read on legal_templates for select using (auth.role() = 'authenticated');
