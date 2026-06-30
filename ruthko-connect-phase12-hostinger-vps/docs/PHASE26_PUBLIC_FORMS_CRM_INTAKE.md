# Phase 26 — Public Application Forms and CRM Intake Pipeline

## Summary

Phase 26 adds 6 public-facing application forms and connects every submission to the admin CRM via an Intake Queue panel in `crm.html`.

---

## Files Created

| File | Purpose |
|------|---------|
| `apply.html` | Job seeker application |
| `employer-request.html` | Employer staffing request |
| `sponsor-application.html` | Sponsor application |
| `partner-application.html` | Partner application |
| `volunteer-application.html` | Volunteer application |
| `event-rsvp.html` | Event RSVP (pre-fill event name via `?event=` query param) |
| `js/form-validation.js` | Client-side validation — required fields, email, phone, consent |
| `js/crm-intake-service.js` | Supabase submission service; localStorage fallback in sample mode |
| `js/public-forms.js` | Shared form UX — success message, error banner, duplicate-submit guard |
| `supabase/phase26-public-forms-crm-intake.sql` | 3 tables + RLS + triggers + indexes |
| `docs/PHASE26_PUBLIC_FORMS_CRM_INTAKE.md` | This file |

---

## Database Tables

### `crm_intake_submissions`
Receives all public form submissions. One row per submission.

Key fields: `submission_type`, `status`, `consent_given`, `details_json` (form-specific extras), `source_page`, `assigned_to`, `priority`.

Valid statuses: `new | reviewing | contacted | qualified | scheduled | converted | closed | rejected | archived`

Valid priorities: `low | normal | high | urgent`

### `crm_contacts`
CRM contact records created from intake submissions by admins.

### `crm_pipeline_items`
Pipeline tracking items linked to contacts and/or submissions.

---

## Public Form Fields

All forms share: first name, last name, email, phone, city, state, country, preferred language, message, consent checkbox.

| Form | Extra fields stored in `details_json` |
|------|--------------------------------------|
| Job Seeker | desired_job_type, experience_level, work_authorization, preferred_location, availability_date, pay_expectation, skills, certifications, resume_link |
| Employer | industry, hiring_needs, workers_needed, job_location, start_date, pay_range, shift_type, housing_support, transportation_support |
| Sponsor | sponsor_level, budget_range, event_interest, logo_url |
| Partner | website, partnership_type, target_audience, collaboration_idea, logo_url |
| Volunteer | volunteer_role, availability, skills, availability_date, hours_per_week |
| Event RSVP | event_name, guests, attendance_type |

---

## RLS Permissions

| Table | Public | Viewer | Editor | Admin | Owner |
|-------|--------|--------|--------|-------|-------|
| crm_intake_submissions | INSERT (consent=true) | SELECT | SELECT + UPDATE | ALL | ALL |
| crm_contacts | — | SELECT | ALL | ALL | ALL |
| crm_pipeline_items | — | SELECT | ALL | ALL | ALL |

No service-role key is exposed. All operations use the Supabase anon key.

---

## Admin CRM Intake Queue (`crm.html#intake`)

Stats cards: Total Intake, New, Reviewing, Converted.

Filters: search (name/email), submission type, status, priority, date from/to.

Per-row actions:
- **View** — opens detail modal with all form fields + `details_json`
- **Change status** — quick dropdown (reviewing / contacted / qualified / converted / rejected / archive)

Modal actions:
- **Create Contact** — creates a `crm_contacts` row from submission data, marks submission as `converted`
- **Add to Pipeline** — creates a `crm_pipeline_items` row
- **Archive** — sets status to `archived`
- **Mark Duplicate** — archives with low priority

---

## Phase 27 Notification Stubs

`crm-intake-service.js` exposes four stub functions that log to console and return `Promise.resolve({ queued: true })`. They are called automatically after a successful submission:

- `notifyAdminOfNewSubmission(submission)` — all types
- `sendApplicantConfirmation(submission)` — job_seeker only
- `sendEmployerConfirmation(submission)` — employer only
- `sendSponsorConfirmation(submission)` — sponsor only

Phase 27 (Email Notifications) will implement these with real email sending.

---

## Sample / Offline Mode

When `sampleMode: true` in `supabase-config.js` or Supabase is unreachable:
- Submissions are saved to `localStorage['ruthko_intake_submissions_v1']` (max 200 entries)
- The intake queue in `crm.html` reads from localStorage
- All form success/error states work normally

---

## Setup Checklist

1. Run `supabase/phase26-public-forms-crm-intake.sql` in Supabase SQL Editor
2. Confirm `admin_profiles` table exists (Phase 23 required)
3. Seed owner profile if not done:
   ```sql
   insert into admin_profiles (user_id, role, full_name, is_active)
   values ('YOUR-UUID', 'owner', 'Emmanuel Kodjoe', true)
   on conflict (user_id) do update set role='owner', is_active=true;
   ```
4. Test `apply.html` submission in browser
5. Open `crm.html#intake` and confirm submission appears
6. Test "Create Contact" and "Add to Pipeline" actions

---

## Safety Constraints Preserved

- Phase 19 multilingual public pages: untouched
- Phase 20 admin sidebar parity: maintained (Intake Queue added consistently)
- Phase 21 shared content JSON fallback: untouched
- Phase 22 Supabase content persistence: untouched
- Phase 23 admin login and role permissions: untouched
- Phase 24 audit log and change history: untouched
- Phase 25 media library and file uploads: untouched

---

## Merge Order

Merge branches into main in this order:
1. `phase22-supabase-admin-persistence`
2. `phase23-admin-auth-roles`
3. `phase24-admin-audit-log`
4. `phase25-admin-media-library`
5. `phase26-public-forms-crm-intake` ← current
