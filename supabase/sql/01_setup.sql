-- PM Tracker (Projects / Tasks / Panjar) - Supabase SQL Setup
-- 1) Run this in Supabase SQL Editor.
-- 2) After that: create auth users, set role/full_name in user metadata, and assign project_members.

-- Extensions
create extension if not exists pgcrypto;

-- PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'pm', -- admin | pm_lead | pm
  created_at timestamptz not null default now()
);

-- Auto-create profile when auth user created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'pm')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- PROJECTS
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date,
  end_date date,
  status text not null default 'active', -- active | completed | archived
  health text not null default 'on_track', -- on_track | at_risk | off_track
  owner_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
before update on public.projects
for each row execute procedure public.set_updated_at();

-- PROJECT MEMBERS
create table if not exists public.project_members (
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  member_role text not null default 'pm', -- pm_lead | pm
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

-- TASKS
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  pic_user_id uuid references public.profiles(id),
  due_date date,
  priority text not null default 'p2', -- p0..p3
  status text not null default 'backlog', -- backlog|ready|in_progress|blocked|done
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
before update on public.tasks
for each row execute procedure public.set_updated_at();

-- PANJAR
create table if not exists public.panjar (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  receiver_user_id uuid not null references public.profiles(id),
  amount bigint not null,
  disburse_date date not null,
  due_settlement date,
  settled_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

-- Trigger: when project becomes completed, set due_settlement = end_date + 7 for open panjar
create or replace function public.apply_panjar_due_on_completed()
returns trigger
language plpgsql
as $$
begin
  if (new.status = 'completed' and old.status is distinct from 'completed') then
    update public.panjar p
      set due_settlement = (new.end_date + 7)
    where p.project_id = new.id
      and p.settled_at is null
      and p.due_settlement is null
      and new.end_date is not null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_panjar_due_completed on public.projects;
create trigger trg_panjar_due_completed
after update on public.projects
for each row execute procedure public.apply_panjar_due_on_completed();

-- RLS ON
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;
alter table public.panjar enable row level security;

-- Helper: role checks
create or replace function public.is_admin()
returns boolean language sql stable
as $$ select exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','pm_lead')); $$;

-- PROFILES policies
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select to authenticated
using (true); -- allow read all profiles for dropdown

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update to authenticated
using (id = auth.uid());

-- PROJECT MEMBERS policies
drop policy if exists "pm_select_members" on public.project_members;
create policy "pm_select_members" on public.project_members
for select to authenticated
using (
  exists(select 1 from public.project_members m where m.project_id = project_id and m.user_id = auth.uid())
  or public.is_admin()
);

drop policy if exists "lead_manage_members" on public.project_members;
create policy "lead_manage_members" on public.project_members
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- PROJECT policies
drop policy if exists "projects_select_by_membership" on public.projects;
create policy "projects_select_by_membership" on public.projects
for select to authenticated
using (
  exists(select 1 from public.project_members m where m.project_id = id and m.user_id = auth.uid())
  or public.is_admin()
);

drop policy if exists "projects_insert_admin" on public.projects;
create policy "projects_insert_admin" on public.projects
for insert to authenticated
with check (public.is_admin());

drop policy if exists "projects_update_admin" on public.projects;
create policy "projects_update_admin" on public.projects
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

-- TASK policies
drop policy if exists "tasks_select_by_project" on public.tasks;
create policy "tasks_select_by_project" on public.tasks
for select to authenticated
using (
  exists(select 1 from public.project_members m where m.project_id = project_id and m.user_id = auth.uid())
  or public.is_admin()
);

drop policy if exists "tasks_write_by_project" on public.tasks;
create policy "tasks_write_by_project" on public.tasks
for insert to authenticated
with check (
  exists(select 1 from public.project_members m where m.project_id = project_id and m.user_id = auth.uid())
  or public.is_admin()
);

drop policy if exists "tasks_update_by_project" on public.tasks;
create policy "tasks_update_by_project" on public.tasks
for update to authenticated
using (
  exists(select 1 from public.project_members m where m.project_id = project_id and m.user_id = auth.uid())
  or public.is_admin()
)
with check (
  exists(select 1 from public.project_members m where m.project_id = project_id and m.user_id = auth.uid())
  or public.is_admin()
);

drop policy if exists "tasks_delete_admin" on public.tasks;
create policy "tasks_delete_admin" on public.tasks
for delete to authenticated
using (public.is_admin());

-- PANJAR policies
drop policy if exists "panjar_select_by_project" on public.panjar;
create policy "panjar_select_by_project" on public.panjar
for select to authenticated
using (
  exists(select 1 from public.project_members m where m.project_id = project_id and m.user_id = auth.uid())
  or public.is_admin()
);

drop policy if exists "panjar_insert_by_project" on public.panjar;
create policy "panjar_insert_by_project" on public.panjar
for insert to authenticated
with check (
  exists(select 1 from public.project_members m where m.project_id = project_id and m.user_id = auth.uid())
  or public.is_admin()
);

drop policy if exists "panjar_update_by_project" on public.panjar;
create policy "panjar_update_by_project" on public.panjar
for update to authenticated
using (
  exists(select 1 from public.project_members m where m.project_id = project_id and m.user_id = auth.uid())
  or public.is_admin()
)
with check (
  exists(select 1 from public.project_members m where m.project_id = project_id and m.user_id = auth.uid())
  or public.is_admin()
);

-- NOTE: public executive dashboard uses anon + token via separate SQL file.
