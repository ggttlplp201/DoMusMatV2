-- Phase 1 pano tour: render_jobs + public `tours` storage bucket.
-- Assumes 0001 (profiles) and 0003 (touch_updated_at) are already applied.

create table if not exists public.render_jobs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  status      text not null default 'queued'
                check (status in ('queued', 'rendering', 'ready', 'error')),
  phase       text not null default 'browser'
                check (phase in ('browser', 'cycles')),
  spec        jsonb not null,
  pano_urls   jsonb not null default '{}'::jsonb,
  error       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.render_jobs enable row level security;

create index if not exists render_jobs_user_id_idx on public.render_jobs(user_id);

-- RLS: a user reads / creates / updates only their own render jobs.
create policy "render_jobs_select_own" on public.render_jobs for select
  using (user_id = auth.uid());
create policy "render_jobs_insert_own" on public.render_jobs for insert
  with check (user_id = auth.uid());
create policy "render_jobs_update_own" on public.render_jobs for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- keep updated_at fresh (reuses the trigger fn from 0003)
drop trigger if exists render_jobs_touch_updated on public.render_jobs;
create trigger render_jobs_touch_updated
  before update on public.render_jobs
  for each row execute function public.touch_updated_at();

-- public-read bucket for rendered panoramas
insert into storage.buckets (id, name, public)
  values ('tours', 'tours', true)
  on conflict (id) do nothing;

-- authenticated users may write panos; anyone may read them
create policy "tours_write_authenticated" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'tours');
create policy "tours_read_public" on storage.objects
  for select using (bucket_id = 'tours');
