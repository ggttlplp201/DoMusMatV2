-- Security: prevent privilege escalation via profile self-update.
-- The profiles UPDATE policy lets a user edit their own row (name/company/country),
-- but must NOT let a non-manager change the `role` column (e.g. customer -> manager).
--
-- This BEFORE UPDATE trigger blocks a role change UNLESS the caller is a manager.
-- The `auth.uid() is null` escape hatch keeps administrative promotion working from
-- trusted contexts where there is no end-user JWT (the SQL editor / service_role),
-- which is how the first manager is seeded.

create or replace function public.enforce_role_change_is_manager()
returns trigger
language plpgsql
security definer
set search_path = public
as $enforce_role$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_manager() then
    raise exception 'Only managers can change a profile role';
  end if;
  return new;
end;
$enforce_role$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row execute function public.enforce_role_change_is_manager();
