// ============================================================
// Ruthko Connect — Auth (ruthko-auth.js)
// Depends on: supabase-config.js (loaded first)
//
// Usage on PROTECTED pages:
//   <script src="js/ruthko-auth.js"></script>
//   <script>RuthkoAuth.guard();</script>   ← call after DOM ready
//
// Usage on login.html:
//   RuthkoAuth.login(email, password)      ← returns promise
//
// Logout button:
//   onclick="RuthkoAuth.logout()"
// ============================================================

var RuthkoAuth = (function () {
  "use strict";

  var STORAGE_KEY = "ruthko_admin_session";
  var LOGIN_PAGE  = "login.html";
  var HOME_PAGE   = "index.html";

  var _supabase = null;

  function getConfig() {
    return window.RUTHKO_CONFIG || { sampleMode: true };
  }

  function getClient() {
    if (_supabase) return _supabase;
    var cfg = getConfig();
    if (!cfg.sampleMode && window.supabase) {
      _supabase = window.supabase.createClient(cfg.supabase.url, cfg.supabase.anonKey);
    }
    return _supabase;
  }

  // ── Session helpers (sample mode) ─────────────────────────
  function sampleIsLoggedIn() {
    try {
      var s = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
      return s && s.email;
    } catch (e) { return false; }
  }

  function sampleSetSession(email) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ email: email, at: Date.now() }));
  }

  function sampleClearSession() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function sampleGetUser() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    } catch (e) { return null; }
  }

  // ── Public API ────────────────────────────────────────────

  // Call at the top of every protected page.
  // Shows a black overlay until auth is confirmed; redirects if not logged in.
  async function guard() {
    showOverlay();
    var cfg = getConfig();

    if (cfg.sampleMode) {
      if (!sampleIsLoggedIn()) {
        redirect(LOGIN_PAGE);
        return;
      }
      injectLogoutBtn();
      injectUserBadge(sampleGetUser().email);
      hideOverlay();
      return;
    }

    // Live Supabase check
    var client = getClient();
    if (!client) { redirect(LOGIN_PAGE); return; }

    try {
      var result = await client.auth.getSession();
      var session = result.data && result.data.session;
      if (!session) { redirect(LOGIN_PAGE); return; }
      injectLogoutBtn();
      injectUserBadge(session.user.email);
      hideOverlay();
    } catch (e) {
      redirect(LOGIN_PAGE);
    }
  }

  // Login — resolves { ok, error }
  async function login(email, password) {
    var cfg = getConfig();

    if (cfg.sampleMode) {
      if (!email || !password) return { ok: false, error: "Enter email and password." };
      sampleSetSession(email);
      return { ok: true };
    }

    var client = getClient();
    if (!client) return { ok: false, error: "Supabase not configured." };

    var result = await client.auth.signInWithPassword({ email: email, password: password });
    if (result.error) return { ok: false, error: result.error.message };
    return { ok: true };
  }

  // Logout
  async function logout() {
    var cfg = getConfig();
    if (cfg.sampleMode) {
      sampleClearSession();
      redirect(LOGIN_PAGE);
      return;
    }
    var client = getClient();
    if (client) await client.auth.signOut();
    redirect(LOGIN_PAGE);
  }

  // Get current user email (sync in sample, call after guard resolves)
  async function getUser() {
    var cfg = getConfig();
    if (cfg.sampleMode) return sampleGetUser();
    var client = getClient();
    if (!client) return null;
    var result = await client.auth.getUser();
    return result.data && result.data.user ? result.data.user : null;
  }

  // ── DOM helpers ───────────────────────────────────────────
  function showOverlay() {
    var el = document.getElementById("auth-overlay");
    if (!el) {
      el = document.createElement("div");
      el.id = "auth-overlay";
      el.style.cssText = "position:fixed;inset:0;background:#0a0a0a;z-index:9999;display:flex;align-items:center;justify-content:center;";
      el.innerHTML = '<div style="color:#71717a;font-size:14px;font-family:Inter,sans-serif;">Checking session…</div>';
      document.body.appendChild(el);
    }
    el.style.display = "flex";
  }

  function hideOverlay() {
    var el = document.getElementById("auth-overlay");
    if (el) el.style.display = "none";
  }

  function injectLogoutBtn() {
    // Only inject once
    if (document.getElementById("auth-logout-btn")) return;

    // Try to find the header action area
    var btn = document.createElement("button");
    btn.id = "auth-logout-btn";
    btn.textContent = "Log Out";
    btn.onclick = logout;
    btn.style.cssText = "font-size:13px;padding:7px 14px;border-radius:8px;border:1px solid #3f3f46;background:transparent;color:#a1a1aa;cursor:pointer;font-family:Inter,sans-serif;transition:all 0.2s;white-space:nowrap;";
    btn.onmouseover = function(){ this.style.color="#fff"; this.style.borderColor="#71717a"; };
    btn.onmouseout  = function(){ this.style.color="#a1a1aa"; this.style.borderColor="#3f3f46"; };

    // Insert before last child of header flex row, or append to body header
    var header = document.querySelector("header");
    if (header) {
      var flex = header.querySelector(".flex.items-center.gap-3, .flex.items-center.gap-4");
      if (flex) {
        flex.appendChild(btn);
        return;
      }
      header.appendChild(btn);
    }
  }

  function injectUserBadge(email) {
    if (!email || document.getElementById("auth-user-badge")) return;
    var badge = document.createElement("span");
    badge.id = "auth-user-badge";
    badge.textContent = email;
    badge.style.cssText = "font-size:11px;color:#71717a;font-family:Inter,sans-serif;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:none;";
    // show on md+ (simple approach: always show, let CSS hide on small)
    badge.style.display = "inline";

    var header = document.querySelector("header");
    if (header) {
      var flex = header.querySelector(".flex.items-center.gap-3, .flex.items-center.gap-4");
      if (flex) { flex.insertBefore(badge, flex.firstChild); }
    }
  }

  function redirect(page) {
    // Avoid redirect loops
    if (window.location.pathname.endsWith(page) || window.location.href.includes(page)) return;
    window.location.href = page;
  }

  return { guard: guard, login: login, logout: logout, getUser: getUser };

})();
