-- ============================================================
-- Ruthko Connect — Phase 6: Form Database Extension
-- Run AFTER schema.sql and auth-admin-policies.sql
-- ============================================================

-- ── intake_submissions (raw log of every form post) ───────────
create table if not exists intake_submissions (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  lead_id     uuid references leads(id) on delete set null,
  form_name   text not null,
  raw_data    jsonb not null default '{}'
);

-- ── employers ─────────────────────────────────────────────────
create table if not exists employers (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  lead_id      uuid references leads(id) on delete cascade,
  company      text,
  contact_person text,
  email        text,
  phone        text,
  industry     text,
  visa_type    text,
  worker_count int,
  job_description text
);

-- ── candidates ────────────────────────────────────────────────
create table if not exists candidates (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  lead_id      uuid references leads(id) on delete cascade,
  full_name    text,
  email        text,
  phone        text,
  country      text,
  profession   text,
  experience   text,
  visa_status  text,
  about        text
);

-- ── sponsors ──────────────────────────────────────────────────
create table if not exists sponsors (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  lead_id         uuid references leads(id) on delete cascade,
  organization    text,
  contact_name    text,
  email           text,
  phone           text,
  package         text,
  event_interest  text,
  goals           text
);

-- ── vendors ───────────────────────────────────────────────────
create table if not exists vendors (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  lead_id       uuid references leads(id) on delete cascade,
  business_name text,
  contact_name  text,
  email         text,
  phone         text,
  business_type text,
  event         text,
  booth_count   text,
  products      text
);

-- ── event_registrations ───────────────────────────────────────
create table if not exists event_registrations (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  lead_id      uuid references leads(id) on delete cascade,
  full_name    text,
  email        text,
  phone        text,
  organization text,
  event        text,
  attendees    text,
  role         text,
  notes        text
);

-- ── Indexes ───────────────────────────────────────────────────
create index if not exists intake_submissions_lead_idx on intake_submissions(lead_id);
create index if not exists intake_submissions_form_idx on intake_submissions(form_name);
create index if not exists employers_lead_idx          on employers(lead_id);
create index if not exists candidates_lead_idx         on candidates(lead_id);
create index if not exists sponsors_lead_idx           on sponsors(lead_id);
create index if not exists vendors_lead_idx            on vendors(lead_id);
create index if not exists event_reg_lead_idx          on event_registrations(lead_id);
