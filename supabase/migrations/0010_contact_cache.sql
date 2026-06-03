-- Caches journalist/newsroom contact lookups (Hunter.io domain-search) so the
-- Media tab enriches outlets with real emails without re-billing the provider on
-- every view. One row per (user, domain); contacts change slowly so the TTL is
-- long (30d). RLS-scoped per user.

create table if not exists contact_cache (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  domain      text not null,
  contacts    jsonb not null default '[]'::jsonb,
  fetched_at  timestamptz not null default now(),
  unique (user_id, domain)
);

alter table contact_cache enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'contact_cache' and policyname = 'contact_cache_owner'
  ) then
    create policy contact_cache_owner on contact_cache
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end$$;
