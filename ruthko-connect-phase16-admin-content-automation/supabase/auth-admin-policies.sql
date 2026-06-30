-- Ruthko Connect Phase 5: authenticated admin policies
-- Run this after you create your Supabase Auth admin user.
-- This replaces the open development policies from Phase 4.

-- Leads
drop policy if exists "dev_read_leads" on leads;
drop policy if exists "dev_insert_leads" on leads;
drop policy if exists "dev_update_leads" on leads;
create policy "admin_read_leads" on leads for select to authenticated using (true);
create policy "admin_insert_leads" on leads for insert to authenticated with check (true);
create policy "admin_update_leads" on leads for update to authenticated using (true) with check (true);
create policy "admin_delete_leads" on leads for delete to authenticated using (true);

-- Employers
drop policy if exists "dev_read_employers" on employers;
drop policy if exists "dev_insert_employers" on employers;
create policy "admin_read_employers" on employers for select to authenticated using (true);
create policy "admin_insert_employers" on employers for insert to authenticated with check (true);
create policy "admin_update_employers" on employers for update to authenticated using (true) with check (true);
create policy "admin_delete_employers" on employers for delete to authenticated using (true);

-- Candidates
drop policy if exists "dev_read_candidates" on candidates;
drop policy if exists "dev_insert_candidates" on candidates;
create policy "admin_read_candidates" on candidates for select to authenticated using (true);
create policy "admin_insert_candidates" on candidates for insert to authenticated with check (true);
create policy "admin_update_candidates" on candidates for update to authenticated using (true) with check (true);
create policy "admin_delete_candidates" on candidates for delete to authenticated using (true);

-- Sponsors
drop policy if exists "dev_read_sponsors" on sponsors;
drop policy if exists "dev_insert_sponsors" on sponsors;
create policy "admin_read_sponsors" on sponsors for select to authenticated using (true);
create policy "admin_insert_sponsors" on sponsors for insert to authenticated with check (true);
create policy "admin_update_sponsors" on sponsors for update to authenticated using (true) with check (true);
create policy "admin_delete_sponsors" on sponsors for delete to authenticated using (true);

-- Vendors
drop policy if exists "dev_read_vendors" on vendors;
drop policy if exists "dev_insert_vendors" on vendors;
create policy "admin_read_vendors" on vendors for select to authenticated using (true);
create policy "admin_insert_vendors" on vendors for insert to authenticated with check (true);
create policy "admin_update_vendors" on vendors for update to authenticated using (true) with check (true);
create policy "admin_delete_vendors" on vendors for delete to authenticated using (true);

-- Events
drop policy if exists "dev_read_events" on ruthko_events;
drop policy if exists "dev_insert_events" on ruthko_events;
create policy "admin_read_events" on ruthko_events for select to authenticated using (true);
create policy "admin_insert_events" on ruthko_events for insert to authenticated with check (true);
create policy "admin_update_events" on ruthko_events for update to authenticated using (true) with check (true);
create policy "admin_delete_events" on ruthko_events for delete to authenticated using (true);

-- Payments
drop policy if exists "dev_read_payments" on payments;
drop policy if exists "dev_insert_payments" on payments;
create policy "admin_read_payments" on payments for select to authenticated using (true);
create policy "admin_insert_payments" on payments for insert to authenticated with check (true);
create policy "admin_update_payments" on payments for update to authenticated using (true) with check (true);
create policy "admin_delete_payments" on payments for delete to authenticated using (true);

-- Tasks
drop policy if exists "dev_read_tasks" on tasks;
drop policy if exists "dev_insert_tasks" on tasks;
create policy "admin_read_tasks" on tasks for select to authenticated using (true);
create policy "admin_insert_tasks" on tasks for insert to authenticated with check (true);
create policy "admin_update_tasks" on tasks for update to authenticated using (true) with check (true);
create policy "admin_delete_tasks" on tasks for delete to authenticated using (true);
