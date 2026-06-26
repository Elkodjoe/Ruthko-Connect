-- ============================================================
-- Ruthko Connect — Supabase Auth + RLS Admin Policies
--
-- Run AFTER schema.sql.
-- Run in: Supabase Dashboard → SQL Editor → New Query
--
-- This file:
-- 1. Enables Row-Level Security on all tables
-- 2. Creates policies so ONLY authenticated (admin) users
--    can read/write leads, tasks, and payments
-- 3. Keeps no data accessible to anonymous/public requests
-- ============================================================

-- ── Enable RLS ────────────────────────────────────────────────
alter table leads    enable row level security;
alter table tasks    enable row level security;
alter table payments enable row level security;

-- ── Drop existing policies (safe to re-run) ───────────────────
drop policy if exists "admin_leads_all"    on leads;
drop policy if exists "admin_tasks_all"    on tasks;
drop policy if exists "admin_payments_all" on payments;

-- ── Admin full-access policies ────────────────────────────────
-- Any authenticated user (your admin account) gets full CRUD.
-- If you want to restrict to specific emails, use:
--   auth.jwt()->>'email' = 'admin@ruthko.com'

create policy "admin_leads_all"
  on leads for all
  using      (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "admin_tasks_all"
  on tasks for all
  using      (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "admin_payments_all"
  on payments for all
  using      (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ── Verify (run this to confirm policies are active) ──────────
-- select tablename, policyname, cmd, roles
-- from pg_policies
-- where tablename in ('leads','tasks','payments')
-- order by tablename, policyname;

-- ── How to create your admin user ────────────────────────────
-- Option A (Supabase Dashboard):
--   Authentication → Users → Invite User → enter admin@ruthko.com
--   Check your email, set a password via the invite link.
--
-- Option B (SQL):
--   This is done via the Supabase Auth API — cannot be done in SQL Editor.
--   Use the Supabase Dashboard UI (above) or the JS client:
--
--   const { data, error } = await supabase.auth.admin.createUser({
--     email: 'admin@ruthko.com',
--     password: 'YOUR_STRONG_PASSWORD',
--     email_confirm: true
--   });
