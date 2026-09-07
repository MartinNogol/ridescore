-- SCOOT SCORING - starter schema for Supabase
-- Run in Supabase > SQL Editor. Final scoring rules can be adjusted after importing your Excel logic.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'viewer' check (role in ('viewer','judge','head_judge','registration','speaker','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  event_date date,
  location text,
  status text not null default 'draft' check (status in ('draft','registration','live','finished')),
  scoring_config jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  run_count int not null default 2,
  advance_count int,
  unique(event_id,name)
);

create table if not exists public.riders (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  birth_date date,
  city text,
  email text,
  phone text,
  parent_name text,
  sponsors text,
  instagram text,
  bio text,
  created_at timestamptz not null default now()
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  rider_id uuid not null references public.riders(id) on delete cascade,
  bib int,
  status text not null default 'registered' check (status in ('registered','checked-in','dns','dnf','disqualified')),
  start_order int,
  created_at timestamptz not null default now(),
  unique(event_id,rider_id)
);

create table if not exists public.judge_assignments (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'judge',
  primary key(event_id,user_id)
);

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  judge_id uuid not null references public.profiles(id),
  run_no int not null,
  criterion_scores jsonb not null default '{}'::jsonb,
  total numeric(7,2) not null,
  submitted_at timestamptz not null default now(),
  unique(registration_id,judge_id,run_no)
);

-- Safe public leaderboard view. No birth date, email or phone is exposed.
create or replace view public.public_entries as
select r.id rider_id, reg.id registration_id, reg.event_id, reg.category_id, reg.bib,
       r.full_name, r.city, r.sponsors, r.instagram, reg.status
from public.registrations reg
join public.riders r on r.id = reg.rider_id;

-- RLS
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.categories enable row level security;
alter table public.riders enable row level security;
alter table public.registrations enable row level security;
alter table public.judge_assignments enable row level security;
alter table public.scores enable row level security;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('judge','head_judge','registration','speaker','admin'));
$$;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin');
$$;

-- Public may read event/category info. Sensitive rider records stay staff-only.
create policy "events public read" on public.events for select using (true);
create policy "categories public read" on public.categories for select using (true);
create policy "riders staff read" on public.riders for select using (public.is_staff());
create policy "registrations staff read" on public.registrations for select using (public.is_staff());
create policy "scores public read" on public.scores for select using (true);

-- Staff writes
create policy "riders staff insert" on public.riders for insert with check (public.is_staff());
create policy "riders staff update" on public.riders for update using (public.is_staff());
create policy "registrations staff insert" on public.registrations for insert with check (public.is_staff());
create policy "registrations staff update" on public.registrations for update using (public.is_staff());
create policy "scores judges insert" on public.scores for insert with check (public.is_staff() and judge_id=auth.uid());
create policy "scores judges update own" on public.scores for update using (judge_id=auth.uid());
create policy "profiles self read" on public.profiles for select using (id=auth.uid() or public.is_admin());
create policy "profiles admin update" on public.profiles for update using (public.is_admin());
create policy "events admin all" on public.events for all using (public.is_admin()) with check (public.is_admin());
create policy "categories admin all" on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy "judge assignments admin all" on public.judge_assignments for all using (public.is_admin()) with check (public.is_admin());

-- Create profile automatically after Google login.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,email,full_name)
  values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',new.email))
  on conflict(id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- IMPORTANT:
-- Public self-registration should be implemented via an Edge Function / RPC so anonymous users
-- can create rider + registration atomically without exposing private rider data. The static demo
-- intentionally stores registration locally until that endpoint is added.
