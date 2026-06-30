// Ruthko Connect Phase 22 — Admin Content Sync
// Orchestrates the three-tier content loading and saving strategy:
//
//   LOAD:  Supabase → localStorage (ruthko_content_v1) → data/site-content.json → hardcoded defaults
//   SAVE:  Supabase + localStorage simultaneously; returns save status string
//
// Fires:
//   ruthko:content-synced  { source: 'supabase'|'local'|'json'|'default', content }
//   ruthko:save-status     { status: 'supabase'|'local'|'failed', section, lang }
(function () {
  var LOCAL_KEY   = 'ruthko_content_v1';
  var SOURCE_KEY  = 'ruthko_content_source_v1'; // tracks where last load came from
  var JSON_PATH   = 'data/site-content.json';

  // ── helpers ─────────────────────────────────────────────────────────────

  function getLocal() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null') || null; } catch (_) { return null; }
  }

  function setLocal(content) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(content)); } catch (_) {}
  }

  function mergeDeep(target, source) {
    if (!source || typeof source !== 'object') return target;
    var out = Object.assign({}, target);
    Object.keys(source).forEach(function (k) {
      if (source[k] && typeof source[k] === 'object' && !Array.isArray(source[k])) {
        out[k] = mergeDeep(out[k] && typeof out[k] === 'object' ? out[k] : {}, source[k]);
      } else {
        out[k] = source[k];
      }
    });
    return out;
  }

  function fire(name, detail) {
    try { window.dispatchEvent(new CustomEvent(name, { detail: detail })); } catch (_) {}
  }

  function showSaveStatus(elementId, status) {
    var el = document.getElementById(elementId);
    if (!el) return;
    var msgs = {
      supabase: { text: 'Saved to Supabase ✓', cls: 'text-green-400' },
      local:    { text: 'Saved locally only (Supabase unavailable)', cls: 'text-yellow-400' },
      failed:   { text: 'Failed to save — check console', cls: 'text-red-400' }
    };
    var m = msgs[status] || { text: status, cls: 'text-zinc-400' };
    el.textContent = m.text;
    el.className = 'text-sm font-bold mt-2 ' + m.cls;
    setTimeout(function () { el.textContent = ''; el.className = 'text-sm text-zinc-400 mt-2'; }, 4000);
  }

  // ── LOAD ────────────────────────────────────────────────────────────────

  async function loadContent() {
    var svc = window.ruthkoContentService;

    // Tier 1: Supabase
    if (svc && svc.isAvailable()) {
      var res = await svc.loadAllContent();
      if (res.data && Object.keys(res.data).length) {
        setLocal(res.data);
        localStorage.setItem(SOURCE_KEY, 'supabase');
        fire('ruthko:content-synced', { source: 'supabase', content: res.data });
        return { source: 'supabase', content: res.data };
      }
    }

    // Tier 2: localStorage
    var local = getLocal();
    if (local) {
      localStorage.setItem(SOURCE_KEY, 'local');
      fire('ruthko:content-synced', { source: 'local', content: local });
      return { source: 'local', content: local };
    }

    // Tier 3: data/site-content.json
    try {
      var resp = await fetch(JSON_PATH, { cache: 'no-store' });
      if (resp.ok) {
        var json = await resp.json();
        setLocal(json);
        localStorage.setItem(SOURCE_KEY, 'json');
        fire('ruthko:content-synced', { source: 'json', content: json });
        return { source: 'json', content: json };
      }
    } catch (_) {}

    // Tier 4: hardcoded defaults (admin-data.js owns these)
    localStorage.setItem(SOURCE_KEY, 'default');
    fire('ruthko:content-synced', { source: 'default', content: null });
    return { source: 'default', content: null };
  }

  // ── SAVE ────────────────────────────────────────────────────────────────

  // Save a single section+language pair.
  // Returns 'supabase' | 'local' | 'failed'
  async function saveSection(sectionKey, lang, contentJson, opts) {
    opts = opts || {};
    var statusElId = opts.statusElementId || null;
    var updatedBy  = opts.updatedBy || null;
    var svc = window.ruthkoContentService;

    // Always update localStorage first (optimistic)
    var local = getLocal() || {};
    if (!local[sectionKey]) local[sectionKey] = {};
    local[sectionKey][lang] = contentJson;
    setLocal(local);

    // Also tell admin-data.js about the change so DOM updates
    if (typeof window.ruthkoSaveContent === 'function') {
      var partial = {};
      partial[sectionKey] = {};
      partial[sectionKey][lang] = contentJson;
      window.ruthkoSaveContent(partial);
    }

    var status = 'local';

    // Try Supabase
    if (svc && svc.isAvailable()) {
      var res = await svc.upsertSection(sectionKey, lang, contentJson, updatedBy);
      status = res.ok ? 'supabase' : 'local';
      if (!res.ok) {
        console.warn('[Phase 22] Supabase upsert failed for', sectionKey, lang, ':', res.error);
      }
    }

    if (statusElId) showSaveStatus(statusElId, status);
    fire('ruthko:save-status', { status: status, section: sectionKey, lang: lang });
    return status;
  }

  // Save the entire content object (all sections, all languages).
  async function saveAllContent(contentObj, opts) {
    opts = opts || {};
    var statusElId = opts.statusElementId || null;
    var updatedBy  = opts.updatedBy || null;
    var svc = window.ruthkoContentService;

    setLocal(contentObj);
    if (typeof window.ruthkoSaveContent === 'function') window.ruthkoSaveContent(contentObj);

    var status = 'local';
    if (svc && svc.isAvailable()) {
      var res = await svc.upsertAllContent(contentObj, updatedBy);
      status = res.ok ? 'supabase' : 'local';
      if (!res.ok) console.warn('[Phase 22] Supabase bulk upsert failed:', res.error);
    }

    if (statusElId) showSaveStatus(statusElId, status);
    fire('ruthko:save-status', { status: status, section: 'all', lang: 'all' });
    return status;
  }

  // ── ADMIN UI helpers ─────────────────────────────────────────────────────

  // Attach enhanced save behavior to a button.
  // opts: { sectionKey, lang, getContent: fn→object, statusElementId, updatedBy }
  function bindSaveButton(buttonId, opts) {
    var btn = document.getElementById(buttonId);
    if (!btn) return;
    btn.addEventListener('click', async function () {
      btn.disabled = true;
      var content = opts.getContent ? opts.getContent() : {};
      var status = await saveSection(opts.sectionKey, opts.lang || 'en', content, opts);
      btn.disabled = false;
    });
  }

  // Show source indicator in the admin UI (where content was last loaded from)
  function showSourceBadge(elementId) {
    var el = document.getElementById(elementId);
    if (!el) return;
    var source = localStorage.getItem(SOURCE_KEY) || 'unknown';
    var labels = {
      supabase: { text: 'Live: Supabase', cls: 'text-green-400' },
      local:    { text: 'Cache: localStorage', cls: 'text-yellow-400' },
      json:     { text: 'Default: site-content.json', cls: 'text-blue-400' },
      default:  { text: 'Default: hardcoded', cls: 'text-zinc-500' },
      unknown:  { text: 'Source unknown', cls: 'text-zinc-500' }
    };
    var m = labels[source] || labels.unknown;
    el.textContent = m.text;
    el.className = el.className.replace(/text-\w+-\d+/g, '') + ' ' + m.cls;
  }

  // ── init ─────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', async function () {
    // Only run the full Supabase load on admin pages and public pages
    // that have loaded supabase-content-service.js.
    if (typeof window.ruthkoContentService !== 'undefined') {
      var result = await loadContent();
      // If Supabase returned fresh content, apply it to DOM via admin-data.js
      if (result.content && typeof window.ruthkoApplyContent === 'function') {
        // Merge into admin-data's internal store then apply
        if (typeof window.ruthkoSaveContent === 'function') {
          window.ruthkoSaveContent(result.content);
        }
        window.ruthkoApplyContent();
      }
    }
  });

  // ── Public API ────────────────────────────────────────────────────────────

  window.ruthkoContentSync = {
    load:            loadContent,
    saveSection:     saveSection,
    saveAllContent:  saveAllContent,
    bindSaveButton:  bindSaveButton,
    showSourceBadge: showSourceBadge,
    showSaveStatus:  showSaveStatus
  };
})();
