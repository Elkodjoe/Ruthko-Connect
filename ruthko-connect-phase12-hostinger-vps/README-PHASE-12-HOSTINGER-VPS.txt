RUTHKO CONNECT PHASE 12, HOSTINGER VPS DEPLOYMENT

Purpose
This phase moves Ruthko Connect from local static hosting and Netlify Functions into a VPS-ready Node.js app.

Business focus
Ruthko Connect is a dual business platform:
1. Staffing, recruitment, jobs, employers, candidates, sponsors, partners, CRM, campaigns, payments, and automations.
2. Event organizing, event registration, sponsors, vendors, booths, speakers, attendees, ticketing, and event follow-up.

New VPS files
server.js
package.json
ecosystem.config.cjs
.env.example
nginx/ruthko-connect.conf
scripts/deploy-hostinger-vps.sh
HOSTINGER-VPS-COMMANDS.txt

What changed
The app now runs through Node.js on the VPS.
The same public pages still work.
The same CRM pages still work.
The Netlify Function URLs still work through Express compatibility routes.
This keeps the frontend code from breaking.

Supported backend routes
/.netlify/functions/notify-lead
/.netlify/functions/send-auto-reply
/.netlify/functions/send-campaign
/.netlify/functions/unsubscribe
/.netlify/functions/task-health-check

Also supported
/api/notify-lead
/api/send-auto-reply
/api/send-campaign
/api/unsubscribe
/api/task-health-check

Production structure
Domain: ruthkojobs.com
Server folder: /var/www/ruthko-connect
Node app port: 3000
Reverse proxy: Nginx
Process manager: PM2
SSL: Certbot
Database: Supabase
Email sending: Resend
Payments: Stripe Payment Links first, Stripe backend later

Local test
npm install
npm start
Open http://localhost:3000

Hostinger VPS setup
1. Create or open Hostinger VPS.
2. Use Ubuntu 24.04 if available.
3. Point ruthkojobs.com and www.ruthkojobs.com to the VPS IP using A records.
4. SSH into the VPS.
5. Clone the GitHub repo.
6. Run scripts/deploy-hostinger-vps.sh.
7. Edit /var/www/ruthko-connect/.env.
8. Restart PM2.
9. Run Certbot after DNS resolves.

Important environment values
RESEND_API_KEY
RUTHKO_NOTIFY_TO
RUTHKO_NOTIFY_FROM
RUTHKO_AUTOREPLY_FROM
RUTHKO_CAMPAIGN_FROM
RUTHKO_REPLY_TO
RUTHKO_UNSUBSCRIBE_BASE_URL
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY

Recommended next step
After this VPS deploy works, Phase 13 should add event management depth:
Events dashboard
Ticket types
Vendor booth inventory
Speaker management
Sponsor deliverables
Event check-in list
Attendee export
Post-event sponsor report
