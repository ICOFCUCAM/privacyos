-- PrivacyOS organization RBAC: team membership with roles.
-- Members belong to an organization with a role (owner/admin/member/viewer).
-- A SECURITY DEFINER helper avoids recursive RLS when policies check membership.

create type org_role as enum ('owner', 'admin', 'member', 'viewer');
create type member_status as enum ('invited', 'active');

create table org_members (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,
  email       text not null,
  role        org_role not null default 'member',
  status      member_status not null default 'invited',
  created_at  timestamptz not null default now()
);
create unique index org_members_org_email_idx on org_members(org_id, lower(email));
create index org_members_user_idx on org_members(user_id);
create index org_members_org_idx on org_members(org_id);

-- Current user's role in an org (NULL if not a member). SECURITY DEFINER so the
-- membership lookup in RLS policies does not recurse through RLS.
create or replace function public.org_role_for(p_org uuid)
  returns org_role
  language sql
  security definer
  stable
  set search_path = public
as $$
  select role from public.org_members
  where org_id = p_org and user_id = auth.uid()
  limit 1
$$;

alter table org_members enable row level security;

-- Members can read their org's roster; only owners/admins can write.
create policy org_members_select on org_members
  for select using (user_id = auth.uid() or public.org_role_for(org_id) is not null);
create policy org_members_write on org_members
  for all
  using (public.org_role_for(org_id) in ('owner', 'admin'))
  with check (public.org_role_for(org_id) in ('owner', 'admin'));

-- Bootstrap: the creator of an organization becomes its owner (bypasses RLS).
create or replace function public.add_org_owner()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  uemail text;
begin
  select email into uemail from auth.users where id = new.user_id;
  insert into org_members (org_id, user_id, email, role, status)
  values (new.id, new.user_id, coalesce(uemail, 'owner@privacyos.local'), 'owner', 'active')
  on conflict (org_id, lower(email)) do nothing;
  return new;
end;
$$;

create trigger organizations_add_owner
  after insert on organizations
  for each row execute function public.add_org_owner();

-- Backfill owners for organizations created before this migration.
insert into org_members (org_id, user_id, email, role, status)
select o.id, o.user_id, coalesce(u.email, 'owner@privacyos.local'), 'owner', 'active'
from organizations o
left join auth.users u on u.id = o.user_id
on conflict (org_id, lower(email)) do nothing;
