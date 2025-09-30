-- Supabase schema (UUID + RLS across all domain tables)
-- Enable pgcrypto for gen_random_uuid() if not already
create extension if not exists pgcrypto;

-- Profiles (one-to-one with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default ''::text,
  is_admin boolean not null default false,
  linkedin_token text,
  linkedin_id text,
  linkedin_connected_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text not null default 'inactive',
  subscription_plan text not null default 'pro',
  subscription_current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_ends_at timestamptz,
  trial_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
drop policy if exists profiles_self_rw on public.profiles;
create policy profiles_self_rw on public.profiles
  for all using (auth.uid() = id)
  with check (auth.uid() = id);

-- Content projects
create table if not exists public.content_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  source_url text,
  transcript_original text,
  transcript_cleaned text,
  current_stage text not null default 'processing',
  processing_progress integer not null default 0,
  processing_step text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.content_projects enable row level security;
drop policy if exists content_projects_rw on public.content_projects;
create policy content_projects_rw on public.content_projects
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Insights
create table if not exists public.insights (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.content_projects(id) on delete cascade,
  content text not null,
  quote text,
  score double precision,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.insights enable row level security;
drop policy if exists insights_rw on public.insights;
create policy insights_rw on public.insights
  for all using (exists (select 1 from public.content_projects p where p.id = project_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.content_projects p where p.id = project_id and p.user_id = auth.uid()));

-- Posts
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.content_projects(id) on delete cascade,
  insight_id uuid references public.insights(id) on delete set null,
  content text not null,
  hashtags text[] not null default '{}'::text[],
  platform text not null default 'LinkedIn',
  status text not null default 'pending',
  published_at timestamptz,
  scheduled_at timestamptz,
  schedule_status text,
  schedule_error text,
  schedule_attempted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.posts enable row level security;
drop policy if exists posts_rw on public.posts;
create policy posts_rw on public.posts
  for all using (exists (select 1 from public.content_projects p where p.id = project_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.content_projects p where p.id = project_id and p.user_id = auth.uid()));

-- Scheduling preferences
create table if not exists public.user_schedule_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  timezone text not null,
  lead_time_minutes integer not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_schedule_preferences enable row level security;
drop policy if exists usp_rw on public.user_schedule_preferences;
create policy usp_rw on public.user_schedule_preferences
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Preferred timeslots
create table if not exists public.user_preferred_timeslots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  iso_day_of_week smallint not null,
  minutes_from_midnight integer not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, iso_day_of_week, minutes_from_midnight)
);
alter table public.user_preferred_timeslots enable row level security;
drop policy if exists upt_rw on public.user_preferred_timeslots;
create policy upt_rw on public.user_preferred_timeslots
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Style profiles
create table if not exists public.user_style_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  style jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_style_profiles enable row level security;
drop policy if exists usp_style_rw on public.user_style_profiles;
create policy usp_style_rw on public.user_style_profiles
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- AI usage events (server-side auditing; typically service role inserts)
create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  project_id uuid references public.content_projects(id) on delete set null,
  action text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(12,6) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.ai_usage_events enable row level security;
-- No general user access; you may add read-only admin policies as needed
drop policy if exists ai_events_none on public.ai_usage_events;
create policy ai_events_none on public.ai_usage_events for select using (false);

-- Auto-provision profiles on new auth user
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
