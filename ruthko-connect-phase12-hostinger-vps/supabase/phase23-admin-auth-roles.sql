-- Phase 23: Admin Auth Roles
-- Run this in Supabase SQL Editor AFTER phase22-admin-persistence.sql

-- admin_profiles: links auth.users to roles within Ruthko Connect
create table if not exists admin_profiles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'viewer',
  full_name    text,
  is_active    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id),
  constraint admin_role_check check (role in ('owner','admin','editor','viewer'))
);

alter table admin_profiles enable row level security;

-- Each user can always read their own profile
create policy "User can read own admin profile"
  on admin_profiles for select
  using (auth.uid() = user_id);

-- Active owners and admins can read all profiles
create policy "Owner and admin can read all profiles"
  on admin_profiles for select
  using (
    exists (
      select 1 from admin_profiles ap
      where ap.user_id = auth.uid()
        and ap.role in ('owner','admin')
        and ap.is_active = true
    )
  );

-- Only active owners can insert/update/delete any profile
create policy "Owner can manage all profiles"
  on admin_profiles for all
  using (
    exists (
      select 1 from admin_profiles ap
      where ap.user_id = auth.uid()
        and ap.role = 'owner'
        and ap.is_active = true
    )
  );

-- Users can insert their own pending profile (self-registration for approval)
create policy "User can create own pending profile"
  on admin_profiles for insert
  with check (auth.uid() = user_id AND role = 'viewer' AND is_active = false);

-- auto-update updated_at
create or replace function ruthko_admin_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists admin_profiles_updated_at on admin_profiles;
create trigger admin_profiles_updated_at
  before update on admin_profiles
  for each row execute procedure ruthko_admin_set_updated_at();

-- Seed the first owner: replace with real user UUID after first login
-- Find the UUID in Supabase Dashboard → Authentication → Users
-- Then run:
-- insert into admin_profiles (user_id, role, full_name, is_active)
-- values ('YOUR-USER-UUID-HERE', 'owner', 'Emmanuel Kodjoe', true)
-- on conflict (user_id) do update set role='owner', is_active=true, full_name='Emmanuel Kodjoe';
