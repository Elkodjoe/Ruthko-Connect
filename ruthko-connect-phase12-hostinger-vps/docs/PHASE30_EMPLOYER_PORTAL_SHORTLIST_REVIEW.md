# Phase 30: Employer Portal and Shortlist Review

## Overview

Phase 30 adds a secure employer-facing portal. Employers log in via a hashed access token (sent by email from admins), review shortlisted candidates, submit feedback, request interviews, track staffing orders, and message their recruiter.

Employers never see the admin console, audit logs, CRM notes, talent pool search, or other employers' data.

## Files Added

| File | Purpose |
|---|---|
| `employer-login.html` | Token-based employer login page |
| `employer-portal.html` | Employer dashboard — shortlists and orders |
| `employer-shortlist-review.html` | Candidate review page with feedback controls |
| `employer-order-status.html` | Order status detail and messaging |
| `js/employer-portal-auth.js` | Token auth, session management, requireAuth guard |
| `js/employer-portal.js` | Portal dashboard data loading |
| `js/employer-shortlist-review.js` | Candidate card rendering, feedback submission |
| `js/employer-feedback-service.js` | CRUD for accounts, access, feedback, messages |
| `js/employer-order-status.js` | Order status display and messaging |
| `supabase/phase30-employer-portal-shortlist-review.sql` | 4 tables + RLS + triggers + indexes |
| `docs/PHASE30_EMPLOYER_PORTAL_SHORTLIST_REVIEW.md` | This file |

## Database Tables

### `employer_accounts`
Stores employer company records. Linked optionally to a `crm_contacts` row.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| crm_contact_id | uuid FK | nullable, crm_contacts |
| company_name | text | |
| contact_name | text | |
| email | text | unique |
| phone | text | |
| is_active | boolean | default true |

### `employer_portal_access`
Each row grants one employer access to one shortlist/order. Stores only a hash of the token — the raw token is delivered by email and never stored.

| Column | Type | Notes |
|---|---|---|
| access_token_hash | text | SHA-256 of raw token |
| access_status | text | active / expired / revoked |
| expires_at | timestamptz | nullable = no expiry |
| last_accessed_at | timestamptz | updated on each login |

### `employer_shortlist_feedback`
One row per candidate per employer. Upserted (not duplicated) on re-submit.

| Column | Type | Notes |
|---|---|---|
| feedback_status | text | interested / maybe / not_a_fit / request_interview / need_more_information / rejected |
| interview_requested | boolean | auto-true when status = request_interview |
| feedback_note | text | employer note |

### `employer_order_messages`
Thread between employer and admin per staffing order.

| Column | Type | Notes |
|---|---|---|
| sender_type | text | employer / admin / system |
| is_read | boolean | admin marks as read |

## Security

- **No plain tokens stored**: Raw token is hashed with SubtleCrypto SHA-256 client-side. Only the hash is stored.
- **No Supabase Auth for employers**: Employer session is stored in `sessionStorage` (not localStorage) for the browser tab lifetime only.
- **RLS**: All 4 tables require admin auth (`admin_profiles` role check). No anon policies — public visitors cannot read any portal data.
- **No service-role key in frontend**: Token lookup in production should go through a Netlify function with service-role key. In sample mode, localStorage fallback is used.
- **Candidate visibility**: Employers see only `share_resume_with_employer = true` resumes. Internal admin notes are not exposed (`admin_summary` is the admin-curated public summary).

## Employer Flow

1. Admin creates employer account → `createEmployerAccount()`
2. Admin shares shortlist → `shareShortlistWithEmployer()` generates token, hashes it, creates portal access row, marks shortlist `sent_to_employer`, logs audit event, calls email placeholder
3. Employer receives email with raw token
4. Employer visits `employer-login.html`, enters token
5. Client hashes token → looks up `employer_portal_access` by hash
6. On match: session stored in `sessionStorage`, employer redirected to portal
7. Employer reviews candidates at `employer-shortlist-review.html`
8. Employer submits feedback → `submitFeedback()` upserts row, fires `ruthko:employer-feedback-submitted`
9. Employer requests interview → `interview_requested = true`, audit logged
10. Employer messages recruiter at `employer-order-status.html`

## Audit Events

| Event | Trigger |
|---|---|
| `employer_portal_access_create` | Admin shares shortlist |
| `employer_portal_access_revoke` | Admin revokes access |
| `employer_shortlist_share` | Shortlist shared with employer |
| `employer_shortlist_view` | Employer opens shortlist review page |
| `employer_candidate_feedback` | Employer submits feedback |
| `employer_interview_request` | Employer sets interview_requested = true |
| `employer_more_candidates_request` | Employer clicks "Request More" |
| `employer_message_create` | Employer or admin sends message |
| `employer_login` | Successful token login |
| `employer_access_denied` | Invalid or expired token attempt |
| `employer_logout` | Employer logs out |

## Email Placeholders (Phase 27 hooks)

| Function | Purpose |
|---|---|
| `sendEmployerPortalInvite()` | Invite employer to portal |
| `sendShortlistSharedNotice()` | Notify employer their shortlist is ready |
| `sendEmployerFeedbackNotice()` | Notify admin of employer feedback |
| `sendInterviewRequestedNotice()` | Notify admin of interview request |

All four create a pending record in `ruthko_email_logs_v1` localStorage and log to console. Connect to Netlify function when email system is stable.

## Admin Actions (in jobs-admin.html / talent-pool.html)

- Create employer account
- Share shortlist with employer (generates token)
- Revoke portal access
- View employer feedback
- View interview requests
- View unread messages
- See portal stats (accounts, active access, feedback count, interview requests)

## talent_profiles additions

```sql
alter table talent_profiles
  add column if not exists admin_summary text,
  add column if not exists share_resume_with_employer boolean not null default false;
```

`admin_summary` is written by admin recruiter — shown on candidate card to employer.
`share_resume_with_employer` must be explicitly set to true before resume link is visible.

## Smoke Tests

| Test | Expected |
|---|---|
| `employer-login.html` loads | Login form renders |
| Invalid token | "Invalid or expired access token" error |
| Valid sample token | Redirects to employer-portal.html |
| Employer sees shortlists | Only their assigned shortlist |
| Employer sees orders | Only their assigned order |
| Candidate card | No admin CRM notes, resume hidden unless shared |
| Feedback submit | Feedback saved, `ruthko:employer-feedback-submitted` dispatched |
| Interview request | `interview_requested = true`, audit logged |
| Request more candidates | System message created in order thread |
| Download CSV | CSV file with candidate review data downloads |
| Message recruiter | Message appears in thread |
| Logout | Session cleared, redirect to login |
| Talent pool | Still loads |
| Job board | Still loads |
| CRM | Still loads |
| Public pages | Not affected |

## Phase 31 Preview

Phase 31: Candidate Portal and Application Status Tracking — let job seekers log in to check their application status, upload documents, and receive status updates.
