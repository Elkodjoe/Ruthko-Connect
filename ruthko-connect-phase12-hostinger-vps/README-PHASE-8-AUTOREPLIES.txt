RUTHKO CONNECT - PHASE 8 AUTO-REPLY EMAILS

This phase adds automatic confirmation emails to people who submit public forms.

What happens now:

1. Public form is submitted.
2. Lead is saved to Supabase CRM or browser sample storage.
3. Admin alert is sent to Ruthko.
4. Auto-reply email is sent to the person who submitted the form.
5. User is redirected to thank-you.html.

Auto-reply types included:

Employer staffing request
Candidate interest form
Sponsor interest form
Vendor booth request
Event RSVP form

New file:

netlify/functions/send-auto-reply.js

Updated file:

js/intake-crm.js

Required Netlify environment variables:

RESEND_API_KEY=your_resend_api_key
RUTHKO_NOTIFY_TO=info@ruthkojobs.com
RUTHKO_NOTIFY_FROM=Ruthko Connect <onboarding@resend.dev>
RUTHKO_AUTOREPLY_FROM=Ruthko Connect <onboarding@resend.dev>
RUTHKO_REPLY_TO=info@ruthkojobs.com

Important Resend setup:

The default onboarding@resend.dev sender is for testing.
For production, verify your Ruthko domain in Resend and replace the sender with your domain email.

Example production sender:

RUTHKO_AUTOREPLY_FROM=Ruthko Connect <info@ruthkojobs.com>
RUTHKO_NOTIFY_FROM=Ruthko Connect <info@ruthkojobs.com>

Local test:

python -m http.server 5500

Open:

http://localhost:5500/intake.html

Full Netlify function test:

netlify dev

Open:

http://localhost:8888/intake.html

Phase 9 direction:

Add task automation, follow-up reminders, and CRM status workflows.
