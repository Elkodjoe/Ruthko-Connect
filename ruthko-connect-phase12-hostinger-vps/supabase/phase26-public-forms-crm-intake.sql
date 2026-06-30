-- Phase 26: Public Forms and CRM Intake Pipeline
-- Run in Supabase SQL Editor in this order after phase23 (admin_profiles must exist)

-- ── 1. crm_intake_submissions ────────────────────────────────────────────────

create table if not exists crm_intake_submissions (
  id uuid primary key default gen_random_uuid(),
  submission_type text not null,
  status text not null default 'new',
  first_name text,
  last_name text,
  email text,
  phone text,
  city text,
  state text,
  country text,
  preferred_language text default 'en',
  organization_name text,
  message text,
  details_json jsonb not null default '{}'::jsonb,
  source_page text,
  consent_given boolean not null default false,
  assigned_to uuid,
  priority text not null default 'normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_intake_status_check
    check (status in ('new','reviewing','contacted','qualified','scheduled','converted','closed','rejected','archived')),
  constraint crm_intake_priority_check
    check (priority in ('low','normal','high','urgent'))
);

-- ── 2. crm_contacts ─────────────────────────────────────────────────────────

create table if not exists crm_contacts (
  id uuid primary key default gen_random_uuid(),
  first_name text,
  last_name text,
  email text,
  phone text,
  city text,
  state text,
  country text,
  preferred_language text default 'en',
  contact_type text,
  tags text[],
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 3. crm_pipeline_items ───────────────────────────────────────────────────

create table if not exists crm_pipeline_items (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references crm_contacts(id) on delete set null,
  submission_id uuid references crm_intake_submissions(id) on delete set null,
  pipeline_type text not null,
  stage text not null default 'new',
  priority text not null default 'normal',
  assigned_to uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_pipeline_stage_check
    check (stage in ('new','reviewing','contacted','qualified','scheduled','converted','closed','rejected')),
  constraint crm_pipeline_priority_check
    check (priority in ('low','normal','high','urgent'))
);

-- ── 4. Triggers ─────────────────────────────────────────────────────────────

create or replace function crm_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists crm_intake_set_updated_at on crm_intake_submissions;
create trigger crm_intake_set_updated_at
  before update on crm_intake_submissions
  for each row execute procedure crm_set_updated_at();

drop trigger if exists crm_contacts_set_updated_at on crm_contacts;
create trigger crm_contacts_set_updated_at
  before update on crm_contacts
  for each row execute procedure crm_set_updated_at();

drop trigger if exists crm_pipeline_set_updated_at on crm_pipeline_items;
create trigger crm_pipeline_set_updated_at
  before update on crm_pipeline_items
  for each row execute procedure crm_set_updated_at();

-- ── 5. Indexes ───────────────────────────────────────────────────────────────

create index if not exists idx_crm_intake_type on crm_intake_submissions (submission_type);
create index if not exists idx_crm_intake_status on crm_intake_submissions (status);
create index if not exists idx_crm_intake_email on crm_intake_submissions (email);
create index if not exists idx_crm_intake_created on crm_intake_submissions (created_at desc);
create index if not exists idx_crm_contacts_email on crm_contacts (email);
create index if not exists idx_crm_pipeline_stage on crm_pipeline_items (stage);

-- ── 6. RLS ───────────────────────────────────────────────────────────────────

alter table crm_intake_submissions enable row level security;
alter table crm_contacts enable row level security;
alter table crm_pipeline_items enable row level security;

-- Public: anyone with consent can submit (insert only)
drop policy if exists "Public can submit CRM intake forms" on crm_intake_submissions;
create policy "Public can submit CRM intake forms"
  on crm_intake_submissions for insert
  with check (consent_given = true);

-- Admins read all intake
drop policy if exists "Approved admins can read CRM intake" on crm_intake_submissions;
create policy "Approved admins can read CRM intake"
  on crm_intake_submissions for select
  using (
    exists (
      select 1 from admin_profiles ap
      where ap.user_id = auth.uid()
      and ap.is_active = true
      and ap.role in ('owner','admin','editor','viewer')
    )
  );

-- Owner/admin/editor can update intake
drop policy if exists "Approved admins can update CRM intake" on crm_intake_submissions;
create policy "Approved admins can update CRM intake"
  on crm_intake_submissions for update
  using (
    exists (
      select 1 from admin_profiles ap
      where ap.user_id = auth.uid()
      and ap.is_active = true
      and ap.role in ('owner','admin','editor')
    )
  );

-- Owner/admin can delete intake
drop policy if exists "Owner or admin can delete CRM intake" on crm_intake_submissions;
create policy "Owner or admin can delete CRM intake"
  on crm_intake_submissions for delete
  using (
    exists (
      select 1 from admin_profiles ap
      where ap.user_id = auth.uid()
      and ap.is_active = true
      and ap.role in ('owner','admin')
    )
  );

-- CRM contacts: owner/admin/editor full access; viewer read-only
drop policy if exists "Admins manage CRM contacts" on crm_contacts;
create policy "Admins manage CRM contacts"
  on crm_contacts for all
  using (
    exists (
      select 1 from admin_profiles ap
      where ap.user_id = auth.uid()
      and ap.is_active = true
      and ap.role in ('owner','admin','editor')
    )
  );

drop policy if exists "Viewers read CRM contacts" on crm_contacts;
create policy "Viewers read CRM contacts"
  on crm_contacts for select
  using (
    exists (
      select 1 from admin_profiles ap
      where ap.user_id = auth.uid()
      and ap.is_active = true
      and ap.role = 'viewer'
    )
  );

-- CRM pipeline: owner/admin/editor full access; viewer read-only
drop policy if exists "Admins manage CRM pipeline" on crm_pipeline_items;
create policy "Admins manage CRM pipeline"
  on crm_pipeline_items for all
  using (
    exists (
      select 1 from admin_profiles ap
      where ap.user_id = auth.uid()
      and ap.is_active = true
      and ap.role in ('owner','admin','editor')
    )
  );

drop policy if exists "Viewers read CRM pipeline" on crm_pipeline_items;
create policy "Viewers read CRM pipeline"
  on crm_pipeline_items for select
  using (
    exists (
      select 1 from admin_profiles ap
      where ap.user_id = auth.uid()
      and ap.is_active = true
      and ap.role = 'viewer'
    )
  );

-- ── 7. Phase 23 dependency note ──────────────────────────────────────────────
-- admin_profiles must exist before running this file.
-- If you skipped Phase 23, run phase23-admin-auth-roles.sql first.
-- Then run this file, then seed your admin profile:
--   insert into admin_profiles (user_id, role, full_name, is_active)
--   values ('YOUR-UUID', 'owner', 'Emmanuel Kodjoe', true)
--   on conflict (user_id) do update set role='owner', is_active=true;
