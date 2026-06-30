// Ruthko Connect Phase 22 — Supabase Content Service
// Low-level CRUD for the site_content table.
// All methods return { data, error } — never throw.
// Higher-level orchestration is in admin-content-sync.js.
(function () {
  var TABLE = 'site_content';

  // Returns a ready Supabase client or null if not configured.
  function client() {
    if (typeof window.getRuthkoSupabaseClient === 'function') {
      return window.getRuthkoSupabaseClient();
    }
    return null;
  }

  // ── READ ────────────────────────────────────────────────────────────────

  // Load one section in one language.
  // Returns { data: { content_json, updated_at }, error }
  async function loadSection(sectionKey, lang) {
    var sb = client();
    if (!sb) return { data: null, error: 'no-client' };
    try {
      var res = await sb
        .from(TABLE)
        .select('content_json, updated_at')
        .eq('section_key', sectionKey)
        .eq('language', lang || 'en')
        .eq('is_active', true)
        .maybeSingle();
      return { data: res.data || null, error: res.error || null };
    } catch (e) {
      return { data: null, error: e.message || 'fetch-error' };
    }
  }

  // Load ALL active rows and return as a nested object:
  // { hero: { en: {...}, fr: {...} }, announcement: { en: {...} }, ... }
  async function loadAllContent() {
    var sb = client();
    if (!sb) return { data: null, error: 'no-client' };
    try {
      var res = await sb
        .from(TABLE)
        .select('section_key, language, content_json, updated_at')
        .eq('is_active', true)
        .order('section_key')
        .order('language');
      if (res.error) return { data: null, error: res.error };
      var out = {};
      (res.data || []).forEach(function (row) {
        if (!out[row.section_key]) out[row.section_key] = {};
        out[row.section_key][row.language] = row.content_json;
      });
      return { data: out, error: null };
    } catch (e) {
      return { data: null, error: e.message || 'fetch-error' };
    }
  }

  // ── WRITE ───────────────────────────────────────────────────────────────

  // Upsert one section in one language.
  // updatedBy is optional (admin email / identifier).
  async function upsertSection(sectionKey, lang, contentJson, updatedBy) {
    var sb = client();
    if (!sb) return { ok: false, error: 'no-client' };
    try {
      var res = await sb
        .from(TABLE)
        .upsert(
          {
            section_key:  sectionKey,
            language:     lang || 'en',
            content_json: contentJson,
            is_active:    true,
            updated_by:   updatedBy || null
          },
          { onConflict: 'section_key,language' }
        );
      if (res.error) return { ok: false, error: res.error.message || res.error };
      return { ok: true, error: null };
    } catch (e) {
      return { ok: false, error: e.message || 'upsert-error' };
    }
  }

  // Upsert multiple sections at once from a content object.
  // contentObj shape: { hero: { en: {...}, fr: {...} }, ... }
  // updatedBy is optional.
  async function upsertAllContent(contentObj, updatedBy) {
    var sb = client();
    if (!sb) return { ok: false, error: 'no-client' };
    var rows = [];
    Object.keys(contentObj || {}).forEach(function (sectionKey) {
      var langMap = contentObj[sectionKey];
      if (!langMap || typeof langMap !== 'object') return;
      Object.keys(langMap).forEach(function (lang) {
        rows.push({
          section_key:  sectionKey,
          language:     lang,
          content_json: langMap[lang],
          is_active:    true,
          updated_by:   updatedBy || null
        });
      });
    });
    if (!rows.length) return { ok: true, error: null };
    try {
      var res = await sb
        .from(TABLE)
        .upsert(rows, { onConflict: 'section_key,language' });
      if (res.error) return { ok: false, error: res.error.message || res.error };
      return { ok: true, error: null };
    } catch (e) {
      return { ok: false, error: e.message || 'upsert-error' };
    }
  }

  // Deactivate a section (soft-delete — does not remove from DB).
  async function deactivateSection(sectionKey, lang) {
    var sb = client();
    if (!sb) return { ok: false, error: 'no-client' };
    try {
      var res = await sb
        .from(TABLE)
        .update({ is_active: false })
        .eq('section_key', sectionKey)
        .eq('language', lang || 'en');
      if (res.error) return { ok: false, error: res.error.message || res.error };
      return { ok: true, error: null };
    } catch (e) {
      return { ok: false, error: e.message || 'update-error' };
    }
  }

  // ── PUBLIC API ──────────────────────────────────────────────────────────

  window.ruthkoContentService = {
    isAvailable:      function () { return !!client(); },
    loadSection:      loadSection,
    loadAllContent:   loadAllContent,
    upsertSection:    upsertSection,
    upsertAllContent: upsertAllContent,
    deactivateSection: deactivateSection
  };
})();
