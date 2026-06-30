-- Phase 24: Admin Audit Log and Change History
-- Run this in Supabase SQL Editor AFTER phase23-admin-auth-roles.sql

create table if not exists admin_audit_logs (
  id             uuid primary key default gen_random_uuid(),
  admin_user_id  uuid,
  admin_email    text,
  admin_role     text,
  action_type    text not null,
  entity_type    text,
  entity_id      text,
  entity_label   text,
  before_json    jsonb,
  after_json     jsonb,
  ip_address     text,
  user_agent     text,
  created_at     timestamptz not null default now()
);

create table if not exists admin_change_versions (
  id               uuid primary key default gen_random_uuid(),
  entity_type      text not null,
  entity_key       text not null,
  language         text not null default 'en',
  version_number   integer not null default 1,
  content_json     jsonb not null default '{}'::jsonb,
  changed_by       uuid,
  changed_by_email text,
  change_note      text,
  created_at       timestamptz not null default now()
);

alter table admin_audit_logs enable row level security;
alter table admin_change_versions enable row level security;

-- Active owners and admins can read all audit logs
create policy "Active admins can read audit logs"
  on admin_audit_logs
  for select
  using (
    exists (
      select 1 from admin_profiles ap
      where ap.user_id = auth.uid()
        and ap.is_active = true
        and ap.role in ('owner', 'admin')
    )
  );

-- Active admins can also read logs where they are the author (editors seeing own logs)
create policy "Editors can read own audit logs"
  on admin_audit_logs
  for select
  using (
    admin_user_id = auth.uid()
    and exists (
      select 1 from admin_profiles ap
      where ap.user_id = auth.uid()
        and ap.is_active = true
        and ap.role = 'editor'
    )
  );

-- Any active admin can insert audit log entries
create policy "Active admins can insert audit logs"
  on admin_audit_logs
  for insert
  with check (
    exists (
      select 1 from admin_profiles ap
      where ap.user_id = auth.uid()
        and ap.is_active = true
    )
  );

-- Owners, admins, and editors can read change versions
create policy "Owners and admins can read change versions"
  on admin_change_versions
  for select
  using (
    exists (
      select 1 from admin_profiles ap
      where ap.user_id = auth.uid()
        and ap.is_active = true
        and ap.role in ('owner', 'admin', 'editor')
    )
  );

-- Owners, admins, and editors can insert change versions
create policy "Owners and admins can insert change versions"
  on admin_change_versions
  for insert
  with check (
    exists (
      select 1 from admin_profiles ap
      where ap.user_id = auth.uid()
        and ap.is_active = true
        and ap.role in ('owner', 'admin', 'editor')
    )
  );

-- Only owners and admins can update/delete versions (for restore operations)
create policy "Owners and admins can update change versions"
  on admin_change_versions
  for update
  using (
    exists (
      select 1 from admin_profiles ap
      where ap.user_id = auth.uid()
        and ap.is_active = true
        and ap.role in ('owner', 'admin')
    )
  );

-- Performance indexes
create index if not exists audit_logs_action_type_idx    on admin_audit_logs (action_type);
create index if not exists audit_logs_admin_email_idx    on admin_audit_logs (admin_email);
create index if not exists audit_logs_entity_type_idx    on admin_audit_logs (entity_type);
create index if not exists audit_logs_created_at_idx     on admin_audit_logs (created_at desc);
create index if not exists change_versions_entity_idx    on admin_change_versions (entity_type, entity_key, language);
create index if not exists change_versions_created_at_idx on admin_change_versions (created_at desc);
