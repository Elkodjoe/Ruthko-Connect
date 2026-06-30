RUTHKO CONNECT PHASE 6: PUBLIC FORMS TO CRM DATABASE

Goal:
Connect every public intake form directly to the Supabase CRM database.

New files:

js/intake-crm.js
Handles public form submissions.
Creates a lead in the leads table.
Stores detailed data in employers, candidates, sponsors, vendors, or event_registrations.
Stores a full copy in intake_submissions.

supabase/phase6-form-database-extension.sql
Adds intake_submissions and event_registrations tables.

supabase/phase6-public-form-policies.sql
Allows public website visitors to submit forms.
It does not allow visitors to read your CRM records.

Updated file:

intake.html
Now sends forms to Supabase or browser sample storage.

Local test:

cd C:\Users\kodjo\ruthko-connect
python -m http.server 5500

Open:

http://localhost:5500/intake.html

In sample mode:
Forms save to browser storage.
Then open CRM:

http://localhost:5500/crm.html

You will see the saved lead in sample CRM mode.

Live Supabase setup:

1. Open Supabase.
2. Open SQL Editor.
3. Run this file first if not already done:

supabase/schema.sql

4. Run Phase 5 admin policy file:

supabase/auth-admin-policies.sql

5. Run Phase 6 extension:

supabase/phase6-form-database-extension.sql

6. Run Phase 6 public insert policy file:

supabase/phase6-public-form-policies.sql

7. Open:

js/supabase-config.js

8. Paste your Supabase URL and anon key.
9. Change:

sampleMode: true

to:

sampleMode: false

Test flow:

1. Open intake.html.
2. Submit an Employer form.
3. Open Supabase Table Editor.
4. Check these tables:

leads
employers
intake_submissions

5. Log into crm.html and verify the lead appears.

Public pages:

intake.html
payments.html
thank-you.html

Protected admin pages:

login.html
index.html
crm.html

Next phase:
Phase 7, email notifications for new leads.
