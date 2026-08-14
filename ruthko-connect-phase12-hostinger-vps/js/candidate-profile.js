(function () {
  'use strict';

  var profileId = null;
  var profile   = null;
  var currentTab = 'overview';

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

  function field(label, value) {
    return '<div class="mb-3"><p class="text-xs text-zinc-500 uppercase tracking-wide mb-0.5">' + label + '</p><p class="text-sm font-medium">' + esc(value || '—') + '</p></div>';
  }

  // ── Load profile ──────────────────────────────────────────────────────────────
  async function loadProfile() {
    var params = new URLSearchParams(window.location.search);
    profileId = params.get('id');
    if (!profileId) { showError('No candidate ID in URL.'); return; }

    var svc = window.ruthkoCandidateMatching;
    if (!svc) { showError('Candidate service not loaded.'); return; }

    profile = await svc.getTalentProfile(profileId).catch(function () { return null; });
    if (!profile) { showError('Candidate profile not found.'); return; }

    renderHeader();
    cpSetTab('overview');
  }

  function showError(msg) {
    var el = document.getElementById('cpContent');
    if (el) el.innerHTML = '<div class="p-8 text-center text-red-400">' + esc(msg) + '</div>';
  }

  function renderHeader() {
    var el = document.getElementById('cpHeader');
    if (!el || !profile) return;
    var name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Unknown Candidate';
    var svc  = window.ruthkoCandidateMatching;
    var statuses = svc ? svc.CANDIDATE_STATUSES : [];
    el.innerHTML =
      '<div class="flex flex-col md:flex-row md:items-start gap-5">' +
        '<div class="flex-1">' +
          '<h2 class="text-3xl font-extrabold mb-1">' + esc(name) + '</h2>' +
          '<p class="text-zinc-400 text-sm">' + esc(profile.email) + ' · ' + esc(profile.phone) + '</p>' +
          '<p class="text-zinc-500 text-sm">' + [profile.city, profile.state, profile.country].filter(Boolean).join(', ') + '</p>' +
          '<div class="flex flex-wrap gap-2 mt-3">' +
            statusBadge(profile.status) +
            (profile.desired_job_type ? '<span class="bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-xs">' + esc(profile.desired_job_type) + '</span>' : '') +
            (profile.experience_level ? '<span class="bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-xs">' + esc(profile.experience_level) + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="flex flex-wrap gap-2 shrink-0">' +
          '<select onchange="cpQuickStatus(this.value)" class="bg-black border border-zinc-800 rounded-xl p-2 text-sm">' +
          statuses.map(function (s) { return '<option' + (s === profile.status ? ' selected' : '') + '>' + s + '</option>'; }).join('') +
          '</select>' +
          (profile.resume_url ? '<a href="' + esc(profile.resume_url) + '" target="_blank" rel="noopener" class="btn-secondary px-4 py-2 rounded-xl font-bold text-sm">View Resume</a>' : '') +
          '<a href="talent-pool.html" class="btn-secondary px-4 py-2 rounded-xl font-bold text-sm">← Pool</a>' +
        '</div>' +
      '</div>';
  }

  window.cpQuickStatus = async function (status) {
    var svc = window.ruthkoCandidateMatching;
    if (!svc || !profileId) return;
    var result = await svc.updateTalentProfile(profileId, { status: status });
    if (result.ok) {
      profile.status = status;
      renderHeader();
    }
  };

  // ── Tabs ──────────────────────────────────────────────────────────────────────
  window.cpSetTab = function (tab) {
    currentTab = tab;
    ['overview','skills','notes','shortlists'].forEach(function (t) {
      var btn = document.getElementById('cpTab-' + t);
      var sec = document.getElementById('cpSection-' + t);
      if (btn) btn.className = btn.className.replace(/btn-primary|btn-secondary/g,'').trim() + (t === tab ? ' btn-primary' : ' btn-secondary') + ' px-4 py-2 rounded-xl font-bold text-sm';
      if (sec) sec.classList.toggle('hidden', t !== tab);
    });
    if (tab === 'overview')   renderOverview();
    if (tab === 'skills')     renderSkills();
    if (tab === 'notes')      loadNotes();
    if (tab === 'shortlists') loadShortlists();
  };

  // ── Overview tab ──────────────────────────────────────────────────────────────
  function renderOverview() {
    var el = document.getElementById('cpSection-overview');
    if (!el || !profile) return;
    var pj = profile.profile_json || {};
    el.innerHTML =
      '<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">' +
        '<div class="glass border border-zinc-800 rounded-2xl p-5 md:col-span-2">' +
          '<h4 class="font-bold mb-4 text-lg">Personal Info</h4>' +
          '<div class="grid grid-cols-2 gap-x-8 gap-y-1">' +
            field('First Name', profile.first_name) + field('Last Name', profile.last_name) +
            field('Email', profile.email) + field('Phone', profile.phone) +
            field('City', profile.city) + field('State', profile.state) +
            field('Country', profile.country) + field('Language', profile.preferred_language) +
          '</div>' +
        '</div>' +
        '<div class="glass border border-zinc-800 rounded-2xl p-5">' +
          '<h4 class="font-bold mb-4 text-lg">Work Preferences</h4>' +
          field('Desired Job Type', profile.desired_job_type) +
          field('Experience Level', profile.experience_level) +
          field('Work Authorization', profile.work_authorization_status) +
          field('Preferred Location', profile.preferred_location) +
          field('Preferred Shift', profile.preferred_shift) +
          field('Availability Date', fmtDate(profile.availability_date)) +
        '</div>' +
        (profile.resume_url ? '<div class="glass border border-zinc-800 rounded-2xl p-5 flex items-center gap-4"><i data-lucide="file-text" class="w-8 h-8 text-yellow-400 shrink-0"></i><div><p class="font-semibold">Resume on file</p><a href="' + esc(profile.resume_url) + '" target="_blank" rel="noopener" class="text-yellow-400 text-sm underline">View / Download</a></div></div>' : '') +
        (pj.message ? '<div class="glass border border-zinc-800 rounded-2xl p-5 md:col-span-2 xl:col-span-3"><h4 class="font-bold mb-2">Message / Notes from Application</h4><p class="text-zinc-300 text-sm">' + esc(pj.message) + '</p></div>' : '') +
      '</div>';
    if (window.lucide) window.lucide.createIcons();
  }

  // ── Skills tab ────────────────────────────────────────────────────────────────
  function renderSkills() {
    var el = document.getElementById('cpSection-skills');
    if (!el || !profile) return;
    var skills = profile.candidate_skills || [];
    var certs  = profile.candidate_certifications || [];
    el.innerHTML =
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-6">' +
        '<div class="glass border border-zinc-800 rounded-2xl p-5">' +
          '<div class="flex items-center justify-between mb-4"><h4 class="font-bold text-lg">Skills</h4><button onclick="cpAddSkillPrompt()" class="btn-primary px-3 py-1 rounded-lg text-sm font-bold">+ Add</button></div>' +
          (skills.length ? '<div class="flex flex-wrap gap-2" id="cpSkillsList">' +
            skills.map(function (s) {
              return '<span class="flex items-center gap-1 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-lg text-sm">' + esc(s.skill_name) + (s.skill_level ? ' <span class="text-zinc-500">(' + esc(s.skill_level) + ')</span>' : '') + '<button onclick="cpDeleteSkill(\'' + esc(s.id) + '\')" class="ml-1 text-zinc-500 hover:text-red-400 text-xs">✕</button></span>';
            }).join('') + '</div>' : '<p id="cpSkillsList" class="text-zinc-500 text-sm">No skills added yet.</p>') +
        '</div>' +
        '<div class="glass border border-zinc-800 rounded-2xl p-5">' +
          '<div class="flex items-center justify-between mb-4"><h4 class="font-bold text-lg">Certifications</h4><button onclick="cpAddCertPrompt()" class="btn-primary px-3 py-1 rounded-lg text-sm font-bold">+ Add</button></div>' +
          (certs.length ? '<div class="space-y-2" id="cpCertsList">' +
            certs.map(function (c) {
              return '<div class="flex items-center justify-between bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg"><div><p class="font-medium text-sm">' + esc(c.certification_name) + '</p>' + (c.issuing_body ? '<p class="text-xs text-zinc-500">' + esc(c.issuing_body) + '</p>' : '') + (c.expiration_date ? '<p class="text-xs text-zinc-500">Expires: ' + fmtDate(c.expiration_date) + '</p>' : '') + '</div>' + (c.document_url ? '<a href="' + esc(c.document_url) + '" target="_blank" rel="noopener" class="text-yellow-400 text-xs underline">View</a>' : '') + '<button onclick="cpDeleteCert(\'' + esc(c.id) + '\')" class="ml-2 text-zinc-500 hover:text-red-400 text-xs">✕</button></div>';
            }).join('') + '</div>' : '<p id="cpCertsList" class="text-zinc-500 text-sm">No certifications added yet.</p>') +
        '</div>' +
      '</div>';
  }

  window.cpAddSkillPrompt = async function () {
    var name  = prompt('Skill name:'); if (!name) return;
    var level = prompt('Skill level (beginner/intermediate/advanced) or leave blank:') || '';
    var svc = window.ruthkoCandidateMatching;
    if (!svc) return;
    var result = await svc.addSkill(profileId, { skill_name: name.trim(), skill_level: level.trim() });
    if (result.ok) { profile = await svc.getTalentProfile(profileId); renderSkills(); }
  };

  window.cpDeleteSkill = async function (id) {
    var svc = window.ruthkoCandidateMatching;
    if (!svc || !confirm('Remove this skill?')) return;
    await svc.deleteSkill(id);
    profile = await svc.getTalentProfile(profileId);
    renderSkills();
  };

  window.cpAddCertPrompt = async function () {
    var name = prompt('Certification name:'); if (!name) return;
    var body = prompt('Issuing body (optional):') || '';
    var svc  = window.ruthkoCandidateMatching;
    if (!svc) return;
    var result = await svc.addCertification(profileId, { certification_name: name.trim(), issuing_body: body.trim() });
    if (result.ok) { profile = await svc.getTalentProfile(profileId); renderSkills(); }
  };

  window.cpDeleteCert = async function (id) {
    var svc = window.ruthkoCandidateMatching;
    if (!svc || !confirm('Remove this certification?')) return;
    await svc.deleteCertification(id);
    profile = await svc.getTalentProfile(profileId);
    renderSkills();
  };

  // ── Notes tab ─────────────────────────────────────────────────────────────────
  async function loadNotes() {
    var el = document.getElementById('cpSection-notes');
    if (!el) return;
    var svc = window.ruthkoCandidateMatching;
    var notes = svc ? await svc.getNotes(profileId).catch(function () { return []; }) : [];
    el.innerHTML =
      '<div class="glass border border-zinc-800 rounded-2xl p-5 mb-5">' +
        '<h4 class="font-bold mb-3">Add Note</h4>' +
        '<select id="cpNoteType" class="bg-black border border-zinc-800 rounded-xl p-2 text-sm mb-3 w-full md:w-48">' +
          '<option value="general">General</option><option value="call">Call Log</option>' +
          '<option value="screening">Screening</option><option value="interview">Interview</option><option value="status">Status Change</option>' +
        '</select>' +
        '<textarea id="cpNoteText" placeholder="Add a note about this candidate…" class="w-full bg-black border border-zinc-800 rounded-xl p-3 text-sm h-24 mb-3"></textarea>' +
        '<button onclick="cpSubmitNote()" class="btn-primary px-4 py-2 rounded-xl font-bold text-sm">Save Note</button>' +
      '</div>' +
      '<div class="space-y-3">' +
        (notes.length ? notes.map(function (n) {
          return '<div class="glass border border-zinc-800 rounded-xl p-4"><p class="text-sm text-white mb-1">' + esc(n.note_text) + '</p><p class="text-xs text-zinc-500">' + esc(n.note_type) + ' · ' + fmtDate(n.created_at) + (n.created_by_email ? ' · ' + esc(n.created_by_email) : '') + '</p></div>';
        }).join('') : '<p class="text-zinc-500 text-sm">No notes yet.</p>') +
      '</div>';
  }

  window.cpSubmitNote = async function () {
    var text = (document.getElementById('cpNoteText') || {}).value || '';
    var type = (document.getElementById('cpNoteType') || {}).value || 'general';
    if (!text.trim()) { alert('Note text is required.'); return; }
    var svc = window.ruthkoCandidateMatching;
    if (!svc) return;
    var result = await svc.addNote(profileId, text.trim(), type);
    if (result.ok) await loadNotes();
    else alert('Error saving note: ' + (result.error || 'Unknown'));
  };

  // ── Shortlists tab ────────────────────────────────────────────────────────────
  async function loadShortlists() {
    var el = document.getElementById('cpSection-shortlists');
    if (!el) return;
    var svc = window.ruthkoShortlists;
    if (!svc) { el.innerHTML = '<p class="text-zinc-500 text-sm">Shortlist service not loaded.</p>'; return; }
    var all = await svc.getShortlists({ limit: 200 }).catch(function () { return []; });
    // Filter shortlists that include this profile via employer_shortlist_candidates
    // We'll show all shortlists for now with the candidate's score if available
    var client = typeof window.getRuthkoSupabaseClient === 'function' ? window.getRuthkoSupabaseClient() : null;
    var myCandidacies = [];
    if (client) {
      try {
        var r = await client.from('employer_shortlist_candidates').select('*, employer_shortlists(*)').eq('talent_profile_id', profileId);
        if (!r.error) myCandidacies = r.data || [];
      } catch (_) {}
    }
    el.innerHTML = !myCandidacies.length
      ? '<p class="text-zinc-500 text-sm">This candidate is not on any shortlist yet.</p>'
      : '<div class="space-y-3">' + myCandidacies.map(function (c) {
          var sl = c.employer_shortlists || {};
          return '<div class="glass border border-zinc-800 rounded-xl p-4 flex items-center justify-between gap-4"><div><p class="font-semibold">' + esc(sl.shortlist_name || c.shortlist_id) + '</p><p class="text-xs text-zinc-500">' + esc(sl.employer_name) + ' · Status: ' + esc(c.status) + '</p></div><span class="text-sm font-bold text-yellow-400">Score: ' + (c.match_score || 0) + '</span></div>';
        }).join('') + '</div>';
  }

  // ── Init ──────────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', loadProfile);
})();
