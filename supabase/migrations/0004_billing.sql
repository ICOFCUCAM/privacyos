-- PrivacyOS billing: subscriptions.
-- One active subscription record per user, kept in sync by the Stripe webhook.
-- RLS lets a user read their own row; writes happen via the service-role webhook.

create type subscription_status as enum (
  'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'unpaid', 'none'
);

create table subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan_id                text not null,                       -- PrivacyOS plan id (see billing/plans.ts)
  status                 subscription_status not null default 'none',
  stripe_customer_id     text,
  stripe_subscription_id text,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create unique index subscriptions_user_idx on subscriptions(user_id);
create index subscriptions_stripe_customer_idx on subscriptions(stripe_customer_id);

create trigger subscriptions_updated_at before update on subscriptions
  for each row execute function set_updated_at();

alter table subscriptions enable row level security;

-- Users can read (and self-insert a placeholder for) their own subscription.
-- Authoritative status changes are written by the service-role webhook handler.
create policy subscriptions_read on subscriptions
  for select using (user_id = auth.uid());
create policy subscriptions_insert on subscriptions
  for insert with check (user_id = auth.uid());
