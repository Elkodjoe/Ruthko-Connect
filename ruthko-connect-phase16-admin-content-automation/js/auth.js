// Ruthko Connect admin authentication
// Works in sample mode for local testing.
// Switch sampleMode to false in js/supabase-config.js after Supabase is ready.

(function () {
  const DEMO_SESSION_KEY = 'ruthko_admin_demo_session';

  function getConfig() {
    return window.RUTHKO_SUPABASE || {};
  }

  function isSampleMode() {
    const cfg = getConfig();
    const missing = !cfg.url || cfg.url.includes('YOUR-PROJECT') || !cfg.anonKey || cfg.anonKey.includes('YOUR-SUPABASE');
    return cfg.sampleMode || missing || !window.supabase;
  }

  function getClient() {
    if (typeof window.getRuthkoSupabaseClient === 'function') {
      return window.getRuthkoSupabaseClient();
    }
    return null;
  }

  function getRedirectTarget() {
    const params = new URLSearchParams(window.location.search);
    return params.get('redirect') || 'admin.html';
  }

  function setMessage(id, message, isError) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message || '';
    el.className = isError ? 'text-red-400 text-sm font-bold mt-3' : 'text-green-400 text-sm font-bold mt-3';
  }

  window.ruthkoIsSampleMode = isSampleMode;

  window.ruthkoGetCurrentUser = async function () {
    if (isSampleMode()) {
      const raw = localStorage.getItem(DEMO_SESSION_KEY);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch (error) {
        localStorage.removeItem(DEMO_SESSION_KEY);
        return null;
      }
    }

    const client = getClient();
    if (!client) return null;
    const { data, error } = await client.auth.getUser();
    if (error) return null;
    return data.user || null;
  };

  window.ruthkoLogin = async function (event) {
    if (event) event.preventDefault();

    const email = (document.getElementById('email') || {}).value || '';
    const password = (document.getElementById('password') || {}).value || '';
    const button = document.getElementById('loginButton');

    if (button) {
      button.disabled = true;
      button.textContent = 'Signing in...';
    }

    try {
      if (isSampleMode()) {
        if (!email || !password) {
          setMessage('authMessage', 'Enter an email and password.', true);
          return;
        }

        localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({
          email: email,
          role: 'admin',
          sampleMode: true,
          signedInAt: new Date().toISOString()
        }));
        window.location.href = getRedirectTarget();
        return;
      }

      const client = getClient();
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage('authMessage', error.message || 'Login failed.', true);
        return;
      }
      window.location.href = getRedirectTarget();
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Sign In';
      }
    }
  };

  window.ruthkoLogout = async function () {
    if (isSampleMode()) {
      localStorage.removeItem(DEMO_SESSION_KEY);
      window.location.href = 'login.html';
      return;
    }

    const client = getClient();
    if (client) await client.auth.signOut();
    window.location.href = 'login.html';
  };

  window.ruthkoRequireAdmin = async function () {
    const user = await window.ruthkoGetCurrentUser();
    if (!user) {
      const redirect = encodeURIComponent(window.location.pathname.split('/').pop() || 'admin.html');
      window.location.href = 'login.html?redirect=' + redirect;
      return null;
    }

    document.documentElement.classList.remove('auth-checking');
    const label = document.querySelector('[data-admin-email]');
    if (label) label.textContent = user.email || 'Ruthko Admin';
    return user;
  };

  window.ruthkoRedirectIfLoggedIn = async function () {
    const user = await window.ruthkoGetCurrentUser();
    if (user) window.location.href = getRedirectTarget();
  };
})();
