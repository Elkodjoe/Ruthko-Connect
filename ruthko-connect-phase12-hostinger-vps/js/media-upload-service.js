// Phase 25: Supabase Storage upload service
(function () {
  var BUCKET = 'ruthko-media';
  var SAMPLE_KEY = 'ruthko_media_sample_v1';

  var FOLDER_MAP = {
    logo:           'public/logos',
    banner:         'public/banners',
    'event flyer':  'public/events',
    'sponsor logo': 'public/sponsors',
    'partner logo': 'public/partners',
    'team photo':   'public/general',
    'job document': 'public/jobs',
    report:         'public/reports',
    'social graphic': 'public/social',
    general:        'public/general',
  };

  var ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  var ALLOWED_EXT = ['jpg','jpeg','png','webp','gif','svg','pdf','doc','docx'];

  function getClient() {
    try {
      return typeof window.getRuthkoSupabaseClient === 'function' ? window.getRuthkoSupabaseClient() : null;
    } catch (_) { return null; }
  }

  function isSample() {
    return typeof window.ruthkoIsSampleMode === 'function' && window.ruthkoIsSampleMode();
  }

  function validateFile(file) {
    var ext = (file.name || '').split('.').pop().toLowerCase();
    if (ALLOWED_EXT.indexOf(ext) === -1) {
      return 'File type .' + ext + ' is not allowed. Allowed: ' + ALLOWED_EXT.join(', ');
    }
    if (file.size > 20 * 1024 * 1024) {
      return 'File is too large. Maximum size is 20 MB.';
    }
    return null;
  }

  function buildFilePath(file, category) {
    var folder = FOLDER_MAP[category] || 'public/general';
    var ext = (file.name || '').split('.').pop().toLowerCase();
    var safeName = (file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
    var ts = Date.now();
    return folder + '/' + ts + '_' + safeName;
  }

  // Sample mode: convert file to data URL and cache in localStorage
  async function uploadSample(file, category) {
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var dataUrl = e.target.result;
        var path = buildFilePath(file, category);
        var samples = [];
        try { samples = JSON.parse(localStorage.getItem(SAMPLE_KEY) || '[]'); } catch (_) {}
        samples.unshift({ path: path, url: dataUrl, name: file.name, size: file.size, type: file.type });
        if (samples.length > 100) samples = samples.slice(0, 100);
        try { localStorage.setItem(SAMPLE_KEY, JSON.stringify(samples)); } catch (_) {}
        resolve({ ok: true, path: path, url: dataUrl, sampleMode: true });
      };
      reader.onerror = function () { resolve({ ok: false, error: 'Failed to read file.' }); };
      reader.readAsDataURL(file);
    });
  }

  async function uploadToStorage(file, category, onProgress) {
    var err = validateFile(file);
    if (err) return { ok: false, error: err };

    if (isSample()) return uploadSample(file, category);

    var client = getClient();
    if (!client) return { ok: false, error: 'Supabase Storage not configured.' };

    var path = buildFilePath(file, category);

    try {
      // Supabase JS v2 Storage upload
      var res = await client.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

      if (res.error) return { ok: false, error: res.error.message || 'Upload failed.' };

      var urlRes = client.storage.from(BUCKET).getPublicUrl(path);
      var publicUrl = urlRes.data && urlRes.data.publicUrl;

      return { ok: true, path: path, url: publicUrl };
    } catch (e) {
      return { ok: false, error: e.message || 'Upload failed.' };
    }
  }

  async function deleteFromStorage(filePath) {
    if (isSample()) {
      var samples = [];
      try { samples = JSON.parse(localStorage.getItem(SAMPLE_KEY) || '[]'); } catch (_) {}
      samples = samples.filter(function (s) { return s.path !== filePath; });
      try { localStorage.setItem(SAMPLE_KEY, JSON.stringify(samples)); } catch (_) {}
      return { ok: true };
    }

    var client = getClient();
    if (!client) return { ok: false, error: 'Supabase not configured.' };

    try {
      var res = await client.storage.from(BUCKET).remove([filePath]);
      if (res.error) return { ok: false, error: res.error.message };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Delete failed.' };
    }
  }

  function getPublicUrl(filePath) {
    var client = getClient();
    if (!client) return null;
    try {
      var res = client.storage.from(BUCKET).getPublicUrl(filePath);
      return res.data && res.data.publicUrl;
    } catch (_) { return null; }
  }

  window.ruthkoMediaUpload = {
    upload: uploadToStorage,
    delete: deleteFromStorage,
    getPublicUrl: getPublicUrl,
    validate: validateFile,
    BUCKET: BUCKET,
    ALLOWED_EXT: ALLOWED_EXT,
    FOLDER_MAP: FOLDER_MAP,
  };
})();
