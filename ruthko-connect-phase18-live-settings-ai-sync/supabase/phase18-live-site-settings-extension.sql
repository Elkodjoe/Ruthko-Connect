-- Phase 18: Live Site Settings and AI Assistant Sync
-- Run after Phase 16. This keeps admin content changes synced across phone, computer, and the live site.

create table if not exists public.site_settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  asset_type text not null default 'flyer',
  title text not null,
  url text not null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.email_automation_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text unique not null,
  trigger_name text not null,
  subject text not null,
  body text not null,
  is_active boolean default true,
  updated_at timestamptz default now()
);

create table if not exists public.social_publications (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  topic text,
  caption text not null,
  scheduled_for date,
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.site_settings enable row level security;
alter table public.media_assets enable row level security;
alter table public.email_automation_templates enable row level security;
alter table public.social_publications enable row level security;

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings" on public.site_settings for select using (true);

drop policy if exists "Public can read media assets" on public.media_assets;
create policy "Public can read media assets" on public.media_assets for select using (true);

drop policy if exists "Admins manage site settings" on public.site_settings;
create policy "Admins manage site settings" on public.site_settings for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "Admins manage media assets" on public.media_assets;
create policy "Admins manage media assets" on public.media_assets for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "Admins manage email automation templates" on public.email_automation_templates;
create policy "Admins manage email automation templates" on public.email_automation_templates for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "Admins manage social publications" on public.social_publications;
create policy "Admins manage social publications" on public.social_publications for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into public.site_settings (key, value) values
('contactEmail', 'info@ruthkojobs.com'),
('contactPhone1', '+1-701-260-3908'),
('contactPhone2', '+1-240-486-5002'),
('contactWebsite', 'https://ruthkojobs.com'),
('footerMessage', 'Staffing, event organizing, sponsorship, vendors, and partnerships.'),
('eventHeadline', 'Ruthko Events and Business Programs'),
('eventSubtitle', 'Professional event organizing for summits, vendor programs, sponsor activations, cultural exchanges, and business networking.'),
('eventCtaLink', 'intake.html#event'),
('eventBannerUrl', 'images/logo.png')
on conflict (key) do nothing;

insert into public.email_automation_templates (template_key, trigger_name, subject, body, is_active) values
('employer', 'New employer staffing request', 'Thank you for your staffing request', 'Hello {{name}},\n\nThank you for contacting Ruthko. We received your staffing request and our team will review your worker needs, timeline, and next steps.\n\nBest,\nRuthko Connect', true),
('candidate', 'New candidate interest', 'Ruthko received your candidate interest form', 'Hello {{name}},\n\nThank you for your interest. Please prepare your resume, credentials, and work authorization details for review.\n\nBest,\nRuthko Connect', true),
('sponsor', 'New sponsor inquiry', 'Thank you for your Ruthko sponsorship interest', 'Hello {{name}},\n\nThank you for your sponsorship interest. We will share package details, event visibility options, and the next sponsor call path.\n\nBest,\nRuthko Connect', true),
('vendor', 'New vendor booth request', 'Ruthko received your vendor booth request', 'Hello {{name}},\n\nThank you for your booth request. We will review booth availability, payment details, and event setup instructions.\n\nBest,\nRuthko Connect', true),
('event', 'New event RSVP', 'Your Ruthko event RSVP was received', 'Hello {{name}},\n\nThank you for your RSVP. We will send event details, check-in instructions, and updates as the date approaches.\n\nBest,\nRuthko Connect', true)
on conflict (template_key) do nothing;
