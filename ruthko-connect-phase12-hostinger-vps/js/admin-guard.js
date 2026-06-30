// Phase 23: role-aware guard — runs after auth-guard.js confirms login
(function () {
  function showDenyOverlay(message) {
    document.documentElement.classList.remove('auth-checking');
    var overlay = document.createElement('div');
    overlay.id = 'ruthkoRoleDenyOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#0a0a0a;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML =
      '<div style="text-align:center;max-width:420px;padding:2rem;">' +
        '<div style="font-size:3rem;margin-bottom:1rem;">&#128274;</div>' +
        '<h2 style="color:#facc15;font-size:1.5rem;font-weight:800;margin-bottom:0.5rem;">Access Restricted</h2>' +
        '<p style="color:#a1a1aa;margin-bottom:1.5rem;">' + message + '</p>' +
        '<a href="admin.html" style="background:linear-gradient(135deg,#facc15,#f59e0b);color:#000;padding:0.6rem 1.5rem;border-radius:0.75rem;font-weight:700;text-decoration:none;display:inline-block;">Go to Dashboard</a>' +
        '<br/><br/>' +
        '<a href="#" onclick="(window.ruthkoLogout || function(){window.location.href=\'admin-login.html\'})(); return false;" style="color:#71717a;font-size:0.875rem;">Sign out</a>' +
      '</div>';
    document.body.appendChild(overlay);
  }

  async function runRoleGuard() {
    if (typeof window.ruthkoGetAdminProfile !== 'function') return;

    var profile = await window.ruthkoGetAdminProfile();

    if (!profile) {
      // Logged in via auth.js but no admin_profiles row — account pending
      var isLoggedIn = false;
      try {
        if (typeof window.ruthkoIsSampleMode === 'function' && window.ruthkoIsSampleMode()) {
          isLoggedIn = !!localStorage.getItem('ruthko_admin_demo_session');
        } else {
          var client = typeof window.getRuthkoSupabaseClient === 'function' ? window.getRuthkoSupabaseClient() : null;
          if (client) {
            var userRes = await client.auth.getUser();
            isLoggedIn = !!(userRes.data && userRes.data.user);
          }
        }
      } catch (_) {}

      if (isLoggedIn) {
        showDenyOverlay('Your account is pending approval. An owner must activate your profile before you can access admin pages.');
      }
      return;
    }

    if (!profile.is_active) {
      showDenyOverlay('Your account has not been activated yet. Please contact an owner to get access.');
      return;
    }

    // Check page-level role restriction from <body data-page-role="owner,admin">
    var pageRoles = (document.body.dataset.pageRole || '').split(',').map(function (r) { return r.trim(); }).filter(Boolean);
    if (pageRoles.length && pageRoles.indexOf(profile.role) === -1) {
      showDenyOverlay('This page requires one of: ' + pageRoles.join(', ') + '. Your role is: ' + profile.role + '.');
      return;
    }

    // Apply role-based UI
    if (typeof window.ruthkoApplyRoleUI === 'function') {
      window.ruthkoApplyRoleUI(profile.role);
    }

    // Set display name in sidebar if element exists
    var nameEl = document.getElementById('ruthkoAdminUserName');
    if (nameEl && profile.full_name) {
      nameEl.textContent = profile.full_name;
    }

    document.dispatchEvent(new CustomEvent('ruthko:role-ready', { detail: { role: profile.role, profile: profile } }));
  }

  document.addEventListener('DOMContentLoaded', runRoleGuard);
})();
