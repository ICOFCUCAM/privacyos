-- Evidence Vault — the live forensic ledger.
--
-- Until now the Evidence Vault was a read-only *derivation*: the page recomputed
-- evidence from exposures/threats/cases on every load, so the autonomous work
-- the engine actually performed (broker opt-outs filed, cases opened, takedowns
-- routed, playbooks executed) left no immutable record. This table makes the
-- vault a real append-only ledger: the always-on cycle seals each autonomous
-- action as a tamper-evident `case_artifact` here, and Legal/Reports can later
-- cite a concrete evidence id + SHA-256 digest.
--
-- One row per sealed artifact. `custody` keeps the chain-of-custody steps as
-- jsonb. RLS-scoped per user; the service-role scheduler writes user_id by hand.

create table if not exists evidence_records (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  subject_id   uuid not null references subjects(id) on delete cascade,
  kind         text not null default 'case_artifact',
  title        text not null,
  source       text not null,
  hash         text not null,
  risk_level   text not null,
  collected_by text not null,
  collected_at timestamptz not null default now(),
  case_id      uuid references cases(id) on delete set null,
  case_title   text,
  custody      jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists evidence_records_subject_idx
  on evidence_records(subject_id, collected_at desc);

alter table evidence_records enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'evidence_records' and policyname = 'evidence_records_owner'
  ) then
    create policy evidence_records_owner on evidence_records
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end$$;
