Ruthko Connect Phase 9: Task Automation and CRM Follow-Up Workflows

This phase turns every new form submission into follow-up work.

What changed

1. Public intake forms now create automated tasks.

Employer form creates:
- Call employer about staffing request
- Send employer staffing checklist

Candidate form creates:
- Review candidate profile
- Request resume and credentials

Sponsor form creates:
- Prepare sponsor follow-up
- Schedule sponsor call

Vendor form creates:
- Confirm booth needs
- Send vendor booth payment details

Event RSVP form creates:
- Confirm RSVP
- Add attendee to event follow-up list

2. New protected task dashboard

tasks.html

Use it to:
- View open tasks
- See due today
- See overdue work
- Track high-priority tasks
- Add manual tasks
- Mark tasks done
- Snooze tasks by 2 days
- Export tasks as CSV

3. New JavaScript file

js/ruthko-tasks.js

This handles the task dashboard, filters, local sample mode, live Supabase mode, CSV export, task completion, and snoozing.

4. Updated public form logic

js/intake-crm.js

This now saves the lead, saves the detail record, saves the intake submission, creates follow-up tasks, sends the admin alert, sends the auto-reply, then redirects to the thank-you page.

5. New Supabase SQL extension

supabase/phase9-task-automation-extension.sql

Run this after earlier SQL files.

Supabase setup order

1. supabase/schema.sql
2. supabase/auth-admin-policies.sql
3. supabase/phase6-form-database-extension.sql
4. supabase/phase6-public-form-policies.sql
5. supabase/phase9-task-automation-extension.sql

Local test

cd C:\Users\kodjo\ruthko-connect
python -m http.server 5500

Open:

http://localhost:5500/login.html
http://localhost:5500/tasks.html
http://localhost:5500/intake.html

Sample mode

If sampleMode is true, tasks save to browser storage.

Live mode

Open:

js/supabase-config.js

Paste your Supabase URL and anon key.

Then change:

sampleMode: true

to:

sampleMode: false

Best use

Start each day from tasks.html.

Handle tasks in this order:

1. Overdue
2. Due today
3. High priority
4. Sponsor and employer follow-up
5. Candidate document requests
6. Event RSVP confirmations
