(function () {
  'use strict';

  var allProfiles    = [];
  var selectedIds    = {};
  var currentJobPost = null;

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function fmtDate(d) { if (!d) return '—'; var dt = new Date(d); return isNaN(dt) ? '—' : dt.toLocaleDateString(); }

  function statusBadge(status) {
    var colors = {
      new:'bg-yellow-900 text-yellow-300', screening:'bg-blue-900 text-blue-300',
      qualified:'bg-teal-900 text-teal-300', not_qualified:'bg-red-900 text-red-300',
      active_pool:'bg-green-900 text-green-300', shortlisted:'bg-purple-900 text-purple-300',
      submitted_to_employer:'bg-indigo-900 text-indigo-300', interviewing:'bg-orange-900 text-orange-300',
      hired:'bg-green-900 text-green-400 font-extrabold', inactive:'bg-zinc-800 text-zinc-400',
      archived:'bg-zinc-900 text-zinc-500'
    };
    var cls = colors[status] || 'bg-zinc-800 text-zinc-400';
    return '<span class="px-2 py-0.5 rounded text-xs font-semibold ' + cls + '">' + esc(status) + '</span>';
  }

  function matchBadge(score, label) {
    if (!score && score !== 0) return '';
    var svc = window.ruthkoJobMatchScore;
    var cls = svc ? svc.getLabelClass(score) : 'bg-zinc-800 text-zinc-400';
    return '<span class="px-2 py-0.5 rounded text-xs font-semibold ' + cls + '">' + score + ' — ' + esc(label || '') + '</span>';
  }

  // ── Filters ───────────────────────────────────────────────────────────────────
  function getFilters() {
    return {
      keyword:                 (document.getElementById('tpKeyword') || {}).value || '',
      status:                  (document.getElementById('tpStatus') || {}).value || '',
      desired_job_type:        (document.getElementById('tpJobType') || {}).value || '',
      experience_level:        (document.getElementById('tpExperience') || {}).value || '',
      work_authorization_status:(document.getElementById('tpWorkAuth') || {}).value || '',
      preferred_language:      (document.getElementById('tpLanguage') || {}).value || '',
      preferred_shift:         (document.getElementById('tpShift') || {}).value || '',
      limit: 300
    };
  }

  async function loadProfiles() {
    var svc = window.ruthkoCandidateMatching;
    if (!svc) return;
    var tbody = document.getElementById('tpTable');
    if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-zinc-500 text-center">Loading…</td></tr>';
    allProfiles = await svc.getTalentProfiles(getFilters()).catch(function () { return []; });

    // If a job is selected, score candidates
    if (currentJobPost) {
      var scorer = window.ruthkoJobMatchScore;
      if (scorer) allProfiles = scorer.rankCandidates(allProfiles, currentJobPost);
    }

    renderTable(allProfiles);
  }
  window.tpLoadProfiles = loadProfiles;

  // ── Stats ─────────────────────────────────────────────────────────────────────
  async function loadStats() {
    var svc = window.ruthkoCandidateMatching;
    if (!svc) return;
    var stats = await svc.getTalentStats().catch(function () { return {}; });
    var el = document.getElementById('tpStats');
    if (!el) return;
    el.innerHTML = [
      ['Total Candidates', stats.total || 0, 'text-zinc-300'],
      ['Active Pool', stats.active || 0, 'text-green-400'],
      ['Shortlisted', stats.shortlisted || 0, 'text-purple-400'],
      ['Hired', stats.hired || 0, 'text-yellow-400'],
      ['New', stats.new || 0, 'text-blue-400']
    ].map(function (s) {
      return '<div class="glass border border-zinc-800 rounded-2xl p-4"><p class="text-2xl font-extrabold ' + s[2] + '">' + s[1] + '</p><p class="text-zinc-400 text-xs mt-1">' + s[0] + '</p></div>';
    }).join('');
  }

  // ── Table ─────────────────────────────────────────────────────────────────────
  function renderTable(profiles) {
    var tbody = document.getElementById('tpTable');
    if (!tbody) return;
    if (!profiles.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-zinc-500 text-center">No candidates found. Job seekers from public forms appear here automatically.</td></tr>';
      return;
    }
    var statuses = window.ruthkoCandidateMatching ? window.ruthkoCandidateMatching.CANDIDATE_STATUSES : [];
    tbody.innerHTML = profiles.map(function (p) {
      var name = [p.first_name, p.last_name].filter(Boolean).join(' ') || '—';
      var loc  = [p.city, p.state].filter(Boolean).join(', ');
      var checked = selectedIds[p.id] ? 'checked' : '';
      var matchCell = currentJobPost && p._matchScore !== undefined
        ? '<td class="p-3">' + matchBadge(p._matchScore, p._matchLabel) + '</td>'
        : '';
      return '<tr class="border-b border-zinc-900 hover:bg-white/5">' +
        '<td class="p-3"><input type="checkbox" class="w-4 h-4 accent-yellow-400" ' + checked + ' onchange="tpToggleSelect(\'' + esc(p.id) + '\',this.checked)" /></td>' +
        '<td class="p-3"><a href="candidate-profile.html?id=' + esc(p.id) + '" class="font-semibold text-yellow-400 hover:underline">' + esc(name) + '</a><br><span class="text-xs text-zinc-500">' + esc(p.email) + '</span></td>' +
        '<td class="p-3 text-xs text-zinc-400">' + esc(p.desired_job_type || '—') + '</td>' +
        '<td class="p-3 text-xs text-zinc-400">' + esc(loc || '—') + '</td>' +
        '<td class="p-3 text-xs text-zinc-400">' + esc(p.experience_level || '—') + '</td>' +
        '<td class="p-3">' + statusBadge(p.status) + '</td>' +
        (currentJobPost ? matchCell : '') +
        '<td class="p-3">' +
          '<select onchange="tpQuickStatus(\'' + esc(p.id) + '\',this.value)" class="bg-black border border-zinc-800 rounded-lg p-1.5 text-xs">' +
          statuses.map(function (s) { return '<option' + (s === p.status ? ' selected' : '') + '>' + s + '</option>'; }).join('') +
          '</select>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  window.tpToggleSelect = function (id, checked) {
    if (checked) selectedIds[id] = true; else delete selectedIds[id];
    var count = Object.keys(selectedIds).length;
    var btn = document.getElementById('tpCreateShortlistBtn');
    if (btn) btn.textContent = count > 0 ? 'Create Shortlist (' + count + ')' : 'Create Shortlist';
  };

  window.tpSelectAll = function () {
    allProfiles.forEach(function (p) { selectedIds[p.id] = true; });
    renderTable(allProfiles);
    var count = Object.keys(selectedIds).length;
    var btn = document.getElementById('tpCreateShortlistBtn');
    if (btn) btn.textContent = 'Create Shortlist (' + count + ')';
  };

  window.tpClearSelection = function () {
    selectedIds = {};
    renderTable(allProfiles);
    var btn = document.getElementById('tpCreateShortlistBtn');
    if (btn) btn.textContent = 'Create Shortlist';
  };

  window.tpQuickStatus = async function (id, status) {
    var svc = window.ruthkoCandidateMatching;
    if (!svc) return;
    await svc.updateTalentProfile(id, { status: status });
    await loadStats();
    // update local row without full reload
    var idx = allProfiles.findIndex(function (p) { return p.id === id; });
    if (idx !== -1) { allProfiles[idx].status = status; renderTable(allProfiles); }
  };

  // ── Job matching mode ─────────────────────────────────────────────────────────
  window.tpSetJobMatch = function (jobPost) {
    currentJobPost = jobPost;
    var banner = document.getElementById('tpMatchBanner');
    var col    = document.getElementById('tpMatchCol');
    if (banner) { banner.textContent = 'Matching candidates for: ' + (jobPost ? jobPost.title : ''); banner.classList.toggle('hidden', !jobPost); }
    if (col) col.classList.toggle('hidden', !jobPost);
    loadProfiles();
  };

  window.tpClearJobMatch = function () {
    currentJobPost = null;
    selectedIds = {};
    var banner = document.getElementById('tpMatchBanner');
    var col    = document.getElementById('tpMatchCol');
    if (banner) banner.classList.add('hidden');
    if (col)    col.classList.add('hidden');
    loadProfiles();
  };

  // ── Shortlist modal ───────────────────────────────────────────────────────────
  window.tpOpenCreateShortlist = function () {
    var count = Object.keys(selectedIds).length;
    if (!count) { alert('Select at least one candidate first.'); return; }
    var modal = document.getElementById('tpShortlistModal');
    if (!modal) return;
    document.getElementById('tpSlName').value = currentJobPost ? 'Shortlist for ' + currentJobPost.title : '';
    document.getElementById('tpSlEmployer').value = (currentJobPost && currentJobPost.company_name) || '';
    document.getElementById('tpSlCount').textContent = count + ' candidate(s) selected.';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  };

  window.tpCloseShortlistModal = function () {
    var modal = document.getElementById('tpShortlistModal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
  };

  window.tpSaveShortlist = async function () {
    var name     = (document.getElementById('tpSlName') || {}).value || '';
    var employer = (document.getElementById('tpSlEmployer') || {}).value || '';
    var notes    = (document.getElementById('tpSlNotes') || {}).value || '';
    if (!name.trim()) { alert('Shortlist name is required.'); return; }
    var selected = allProfiles.filter(function (p) { return selectedIds[p.id]; });
    if (!selected.length) { alert('No candidates selected.'); return; }
    var svc = window.ruthkoShortlists;
    if (!svc) { alert('Shortlist service not loaded.'); return; }
    var result = await svc.buildShortlistFromMatches(
      currentJobPost || { id: null, title: name },
      selected, name, employer, null
    );
    if (result.ok) {
      tpCloseShortlistModal();
      selectedIds = {};
      var btn = document.getElementById('tpCreateShortlistBtn');
      if (btn) btn.textContent = 'Create Shortlist';
      alert('Shortlist "' + name + '" created with ' + result.candidatesAdded + ' candidate(s).');
      await loadStats();
    } else {
      alert('Error creating shortlist: ' + (result.error || 'Unknown'));
    }
  };

  // ── Export ────────────────────────────────────────────────────────────────────
  window.tpExport = function () {
    var svc = window.ruthkoCandidateMatching;
    if (svc) svc.exportTalentCsv(allProfiles);
  };

  // ── Init ──────────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    loadStats();
    loadProfiles();
  });
})();
