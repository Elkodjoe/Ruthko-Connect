// ============================================================
// Ruthko Connect — Supabase Configuration
//
// HOW TO CONNECT:
// 1. Create a project at https://supabase.com
// 2. Go to Project Settings → API
// 3. Copy your Project URL and anon (public) key
// 4. Paste them below
// 5. Set sampleMode: false
// ============================================================

window.RUTHKO_CONFIG = {
  supabase: {
    url:    "YOUR_SUPABASE_PROJECT_URL",   // e.g. https://xyzabc.supabase.co
    anonKey:"YOUR_SUPABASE_ANON_KEY"       // starts with eyJ...
  },

  // sampleMode: true  → uses built-in mock data, no Supabase needed (local dev)
  // sampleMode: false → reads/writes to your real Supabase database
  sampleMode: true
};
