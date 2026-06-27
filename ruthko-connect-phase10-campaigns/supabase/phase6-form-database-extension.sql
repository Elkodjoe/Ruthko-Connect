-- Ruthko Connect Phase 6: public form database extension
-- Run this after supabase/schema.sql.

create table if not exists intake_submissions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete set null,
  form_type text not null,
  lead_type text not null,
  name text,
  email text,
  phone text,
  payload jsonb not null default '{}'::jsonb,
  status text default 'New',
  created_at timestamptz default now()
);

create table if not exists event_registrations (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  event_interest text,
  attendee_type text,
  message text,
  status text default 'New',
  created_at timestamptz default now()
);

alter table intake_submissions enable row level security;
alter table event_registrations enable row level security;

drop policy if exists "public_insert_intake_submissions" on intake_submissions;
create policy "public_insert_intake_submissions" on intake_submissions for insert to anon with check (true);

drop policy if exists "admin_read_intake_submissions" on intake_submissions;
create policy "admin_read_intake_submissions" on intake_submissions for select to authenticated using (true);

drop policy if exists "admin_update_intake_submissions" on intake_submissions;
create policy "admin_update_intake_submissions" on intake_submissions for update to authenticated using (true) with check (true);

drop policy if exists "admin_delete_intake_submissions" on intake_submissions;
create policy "admin_delete_intake_submissions" on intake_submissions for delete to authenticated using (true);

drop policy if exists "public_insert_event_registrations" on event_registrations;
create policy "public_insert_event_registrations" on event_registrations for insert to anon with check (true);

drop policy if exists "admin_read_event_registrations" on event_registrations;
create policy "admin_read_event_registrations" on event_registrations for select to authenticated using (true);

drop policy if exists "admin_update_event_registrations" on event_registrations;
create policy "admin_update_event_registrations" on event_registrations for update to authenticated using (true) with check (true);

drop policy if exists "admin_delete_event_registrations" on event_registrations;
create policy "admin_delete_event_registrations" on event_registrations for delete to authenticated using (true);
