-- Phase 27: Email Notifications and CRM Automations
-- Run after phase26-public-forms-crm-intake.sql
-- Security: public users cannot read email logs; admins read based on role

-- ─── Email Logs ───────────────────────────────────────────────────────────────
create table if not exists crm_email_logs (
  id              uuid primary key default gen_random_uuid(),
  submission_id   uuid references crm_intake_submissions(id) on delete set null,
  contact_id      uuid references crm_contacts(id) on delete set null,
  email_type      text not null,
  recipient_email text not null,
  subject         text,
  status          text not null default 'pending'
                    check (status in ('pending','sent','failed','skipped')),
  provider        text,
  provider_id     text,
  error_message   text,
  sent_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── Automation Rules ─────────────────────────────────────────────────────────
create table if not exists crm_automation_rules (
  id               uuid primary key default gen_random_uuid(),
  rule_name        text not null,
  submission_type  text not null,
  trigger_event    text not null default 'submission_created',
  action_type      text not null,
  delay_hours      integer not null default 24,
  task_title       text,
  task_description text,
  priority         text not null default 'normal'
                     check (priority in ('low','normal','high','urgent')),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─── Automation Tasks ─────────────────────────────────────────────────────────
create table if not exists crm_automation_tasks (
  id              uuid primary key default gen_random_uuid(),
  rule_id         uuid references crm_automation_rules(id) on delete set null,
  submission_id   uuid references crm_intake_submissions(id) on delete set null,
  contact_id      uuid references crm_contacts(id) on delete set null,
  task_title      text not null,
  task_description text,
  action_type     text not null,
  status          text not null default 'pending'
                    check (status in ('pending','processing','completed','failed','cancelled')),
  priority        text not null default 'normal'
                    check (priority in ('low','normal','high','urgent')),
  assigned_to     uuid,
  due_at          timestamptz,
  completed_at    timestamptz,
  error_message   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── Updated-at triggers ──────────────────────────────────────────────────────
create or replace function crm_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists set_updated_at_email_logs on crm_email_logs;
create trigger set_updated_at_email_logs
  before update on crm_email_logs
  for each row execute function crm_set_updated_at();

drop trigger if exists set_updated_at_automation_rules on crm_automation_rules;
create trigger set_updated_at_automation_rules
  before update on crm_automation_rules
  for each row execute function crm_set_updated_at();

drop trigger if exists set_updated_at_automation_tasks on crm_automation_tasks;
create trigger set_updated_at_automation_tasks
  before update on crm_automation_tasks
  for each row execute function crm_set_updated_at();

-- ─── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists idx_email_logs_submission    on crm_email_logs(submission_id);
create index if not exists idx_email_logs_status        on crm_email_logs(status);
create index if not exists idx_email_logs_email_type    on crm_email_logs(email_type);
create index if not exists idx_email_logs_created_at    on crm_email_logs(created_at desc);
create index if not exists idx_automation_rules_type    on crm_automation_rules(submission_type);
create index if not exists idx_automation_rules_active  on crm_automation_rules(is_active);
create index if not exists idx_automation_tasks_sub     on crm_automation_tasks(submission_id);
create index if not exists idx_automation_tasks_status  on crm_automation_tasks(status);
create index if not exists idx_automation_tasks_due     on crm_automation_tasks(due_at);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
alter table crm_email_logs       enable row level security;
alter table crm_automation_rules enable row level security;
alter table crm_automation_tasks enable row level security;

-- Email logs: no public access; admins can read; owner/admin can delete
create policy "admins_read_email_logs" on crm_email_logs
  for select using (
    exists (
      select 1 from admin_profiles
      where user_id = auth.uid() and is_active = true
        and role in ('owner','admin','editor','viewer')
    )
  );

create policy "admins_insert_email_logs" on crm_email_logs
  for insert with check (
    exists (
      select 1 from admin_profiles
      where user_id = auth.uid() and is_active = true
        and role in ('owner','admin','editor')
    )
  );

create policy "admins_update_email_logs" on crm_email_logs
  for update using (
    exists (
      select 1 from admin_profiles
      where user_id = auth.uid() and is_active = true
        and role in ('owner','admin','editor')
    )
  );

create policy "owner_admin_delete_email_logs" on crm_email_logs
  for delete using (
    exists (
      select 1 from admin_profiles
      where user_id = auth.uid() and is_active = true
        and role in ('owner','admin')
    )
  );

-- Automation rules: admins read; owner/admin manage
create policy "admins_read_automation_rules" on crm_automation_rules
  for select using (
    exists (
      select 1 from admin_profiles
      where user_id = auth.uid() and is_active = true
        and role in ('owner','admin','editor','viewer')
    )
  );

create policy "owner_admin_manage_automation_rules" on crm_automation_rules
  for all using (
    exists (
      select 1 from admin_profiles
      where user_id = auth.uid() and is_active = true
        and role in ('owner','admin')
    )
  );

-- Automation tasks: admins read; editor+ manage
create policy "admins_read_automation_tasks" on crm_automation_tasks
  for select using (
    exists (
      select 1 from admin_profiles
      where user_id = auth.uid() and is_active = true
        and role in ('owner','admin','editor','viewer')
    )
  );

create policy "editors_manage_automation_tasks" on crm_automation_tasks
  for all using (
    exists (
      select 1 from admin_profiles
      where user_id = auth.uid() and is_active = true
        and role in ('owner','admin','editor')
    )
  );

-- ─── Seed default automation rules ───────────────────────────────────────────
insert into crm_automation_rules
  (rule_name, submission_type, trigger_event, action_type, delay_hours, task_title, task_description, priority)
values
  ('Job Seeker Follow-up', 'job_seeker', 'submission_created', 'create_task', 24,
   'Follow up with job seeker',
   'Review application, check resume link, contact candidate within 24 hours.',
   'normal'),
  ('Employer Review', 'employer', 'submission_created', 'create_task', 4,
   'Review employer staffing request',
   'Urgent: review staffing needs, verify company details, and call within 4 hours.',
   'high'),
  ('Sponsor Outreach', 'sponsor', 'submission_created', 'create_task', 24,
   'Follow up with sponsor prospect',
   'Review sponsor level and budget range, prepare sponsorship proposal.',
   'normal'),
  ('Partner Outreach', 'partner', 'submission_created', 'create_task', 48,
   'Follow up with partner applicant',
   'Review partnership type and collaboration idea, schedule an introductory call.',
   'normal'),
  ('Volunteer Onboarding', 'volunteer', 'submission_created', 'create_task', 48,
   'Review volunteer application',
   'Confirm role availability, contact volunteer, and schedule orientation.',
   'normal'),
  ('Event RSVP Confirmation', 'event_rsvp', 'submission_created', 'create_task', 24,
   'Process event RSVP',
   'Confirm RSVP details, check guest count, and send event logistics if guest count > 3.',
   'normal')
on conflict do nothing;
