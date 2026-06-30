-- Phase 29: Candidate Matching and Talent Pool
-- Run after phase28-job-board-employer-workflow.sql
-- Requires: crm_contacts, crm_intake_submissions, job_posts, employer_staffing_orders

-- ─── Talent Profiles ──────────────────────────────────────────────────────────
create table if not exists talent_profiles (
  id                       uuid primary key default gen_random_uuid(),
  crm_contact_id           uuid references crm_contacts(id) on delete set null,
  crm_submission_id        uuid references crm_intake_submissions(id) on delete set null,
  first_name               text,
  last_name                text,
  email                    text,
  phone                    text,
  city                     text,
  state                    text,
  country                  text,
  preferred_language       text default 'en',
  desired_job_type         text,
  experience_level         text,
  work_authorization_status text,
  preferred_location       text,
  preferred_shift          text,
  availability_date        date,
  resume_url               text,
  status                   text not null default 'new'
                             check (status in ('new','screening','qualified','not_qualified','active_pool','shortlisted','submitted_to_employer','interviewing','hired','inactive','archived')),
  assigned_to              uuid,
  profile_json             jsonb not null default '{}'::jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- ─── Candidate Skills ─────────────────────────────────────────────────────────
create table if not exists candidate_skills (
  id                uuid primary key default gen_random_uuid(),
  talent_profile_id uuid references talent_profiles(id) on delete cascade,
  skill_name        text not null,
  skill_level       text,
  years_experience  numeric,
  created_at        timestamptz not null default now()
);

-- ─── Candidate Certifications ─────────────────────────────────────────────────
create table if not exists candidate_certifications (
  id                uuid primary key default gen_random_uuid(),
  talent_profile_id uuid references talent_profiles(id) on delete cascade,
  certification_name text not null,
  issuing_body      text,
  expiration_date   date,
  document_url      text,
  created_at        timestamptz not null default now()
);

-- ─── Candidate Match Scores ───────────────────────────────────────────────────
create table if not exists candidate_match_scores (
  id                uuid primary key default gen_random_uuid(),
  talent_profile_id uuid references talent_profiles(id) on delete cascade,
  job_post_id       uuid references job_posts(id) on delete cascade,
  score             integer not null default 0 check (score >= 0 and score <= 100),
  label             text,
  score_json        jsonb not null default '{}'::jsonb,
  created_by        uuid,
  created_at        timestamptz not null default now()
);

-- ─── Employer Shortlists ──────────────────────────────────────────────────────
create table if not exists employer_shortlists (
  id                uuid primary key default gen_random_uuid(),
  staffing_order_id uuid references employer_staffing_orders(id) on delete set null,
  job_post_id       uuid references job_posts(id) on delete set null,
  shortlist_name    text not null,
  employer_name     text,
  status            text not null default 'draft'
                      check (status in ('draft','review','sent_to_employer','employer_reviewing','interview_selected','filled','closed')),
  notes             text,
  created_by        uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ─── Employer Shortlist Candidates ────────────────────────────────────────────
create table if not exists employer_shortlist_candidates (
  id                uuid primary key default gen_random_uuid(),
  shortlist_id      uuid references employer_shortlists(id) on delete cascade,
  talent_profile_id uuid references talent_profiles(id) on delete cascade,
  job_post_id       uuid references job_posts(id) on delete set null,
  match_score       integer default 0,
  admin_notes       text,
  employer_feedback text,
  status            text not null default 'shortlisted',
  created_at        timestamptz not null default now()
);

-- ─── Candidate Notes ──────────────────────────────────────────────────────────
create table if not exists candidate_notes (
  id                uuid primary key default gen_random_uuid(),
  talent_profile_id uuid references talent_profiles(id) on delete cascade,
  note_text         text not null,
  note_type         text default 'general',
  created_by        uuid,
  created_by_email  text,
  created_at        timestamptz not null default now()
);

-- ─── Updated-at triggers ─────────────────────────────────────────────────────
create or replace function crm_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists set_updated_at_talent_profiles on talent_profiles;
create trigger set_updated_at_talent_profiles
  before update on talent_profiles
  for each row execute function crm_set_updated_at();

drop trigger if exists set_updated_at_employer_shortlists on employer_shortlists;
create trigger set_updated_at_employer_shortlists
  before update on employer_shortlists
  for each row execute function crm_set_updated_at();

-- ─── Indexes ─────────────────────────────────────────────────────────────────
create index if not exists idx_talent_profiles_status       on talent_profiles(status);
create index if not exists idx_talent_profiles_email        on talent_profiles(email);
create index if not exists idx_talent_profiles_job_type     on talent_profiles(desired_job_type);
create index if not exists idx_talent_profiles_submission   on talent_profiles(crm_submission_id);
create index if not exists idx_talent_profiles_contact      on talent_profiles(crm_contact_id);
create index if not exists idx_candidate_skills_profile     on candidate_skills(talent_profile_id);
create index if not exists idx_candidate_certs_profile      on candidate_certifications(talent_profile_id);
create index if not exists idx_match_scores_profile         on candidate_match_scores(talent_profile_id);
create index if not exists idx_match_scores_job             on candidate_match_scores(job_post_id);
create index if not exists idx_shortlists_status            on employer_shortlists(status);
create index if not exists idx_shortlist_candidates_list    on employer_shortlist_candidates(shortlist_id);
create index if not exists idx_shortlist_candidates_profile on employer_shortlist_candidates(talent_profile_id);
create index if not exists idx_candidate_notes_profile      on candidate_notes(talent_profile_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table talent_profiles              enable row level security;
alter table candidate_skills             enable row level security;
alter table candidate_certifications     enable row level security;
alter table candidate_match_scores       enable row level security;
alter table employer_shortlists          enable row level security;
alter table employer_shortlist_candidates enable row level security;
alter table candidate_notes              enable row level security;

-- Talent profiles
create policy "admins_read_talent_profiles" on talent_profiles
  for select using (
    exists (select 1 from admin_profiles where user_id = auth.uid() and is_active = true
            and role in ('owner','admin','editor','viewer'))
  );
create policy "editors_manage_talent_profiles" on talent_profiles
  for all using (
    exists (select 1 from admin_profiles where user_id = auth.uid() and is_active = true
            and role in ('owner','admin','editor'))
  );

-- Skills
create policy "admins_read_candidate_skills" on candidate_skills
  for select using (
    exists (select 1 from admin_profiles where user_id = auth.uid() and is_active = true
            and role in ('owner','admin','editor','viewer'))
  );
create policy "editors_manage_candidate_skills" on candidate_skills
  for all using (
    exists (select 1 from admin_profiles where user_id = auth.uid() and is_active = true
            and role in ('owner','admin','editor'))
  );

-- Certifications
create policy "admins_read_candidate_certs" on candidate_certifications
  for select using (
    exists (select 1 from admin_profiles where user_id = auth.uid() and is_active = true
            and role in ('owner','admin','editor','viewer'))
  );
create policy "editors_manage_candidate_certs" on candidate_certifications
  for all using (
    exists (select 1 from admin_profiles where user_id = auth.uid() and is_active = true
            and role in ('owner','admin','editor'))
  );

-- Match scores
create policy "admins_read_match_scores" on candidate_match_scores
  for select using (
    exists (select 1 from admin_profiles where user_id = auth.uid() and is_active = true
            and role in ('owner','admin','editor','viewer'))
  );
create policy "editors_manage_match_scores" on candidate_match_scores
  for all using (
    exists (select 1 from admin_profiles where user_id = auth.uid() and is_active = true
            and role in ('owner','admin','editor'))
  );

-- Shortlists
create policy "admins_read_shortlists" on employer_shortlists
  for select using (
    exists (select 1 from admin_profiles where user_id = auth.uid() and is_active = true
            and role in ('owner','admin','editor','viewer'))
  );
create policy "editors_manage_shortlists" on employer_shortlists
  for all using (
    exists (select 1 from admin_profiles where user_id = auth.uid() and is_active = true
            and role in ('owner','admin','editor'))
  );

-- Shortlist candidates
create policy "admins_read_shortlist_candidates" on employer_shortlist_candidates
  for select using (
    exists (select 1 from admin_profiles where user_id = auth.uid() and is_active = true
            and role in ('owner','admin','editor','viewer'))
  );
create policy "editors_manage_shortlist_candidates" on employer_shortlist_candidates
  for all using (
    exists (select 1 from admin_profiles where user_id = auth.uid() and is_active = true
            and role in ('owner','admin','editor'))
  );

-- Notes
create policy "admins_read_candidate_notes" on candidate_notes
  for select using (
    exists (select 1 from admin_profiles where user_id = auth.uid() and is_active = true
            and role in ('owner','admin','editor','viewer'))
  );
create policy "editors_manage_candidate_notes" on candidate_notes
  for all using (
    exists (select 1 from admin_profiles where user_id = auth.uid() and is_active = true
            and role in ('owner','admin','editor'))
  );
