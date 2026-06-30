RUTHKO CONNECT PHASE 10: CAMPAIGNS AND BULK EMAIL SEGMENTS

What this phase adds

1. Protected campaign dashboard
   File: campaigns.html

2. Campaign logic
   File: js/ruthko-campaigns.js

3. Campaign email function
   File: netlify/functions/send-campaign.js

4. Unsubscribe function
   File: netlify/functions/unsubscribe.js

5. Campaign database extension
   File: supabase/phase10-campaigns-extension.sql

6. Public intake consent checkbox
   File: intake.html

7. Marketing consent fields in form save logic
   File: js/intake-crm.js

What the campaign page does

- Shows eligible contacts
- Filters by lead type
- Filters by lead status
- Searches name, email, notes, and source
- Exports selected segment as CSV
- Saves campaign drafts
- Previews campaign emails
- Sends approved campaign emails to the current segment
- Records sent campaign history

Eligibility rule

A contact appears in campaign segments only when:

- The contact has an email
- marketing_consent is true
- marketing_status is not Unsubscribed
- marketing_status is not Suppressed

Local testing

Open:

http://localhost:5500/campaigns.html

Full email testing

Use Netlify Dev:

netlify dev

Open:

http://localhost:8888/campaigns.html

Required Netlify environment variables

RESEND_API_KEY
RUTHKO_CAMPAIGN_FROM=Ruthko Connect <onboarding@resend.dev>
RUTHKO_REPLY_TO=info@ruthkojobs.com
RUTHKO_UNSUBSCRIBE_BASE_URL=https://your-site.netlify.app/.netlify/functions/unsubscribe

Optional for unsubscribe database updates

SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY

Supabase setup order

1. Run supabase/schema.sql
2. Run supabase/auth-admin-policies.sql
3. Run supabase/phase6-form-database-extension.sql
4. Run supabase/phase6-public-form-policies.sql
5. Run supabase/phase9-task-automation-extension.sql
6. Run supabase/phase10-campaigns-extension.sql

Main pages

Dashboard:
index.html

CRM:
crm.html

Tasks:
tasks.html

Campaigns:
campaigns.html

Public intake:
intake.html
