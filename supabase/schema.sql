-- ============================================================
-- Ruthko Connect — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- LEADS (all intake form submissions land here)
create table if not exists leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- identity
  type          text not null check (type in ('employer','candidate','sponsor','vendor','event','invoice')),
  name          text not null,
  email         text,
  phone         text,
  organization  text,
  country       text,

  -- classification
  status        text not null default 'new'
                  check (status in ('new','contacted','qualified','converted','lost')),
  priority      text not null default 'medium'
                  check (priority in ('low','medium','high')),
  source        text default 'intake-form',

  -- financial
  deal_value    numeric(12,2) default 0,
  package       text,

  -- detail fields (jsonb keeps it flexible without extra tables)
  details       jsonb default '{}',

  -- notes
  notes         text,
  assigned_to   text,
  next_followup date
);

-- TASKS (per-lead follow-up actions)
create table if not exists tasks (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  lead_id     uuid references leads(id) on delete cascade,
  title       text not null,
  due_date    date,
  done        boolean not null default false,
  priority    text not null default 'medium'
                check (priority in ('low','medium','high')),
  notes       text
);

-- PAYMENTS (Stripe or invoice payments linked to leads)
create table if not exists payments (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  lead_id         uuid references leads(id) on delete set null,
  amount          numeric(12,2) not null,
  currency        text not null default 'usd',
  status          text not null default 'pending'
                    check (status in ('pending','paid','failed','refunded')),
  method          text default 'stripe',
  stripe_payment_id text,
  package         text,
  notes           text
);

-- ── Indexes ──────────────────────────────────────────────────
create index if not exists leads_type_idx     on leads(type);
create index if not exists leads_status_idx   on leads(status);
create index if not exists leads_created_idx  on leads(created_at desc);
create index if not exists tasks_lead_idx     on tasks(lead_id);
create index if not exists payments_lead_idx  on payments(lead_id);

-- ── updated_at trigger ────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_updated_at on leads;
create trigger leads_updated_at
  before update on leads
  for each row execute function set_updated_at();

-- ── Row-Level Security (enable after testing) ─────────────────
-- alter table leads    enable row level security;
-- alter table tasks    enable row level security;
-- alter table payments enable row level security;
--
-- To allow your admin user full access, create a policy:
-- create policy "admin_all" on leads for all using (auth.role() = 'authenticated');

-- ── Sample seed data (remove before production) ───────────────
insert into leads (type, name, email, phone, organization, status, priority, deal_value, package, source, details) values
  ('employer',  'Global Medical Center',     'hr@globalmed.com',       '+1 713 555 0100', 'Global Medical Center',     'qualified',  'high',   75000, 'EB-3 Placement',         'intake-form', '{"industry":"Healthcare","visa_type":"EB-3","worker_count":5}'),
  ('candidate', 'Ama Boateng',               'ama.boateng@email.com',  '+233 24 555 0201','',                           'new',        'medium', 0,     null,                     'intake-form', '{"profession":"Nursing / Healthcare","country":"Ghana","experience":"3–5 years"}'),
  ('sponsor',   'Diallo Ventures LLC',       'info@diallovc.com',      '+1 832 555 0302', 'Diallo Ventures LLC',        'contacted',  'high',   50000, 'Platinum Sponsor — $50,000','intake-form','{"event_interest":"Cultural Handshake Summit 2026"}'),
  ('sponsor',   'Texas Workforce Board',     'events@twb.org',         '+1 512 555 0403', 'Texas Workforce Board',      'qualified',  'high',   15000, 'Gold Sponsor — $15,000', 'intake-form', '{"event_interest":"Cultural Handshake Summit 2026"}'),
  ('vendor',    'Afro Cuisine Catering',     'hello@afrocuisine.com',  '+1 281 555 0504', 'Afro Cuisine Catering',      'new',        'medium', 3500,  'Vendor Booth — $3,500',  'intake-form', '{"event":"Cultural Handshake Summit — Houston","booth_count":"1 booth — $3,500"}'),
  ('event',     'Dr. Kwame Asante',          'k.asante@university.edu','+1 346 555 0605', 'University of Houston',      'new',        'low',    250,   'General Ticket — $250',  'intake-form', '{"event":"Cultural Handshake Summit 2026","role":"Speaker / Panelist","attendees":"1 (just me)"}'),
  ('employer',  'Lone Star Hospitality Grp', 'hr@lonestar.com',        '+1 214 555 0706', 'Lone Star Hospitality Group','new',        'high',   45000, 'H-2B Placement',         'intake-form', '{"industry":"Hospitality","visa_type":"H-2B (Seasonal)","worker_count":12}'),
  ('invoice',   'Heritage Bank of Commerce', 'finance@heritagebank.com','+1 713 555 0807','Heritage Bank of Commerce',  'contacted',  'high',   15000, 'Gold Sponsor — $15,000', 'invoice-form','{"billing_address":"1200 Main St, Houston TX 77002"}')
on conflict do nothing;
