-- Caches a subject's live page-one search rankings so the SEO tab doesn't spend
-- a SERP-provider credit (and ~15s) on every view. One row per (user, subject);
-- refreshed when stale. RLS-scoped per user.

create table if not exists serp_cache (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id  uuid not null references subjects(id) on delete cascade,
  query       text not null,
  provider    text not null,
  results     jsonb not null default '[]'::jsonb,
  fetched_at  timestamptz not null default now(),
  unique (user_id, subject_id)
);

create index if not exists serp_cache_subject_idx on serp_cache(subject_id);

alter table serp_cache enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'serp_cache' and policyname = 'serp_cache_owner'
  ) then
    create policy serp_cache_owner on serp_cache
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end$$;
