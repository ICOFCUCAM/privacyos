-- Internal SerpApi usage meter — an invisible cost/abuse backstop (never shown
-- to users). One row per (user, billing period) tracks live SerpApi searches
-- spent. consume_serp_budget() atomically reserves N searches against a budget,
-- returning false (without incrementing) when it would exceed — so a generous
-- internal ceiling caps spend even if caching/cadence are bypassed by a bug or
-- abuse. RLS-scoped per user; the service-role scheduler bypasses RLS.

create table if not exists serp_usage (
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  period_start date not null,
  used         int  not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (user_id, period_start)
);

alter table serp_usage enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'serp_usage' and policyname = 'serp_usage_owner'
  ) then
    create policy serp_usage_owner on serp_usage
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end$$;

-- Atomic reserve-or-deny. Row-locks the period so concurrent connectors can't
-- overspend. Returns true and increments when within budget; false otherwise.
create or replace function consume_serp_budget(
  p_user_id uuid, p_period date, p_amount int, p_budget int
) returns boolean language plpgsql as $$
declare cur int;
begin
  insert into serp_usage(user_id, period_start, used)
    values (p_user_id, p_period, 0)
    on conflict (user_id, period_start) do nothing;
  select used into cur from serp_usage
    where user_id = p_user_id and period_start = p_period for update;
  if cur + p_amount > p_budget then
    return false;
  end if;
  update serp_usage set used = used + p_amount, updated_at = now()
    where user_id = p_user_id and period_start = p_period;
  return true;
end$$;

grant execute on function consume_serp_budget(uuid, date, int, int) to authenticated, service_role;
