-- Per-threat investigation steps — the timestamped, agent-driven trail behind
-- each threat (Discovery → Threat Intel → responder → Incident → Legal → user).
-- Stored as append-only steps so the Threat Intelligence page shows the real
-- investigation, not just a derived one. `agent` is text (not the agent_kind
-- enum) so coordination roles added after 0001 don't require an enum migration.

create table if not exists threat_investigations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id  uuid references subjects(id) on delete cascade,
  threat_id   uuid not null references threats(id) on delete cascade,
  agent       text not null,
  label       text not null,
  created_at  timestamptz not null default now()
);

create index if not exists threat_investigations_threat_idx
  on threat_investigations(threat_id, created_at);

alter table threat_investigations enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'threat_investigations' and policyname = 'threat_investigations_owner'
  ) then
    create policy threat_investigations_owner on threat_investigations
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end$$;
