-- Ruthko Connect Phase 4 Supabase schema
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  lead_type text not null check (lead_type in ('Employer', 'Candidate', 'Sponsor', 'Vendor', 'Event', 'Partner')),
  name text not null,
  contact_person text,
  email text,
  phone text,
  status text not null default 'New' check (status in ('New', 'Qualified', 'Proposal', 'Closed Won', 'Closed Lost')),
  value numeric default 0,
  source text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists employers (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_person text,
  email text,
  phone text,
  staffing_need text,
  visa_category text,
  status text default 'New',
  created_at timestamptz default now()
);

create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  profession text,
  visa_interest text,
  resume_url text,
  status text default 'New',
  created_at timestamptz default now()
);

create table if not exists sponsors (
  id uuid primary key default gen_random_uuid(),
  organization_name text not null,
  contact_person text,
  email text,
  phone text,
  sponsor_package text,
  pledge_amount numeric default 0,
  payment_status text default 'Pending',
  created_at timestamptz default now()
);

create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_person text,
  email text,
  phone text,
  booth_type text,
  payment_status text default 'Pending',
  created_at timestamptz default now()
);

create table if not exists ruthko_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  event_date date,
  location text,
  status text default 'Planning',
  ticket_price numeric default 0,
  capacity integer default 0,
  created_at timestamptz default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  payment_type text,
  payer_name text,
  payer_email text,
  amount numeric not null default 0,
  stripe_session_id text,
  payment_status text default 'Pending',
  created_at timestamptz default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete set null,
  title text not null,
  due_date date,
  status text default 'Open',
  notes text,
  created_at timestamptz default now()
);

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_leads_updated_at on leads;
create trigger update_leads_updated_at
before update on leads
for each row execute function update_updated_at_column();

alter table leads enable row level security;
alter table employers enable row level security;
alter table candidates enable row level security;
alter table sponsors enable row level security;
alter table vendors enable row level security;
alter table ruthko_events enable row level security;
alter table payments enable row level security;
alter table tasks enable row level security;

-- Temporary development policies.
-- Use these only while building. Replace with authenticated admin rules before launch.

create policy "dev_read_leads" on leads for select using (true);
create policy "dev_insert_leads" on leads for insert with check (true);
create policy "dev_update_leads" on leads for update using (true);

create policy "dev_read_employers" on employers for select using (true);
create policy "dev_insert_employers" on employers for insert with check (true);

create policy "dev_read_candidates" on candidates for select using (true);
create policy "dev_insert_candidates" on candidates for insert with check (true);

create policy "dev_read_sponsors" on sponsors for select using (true);
create policy "dev_insert_sponsors" on sponsors for insert with check (true);

create policy "dev_read_vendors" on vendors for select using (true);
create policy "dev_insert_vendors" on vendors for insert with check (true);

create policy "dev_read_events" on ruthko_events for select using (true);
create policy "dev_insert_events" on ruthko_events for insert with check (true);

create policy "dev_read_payments" on payments for select using (true);
create policy "dev_insert_payments" on payments for insert with check (true);

create policy "dev_read_tasks" on tasks for select using (true);
create policy "dev_insert_tasks" on tasks for insert with check (true);

insert into leads (lead_type, name, contact_person, email, phone, status, value, source, notes)
values
('Employer', 'Texas Medical Center', 'HR Director', 'hr@example.com', '+1 555 100 2000', 'Qualified', 75000, 'Staffing request', 'RN EB-3 staffing interest'),
('Sponsor', 'Global Investment Group', 'Sponsor Lead', 'sponsor@example.com', '+1 555 300 4000', 'Proposal', 50000, 'Sponsor portal', 'Interested in Platinum Sponsor package'),
('Candidate', 'Registered Nurse Candidate', 'Self', 'candidate@example.com', '+1 555 500 6000', 'New', 0, 'Candidate form', 'EB-3 nursing interest')
on conflict do nothing;
