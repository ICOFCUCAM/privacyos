-- Invite acceptance: let a signed-in user claim org invitations addressed to
-- their email. SECURITY DEFINER so it can update rows the invitee can't yet see
-- under RLS (they aren't a member until they accept).

create or replace function public.accept_org_invites()
  returns integer
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  uemail text;
  claimed integer;
begin
  select email into uemail from auth.users where id = auth.uid();
  if uemail is null then
    return 0;
  end if;

  update org_members
    set user_id = auth.uid(), status = 'active'
  where user_id is null
    and lower(email) = lower(uemail);

  get diagnostics claimed = row_count;
  return claimed;
end;
$$;

revoke all on function public.accept_org_invites() from public;
grant execute on function public.accept_org_invites() to authenticated;
