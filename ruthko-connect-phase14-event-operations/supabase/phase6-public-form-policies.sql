-- Ruthko Connect Phase 6: public insert policies for intake forms
-- Run this after Phase 5 admin policies and Phase 6 extension.
-- Website visitors submit forms, but they do not read CRM records.

drop policy if exists "public_insert_leads" on leads;
create policy "public_insert_leads" on leads for insert to anon with check (true);

drop policy if exists "public_insert_employers" on employers;
create policy "public_insert_employers" on employers for insert to anon with check (true);

drop policy if exists "public_insert_candidates" on candidates;
create policy "public_insert_candidates" on candidates for insert to anon with check (true);

drop policy if exists "public_insert_sponsors" on sponsors;
create policy "public_insert_sponsors" on sponsors for insert to anon with check (true);

drop policy if exists "public_insert_vendors" on vendors;
create policy "public_insert_vendors" on vendors for insert to anon with check (true);
