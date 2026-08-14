// Phase 25: Admin media library — CRUD for media_assets table
(function () {
  var LOCAL_KEY = 'ruthko_media_assets_v1';
  var CATEGORIES = ['logo','banner','event flyer','sponsor logo','partner logo','team photo','job document','report','social graphic','general'];

  function getClient() {
    try { return typeof window.getRuthkoSupabaseClient === 'function' ? window.getRuthkoSupabaseClient() : null; }
    catch (_) { return null; }
  }

  function isSample() {
    return typeof window.ruthkoIsSampleMode === 'function' && window.ruthkoIsSampleMode();
  }

  async function getAdminMeta() {
    var meta = { userId: null, email: null, role: null };
    try {
      if (isSample()) {
        var demo = JSON.parse(localStorage.getItem('ruthko_admin_demo_session') || 'null');
        if (demo) { meta.email = demo.email || 'demo@ruthko.com'; meta.role = 'owner'; }
        return meta;
      }
      var client = getClient();
      if (client) {
        var r = await client.auth.getUser();
        var u = r.data && r.data.user;
        if (u) { meta.userId = u.id; meta.email = u.email; }
      }
      if (typeof window.ruthkoGetCachedProfile === 'function') {
        var p = window.ruthkoGetCachedProfile();
        if (p) meta.role = p.role;
      }
    } catch (_) {}
    return meta;
  }

  // ── Local store (sample mode + offline cache) ─────────────────────────────

  function getLocalAssets() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch (_) { return []; }
  }

  function saveLocalAsset(asset) {
    try {
      var assets = getLocalAssets();
      var idx = assets.findIndex(function (a) { return a.id === asset.id; });
      if (idx >= 0) assets[idx] = asset; else assets.unshift(asset);
      if (assets.length > 500) assets = assets.slice(0, 500);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(assets));
    } catch (_) {}
    return asset;
  }

  function deleteLocalAsset(id) {
    try {
      var assets = getLocalAssets().filter(function (a) { return a.id !== id; });
      localStorage.setItem(LOCAL_KEY, JSON.stringify(assets));
    } catch (_) {}
  }

  // ── Audit helper ──────────────────────────────────────────────────────────

  function audit(actionType, entityLabel, opts) {
    if (typeof window.ruthkoAuditLog === 'object' && typeof window.ruthkoAuditLog.log === 'function') {
      window.ruthkoAuditLog.log(actionType, Object.assign({ entityType: 'media', entityLabel: entityLabel }, opts || {}));
    }
  }

  // ── Core CRUD ─────────────────────────────────────────────────────────────

  async function loadMedia(opts) {
    opts = opts || {};
    var client = getClient();

    if (!client || isSample()) {
      var local = getLocalAssets();
      if (opts.category) local = local.filter(function (a) { return a.category === opts.category; });
      if (opts.mediaType) local = local.filter(function (a) { return a.media_type === opts.mediaType; });
      if (opts.search) {
        var q = opts.search.toLowerCase();
        local = local.filter(function (a) {
          return (a.title || a.file_name || '').toLowerCase().indexOf(q) !== -1 ||
                 (a.alt_text || '').toLowerCase().indexOf(q) !== -1;
        });
      }
      return { data: local, source: 'local' };
    }

    try {
      var query = client.from('media_assets').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(opts.limit || 500);
      if (opts.category) query = query.eq('category', opts.category);
      if (opts.mediaType) query = query.eq('media_type', opts.mediaType);
      if (opts.search) query = query.ilike('title', '%' + opts.search + '%');
      var res = await query;
      if (res.error) throw res.error;
      return { data: res.data || [], source: 'supabase' };
    } catch (_) {
      return { data: getLocalAssets(), source: 'local' };
    }
  }

  async function insertMediaAsset(assetData) {
    var meta = await getAdminMeta();
    var asset = Object.assign({
      id: 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      uploaded_by: meta.userId,
      uploaded_by_email: meta.email,
    }, assetData);

    saveLocalAsset(asset);

    var client = getClient();
    if (client && meta.userId && !isSample()) {
      try {
        var row = Object.assign({}, assetData, {
          uploaded_by: meta.userId,
          uploaded_by_email: meta.email,
        });
        delete row.id;
        var res = await client.from('media_assets').insert(row).select().single();
        if (!res.error && res.data) {
          deleteLocalAsset(asset.id);
          saveLocalAsset(res.data);
          audit('media_upload', res.data.title || res.data.file_name, { after: { url: res.data.file_url } });
          return { ok: true, data: res.data, source: 'supabase' };
        }
      } catch (_) {}
    }

    audit('media_upload', asset.title || asset.file_name, { after: { url: asset.file_url } });
    return { ok: true, data: asset, source: 'local' };
  }

  async function updateMediaAsset(id, changes) {
    var meta = await getAdminMeta();
    changes.updated_at = new Date().toISOString();

    // Update local cache first
    var assets = getLocalAssets();
    var idx = assets.findIndex(function (a) { return a.id === id; });
    if (idx >= 0) {
      assets[idx] = Object.assign({}, assets[idx], changes);
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(assets)); } catch (_) {}
    }

    var client = getClient();
    if (client && !isSample()) {
      try {
        var res = await client.from('media_assets').update(changes).eq('id', id).select().single();
        if (!res.error) {
          audit('media_update', changes.title || id, { after: changes });
          return { ok: true, data: res.data, source: 'supabase' };
        }
      } catch (_) {}
    }

    audit('media_update', changes.title || id, { after: changes });
    return { ok: true, source: 'local' };
  }

  async function deleteMediaAsset(id, filePath) {
    var meta = await getAdminMeta();
    var role = meta.role || (typeof window.ruthkoGetCachedProfile === 'function' && (window.ruthkoGetCachedProfile() || {}).role);

    if (role && role !== 'owner' && role !== 'admin') {
      return { ok: false, error: 'Only owners and admins can delete media.' };
    }

    // Delete from storage
    if (filePath && typeof window.ruthkoMediaUpload === 'object') {
      await window.ruthkoMediaUpload.delete(filePath);
    }

    deleteLocalAsset(id);

    var client = getClient();
    if (client && !isSample()) {
      try {
        await client.from('media_assets').update({ is_active: false }).eq('id', id);
      } catch (_) {}
    }

    audit('media_delete', id);
    return { ok: true };
  }

  // ── Upload + insert combo ─────────────────────────────────────────────────

  async function uploadAndSave(file, meta, onProgress) {
    meta = meta || {};

    // 1. Upload to storage
    var uploadResult = await window.ruthkoMediaUpload.upload(file, meta.category || 'general', onProgress);
    if (!uploadResult.ok) return { ok: false, error: uploadResult.error };

    // 2. Determine media_type
    var ext = (file.name || '').split('.').pop().toLowerCase();
    var mediaType = 'image';
    if (['pdf','doc','docx'].indexOf(ext) !== -1) mediaType = ext === 'pdf' ? 'pdf' : 'document';

    // 3. Insert DB row
    var asset = {
      file_name: file.name,
      file_path: uploadResult.path,
      file_url:  uploadResult.url,
      bucket_name: 'ruthko-media',
      mime_type: file.type,
      file_size: file.size,
      media_type: mediaType,
      category: meta.category || 'general',
      title: meta.title || file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '),
      alt_text: meta.altText || '',
      description: meta.description || '',
      language: meta.language || 'en',
    };

    return insertMediaAsset(asset);
  }

  window.ruthkoMediaLibrary = {
    load: loadMedia,
    insert: insertMediaAsset,
    update: updateMediaAsset,
    delete: deleteMediaAsset,
    uploadAndSave: uploadAndSave,
    getLocal: getLocalAssets,
    CATEGORIES: CATEGORIES,
  };
})();
