RUTHKO CONNECT PHASE 4: SUPABASE CRM DATABASE

What this version adds

1. CRM database page
File: crm.html

Use it to manage leads, employers, candidates, sponsors, vendors, and pipeline value.

2. Supabase schema
File: supabase/schema.sql

Run this SQL inside Supabase SQL Editor.

3. Supabase browser config
File: js/supabase-config.js

Paste your Supabase URL and anon key here after you create the Supabase project.

4. CRM logic
File: js/ruthko-crm.js

This loads leads, adds new leads, filters leads, opens lead details, and exports CSV.

5. Sample mode
The CRM works locally even without Supabase. It saves new test leads in your browser localStorage.

LOCAL TEST

cd C:\Users\kodjo\ruthko-connect
python -m http.server 5500

Open:
http://localhost:5500/crm.html

SUPABASE SETUP

1. Go to Supabase and create a new project.
2. Open SQL Editor.
3. Paste everything from supabase/schema.sql.
4. Run it.
5. Open Project Settings.
6. Copy Project URL.
7. Copy anon public key.
8. Open js/supabase-config.js.
9. Replace the placeholders.
10. Set sampleMode to false.

Example:

window.RUTHKO_SUPABASE = {
  url: 'https://your-project.supabase.co',
  anonKey: 'your-anon-key',
  sampleMode: false
};

SECURITY BEFORE LAUNCH

The SQL includes development policies. They make building easy. Before public launch, replace them with admin login policies.

NEXT PHASE

Phase 5 should add admin login, protected CRM routes, role-based access, and private sponsor records.
