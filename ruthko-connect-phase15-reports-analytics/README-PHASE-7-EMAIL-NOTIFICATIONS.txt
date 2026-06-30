RUTHKO CONNECT - PHASE 7 EMAIL NOTIFICATIONS

What this phase adds

Every public intake form now does three things:

1. Saves the lead to Supabase CRM.
2. Sends an admin email alert through Netlify Functions.
3. Sends the visitor to thank-you.html.

Forms covered

Employer staffing request
Candidate interest form
Sponsor interest form
Vendor booth request form
Event RSVP form

New file added

netlify/functions/notify-lead.js

Updated file

js/intake-crm.js

The form now calls:

/.netlify/functions/notify-lead

after the lead is saved.

Email provider

This phase uses Resend.

Environment variables needed in Netlify

RESEND_API_KEY
RUTHKO_NOTIFY_TO
RUTHKO_NOTIFY_FROM

Recommended values

RUTHKO_NOTIFY_TO=info@ruthkojobs.com
RUTHKO_NOTIFY_FROM=Ruthko Connect <onboarding@resend.dev>

Use onboarding@resend.dev for testing.
Use your verified Ruthko domain email after domain verification.

Local test option

Regular local server:

python -m http.server 5500

This tests pages, forms, Supabase, and local storage.
Netlify email function does not run with this option.

Full local test with Netlify Functions:

npm install -g netlify-cli
cd C:\Users\kodjo\ruthko-connect
netlify dev

Then open the URL Netlify gives you.

Netlify setup

1. Open your Netlify site.
2. Go to Site configuration.
3. Go to Environment variables.
4. Add RESEND_API_KEY.
5. Add RUTHKO_NOTIFY_TO.
6. Add RUTHKO_NOTIFY_FROM.
7. Redeploy the site.
8. Submit a public form.
9. Check your email.
10. Check the CRM.

Important

Email notifications should never block the CRM save.
If email fails, the lead still saves.
