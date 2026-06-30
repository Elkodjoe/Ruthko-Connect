// Phase 23: extends auth.js with admin_profiles role awareness
(function () {
  var SAMPLE_PROFILE = { role: 'owner', full_name: 'Demo Owner', is_active: true };
  var PROFILE_KEY = 'ruthko_admin_profile_v1';

  async function getAdminProfile() {
    // Sample mode: any logged-in demo session is treated as owner
    if (typeof window.ruthkoIsSampleMode === 'function' && window.ruthkoIsSampleMode()) {
      var demo = null;
      try { demo = localStorage.getItem('ruthko_admin_demo_session'); } catch (_) {}
      if (!demo) return null;
      return Object.assign({}, SAMPLE_PROFILE);
    }

    var client = null;
    try {
      if (typeof window.getRuthkoSupabaseClient === 'function') client = window.getRuthkoSupabaseClient();
    } catch (_) {}
    if (!client) return null;

    try {
      var userRes = await client.auth.getUser();
      var user = userRes.data && userRes.data.user;
      if (!user) return null;

      var res = await client
        .from('admin_profiles')
        .select('role, full_name, is_active')
        .eq('user_id', user.id)
        .single();

      if (res.error || !res.data) return null;
      try { sessionStorage.setItem(PROFILE_KEY, JSON.stringify(res.data)); } catch (_) {}
      return res.data;
    } catch (_) {
      return null;
    }
  }

  function getCachedProfile() {
    try {
      var p = sessionStorage.getItem(PROFILE_KEY);
      return p ? JSON.parse(p) : null;
    } catch (_) { return null; }
  }

  function clearProfileCache() {
    try { sessionStorage.removeItem(PROFILE_KEY); } catch (_) {}
  }

  async function getCurrentRole() {
    var cached = getCachedProfile();
    if (cached && cached.role) return cached.role;
    var profile = await getAdminProfile();
    return profile ? profile.role : null;
  }

  async function requireRole(allowedRoles) {
    var roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    var profile = await getAdminProfile();
    if (!profile || !profile.is_active) return false;
    return roles.indexOf(profile.role) !== -1;
  }

  // Patch ruthkoLogout to also clear profile cache
  var _origLogout = window.ruthkoLogout;
  if (typeof _origLogout === 'function') {
    window.ruthkoLogout = function () {
      clearProfileCache();
      return _origLogout.apply(this, arguments);
    };
  }

  window.ruthkoGetAdminProfile = getAdminProfile;
  window.ruthkoGetCachedProfile = getCachedProfile;
  window.ruthkoClearProfileCache = clearProfileCache;
  window.ruthkoGetCurrentRole = getCurrentRole;
  window.ruthkoRequireRole = requireRole;
})();
