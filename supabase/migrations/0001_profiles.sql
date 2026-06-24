-- profiles: one row per auth user, 1:1 with auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  company_name text,
  country text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'manager')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Helper: is the current caller a manager? SECURITY DEFINER bypasses RLS,
-- which also avoids recursion inside the profiles SELECT policy below.
create or replace function public.is_manager()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'manager'
  );
$$;

-- A user can read their own profile; managers can read all.
create policy "profiles_select_own_or_manager"
  on public.profiles for select
  using (id = auth.uid() or public.is_manager());

-- A user can update their own profile; managers can update all.
create policy "profiles_update_own_or_manager"
  on public.profiles for update
  using (id = auth.uid() or public.is_manager())
  with check (id = auth.uid() or public.is_manager());

-- Insert happens only via the signup trigger (SECURITY DEFINER) — no client insert policy.

-- Signup trigger: create a profile from auth sign-up metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, company_name, country, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'company_name', ''),
    coalesce(new.raw_user_meta_data->>'country', ''),
    nullif(new.raw_user_meta_data->>'phone', ''),
    'customer'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
