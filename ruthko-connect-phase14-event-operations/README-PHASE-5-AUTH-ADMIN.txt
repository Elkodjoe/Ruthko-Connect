RUTHKO CONNECT PHASE 5: ADMIN LOGIN AND PROTECTED DASHBOARD

What changed

1. Added admin login page:
   login.html

2. Added authentication scripts:
   js/auth.js
   js/auth-guard.js

3. Protected admin pages:
   index.html
   crm.html

4. Left public pages open:
   intake.html
   payments.html
   thank-you.html

5. Added Supabase authenticated admin policy file:
   supabase/auth-admin-policies.sql

Local testing

1. Open Command Prompt.
2. Go to your project folder:

   cd C:\Users\kodjo\ruthko-connect

3. Start the local server:

   python -m http.server 5500

4. Open:

   http://localhost:5500/login.html

Sample mode login

Because js/supabase-config.js still has sampleMode: true, any email and password work locally.
This lets you test the login flow before connecting Supabase Auth.

Recommended test login:

Email: admin@ruthko.com
Password: admin123

Real Supabase Auth setup

1. Open Supabase.
2. Go to Authentication.
3. Go to Users.
4. Click Add User.
5. Add your admin email and password.
6. Go to SQL Editor.
7. Run this file:

   supabase/auth-admin-policies.sql

8. Open this file:

   js/supabase-config.js

9. Paste your real Supabase Project URL and anon key.
10. Change:

   sampleMode: true

   to:

   sampleMode: false

Protected pages

These require login:

http://localhost:5500/index.html
http://localhost:5500/crm.html

Public pages

These remain public:

http://localhost:5500/intake.html
http://localhost:5500/payments.html
http://localhost:5500/thank-you.html

Best next build phase

Phase 6 should connect public forms to the Supabase leads table.
That will move your system from sample leads to real incoming employer, candidate, sponsor, vendor, and event records.
