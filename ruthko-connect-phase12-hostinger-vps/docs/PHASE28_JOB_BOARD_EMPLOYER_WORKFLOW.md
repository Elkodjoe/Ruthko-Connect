# Phase 28 — Admin Job Board and Employer Staffing Workflow

Turns Ruthko Connect into a real staffing workflow: employers submit requests, admins convert them to staffing orders, create job posts, publish jobs, and track applications.

## Files Added

| File | Purpose |
|---|---|
| `jobs-admin.html` | Admin job board page — 4-tab management interface |
| `js/job-board-service.js` | Supabase + localStorage service for all 3 job tables |
| `js/employer-staffing-workflow.js` | Workflow helpers — convert requests to orders, create jobs from orders |
| `js/jobs-admin.js` | Admin UI logic — tabs, modals, filters, quick-status dropdowns |
| `js/public-job-board.js` | Public job board — filters, job cards, Apply links, EN/FR/ES support |
| `supabase/phase28-job-board-employer-workflow.sql` | 3 tables + RLS + triggers + indexes + sample data |
| `docs/PHASE28_JOB_BOARD_EMPLOYER_WORKFLOW.md` | This file |

## Files Modified

- `jobs.html` — Replaced static cards with live job board + filter bar + job listing grid
- All 8 admin pages — Added `job-board-service.js` script + "Job Board" sidebar link

## Admin Workflow

```
Employer submits public form (employer-request.html)
  → appears in CRM Intake Queue (Phase 26)
  → appears in Job Board Admin → Employer Requests tab

Admin clicks "Convert to Order"
  → creates employer_staffing_order record
  → shown in Staffing Orders tab

Admin clicks "+ Job" on staffing order
  → opens Job Post modal with pre-filled details
  → admin adds title, description, requirements
  → saves as draft

Admin reviews draft → clicks "Publish"
  → status: published, is_public: true, published_at: now()
  → job appears on public jobs.html board

Job seeker applies via apply.html?job_id=...
  → job_applications record created
  → applicant confirmation email sent (Phase 27 hook)
  → admin notification sent
  → automation task created

Admin tracks application in Applications tab
  → updates status: reviewing → contacted → interview → offered → hired
```

## Database Tables

### `employer_staffing_orders`
Converts employer form submissions into tracked staffing orders with order status lifecycle.

### `job_posts`
Public-facing job listings. `is_public=true` + `status='published'` required for public visibility. Slug is auto-generated from title + timestamp.

### `job_applications`
Applications tied to specific job posts. Public INSERT is allowed (anon key). Admins read/update by role.

## Job Statuses

| Status | Meaning |
|---|---|
| draft | Being prepared, not visible |
| review | Under internal review |
| published | Live on public board |
| paused | Temporarily hidden |
| filled | Position filled |
| closed | No longer accepting |
| archived | Removed from active view |

## Staffing Order Statuses

`new → reviewing → quoted → approved → recruiting → partially_filled → filled → closed / cancelled`

## Application Statuses

`new → reviewing → contacted → screening → interview → offered → hired / rejected / withdrawn`

## Job Categories

CNA, LPN, RN, Caregiver, Hospitality, Warehouse, Agriculture, Teacher, Event staff, Security, General labor, Administrative, Other

## Employment Types

Full-time, Part-time, Contract, Temporary, Seasonal, Sponsorship pathway, International recruitment

## Public Job Board (jobs.html)

- Filter by keyword, location, category, type, shift, housing support, transportation support
- Job cards with title, company (if show_company_name=true), location, pay range, start date, support badges
- Apply button: `apply.html?job_id=JOB_ID&job_title=TITLE`
- EN / FR / ES language support via `ruthkoPublicJobBoard`
- Supabase → localStorage fallback

## Phase 26 Integration

- Employer requests from `crm_intake_submissions` appear in Employer Requests tab
- Job seeker applications appear in Applications tab
- Apply button passes `job_id` to `apply.html` (Phase 26 job seeker form)

## Phase 27 Integration

- When `job_applications` record is created: `ruthkoEmailAutomation.sendApplicantConfirmation()` is called
- Admin notification email is sent via `notifyAdminOfNewSubmission()`
- Automation task created via `ruthkoAutomation.processSubmission()`
- Application status change: logs `job_application_status_change` audit event; email hook placeholder in place

## Phase 24 Audit Integration

Logged via `window.ruthkoAudit.log()` when available:

| Action | Trigger |
|---|---|
| `job_post_create` | New job post saved |
| `job_post_update` | Job post edited |
| `job_post_publish` | Job published |
| `job_post_pause` | Job paused |
| `job_post_close` | Job closed |
| `job_post_delete` | Job deleted |
| `staffing_order_create` | Order created |
| `staffing_order_update` | Order edited |
| `staffing_order_status_change` | Order status changed |
| `job_application_create` | Application submitted |
| `job_application_update` | Application edited |
| `job_application_status_change` | Application status changed |
| `job_application_assign` | Application assigned |
| `job_export_csv` | Applications exported |

## Security

- Public users read only `is_public=true` and `status='published'` job posts (RLS)
- Public users can INSERT job applications (anon key, RLS `with check (true)`)
- Admins manage all tables by role (owner/admin/editor/viewer)
- No service-role key in frontend — anon key only
- `jobs-admin.html` is auth-guarded via `auth-guard.js`

## Supabase Setup

1. Run `supabase/phase28-job-board-employer-workflow.sql` in Supabase SQL Editor
2. SQL creates 3 tables + RLS policies + indexes + 2 sample published jobs

## Smoke Tests

- [ ] `jobs.html` loads public job board with filter bar
- [ ] Published sample jobs appear on public board
- [ ] Draft jobs do NOT appear on public board
- [ ] Keyword, location, category, shift, housing, transport filters work
- [ ] Apply button opens `apply.html?job_id=...`
- [ ] `jobs-admin.html` redirects to login when logged out
- [ ] Admin logs in → Job Posts tab loads
- [ ] Create job post → appears in table with draft status
- [ ] Publish job → status changes to published, is_public=true
- [ ] Pause job → removed from public board
- [ ] Duplicate job → new draft created
- [ ] Delete job → removed from table
- [ ] Employer form submission → appears in Employer Requests tab
- [ ] Convert to order → appears in Staffing Orders tab
- [ ] Create job from order → Job modal pre-filled with order data
- [ ] Application created → confirmation email triggered (Phase 27)
- [ ] Application status changed → audit log entry created (Phase 24)
- [ ] Export CSV → downloads applications as CSV
- [ ] `crm.html` Intake Queue still works
- [ ] Email Logs tab still works
- [ ] Audit log still records events
- [ ] All public pages still load (Phase 19 unaffected)
```

## After Phase 28

Phase 29: Candidate matching and talent pool.
