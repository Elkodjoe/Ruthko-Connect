// Phase 24: Admin Change History — version save, load, and restore
(function () {
  var LOCAL_KEY = 'ruthko_change_history_v1';

  function getClient() {
    try {
      return typeof window.getRuthkoSupabaseClient === 'function' ? window.getRuthkoSupabaseClient() : null;
    } catch (_) { return null; }
  }

  // ── Local version store ───────────────────────────────────────────────────

  function localKey(entityType, entityKey, lang) {
    return entityType + '__' + entityKey + '__' + (lang || 'en');
  }

  function getLocalVersions(entityType, entityKey, lang) {
    try {
      var store = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
      return store[localKey(entityType, entityKey, lang)] || [];
    } catch (_) { return []; }
  }

  function saveLocalVersion(entityType, entityKey, lang, contentJson, meta) {
    try {
      var store = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
      var key = localKey(entityType, entityKey, lang);
      var versions = store[key] || [];
      var versionNumber = (versions.length ? versions[0].version_number : 0) + 1;
      versions.unshift({
        id: 'local_' + Date.now(),
        entity_type: entityType,
        entity_key: entityKey,
        language: lang || 'en',
        version_number: versionNumber,
        content_json: contentJson,
        changed_by: (meta && meta.userId) || null,
        changed_by_email: (meta && meta.email) || null,
        change_note: (meta && meta.note) || null,
        created_at: new Date().toISOString(),
      });
      if (versions.length > 50) versions = versions.slice(0, 50);
      store[key] = versions;
      localStorage.setItem(LOCAL_KEY, JSON.stringify(store));
      return versions[0];
    } catch (_) { return null; }
  }

  // ── Supabase version store ────────────────────────────────────────────────

  async function getNextVersionNumber(client, entityType, entityKey, lang) {
    try {
      var res = await client
        .from('admin_change_versions')
        .select('version_number')
        .eq('entity_type', entityType)
        .eq('entity_key', entityKey)
        .eq('language', lang || 'en')
        .order('version_number', { ascending: false })
        .limit(1);
      if (res.error || !res.data || !res.data.length) return 1;
      return (res.data[0].version_number || 0) + 1;
    } catch (_) { return 1; }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async function saveVersion(entityType, entityKey, lang, contentJson, opts) {
    opts = opts || {};
    var meta = { userId: null, email: null, note: opts.note || null };
    try {
      if (typeof window.ruthkoGetCachedProfile === 'function') {
        var p = window.ruthkoGetCachedProfile();
        if (p) meta.email = p.email || null;
      }
      if (typeof window.ruthkoIsSampleMode === 'function' && window.ruthkoIsSampleMode()) {
        var demo = JSON.parse(localStorage.getItem('ruthko_admin_demo_session') || 'null');
        if (demo) meta.email = demo.email || 'demo@ruthko.com';
      } else {
        var client = getClient();
        if (client) {
          var userRes = await client.auth.getUser();
          var user = userRes.data && userRes.data.user;
          if (user) { meta.userId = user.id; meta.email = user.email; }
        }
      }
    } catch (_) {}

    // Always save locally
    var local = saveLocalVersion(entityType, entityKey, lang, contentJson, meta);

    // Try Supabase
    var client = getClient();
    if (client && meta.userId) {
      try {
        var vnum = await getNextVersionNumber(client, entityType, entityKey, lang);
        await client.from('admin_change_versions').insert({
          entity_type: entityType,
          entity_key: entityKey,
          language: lang || 'en',
          version_number: vnum,
          content_json: contentJson,
          changed_by: meta.userId,
          changed_by_email: meta.email,
          change_note: meta.note,
        });
        // Log to audit
        if (typeof window.ruthkoAuditLog === 'object') {
          window.ruthkoAuditLog.log('content_save', {
            entityType: entityType,
            entityLabel: entityKey + (lang ? ' (' + lang + ')' : ''),
            after: { version: vnum },
          });
        }
        return { ok: true, source: 'supabase', versionNumber: vnum };
      } catch (_) {}
    }

    return { ok: true, source: 'local', version: local };
  }

  async function getVersions(entityType, entityKey, lang) {
    var local = getLocalVersions(entityType, entityKey, lang);
    var client = getClient();
    if (!client) return { data: local, source: 'local' };

    try {
      var res = await client
        .from('admin_change_versions')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_key', entityKey)
        .eq('language', lang || 'en')
        .order('version_number', { ascending: false })
        .limit(50);
      if (res.error) throw res.error;
      return { data: res.data || [], source: 'supabase' };
    } catch (_) {
      return { data: local, source: 'local' };
    }
  }

  async function restoreVersion(versionId, role, opts) {
    // Only owner and admin can restore
    var allowed = ['owner', 'admin'];
    var currentRole = role || (typeof window.ruthkoGetCachedProfile === 'function' && (window.ruthkoGetCachedProfile() || {}).role);
    if (!currentRole || allowed.indexOf(currentRole) === -1) {
      return { ok: false, error: 'Insufficient permissions to restore versions.' };
    }

    var client = getClient();
    if (!client) {
      return { ok: false, error: 'Supabase not connected. Cannot restore in local mode.' };
    }

    try {
      var res = await client
        .from('admin_change_versions')
        .select('*')
        .eq('id', versionId)
        .single();
      if (res.error || !res.data) return { ok: false, error: 'Version not found.' };

      var version = res.data;
      // Save as a new version pointing to the restore
      await saveVersion(
        version.entity_type,
        version.entity_key,
        version.language,
        version.content_json,
        { note: 'Restored from version ' + version.version_number }
      );

      // Log restore to audit
      if (typeof window.ruthkoAuditLog === 'object') {
        window.ruthkoAuditLog.log('content_save', {
          entityType: version.entity_type,
          entityLabel: 'Restored: ' + version.entity_key + ' v' + version.version_number,
          after: version.content_json,
        });
      }

      return { ok: true, version: version };
    } catch (err) {
      return { ok: false, error: err.message || 'Restore failed.' };
    }
  }

  window.ruthkoChangeHistory = {
    saveVersion: saveVersion,
    getVersions: getVersions,
    restoreVersion: restoreVersion,
    getLocalVersions: getLocalVersions,
  };
})();
