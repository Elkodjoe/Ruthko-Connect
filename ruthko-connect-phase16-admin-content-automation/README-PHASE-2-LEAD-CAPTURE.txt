RUTHKO CONNECT PHASE 2, LEAD CAPTURE

Local destination:
C:\Users\kodjo\ruthko-connect

New files added:
intake.html
thank-you.html
README-PHASE-2-LEAD-CAPTURE.txt
LEAD-FLOW-MAP.txt
NEXT-STEP-PHASE-3-PAYMENTS.txt

What changed:
1. Added a public intake page.
2. Added employer staffing request form.
3. Added candidate interest form.
4. Added sponsor interest form.
5. Added vendor booth request form.
6. Added event RSVP form.
7. Added thank-you page after form submission.
8. Added dashboard button that opens the intake page.
9. Sponsor package buttons now send users to the sponsor or vendor form.

How to run locally:
1. Open this folder:
   C:\Users\kodjo\ruthko-connect

2. Double-click:
   start-local-server.bat

3. Open:
   http://localhost:5500

4. Open the intake page:
   http://localhost:5500/intake.html

How forms work:
The forms use Netlify Forms.
They will not fully submit on your local file system.
They work after Netlify deployment.

Netlify setup:
1. Push this project to GitHub.
2. Connect GitHub repo to Netlify.
3. Leave build command empty.
4. Publish directory: .
5. Deploy.
6. Open Netlify dashboard.
7. Go to Forms.
8. You should see:
   employer-staffing-request
   candidate-interest
   sponsor-interest
   vendor-booth-request
   event-rsvp

What to replace next:
1. Replace sample revenue, jobs, and sponsors with real data.
2. Replace placeholder event details with current Ruthko events.
3. Add Stripe payment links in Phase 3.
4. Connect submissions to Google Sheets or Airtable.
5. Add email notifications.
