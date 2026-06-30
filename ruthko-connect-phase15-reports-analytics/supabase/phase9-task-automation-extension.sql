-- Ruthko Connect Phase 9 task automation extension
-- Run this after schema.sql, auth-admin-policies.sql, Phase 6 extension, and Phase 6 public policies.

alter table tasks add column if not exists task_type text default 'Follow-up';
alter table tasks add column if not exists priority text default 'Medium' check (priority in ('High', 'Medium', 'Low'));
alter table tasks add column if not exists owner text default 'Ruthko Admin';
alter table tasks add column if not exists completed_at timestamptz;
alter table tasks add column if not exists updated_at timestamptz default now();

alter table leads add column if not exists priority text default 'Medium' check (priority in ('High', 'Medium', 'Low'));
alter table leads add column if not exists next_follow_up date;
alter table leads add column if not exists last_contacted_at timestamptz;

create or replace function update_tasks_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_tasks_updated_at on tasks;
create trigger update_tasks_updated_at
before update on tasks
for each row execute function update_tasks_updated_at_column();

create index if not exists idx_tasks_due_date on tasks(due_date);
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_tasks_priority on tasks(priority);
create index if not exists idx_tasks_lead_id on tasks(lead_id);

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'tasks' and policyname = 'admin_read_tasks_phase9'
  ) then
    create policy "admin_read_tasks_phase9" on tasks for select using (auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'tasks' and policyname = 'admin_insert_tasks_phase9'
  ) then
    create policy "admin_insert_tasks_phase9" on tasks for insert with check (auth.role() = 'authenticated' or auth.role() = 'anon');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'tasks' and policyname = 'admin_update_tasks_phase9'
  ) then
    create policy "admin_update_tasks_phase9" on tasks for update using (auth.role() = 'authenticated');
  end if;
end $$;

insert into tasks (title, task_type, priority, due_date, status, owner, notes)
values
('Review new employer leads each morning', 'Admin', 'High', current_date + 1, 'Open', 'Ruthko Admin', 'Check new staffing requests, assign follow-up, and update lead status.'),
('Review sponsor pipeline weekly', 'Proposal', 'Medium', current_date + 3, 'Open', 'Ruthko Admin', 'Check Platinum, Gold, Silver, and vendor booth opportunities.'),
('Follow up with candidate document requests', 'Email', 'Medium', current_date + 2, 'Open', 'Ruthko Admin', 'Review candidate leads and request missing resumes or credentials.')
on conflict do nothing;
