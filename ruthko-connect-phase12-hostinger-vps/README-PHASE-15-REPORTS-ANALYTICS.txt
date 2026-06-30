Ruthko Connect Phase 15: Reports & Analytics

This phase adds a protected Reports workspace for admin users.

New page:
reports.html

New script:
js/reports-analytics.js

New Supabase file:
supabase/phase15-reports-analytics-extension.sql

What the Reports page includes:
- Total pipeline
- Closed revenue
- Active leads
- Task health
- Monthly revenue and pipeline chart
- Lead mix by business line
- Event operations report
- Sponsor and vendor revenue report
- Campaign performance report
- Action alerts
- Executive brief generator
- CSV export

Public visitors should not see reports.html.
It uses the same admin protection as CRM, Tasks, Campaigns, AI Studio, and Event Operations.

Supabase setup order:
1. supabase/schema.sql
2. supabase/auth-admin-policies.sql
3. supabase/phase6-form-database-extension.sql
4. supabase/phase6-public-form-policies.sql
5. supabase/phase9-task-automation-extension.sql
6. supabase/phase10-campaigns-extension.sql
7. supabase/phase14-event-operations-extension.sql
8. supabase/phase15-reports-analytics-extension.sql

Local test:
npx serve . -l 5500

Open:
http://localhost:5500/reports.html

VPS update:
cd /var/www/ruthko-connect
git pull
cd ruthko-connect-phase12-hostinger-vps
npm install
pm2 restart ruthko-connect
