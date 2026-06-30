RUTHKO CONNECT PHASE 3 PAYMENT SETUP

Local folder destination:
C:\Users\kodjo\ruthko-connect

Main files:
index.html
intake.html
payments.html
thank-you.html
netlify.toml
_redirects
start-local-server.bat

What Phase 3 adds:
1. Sponsor payment page
2. Vendor booth payment page
3. Event ticket payment buttons
4. Fallback intake forms when Stripe links are blank
5. Invoice request form through Netlify Forms
6. Dashboard Sponsor Portal buttons now point to payments.html

How to run locally:
cd C:\Users\kodjo\ruthko-connect
python -m http.server 5500

Open:
http://localhost:5500
http://localhost:5500/payments.html
http://localhost:5500/intake.html

How to connect Stripe Payment Links:
1. Log in to Stripe.
2. Go to Payment Links.
3. Create one payment link for each package:
   Platinum Sponsor, $50,000
   Gold Sponsor, $15,000
   Silver Sponsor, $5,000
   Vendor Booth, $3,500
   General Ticket, $250
   VIP Ticket, $500
   Table Ticket, $2,500
4. Copy each Stripe link.
5. Open payments.html.
6. Find this section:

const paymentLinks = {
  platinum: '',
  gold: '',
  silver: '',
  vendor: '',
  ticketGeneral: '',
  ticketVip: '',
  ticketTable: ''
};

7. Paste each Stripe link between the matching quote marks.

Example:
platinum: 'https://buy.stripe.com/YOUR_REAL_LINK_HERE',

Do not put Stripe secret keys in this website.
Use Stripe Payment Links only for this static version.

Recommended next phase:
Phase 4: simple admin CRM with Supabase.
