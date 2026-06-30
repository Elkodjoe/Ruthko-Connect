RUTHKO CONNECT PHASE 14 - EVENT OPERATIONS

Purpose
Ruthko Connect now treats event organizing as a core business line, not an add-on.

New protected page
- event-operations.html

New script
- js/event-operations.js

New Supabase extension
- supabase/phase14-event-operations-extension.sql

What this phase adds
- Event operations dashboard
- Event creation board
- Speaker tracker
- Sponsor deliverables tracker
- Vendor booth tracker
- Attendee and check-in tracker
- Event run sheet timeline
- Event brief generator
- CSV export
- Admin navigation link for Event Ops

Public pages stay clean
- index.html
- jobs.html
- events.html
- sponsors.html
- partners.html
- intake.html
- payments.html
- thank-you.html

Protected admin pages
- admin.html
- event-operations.html
- crm.html
- tasks.html
- campaigns.html
- ai-studio.html

Supabase setup order
1. supabase/schema.sql
2. supabase/auth-admin-policies.sql
3. supabase/phase6-form-database-extension.sql
4. supabase/phase6-public-form-policies.sql
5. supabase/phase9-task-automation-extension.sql
6. supabase/phase10-campaigns-extension.sql
7. supabase/phase14-event-operations-extension.sql

Local test
Open login.html.
Sign in with admin@ruthko.com and any password while sampleMode is true.
Open event-operations.html.

Deploy to Hostinger VPS
Copy this phase into ruthko-connect-phase12-hostinger-vps.
Commit and push.
On VPS, run git pull, npm install, and pm2 restart ruthko-connect.
