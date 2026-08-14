// Production hardening: sample mode (placeholder Supabase credentials) was
// previously silent — an admin could work an entire session against
// localStorage-only data with no indication nothing was really persisted or
// visible to other admins/devices. This makes that state unmissable.
(function () {
  function showBanner() {
    if (document.getElementById('ruthko-sample-mode-banner')) return;
    var bar = document.createElement('div');
    bar.id = 'ruthko-sample-mode-banner';
    bar.style.cssText =
      'position:sticky;top:0;z-index:9999;background:#facc15;color:#000;' +
      'font:600 13px/1.4 Arial,sans-serif;text-align:center;padding:8px 12px;';
    bar.textContent =
      'SAMPLE MODE — Supabase is not connected. Changes save to this browser only and are not ' +
      'visible on other devices or to other admins. Set real credentials in js/supabase-config.js to go live.';
    document.body.insertBefore(bar, document.body.firstChild);
  }

  function check() {
    if (typeof window.ruthkoIsSampleMode === 'function' && window.ruthkoIsSampleMode()) {
      showBanner();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', check);
  } else {
    check();
  }
})();
