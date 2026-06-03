-- Stored workflow executions (the Layer-11 History view). Each row is one
-- WorkflowRun produced by executeWorkflow: the run record (start/end/duration,
-- agent activity, outputs, errors) is kept as jsonb, with a per-user sequence
-- for the human "#<seq>" reference. RLS-scoped per user.

create table if not exists workflow_runs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  seq         bigint not null,
  run         jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists workflow_runs_user_idx on workflow_runs(user_id, seq desc);

alter table workflow_runs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'workflow_runs' and policyname = 'workflow_runs_owner'
  ) then
    create policy workflow_runs_owner on workflow_runs
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end$$;
