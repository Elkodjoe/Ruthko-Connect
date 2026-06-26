-- ============================================================
-- Ruthko Connect — Phase 9: Task Automation Extension
-- Run AFTER schema.sql, auth-admin-policies.sql,
--   phase6-form-database-extension.sql,
--   phase6-public-form-policies.sql
-- ============================================================

-- ── Allow anonymous (public form) INSERT on tasks ────────────
-- The tasks table already exists from schema.sql.
-- We need anon INSERT so intake-crm.js can create follow-up
-- tasks at the same time it saves a lead.

alter table tasks enable row level security;

drop policy if exists "public_insert_tasks" on tasks;
drop policy if exists "admin_tasks_all"     on tasks;

create policy "public_insert_tasks"
  on tasks for insert
  to anon
  with check (true);

create policy "admin_tasks_all"
  on tasks for all
  to authenticated
  using      (true)
  with check (true);

-- ── task_templates view (for reference / future automation) ──
-- Shows what tasks each form type auto-generates.
-- Not required — just useful for documentation.
create table if not exists task_templates (
  id         serial primary key,
  form_type  text not null,
  title      text not null,
  days_due   int  not null default 1,   -- days from now
  priority   text not null default 'medium'
               check (priority in ('low','medium','high'))
);

-- Wipe and re-seed (idempotent)
delete from task_templates;

insert into task_templates (form_type, title, days_due, priority) values
  -- Employer
  ('employer', 'Call to discuss staffing needs',    1, 'high'),
  ('employer', 'Send candidate shortlist',          5, 'high'),
  ('employer', 'Confirm visa type & worker count',  2, 'medium'),
  -- Candidate
  ('candidate','Request resume / CV',               2, 'medium'),
  ('candidate','Verify credentials and experience', 3, 'medium'),
  ('candidate','Match to open employer listings',   5, 'high'),
  -- Sponsor
  ('sponsor',  'Send sponsorship proposal',         1, 'high'),
  ('sponsor',  'Schedule intro call',               3, 'high'),
  ('sponsor',  'Follow up if no response',          7, 'medium'),
  -- Vendor
  ('vendor',   'Confirm booth assignment',          1, 'high'),
  ('vendor',   'Send booth invoice',                2, 'high'),
  ('vendor',   'Send event day setup instructions', 7, 'medium'),
  -- Event RSVP
  ('event',    'Add to attendee list',              1, 'medium'),
  ('event',    'Send ticket and event details',     2, 'medium'),
  -- Invoice
  ('invoice',  'Prepare and send invoice',          1, 'high'),
  ('invoice',  'Confirm payment received',          5, 'high');
