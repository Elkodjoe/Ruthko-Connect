-- Phase 30: Employer Portal and Shortlist Review
-- Run after all previous phase SQL files.

-- ── Tables ────────────────────────────────────────────────────────────────────

create table if not exists employer_accounts (
  id uuid primary key default gen_random_uuid(),
  crm_contact_id uuid references crm_contacts(id) on delete set null,
  company_name text,
  contact_name text,
  email text not null unique,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists employer_portal_access (
  id uuid primary key default gen_random_uuid(),
  employer_account_id uuid references employer_accounts(id) on delete cascade,
  staffing_order_id uuid references employer_staffing_orders(id) on delete cascade,
  shortlist_id uuid references employer_shortlists(id) on delete cascade,
  access_status text not null default 'active',
  access_token_hash text,
  expires_at timestamptz,
  last_accessed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employer_portal_access_status_check
    check (access_status in ('active', 'expired', 'revoked'))
);

create table if not exists employer_shortlist_feedback (
  id uuid primary key default gen_random_uuid(),
  shortlist_id uuid references employer_shortlists(id) on delete cascade,
  shortlist_candidate_id uuid references employer_shortlist_candidates(id) on delete cascade,
  employer_account_id uuid references employer_accounts(id) on delete cascade,
  talent_profile_id uuid references talent_profiles(id) on delete set null,
  feedback_status text not null default 'maybe',
  feedback_note text,
  interview_requested boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employer_shortlist_feedback_status_check
    check (feedback_status in ('interested', 'maybe', 'not_a_fit', 'request_interview', 'need_more_information', 'rejected'))
);

create table if not exists employer_order_messages (
  id uuid primary key default gen_random_uuid(),
  employer_account_id uuid references employer_accounts(id) on delete cascade,
  staffing_order_id uuid references employer_staffing_orders(id) on delete cascade,
  sender_type text not null default 'employer',
  message_text text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint employer_order_messages_sender_check
    check (sender_type in ('employer', 'admin', 'system'))
);

-- ── Add admin_summary + share flag to talent_profiles if not present ──────────

alter table talent_profiles
  add column if not exists admin_summary text,
  add column if not exists share_resume_with_employer boolean not null default false;

-- ── Triggers ─────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_employer_accounts') then
    create trigger set_updated_at_employer_accounts
      before update on employer_accounts
      for each row execute function crm_set_updated_at();
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_employer_portal_access') then
    create trigger set_updated_at_employer_portal_access
      before update on employer_portal_access
      for each row execute function crm_set_updated_at();
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_employer_shortlist_feedback') then
    create trigger set_updated_at_employer_shortlist_feedback
      before update on employer_shortlist_feedback
      for each row execute function crm_set_updated_at();
  end if;
end $$;

-- ── Indexes ───────────────────────────────────────────────────────────────────

create index if not exists idx_employer_accounts_email on employer_accounts(email);
create index if not exists idx_employer_portal_access_token_hash on employer_portal_access(access_token_hash);
create index if not exists idx_employer_portal_access_employer on employer_portal_access(employer_account_id);
create index if not exists idx_employer_portal_access_shortlist on employer_portal_access(shortlist_id);
create index if not exists idx_employer_feedback_shortlist on employer_shortlist_feedback(shortlist_id);
create index if not exists idx_employer_feedback_employer on employer_shortlist_feedback(employer_account_id);
create index if not exists idx_employer_messages_order on employer_order_messages(staffing_order_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table employer_accounts enable row level security;
alter table employer_portal_access enable row level security;
alter table employer_shortlist_feedback enable row level security;
alter table employer_order_messages enable row level security;

-- employer_accounts: admins manage, viewers read
create policy "admins_read_employer_accounts"
  on employer_accounts for select
  using (
    exists (
      select 1 from admin_profiles ap
      where ap.user_id = auth.uid()
        and ap.is_active = true
        and ap.role in ('owner', 'admin', 'editor', 'viewer')
    )
  );

create policy "editors_manage_employer_accounts"
  on employer_accounts for all
  using (
    exists (
      select 1 from admin_profiles ap
      where ap.user_id = auth.uid()
        and ap.is_active = true
        and ap.role in ('owner', 'admin', 'editor')
    )
  );

-- employer_portal_access: admins only
create policy "admins_read_employer_portal_access"
  on employer_portal_access for select
  using (
    exists (
      select 1 from admin_profiles ap
      where ap.user_id = auth.uid()
        and ap.is_active = true
        and ap.role in ('owner', 'admin', 'editor', 'viewer')
    )
  );

create policy "editors_manage_employer_portal_access"
  on employer_portal_access for all
  using (
    exists (
      select 1 from admin_profiles ap
      where ap.user_id = auth.uid()
        and ap.is_active = true
        and ap.role in ('owner', 'admin', 'editor')
    )
  );

-- employer_shortlist_feedback: admins read/manage
create policy "admins_read_employer_shortlist_feedback"
  on employer_shortlist_feedback for select
  using (
    exists (
      select 1 from admin_profiles ap
      where ap.user_id = auth.uid()
        and ap.is_active = true
        and ap.role in ('owner', 'admin', 'editor', 'viewer')
    )
  );

create policy "editors_manage_employer_shortlist_feedback"
  on employer_shortlist_feedback for all
  using (
    exists (
      select 1 from admin_profiles ap
      where ap.user_id = auth.uid()
        and ap.is_active = true
        and ap.role in ('owner', 'admin', 'editor')
    )
  );

-- employer_order_messages: admins read/manage
create policy "admins_read_employer_order_messages"
  on employer_order_messages for select
  using (
    exists (
      select 1 from admin_profiles ap
      where ap.user_id = auth.uid()
        and ap.is_active = true
        and ap.role in ('owner', 'admin', 'editor', 'viewer')
    )
  );

create policy "editors_manage_employer_order_messages"
  on employer_order_messages for all
  using (
    exists (
      select 1 from admin_profiles ap
      where ap.user_id = auth.uid()
        and ap.is_active = true
        and ap.role in ('owner', 'admin', 'editor')
    )
  );

-- NOTE: Employer portal users authenticate via token lookup, not Supabase Auth.
-- Token lookups go through a Netlify/server function or service-role in production.
-- The anon key cannot read employer_portal_access directly (no anon policy).
-- This is intentional — keeps employer session logic server-side.
