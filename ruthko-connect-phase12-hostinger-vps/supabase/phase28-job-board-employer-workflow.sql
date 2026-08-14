-- Phase 28: Admin Job Board and Employer Staffing Workflow
-- Run after phase27-email-crm-automations.sql
-- Requires: crm_intake_submissions, crm_contacts from phase26

-- ─── Employer Staffing Orders ─────────────────────────────────────────────────
create table if not exists employer_staffing_orders (
  id                     uuid primary key default gen_random_uuid(),
  employer_submission_id uuid references crm_intake_submissions(id) on delete set null,
  employer_contact_id    uuid references crm_contacts(id) on delete set null,
  company_name           text,
  industry               text,
  job_location_city      text,
  job_location_state     text,
  job_location_country   text,
  number_of_workers      integer,
  desired_start_date     date,
  pay_range              text,
  shift_type             text,
  housing_support        boolean not null default false,
  transportation_support boolean not null default false,
  order_status           text not null default 'new'
                           check (order_status in ('new','reviewing','quoted','approved','recruiting','partially_filled','filled','closed','cancelled')),
  priority               text not null default 'normal'
                           check (priority in ('low','normal','high','urgent')),
  assigned_to            uuid,
  details_json           jsonb not null default '{}'::jsonb,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- ─── Job Posts ────────────────────────────────────────────────────────────────
create table if not exists job_posts (
  id                     uuid primary key default gen_random_uuid(),
  staffing_order_id      uuid references employer_staffing_orders(id) on delete set null,
  title                  text not null,
  slug                   text unique,
  company_name           text,
  show_company_name      boolean not null default false,
  job_category           text not null default 'Other',
  employment_type        text not null default 'Full-time',
  city                   text,
  state                  text,
  country                text default 'United States',
  pay_range              text,
  shift_type             text,
  housing_support        boolean not null default false,
  transportation_support boolean not null default false,
  start_date             date,
  short_description      text,
  full_description       text,
  requirements_json      jsonb not null default '[]'::jsonb,
  benefits_json          jsonb not null default '[]'::jsonb,
  language               text not null default 'en',
  is_public              boolean not null default false,
  status                 text not null default 'draft'
                           check (status in ('draft','review','published','paused','filled','closed','archived')),
  published_at           timestamptz,
  created_by             uuid,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- ─── Job Applications ─────────────────────────────────────────────────────────
create table if not exists job_applications (
  id                      uuid primary key default gen_random_uuid(),
  job_post_id             uuid references job_posts(id) on delete set null,
  crm_submission_id       uuid references crm_intake_submissions(id) on delete set null,
  crm_contact_id          uuid references crm_contacts(id) on delete set null,
  first_name              text,
  last_name               text,
  email                   text,
  phone                   text,
  city                    text,
  state                   text,
  country                 text,
  resume_url              text,
  work_authorization_status text,
  experience_level        text,
  skills_json             jsonb not null default '[]'::jsonb,
  status                  text not null default 'new'
                            check (status in ('new','reviewing','contacted','screening','interview','offered','hired','rejected','withdrawn')),
  assigned_to             uuid,
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ─── Updated-at triggers ─────────────────────────────────────────────────────
create or replace function crm_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists set_updated_at_staffing_orders on employer_staffing_orders;
create trigger set_updated_at_staffing_orders
  before update on employer_staffing_orders
  for each row execute function crm_set_updated_at();

drop trigger if exists set_updated_at_job_posts on job_posts;
create trigger set_updated_at_job_posts
  before update on job_posts
  for each row execute function crm_set_updated_at();

drop trigger if exists set_updated_at_job_applications on job_applications;
create trigger set_updated_at_job_applications
  before update on job_applications
  for each row execute function crm_set_updated_at();

-- ─── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists idx_staffing_orders_status   on employer_staffing_orders(order_status);
create index if not exists idx_staffing_orders_sub      on employer_staffing_orders(employer_submission_id);
create index if not exists idx_job_posts_status         on job_posts(status);
create index if not exists idx_job_posts_category       on job_posts(job_category);
create index if not exists idx_job_posts_public         on job_posts(is_public, status);
create index if not exists idx_job_posts_slug           on job_posts(slug);
create index if not exists idx_job_posts_order          on job_posts(staffing_order_id);
create index if not exists idx_job_applications_post    on job_applications(job_post_id);
create index if not exists idx_job_applications_status  on job_applications(status);
create index if not exists idx_job_applications_email   on job_applications(email);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table employer_staffing_orders enable row level security;
alter table job_posts                enable row level security;
alter table job_applications         enable row level security;

-- Job posts: public can read published; admins manage all
create policy "public_read_published_job_posts" on job_posts
  for select using (is_public = true and status = 'published');

create policy "admins_read_all_job_posts" on job_posts
  for select using (
    exists (select 1 from admin_profiles where user_id = auth.uid() and is_active = true
            and role in ('owner','admin','editor','viewer'))
  );

create policy "editors_manage_job_posts" on job_posts
  for insert with check (
    exists (select 1 from admin_profiles where user_id = auth.uid() and is_active = true
            and role in ('owner','admin','editor'))
  );

create policy "editors_update_job_posts" on job_posts
  for update using (
    exists (select 1 from admin_profiles where user_id = auth.uid() and is_active = true
            and role in ('owner','admin','editor'))
  );

create policy "owner_admin_delete_job_posts" on job_posts
  for delete using (
    exists (select 1 from admin_profiles where user_id = auth.uid() and is_active = true
            and role in ('owner','admin'))
  );

-- Staffing orders: admins manage
create policy "admins_read_staffing_orders" on employer_staffing_orders
  for select using (
    exists (select 1 from admin_profiles where user_id = auth.uid() and is_active = true
            and role in ('owner','admin','editor','viewer'))
  );

create policy "editors_manage_staffing_orders" on employer_staffing_orders
  for all using (
    exists (select 1 from admin_profiles where user_id = auth.uid() and is_active = true
            and role in ('owner','admin','editor'))
  );

-- Job applications: public can insert; admins read/update
create policy "public_submit_job_applications" on job_applications
  for insert with check (true);

create policy "admins_read_job_applications" on job_applications
  for select using (
    exists (select 1 from admin_profiles where user_id = auth.uid() and is_active = true
            and role in ('owner','admin','editor','viewer'))
  );

create policy "editors_update_job_applications" on job_applications
  for update using (
    exists (select 1 from admin_profiles where user_id = auth.uid() and is_active = true
            and role in ('owner','admin','editor'))
  );

create policy "owner_admin_delete_job_applications" on job_applications
  for delete using (
    exists (select 1 from admin_profiles where user_id = auth.uid() and is_active = true
            and role in ('owner','admin'))
  );

-- ─── Sample data (remove in production) ──────────────────────────────────────
insert into job_posts (title, slug, job_category, employment_type, city, state, country, pay_range, shift_type, housing_support, transportation_support, short_description, is_public, status, published_at)
values
  ('CNA – Long-Term Care', 'cna-long-term-care-' || extract(epoch from now())::bigint, 'CNA', 'Full-time', 'Fargo', 'ND', 'United States', '$20–$26/hr', 'Day', true, false, 'Seeking experienced CNAs for long-term care facility in Fargo, ND. H-2B and sponsorship candidates welcome.', true, 'published', now()),
  ('Caregiver – Home Health', 'caregiver-home-health-' || extract(epoch from now())::bigint, 'Caregiver', 'Part-time', 'Minneapolis', 'MN', 'United States', '$18–$22/hr', 'Flexible', false, true, 'Part-time caregiver for home health assignments. Transportation support available.', true, 'published', now())
on conflict (slug) do nothing;
