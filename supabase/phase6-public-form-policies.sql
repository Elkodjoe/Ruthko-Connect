-- ============================================================
-- Ruthko Connect — Phase 6: Public Form RLS Policies
--
-- Allows ANONYMOUS (public) users to INSERT into intake tables.
-- Authenticated admins keep full access via Phase 5 policies.
-- Nobody anonymous can SELECT / UPDATE / DELETE.
-- ============================================================

-- Enable RLS on all new tables
alter table intake_submissions  enable row level security;
alter table employers           enable row level security;
alter table candidates          enable row level security;
alter table sponsors            enable row level security;
alter table vendors             enable row level security;
alter table event_registrations enable row level security;

-- Drop old policies if re-running
drop policy if exists "public_insert_leads"              on leads;
drop policy if exists "public_insert_intake_submissions" on intake_submissions;
drop policy if exists "public_insert_employers"          on employers;
drop policy if exists "public_insert_candidates"         on candidates;
drop policy if exists "public_insert_sponsors"           on sponsors;
drop policy if exists "public_insert_vendors"            on vendors;
drop policy if exists "public_insert_event_reg"         on event_registrations;
drop policy if exists "admin_intake_all"                 on intake_submissions;
drop policy if exists "admin_employers_all"              on employers;
drop policy if exists "admin_candidates_all"             on candidates;
drop policy if exists "admin_sponsors_all"               on sponsors;
drop policy if exists "admin_vendors_all"                on vendors;
drop policy if exists "admin_event_reg_all"              on event_registrations;

-- ── Public INSERT policies (anon role) ───────────────────────
-- Intake forms can create leads and detail records without login.

create policy "public_insert_leads"
  on leads for insert
  to anon
  with check (true);

create policy "public_insert_intake_submissions"
  on intake_submissions for insert
  to anon
  with check (true);

create policy "public_insert_employers"
  on employers for insert
  to anon
  with check (true);

create policy "public_insert_candidates"
  on candidates for insert
  to anon
  with check (true);

create policy "public_insert_sponsors"
  on sponsors for insert
  to anon
  with check (true);

create policy "public_insert_vendors"
  on vendors for insert
  to anon
  with check (true);

create policy "public_insert_event_reg"
  on event_registrations for insert
  to anon
  with check (true);

-- ── Admin full-access policies (authenticated role) ──────────

create policy "admin_intake_all"
  on intake_submissions for all
  to authenticated
  using      (true)
  with check (true);

create policy "admin_employers_all"
  on employers for all
  to authenticated
  using      (true)
  with check (true);

create policy "admin_candidates_all"
  on candidates for all
  to authenticated
  using      (true)
  with check (true);

create policy "admin_sponsors_all"
  on sponsors for all
  to authenticated
  using      (true)
  with check (true);

create policy "admin_vendors_all"
  on vendors for all
  to authenticated
  using      (true)
  with check (true);

create policy "admin_event_reg_all"
  on event_registrations for all
  to authenticated
  using      (true)
  with check (true);
