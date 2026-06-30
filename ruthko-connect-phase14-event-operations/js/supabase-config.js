// Ruthko Connect Supabase config
// For local testing, this file uses sample mode until you paste your real keys.

window.RUTHKO_SUPABASE = {
  url: 'https://YOUR-PROJECT.supabase.co',
  anonKey: 'YOUR-SUPABASE-ANON-KEY',
  sampleMode: true
};

window.getRuthkoSupabaseClient = function () {
  const cfg = window.RUTHKO_SUPABASE || {};
  const missing = !cfg.url || cfg.url.includes('YOUR-PROJECT') || !cfg.anonKey || cfg.anonKey.includes('YOUR-SUPABASE');

  if (cfg.sampleMode || missing || !window.supabase) {
    return null;
  }

  return window.supabase.createClient(cfg.url, cfg.anonKey);
};
