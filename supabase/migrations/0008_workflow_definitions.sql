-- User-authored workflow automations from the Workflow Builder. The trigger and
-- ordered steps are stored as jsonb so the visual builder can round-trip them
-- and the orchestrator can later execute a saved definition. RLS-scoped per user.

create table if not exists workflow_definitions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null,
  trigger     jsonb not null default '{}'::jsonb,
  steps       jsonb not null default '[]'::jsonb,
  enabled     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists workflow_definitions_user_idx on workflow_definitions(user_id);

alter table workflow_definitions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'workflow_definitions' and policyname = 'workflow_definitions_owner'
  ) then
    create policy workflow_definitions_owner on workflow_definitions
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end$$;
