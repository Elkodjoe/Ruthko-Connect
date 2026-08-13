// Phase 23: role permission map and UI application
(function () {
  var ROLE_ORDER = ['owner', 'admin', 'editor', 'viewer'];

  var PERMISSIONS = {
    saveContent:     ['owner', 'admin', 'editor'],
    editEvents:      ['owner', 'admin', 'editor'],
    editJobs:        ['owner', 'admin', 'editor'],
    editPartners:    ['owner', 'admin', 'editor'],
    editSponsors:    ['owner', 'admin', 'editor'],
    manageCampaigns: ['owner', 'admin', 'editor'],
    viewCRM:         ['owner', 'admin'],
    editCRM:         ['owner', 'admin'],
    manageTasks:     ['owner', 'admin'],
    manageAI:        ['owner', 'admin'],
    viewReports:     ['owner', 'admin', 'viewer'],
    manageSettings:  ['owner'],
    manageStaff:     ['owner'],
    manageRoles:     ['owner'],
  };

  var ROLE_COLORS = {
    owner:  'bg-yellow-500 text-black',
    admin:  'bg-blue-500 text-white',
    editor: 'bg-green-500 text-white',
    viewer: 'bg-zinc-500 text-white',
  };

  function canDo(action, role) {
    if (!role) return false;
    var allowed = PERMISSIONS[action] || [];
    return allowed.indexOf(role) !== -1;
  }

  function applyRoleUI(role) {
    // [data-requires-role="owner,admin"] — hide if role not in list
    document.querySelectorAll('[data-requires-role]').forEach(function (el) {
      var required = (el.dataset.requiresRole || '').split(',').map(function (r) { return r.trim(); });
      if (required.length && required[0] && required.indexOf(role) === -1) {
        el.style.display = 'none';
      }
    });

    // [data-requires-permission="saveContent"] — hide if canDo is false
    document.querySelectorAll('[data-requires-permission]').forEach(function (el) {
      if (!canDo(el.dataset.requiresPermission, role)) {
        el.style.display = 'none';
      }
    });

    // [data-permission-disable="saveContent"] — disable button/input if canDo is false
    document.querySelectorAll('[data-permission-disable]').forEach(function (el) {
      if (!canDo(el.dataset.permissionDisable, role)) {
        el.disabled = true;
        el.title = 'Your role does not have permission for this action';
        el.classList.add('opacity-50', 'cursor-not-allowed');
      }
    });

    // Update #ruthkoRoleBadge if present
    var badge = document.getElementById('ruthkoRoleBadge');
    if (badge) {
      badge.textContent = role ? role.charAt(0).toUpperCase() + role.slice(1) : '';
      badge.className = 'px-2 py-0.5 rounded-full text-xs font-bold ' + (ROLE_COLORS[role] || 'bg-zinc-700 text-zinc-300');
      badge.style.display = role ? '' : 'none';
    }

    // Disable Phase 22 save buttons for viewers
    if (role === 'viewer') {
      ['saveHeroBtn', 'saveAnnouncementBtn', 'saveSettingsBtn'].forEach(function (id) {
        var btn = document.getElementById(id);
        if (btn) {
          btn.disabled = true;
          btn.title = 'Viewer role cannot save content';
          btn.classList.add('opacity-50', 'cursor-not-allowed');
        }
      });
    }
  }

  window.RUTHKO_PERMISSIONS = PERMISSIONS;
  window.RUTHKO_ROLE_ORDER = ROLE_ORDER;
  window.ruthkoCanDo = canDo;
  window.ruthkoApplyRoleUI = applyRoleUI;
})();
