Ruthko Connect Phase 18: Live Site Settings and AI Assistant Sync

Purpose
This phase fixes the problem where contact changes made on a phone do not show on the computer. The Content Manager now saves contact details, event banners, flyers, email templates, and social draft content through a live API. On Hostinger VPS, the API saves through Supabase when the service role key is present. If Supabase is not configured yet, it saves to data/site-settings.json on the VPS.

New or updated files
- netlify/functions/site-settings.js
- js/site-settings.js
- js/content-manager.js
- netlify/functions/send-auto-reply.js
- supabase/phase18-live-site-settings-extension.sql
- server.js
- .env.example

What changed
- Public pages load live settings from /.netlify/functions/site-settings.
- Content Manager saves settings to the same live source.
- Phone and computer use the same data after refresh.
- Email automation templates saved in Content Manager are used by the auto-reply function when Supabase is connected.
- AI Studio remains protected for admin use.
- Ask Ruthko remains public for visitors.

Supabase setup
Run this file in Supabase SQL Editor after the earlier schema files:

supabase/phase18-live-site-settings-extension.sql

VPS environment variables
Add these to .env on Hostinger VPS:

SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ADMIN_SETTINGS_TOKEN=make_a_long_private_admin_token

ADMIN_SETTINGS_TOKEN is optional but recommended. If you set it, Content Manager will ask for the token the first time you save.

Deploy
On your computer:

git add .
git commit -m "Add live site settings and AI sync"
git push

On Hostinger VPS:

cd /var/www/ruthko-connect
git pull
cd ruthko-connect-phase12-hostinger-vps
npm install
pm2 restart ruthko-connect

Test
Open admin:
https://ruthkojobs.com/content-manager.html

Change contact phone or email.
Save.
Open the public site on phone and computer.
Refresh.
Both should show the same contact details.
