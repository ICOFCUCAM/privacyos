-- Caches each discovery connector's finding per (user, subject, connector) so a
-- re-scan (interactive rescans, scheduled cycles) doesn't re-spend a paid API
-- credit until the result is stale. One row per (user, subject, connector_id);
-- refreshed when its TTL lapses. RLS-scoped per user. Mirrors serp_cache.

create table if not exists discovery_cache (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id   uuid not null references subjects(id) on delete cascade,
  connector_id text not null,
  finding      jsonb not null default '{}'::jsonb,
  fetched_at   timestamptz not null default now(),
  unique (user_id, subject_id, connector_id)
);

create index if not exists discovery_cache_subject_idx on discovery_cache(subject_id);

alter table discovery_cache enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'discovery_cache' and policyname = 'discovery_cache_owner'
  ) then
    create policy discovery_cache_owner on discovery_cache
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end$$;
