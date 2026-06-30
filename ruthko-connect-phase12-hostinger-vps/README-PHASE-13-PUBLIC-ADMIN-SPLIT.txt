Ruthko Connect Phase 13: Public and Admin Split

This phase removes internal business controls from the public website.

Public pages:
index.html
jobs.html
events.html
partners.html
sponsors.html
payments.html
intake.html
thank-you.html
login.html

Admin-only pages:
admin.html
crm.html
tasks.html
campaigns.html
ai-studio.html

Key changes:
- Current public index.html is now a real public homepage.
- The old admin dashboard moved to admin.html.
- Public pages no longer show Ruthko Admin, admin email, logout, CRM links, tasks, campaigns, internal metrics, or setup notes.
- Admin pages stay behind login with auth-guard.js.
- The Ruthko logo was added at images/logo.png.
- Login now redirects to admin.html by default.

After replacing the folder, commit and push:

git add .
git commit -m "Split public website from admin dashboard"
git push

On VPS:

cd /var/www/ruthko-connect
git pull
cd ruthko-connect-phase13-public-admin-split
npm install
pm2 restart ruthko-connect

If your PM2 app still points to phase12, update the VPS path or copy phase13 contents into the active phase12 folder.
