
-- Phase 14 Event Operations Extension
-- Run after the earlier Ruthko Connect schema files.

create table if not exists event_programs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_type text default 'Summit',
  event_date date,
  city text,
  venue text,
  status text default 'Planning',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists event_speakers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references event_programs(id) on delete cascade,
  name text not null,
  role text,
  email text,
  phone text,
  status text default 'Invited',
  notes text,
  created_at timestamptz default now()
);

create table if not exists event_sponsor_deliverables (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references event_programs(id) on delete cascade,
  sponsor_name text not null,
  tier text,
  amount numeric default 0,
  payment_status text default 'Pending',
  deliverables text,
  due_date date,
  status text default 'Open',
  created_at timestamptz default now()
);

create table if not exists event_vendor_booths (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references event_programs(id) on delete cascade,
  business_name text not null,
  contact_name text,
  email text,
  booth_number text,
  booth_status text default 'Pending',
  payment_status text default 'Pending',
  created_at timestamptz default now()
);

create table if not exists event_attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references event_programs(id) on delete cascade,
  name text not null,
  email text,
  ticket_type text default 'General',
  status text default 'Registered',
  checked_in_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists event_run_sheet_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references event_programs(id) on delete cascade,
  item_time text,
  title text not null,
  owner text,
  status text default 'Open',
  notes text,
  created_at timestamptz default now()
);

alter table event_programs enable row level security;
alter table event_speakers enable row level security;
alter table event_sponsor_deliverables enable row level security;
alter table event_vendor_booths enable row level security;
alter table event_attendees enable row level security;
alter table event_run_sheet_items enable row level security;

-- Admin policies. Supabase authenticated admins manage event operations.
create policy if not exists "Admins manage event programs" on event_programs for all to authenticated using (true) with check (true);
create policy if not exists "Admins manage event speakers" on event_speakers for all to authenticated using (true) with check (true);
create policy if not exists "Admins manage event sponsor deliverables" on event_sponsor_deliverables for all to authenticated using (true) with check (true);
create policy if not exists "Admins manage event vendor booths" on event_vendor_booths for all to authenticated using (true) with check (true);
create policy if not exists "Admins manage event attendees" on event_attendees for all to authenticated using (true) with check (true);
create policy if not exists "Admins manage event run sheet" on event_run_sheet_items for all to authenticated using (true) with check (true);
