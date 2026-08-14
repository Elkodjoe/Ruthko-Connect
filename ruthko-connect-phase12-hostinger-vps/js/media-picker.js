// Phase 25: Reusable media picker modal
(function () {
  var CONTENT_KEY = 'ruthko_content_v1';
  var _callback = null;
  var _opts = {};

  // ── Modal HTML ────────────────────────────────────────────────────────────

  function buildModalHtml() {
    return '<div id="ruthkoMediaPickerOverlay" style="display:none;position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.85);backdrop-filter:blur(4px);" onclick="if(event.target===this)ruthkoMediaPicker.close()">' +
      '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:min(92vw,860px);max-height:90vh;background:#0a0a0a;border:1px solid #27272a;border-radius:1.5rem;display:flex;flex-direction:column;overflow:hidden;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid #27272a;flex-shrink:0;">' +
          '<div>' +
            '<h3 id="ruthkoPickerTitle" style="font-weight:800;font-size:1.1rem;color:#fff;">Select Media</h3>' +
            '<p style="font-size:.75rem;color:#71717a;margin-top:.2rem;">Click an image or file to select it</p>' +
          '</div>' +
          '<div style="display:flex;gap:.5rem;align-items:center;">' +
            '<a href="media-library.html" target="_blank" style="font-size:.75rem;color:#facc15;text-decoration:none;font-weight:700;">Open Library ↗</a>' +
            '<button onclick="ruthkoMediaPicker.close()" style="background:#27272a;border:none;color:#fff;padding:.4rem .8rem;border-radius:.5rem;cursor:pointer;font-weight:700;">✕</button>' +
          '</div>' +
        '</div>' +
        '<div style="padding:.75rem 1.25rem;border-bottom:1px solid #18181b;flex-shrink:0;display:flex;gap:.5rem;flex-wrap:wrap;">' +
          '<input id="ruthkoPickerSearch" type="text" placeholder="Search…" oninput="ruthkoMediaPicker.filter()" style="flex:1;min-width:140px;background:#000;border:1px solid #27272a;color:#fff;padding:.5rem .75rem;border-radius:.5rem;font-size:.85rem;" />' +
          '<select id="ruthkoPickerCategory" onchange="ruthkoMediaPicker.filter()" style="background:#000;border:1px solid #27272a;color:#fff;padding:.5rem .75rem;border-radius:.5rem;font-size:.85rem;">' +
            '<option value="">All categories</option>' +
            '<option>logo</option><option>banner</option><option>event flyer</option>' +
            '<option>sponsor logo</option><option>partner logo</option><option>team photo</option>' +
            '<option>job document</option><option>report</option><option>social graphic</option><option>general</option>' +
          '</select>' +
          '<select id="ruthkoPickerType" onchange="ruthkoMediaPicker.filter()" style="background:#000;border:1px solid #27272a;color:#fff;padding:.5rem .75rem;border-radius:.5rem;font-size:.85rem;">' +
            '<option value="">All types</option><option value="image">Images</option><option value="pdf">PDF</option><option value="document">Documents</option>' +
          '</select>' +
        '</div>' +
        '<div id="ruthkoPickerGrid" style="flex:1;overflow-y:auto;padding:1rem;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:.75rem;">' +
          '<p style="color:#71717a;font-size:.875rem;grid-column:1/-1;text-align:center;padding:3rem 0;">Loading media…</p>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function initModal() {
    if (document.getElementById('ruthkoMediaPickerOverlay')) return;
    var div = document.createElement('div');
    div.innerHTML = buildModalHtml();
    document.body.appendChild(div.firstChild);
  }

  // ── Media grid ────────────────────────────────────────────────────────────

  var _allAssets = [];
  var _filtered = [];

  function isImage(asset) {
    return asset.media_type === 'image' || (asset.mime_type || '').startsWith('image/');
  }

  function cardHtml(asset) {
    var thumb = isImage(asset)
      ? '<img src="' + esc(asset.file_url) + '" alt="' + esc(asset.alt_text || asset.title || '') + '" style="width:100%;height:100px;object-fit:cover;border-radius:.5rem;" onerror="this.src=\'images/logo.png\'" />'
      : '<div style="width:100%;height:100px;background:#18181b;border-radius:.5rem;display:flex;align-items:center;justify-content:center;font-size:2rem;">' + (asset.media_type === 'pdf' ? '📄' : '📎') + '</div>';
    return '<div onclick="ruthkoMediaPicker.select(\'' + esc(asset.id) + '\')" style="cursor:pointer;background:#111;border:1px solid #27272a;border-radius:.75rem;padding:.5rem;transition:border-color .2s;" onmouseenter="this.style.borderColor=\'#facc15\'" onmouseleave="this.style.borderColor=\'#27272a\'">' +
      thumb +
      '<p style="font-size:.7rem;color:#d4d4d8;margin-top:.4rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;">' + esc(asset.title || asset.file_name || 'Untitled') + '</p>' +
      '<p style="font-size:.65rem;color:#71717a;">' + esc(asset.category || '') + '</p>' +
    '</div>';
  }

  function renderGrid(assets) {
    var grid = document.getElementById('ruthkoPickerGrid');
    if (!grid) return;
    if (!assets.length) {
      grid.innerHTML = '<p style="color:#71717a;font-size:.875rem;grid-column:1/-1;text-align:center;padding:3rem 0;">No media found. <a href="media-library.html" target="_blank" style="color:#facc15;">Upload from the Media Library.</a></p>';
      return;
    }
    grid.innerHTML = assets.map(cardHtml).join('');
  }

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Phase 21/22 content layer integration ─────────────────────────────────

  function saveToContentLayer(slotKey, url) {
    if (!slotKey) return;
    try {
      var stored = JSON.parse(localStorage.getItem(CONTENT_KEY) || '{}');
      var parts = slotKey.split('.');
      var obj = stored;
      for (var i = 0; i < parts.length - 1; i++) {
        if (!obj[parts[i]]) obj[parts[i]] = {};
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = url;
      localStorage.setItem(CONTENT_KEY, JSON.stringify(stored));
    } catch (_) {}
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async function open(opts) {
    _opts = opts || {};
    _callback = _opts.onSelect || null;
    initModal();

    var overlay = document.getElementById('ruthkoMediaPickerOverlay');
    var title = document.getElementById('ruthkoPickerTitle');
    if (overlay) overlay.style.display = 'block';
    if (title) title.textContent = _opts.title || 'Select Media';

    // Load media
    if (typeof window.ruthkoMediaLibrary === 'object') {
      var result = await window.ruthkoMediaLibrary.load({ limit: 200 });
      _allAssets = result.data || [];
    } else {
      _allAssets = [];
    }
    _filtered = _allAssets.slice();
    renderGrid(_filtered);
  }

  function close() {
    var overlay = document.getElementById('ruthkoMediaPickerOverlay');
    if (overlay) overlay.style.display = 'none';
    _callback = null;
  }

  function filter() {
    var search = (document.getElementById('ruthkoPickerSearch') || {}).value || '';
    var category = (document.getElementById('ruthkoPickerCategory') || {}).value || '';
    var type = (document.getElementById('ruthkoPickerType') || {}).value || '';
    search = search.toLowerCase();

    _filtered = _allAssets.filter(function (a) {
      if (category && a.category !== category) return false;
      if (type && a.media_type !== type) return false;
      if (search) {
        var hay = [(a.title || ''), (a.file_name || ''), (a.alt_text || '')].join(' ').toLowerCase();
        if (hay.indexOf(search) === -1) return false;
      }
      if (_opts.filter && typeof _opts.filter === 'function') return _opts.filter(a);
      return true;
    });
    renderGrid(_filtered);
  }

  function select(assetId) {
    var asset = _allAssets.find(function (a) { return String(a.id) === String(assetId); });
    if (!asset) return;

    // Save to content layer if slot specified
    if (_opts.contentSlot) saveToContentLayer(_opts.contentSlot, asset.file_url);

    // Audit log
    if (typeof window.ruthkoAuditLog === 'object' && typeof window.ruthkoAuditLog.log === 'function') {
      window.ruthkoAuditLog.log('media_select', {
        entityType: 'media',
        entityLabel: asset.title || asset.file_name,
        after: { url: asset.file_url, slot: _opts.contentSlot || null },
      });
    }

    if (typeof _callback === 'function') _callback(asset);
    close();
  }

  window.ruthkoMediaPicker = { open: open, close: close, filter: filter, select: select };

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModal);
  } else {
    initModal();
  }
})();
