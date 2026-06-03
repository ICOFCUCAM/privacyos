-- Caches residence property-data lookups (ATTOM-style property/detail) so the
-- Executive Residence tab sources property-record / map-visibility / listing
-- status from real data without re-billing the provider on every view. One row
-- per (user, address); property facts change slowly so the TTL is long (30d).
-- RLS-scoped per user.

create table if not exists residence_cache (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  address     text not null,
  signals     jsonb,
  fetched_at  timestamptz not null default now(),
  unique (user_id, address)
);

alter table residence_cache enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'residence_cache' and policyname = 'residence_cache_owner'
  ) then
    create policy residence_cache_owner on residence_cache
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end$$;
