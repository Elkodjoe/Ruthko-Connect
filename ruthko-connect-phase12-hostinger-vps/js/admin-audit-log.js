// Phase 24: Admin Audit Log — core logger
(function () {
  var LOCAL_KEY = 'ruthko_audit_log_v1';
  var MAX_LOCAL = 200;

  // ── Helpers ──────────────────────────────────────────────────────────────

  function getClient() {
    try {
      return typeof window.getRuthkoSupabaseClient === 'function' ? window.getRuthkoSupabaseClient() : null;
    } catch (_) { return null; }
  }

  async function getCurrentAdminMeta() {
    var meta = { userId: null, email: null, role: null };
    try {
      // Phase 23 cache
      if (typeof window.ruthkoGetCachedProfile === 'function') {
        var profile = window.ruthkoGetCachedProfile();
        if (profile) {
          meta.role = profile.role || null;
          meta.email = profile.email || null;
        }
      }
      // Sample mode
      if (typeof window.ruthkoIsSampleMode === 'function' && window.ruthkoIsSampleMode()) {
        var demo = null;
        try { demo = JSON.parse(localStorage.getItem('ruthko_admin_demo_session') || 'null'); } catch (_) {}
        if (demo) {
          meta.email = demo.email || 'demo@ruthko.com';
          meta.role = meta.role || 'owner';
        }
        return meta;
      }
      var client = getClient();
      if (client) {
        var userRes = await client.auth.getUser();
        var user = userRes.data && userRes.data.user;
        if (user) {
          meta.userId = user.id;
          meta.email = user.email || meta.email;
        }
      }
    } catch (_) {}
    return meta;
  }

  // ── Local fallback ────────────────────────────────────────────────────────

  function getLocalLogs() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch (_) { return []; }
  }

  function saveLocalLog(entry) {
    try {
      var logs = getLocalLogs();
      logs.unshift(entry);
      if (logs.length > MAX_LOCAL) logs = logs.slice(0, MAX_LOCAL);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(logs));
    } catch (_) {}
  }

  // ── Core log function ─────────────────────────────────────────────────────

  async function logAudit(actionType, opts) {
    opts = opts || {};
    var meta = await getCurrentAdminMeta();
    var entry = {
      id: 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      admin_user_id: meta.userId,
      admin_email: opts.email || meta.email,
      admin_role: opts.role || meta.role,
      action_type: actionType,
      entity_type: opts.entityType || null,
      entity_id: opts.entityId || null,
      entity_label: opts.entityLabel || null,
      before_json: opts.before || null,
      after_json: opts.after || null,
      ip_address: null,
      user_agent: navigator.userAgent,
      created_at: new Date().toISOString(),
    };

    // Always save locally first
    saveLocalLog(entry);

    // Try Supabase
    var client = getClient();
    if (client && meta.userId) {
      try {
        var row = {
          admin_user_id: entry.admin_user_id,
          admin_email: entry.admin_email,
          admin_role: entry.admin_role,
          action_type: entry.action_type,
          entity_type: entry.entity_type,
          entity_id: entry.entity_id,
          entity_label: entry.entity_label,
          before_json: entry.before_json,
          after_json: entry.after_json,
          user_agent: entry.user_agent,
        };
        await client.from('admin_audit_logs').insert(row);
      } catch (_) {}
    }

    document.dispatchEvent(new CustomEvent('ruthko:audit-logged', { detail: entry }));
    return entry;
  }

  // ── Event hooks (Phase 22 integration via events) ─────────────────────────

  // Hook Phase 22 save status events
  document.addEventListener('ruthko:save-status', function (e) {
    var d = e.detail || {};
    logAudit('content_save', {
      entityType: 'site_content',
      entityLabel: d.section || d.key || 'content',
      after: d.status === 'supabase' ? { synced: true } : { local: true },
    });
  });

  // Hook Phase 22 content synced events
  document.addEventListener('ruthko:content-synced', function (e) {
    var d = e.detail || {};
    if (d.source === 'supabase') {
      logAudit('content_save', {
        entityType: 'site_content',
        entityLabel: 'full_sync',
        after: { source: d.source },
      });
    }
  });

  // Hook Phase 23 role-ready events (login detected when role becomes available)
  document.addEventListener('ruthko:role-ready', function (e) {
    var d = e.detail || {};
    logAudit('admin_login', {
      entityType: 'session',
      role: d.role,
      after: { role: d.role },
    });
  });

  // ── Monkey-patch login / logout ───────────────────────────────────────────

  var _patchAttempts = 0;
  function patchAuthFunctions() {
    if (typeof window.ruthkoLogout === 'function' && !window.ruthkoLogout._auditPatched) {
      var _orig = window.ruthkoLogout;
      window.ruthkoLogout = function () {
        logAudit('admin_logout', { entityType: 'session' });
        return _orig.apply(this, arguments);
      };
      window.ruthkoLogout._auditPatched = true;
    }
    _patchAttempts++;
    if (_patchAttempts < 20 && typeof window.ruthkoLogout !== 'function') {
      setTimeout(patchAuthFunctions, 150);
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  function getLocalAuditLogs(limit, filterFn) {
    var logs = getLocalLogs();
    if (typeof filterFn === 'function') logs = logs.filter(filterFn);
    return limit ? logs.slice(0, limit) : logs;
  }

  async function getSupabaseLogs(opts) {
    opts = opts || {};
    var client = getClient();
    if (!client) return { data: [], source: 'local', logs: getLocalAuditLogs(opts.limit) };

    try {
      var q = client
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(opts.limit || 200);

      if (opts.actionType) q = q.eq('action_type', opts.actionType);
      if (opts.adminEmail) q = q.ilike('admin_email', '%' + opts.adminEmail + '%');
      if (opts.entityType) q = q.eq('entity_type', opts.entityType);
      if (opts.role) q = q.eq('admin_role', opts.role);
      if (opts.dateFrom) q = q.gte('created_at', opts.dateFrom);
      if (opts.dateTo) q = q.lte('created_at', opts.dateTo);

      var res = await q;
      if (res.error) throw res.error;
      return { data: res.data || [], source: 'supabase' };
    } catch (_) {
      return { data: getLocalAuditLogs(opts.limit), source: 'local' };
    }
  }

  function exportAuditCsv(logs) {
    var cols = ['created_at', 'admin_email', 'admin_role', 'action_type', 'entity_type', 'entity_label', 'entity_id'];
    var rows = [cols.join(',')];
    (logs || []).forEach(function (r) {
      rows.push(cols.map(function (c) {
        var v = r[c] == null ? '' : String(r[c]);
        return '"' + v.replace(/"/g, '""') + '"';
      }).join(','));
    });
    var blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ruthko-audit-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
  }

  window.ruthkoAuditLog = {
    log: logAudit,
    getLocal: getLocalAuditLogs,
    getLogs: getSupabaseLogs,
    exportCsv: exportAuditCsv,
  };

  // Patch auth after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchAuthFunctions);
  } else {
    setTimeout(patchAuthFunctions, 100);
  }
})();
