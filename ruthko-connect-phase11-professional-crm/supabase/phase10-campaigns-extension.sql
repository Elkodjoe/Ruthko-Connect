-- Ruthko Connect Phase 10 campaign and segment database extension
-- Run after Phase 9 SQL files.

alter table leads add column if not exists marketing_consent boolean default false;
alter table leads add column if not exists marketing_status text default 'Unknown';
alter table leads add column if not exists segment_tags text[] default '{}';
alter table leads add column if not exists last_campaign_at timestamptz;

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  campaign_type text default 'Email',
  segment_type text default 'all',
  segment_status text,
  subject text not null,
  preview_text text,
  body_html text,
  body_text text,
  status text default 'Draft' check (status in ('Draft', 'Scheduled', 'Sending', 'Sent', 'Paused', 'Cancelled')),
  recipient_count integer default 0,
  sent_at timestamptz,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists campaign_sends (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  email text not null,
  status text default 'Queued' check (status in ('Queued', 'Sent', 'Failed', 'Skipped', 'Unsubscribed')),
  provider_message_id text,
  error_message text,
  sent_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists email_suppressions (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  reason text default 'Unsubscribed',
  created_at timestamptz default now()
);

create or replace function mark_lead_unsubscribed(target_email text)
returns void as $$
begin
  update leads
  set marketing_consent = false,
      marketing_status = 'Unsubscribed',
      updated_at = now()
  where lower(email) = lower(target_email);

  insert into email_suppressions(email, reason)
  values (lower(target_email), 'Unsubscribed')
  on conflict (email) do update set reason = excluded.reason;
end;
$$ language plpgsql security definer;

drop trigger if exists update_campaigns_updated_at on campaigns;
create trigger update_campaigns_updated_at
before update on campaigns
for each row execute function update_updated_at_column();

alter table campaigns enable row level security;
alter table campaign_sends enable row level security;
alter table email_suppressions enable row level security;

drop policy if exists "admin_read_campaigns" on campaigns;
drop policy if exists "admin_insert_campaigns" on campaigns;
drop policy if exists "admin_update_campaigns" on campaigns;
drop policy if exists "admin_read_campaign_sends" on campaign_sends;
drop policy if exists "admin_insert_campaign_sends" on campaign_sends;
drop policy if exists "admin_read_suppressions" on email_suppressions;
drop policy if exists "admin_insert_suppressions" on email_suppressions;

create policy "admin_read_campaigns" on campaigns for select using (auth.role() = 'authenticated');
create policy "admin_insert_campaigns" on campaigns for insert with check (auth.role() = 'authenticated');
create policy "admin_update_campaigns" on campaigns for update using (auth.role() = 'authenticated');

create policy "admin_read_campaign_sends" on campaign_sends for select using (auth.role() = 'authenticated');
create policy "admin_insert_campaign_sends" on campaign_sends for insert with check (auth.role() = 'authenticated');

create policy "admin_read_suppressions" on email_suppressions for select using (auth.role() = 'authenticated');
create policy "admin_insert_suppressions" on email_suppressions for insert with check (auth.role() = 'authenticated');

create index if not exists idx_leads_marketing on leads(marketing_consent, marketing_status, lead_type, status);
create index if not exists idx_campaigns_status on campaigns(status, created_at);
create index if not exists idx_campaign_sends_campaign on campaign_sends(campaign_id);
