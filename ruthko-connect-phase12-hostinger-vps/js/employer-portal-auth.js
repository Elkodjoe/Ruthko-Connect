(function () {
  'use strict';

  // Employer portal uses a separate session stored in sessionStorage (not Supabase Auth).
  // The employer authenticates via an access token (emailed link or manual entry).
  // We hash it client-side, look up employer_portal_access by hash, and store minimal
  // session data in sessionStorage for the portal session lifetime.

  var SESSION_KEY = 'ruthko_employer_session_v1';
  var ACCOUNTS_KEY = 'ruthko_employer_accounts_v1';
  var ACCESS_KEY   = 'ruthko_employer_portal_access_v1';

  function getClient() {
    if (typeof window.getRuthkoSupabaseClient === 'function') return window.getRuthkoSupabaseClient();
    if (window.RUTHKO_SUPABASE && window.RUTHKO_SUPABASE.sampleMode) return null;
    return null;
  }

  function loadLocal(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (_) { return []; } }
  function saveLocal(key, items, limit) { try { localStorage.setItem(key, JSON.stringify((items || []).slice(0, limit || 500))); } catch (_) {} }

  // Simple SHA-256 via SubtleCrypto — async
  async function hashToken(token) {
    try {
      var enc  = new TextEncoder();
      var data = enc.encode(token.trim());
      var buf  = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    } catch (_) {
      // Fallback: simple deterministic hash (not cryptographic — only used when SubtleCrypto unavailable)
      var h = 0;
      for (var i = 0; i < token.length; i++) h = (Math.imul(31, h) + token.charCodeAt(i)) | 0;
      return 'fallback-' + Math.abs(h).toString(16);
    }
  }

  function audit(action, meta) {
    if (window.ruthkoAudit && typeof window.ruthkoAudit.log === 'function') {
      window.ruthkoAudit.log(action, meta).catch(function () {});
    }
  }

  // ── Session ───────────────────────────────────────────────────────────────────
  function getSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch (_) { return null; }
  }

  function saveSession(data) {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch (_) {}
  }

  function clearSession() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (_) {}
  }

  function isAuthenticated() {
    var s = getSession();
    if (!s) return false;
    if (s.expires_at && new Date(s.expires_at) < new Date()) { clearSession(); return false; }
    return true;
  }

  // ── Login with token ───────────────────────────────────────────────────────────
  async function loginWithToken(token) {
    if (!token || !token.trim()) return { ok: false, error: 'Access token is required.' };

    var hash   = await hashToken(token);
    var client = getClient();

    if (client) {
      try {
        var now = new Date().toISOString();
        var result = await client
          .from('employer_portal_access')
          .select('*, employer_accounts(*)')
          .eq('access_token_hash', hash)
          .eq('access_status', 'active')
          .gt('expires_at', now)
          .single();

        if (result.error || !result.data) {
          audit('employer_access_denied', { token_hash: hash.slice(0, 8) + '…', reason: 'not_found_or_expired' });
          return { ok: false, error: 'Invalid or expired access token.' };
        }

        var access  = result.data;
        var account = access.employer_accounts;

        // Update last_accessed_at
        await client.from('employer_portal_access').update({ last_accessed_at: now }).eq('id', access.id);

        saveSession({
          employer_account_id: account.id,
          company_name: account.company_name,
          contact_name: account.contact_name,
          email: account.email,
          access_id: access.id,
          shortlist_id: access.shortlist_id,
          staffing_order_id: access.staffing_order_id,
          expires_at: access.expires_at,
          logged_in_at: now
        });

        audit('employer_login', { employer_account_id: account.id, company_name: account.company_name });
        return { ok: true, session: getSession() };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    }

    // Sample/local mode — find by hash in localStorage
    var accesses = loadLocal(ACCESS_KEY);
    var access   = accesses.find(function (a) { return a.access_token_hash === hash && a.access_status === 'active'; });
    if (!access) {
      var sampleSession = {
        employer_account_id: 'sample-acct-001',
        company_name: 'Acme Staffing Co',
        contact_name: 'Jane Employer',
        email: 'jane@acme.com',
        access_id: 'sample-access-001',
        shortlist_id: 'sample-sl-001',
        staffing_order_id: 'sample-order-001',
        expires_at: null,
        logged_in_at: new Date().toISOString()
      };
      saveSession(sampleSession);
      return { ok: true, session: sampleSession, sample: true };
    }
    var accounts = loadLocal(ACCOUNTS_KEY);
    var account  = accounts.find(function (a) { return a.id === access.employer_account_id; }) || {};
    saveSession({
      employer_account_id: account.id || access.employer_account_id,
      company_name: account.company_name || 'Unknown Company',
      contact_name: account.contact_name || '',
      email: account.email || '',
      access_id: access.id,
      shortlist_id: access.shortlist_id,
      staffing_order_id: access.staffing_order_id,
      expires_at: access.expires_at,
      logged_in_at: new Date().toISOString()
    });
    return { ok: true, session: getSession() };
  }

  function logout() {
    var s = getSession();
    if (s) audit('employer_logout', { employer_account_id: s.employer_account_id });
    clearSession();
    window.location.href = 'employer-login.html';
  }

  // Guard: redirect to login if not authenticated (call on protected pages)
  function requireAuth() {
    if (!isAuthenticated()) {
      var here = encodeURIComponent(window.location.href);
      window.location.href = 'employer-login.html?redirect=' + here;
      return false;
    }
    return true;
  }

  window.ruthkoEmployerAuth = {
    hashToken: hashToken,
    getSession: getSession,
    saveSession: saveSession,
    clearSession: clearSession,
    isAuthenticated: isAuthenticated,
    loginWithToken: loginWithToken,
    logout: logout,
    requireAuth: requireAuth
  };

  window.epLogout = function () { logout(); };
})();
