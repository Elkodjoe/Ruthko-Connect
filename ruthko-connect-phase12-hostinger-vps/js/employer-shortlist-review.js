(function () {
  'use strict';

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function fmtDate(d) { if (!d) return '—'; var dt = new Date(d); return isNaN(dt) ? '—' : dt.toLocaleDateString(); }
  function qp(name) { return new URLSearchParams(window.location.search).get(name) || ''; }

  var SHORTLIST_ID  = '';
  var allCandidates = [];
  var feedbackMap   = {};

  function getClient() {
    if (typeof window.getRuthkoSupabaseClient === 'function') return window.getRuthkoSupabaseClient();
    if (window.RUTHKO_SUPABASE && window.RUTHKO_SUPABASE.sampleMode) return null;
    return null;
  }

  function session() {
    var auth = window.ruthkoEmployerAuth;
    return auth ? auth.getSession() : null;
  }

  function audit(action, meta) {
    if (window.ruthkoAudit && typeof window.ruthkoAudit.log === 'function') {
      window.ruthkoAudit.log(action, meta).catch(function () {});
    }
  }

  // ── Load shortlist header ─────────────────────────────────────────────────────
  async function loadShortlistHeader() {
    var el = document.getElementById('esrHeader');
    if (!el) return;
    var client = getClient();
    var sl = null;

    if (client && SHORTLIST_ID) {
      try {
        var r = await client.from('employer_shortlists').select('*').eq('id', SHORTLIST_ID).single();
        if (!r.error) sl = r.data;
      } catch (_) {}
    }

    if (!sl) sl = { shortlist_name: 'Candidate Shortlist', status: 'sent_to_employer', employer_name: (session() || {}).company_name };

    el.innerHTML =
      '<div class="flex items-center justify-between flex-wrap gap-3">' +
        '<div>' +
          '<h2 class="text-2xl font-extrabold">' + esc(sl.shortlist_name) + '</h2>' +
          '<p class="text-zinc-400 text-sm mt-1">' + esc(sl.employer_name || '') + ' · Status: <span class="text-purple-300 font-semibold">' + esc(sl.status) + '</span></p>' +
        '</div>' +
        '<div class="flex gap-2">' +
          '<button onclick="esrDownloadCSV()" class="btn-secondary px-4 py-2 rounded-xl font-bold text-sm">Download CSV</button>' +
          '<button onclick="esrRequestMore()" class="btn-secondary px-4 py-2 rounded-xl font-bold text-sm">Request More</button>' +
        '</div>' +
      '</div>';

    audit('employer_shortlist_view', { shortlist_id: SHORTLIST_ID });
  }

  // ── Load candidates ───────────────────────────────────────────────────────────
  async function loadCandidates() {
    var el = document.getElementById('esrCandidates');
    if (!el) return;
    el.innerHTML = '<p class="text-zinc-500 text-sm">Loading candidates…</p>';

    var client = getClient();
    var candidates = [];

    if (client && SHORTLIST_ID) {
      try {
        var r = await client
          .from('employer_shortlist_candidates')
          .select('*, talent_profiles(first_name, last_name, city, state, experience_level, desired_job_type, availability_date, work_authorization_status, resume_url, share_resume_with_employer, candidate_skills(skill_name, skill_level), candidate_certifications(certification_name), admin_summary)')
          .eq('shortlist_id', SHORTLIST_ID)
          .order('match_score', { ascending: false });
        if (!r.error) candidates = r.data || [];
      } catch (_) {}
    }

    if (!candidates.length) {
      // Sample candidates for demo
      candidates = [
        { id: 'sample-sc-001', talent_profile_id: 'tp-001', match_score: 87, match_label: 'Strong match', talent_profiles: { first_name: 'Maria', last_name: 'G.', city: 'Atlanta', state: 'GA', experience_level: 'mid', desired_job_type: 'CNA', availability_date: '2026-07-15', work_authorization_status: 'us_citizen', resume_url: null, share_resume_with_employer: true, admin_summary: 'Experienced CNA with 4 years in long-term care. Reliable and highly recommended.', candidate_skills: [{ skill_name: 'Patient care' }, { skill_name: 'Vitals monitoring' }], candidate_certifications: [{ certification_name: 'CNA Georgia' }] } },
        { id: 'sample-sc-002', talent_profile_id: 'tp-002', match_score: 74, match_label: 'Possible match', talent_profiles: { first_name: 'James', last_name: 'D.', city: 'Macon', state: 'GA', experience_level: 'junior', desired_job_type: 'CNA', availability_date: '2026-08-01', work_authorization_status: 'permanent_resident', resume_url: null, share_resume_with_employer: false, admin_summary: 'Recent CNA graduate, eager and available immediately.', candidate_skills: [{ skill_name: 'CPR certified' }], candidate_certifications: [] } }
      ];
    }

    allCandidates = candidates;

    // Load existing feedback
    var svc = window.ruthkoEmployerFeedback;
    var s   = session();
    if (svc && s) {
      var fb = await svc.getFeedback({ shortlist_id: SHORTLIST_ID, employer_account_id: s.employer_account_id }).catch(function () { return []; });
      feedbackMap = {};
      fb.forEach(function (f) { feedbackMap[f.shortlist_candidate_id] = f; });
    }

    renderCandidates();
  }

  function renderCandidates() {
    var el = document.getElementById('esrCandidates');
    if (!el) return;
    if (!allCandidates.length) { el.innerHTML = '<p class="text-zinc-500 text-sm">No candidates in this shortlist yet.</p>'; return; }
    el.innerHTML = allCandidates.map(function (sc) {
      var p    = sc.talent_profiles || {};
      var name = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Candidate';
      var loc  = [p.city, p.state].filter(Boolean).join(', ') || '—';
      var skills = (p.candidate_skills || []).map(function (sk) { return '<span class="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs">' + esc(sk.skill_name) + '</span>'; }).join(' ');
      var certs  = (p.candidate_certifications || []).map(function (c) { return '<span class="px-2 py-0.5 bg-teal-900/60 text-teal-300 rounded text-xs">' + esc(c.certification_name) + '</span>'; }).join(' ');
      var resumeLink = (p.share_resume_with_employer && p.resume_url)
        ? '<a href="' + esc(p.resume_url) + '" target="_blank" rel="noopener" class="text-yellow-400 text-xs hover:underline">View Resume</a>'
        : '<span class="text-zinc-600 text-xs">Resume not shared</span>';
      var existingFb = feedbackMap[sc.id] || {};
      var matchBadge = sc.match_score
        ? '<span class="px-2 py-0.5 rounded text-xs font-semibold bg-green-900 text-green-300">' + esc(sc.match_score) + ' — ' + esc(sc.match_label || '') + '</span>'
        : '';
      return '<div id="card-' + esc(sc.id) + '" class="glass border border-zinc-800 rounded-2xl p-6">' +
        '<div class="flex items-start justify-between gap-4 mb-4">' +
          '<div>' +
            '<h3 class="text-xl font-bold">' + esc(name) + '</h3>' +
            '<p class="text-zinc-400 text-sm">' + esc(loc) + ' · ' + esc(p.experience_level || '—') + ' · ' + esc(p.desired_job_type || '—') + '</p>' +
            '<div class="mt-1 flex items-center gap-2 flex-wrap">' + matchBadge + resumeLink + '</div>' +
          '</div>' +
        '</div>' +
        (p.admin_summary ? '<div class="glass-inner border border-zinc-700 rounded-xl p-3 mb-4 text-sm text-zinc-300 italic">"' + esc(p.admin_summary) + '"</div>' : '') +
        '<div class="flex flex-wrap gap-1 mb-2">' + (skills || '<span class="text-zinc-600 text-xs">No skills listed</span>') + '</div>' +
        '<div class="flex flex-wrap gap-1 mb-4">' + (certs || '') + '</div>' +
        '<p class="text-zinc-500 text-xs mb-4">Available: ' + fmtDate(p.availability_date) + ' · Work auth: ' + esc(p.work_authorization_status || '—') + '</p>' +
        '<div class="border-t border-zinc-800 pt-4">' +
          '<p class="text-sm font-semibold text-zinc-300 mb-2">Your decision:</p>' +
          '<div class="flex flex-wrap gap-2 mb-3">' +
            ['interested','maybe','not_a_fit','request_interview','need_more_information','rejected'].map(function (status) {
              var active = existingFb.feedback_status === status ? ' ring-2 ring-yellow-400' : '';
              var labels = { interested:'Interested', maybe:'Maybe', not_a_fit:'Not a Fit', request_interview:'Request Interview', need_more_information:'Need More Info', rejected:'Rejected' };
              var colors = { interested:'bg-green-900 text-green-300', maybe:'bg-zinc-800 text-zinc-300', not_a_fit:'bg-red-900 text-red-300', request_interview:'bg-purple-900 text-purple-300', need_more_information:'bg-yellow-900 text-yellow-300', rejected:'bg-red-900 text-red-400' };
              return '<button onclick="esrSetFeedback(\'' + esc(sc.id) + '\',\'' + esc(sc.talent_profile_id || '') + '\',\'' + status + '\')" class="px-3 py-1.5 rounded-xl font-semibold text-xs ' + (colors[status] || 'bg-zinc-800 text-zinc-400') + active + '">' + labels[status] + '</button>';
            }).join('') +
          '</div>' +
          '<div class="flex gap-2">' +
            '<input id="note-' + esc(sc.id) + '" value="' + esc(existingFb.feedback_note || '') + '" placeholder="Add a note (optional)" class="flex-1 bg-black border border-zinc-800 rounded-xl p-2 text-sm" />' +
            '<button onclick="esrSubmitNote(\'' + esc(sc.id) + '\',\'' + esc(sc.talent_profile_id || '') + '\')" class="btn-primary px-4 py-2 rounded-xl font-bold text-sm">Save Note</button>' +
          '</div>' +
          '<p id="fb-status-' + esc(sc.id) + '" class="text-xs text-zinc-500 mt-1">' + (existingFb.feedback_status ? 'Saved: ' + existingFb.feedback_status : '') + '</p>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  window.esrSetFeedback = async function (shortlistCandidateId, talentProfileId, status) {
    var svc = window.ruthkoEmployerFeedback;
    var s   = session();
    if (!svc || !s) return;
    var note = (document.getElementById('note-' + shortlistCandidateId) || {}).value || '';
    var isInterview = status === 'request_interview';
    var result = await svc.submitFeedback({
      shortlist_id: SHORTLIST_ID,
      shortlist_candidate_id: shortlistCandidateId,
      employer_account_id: s.employer_account_id,
      talent_profile_id: talentProfileId,
      feedback_status: status,
      feedback_note: note,
      interview_requested: isInterview
    });
    if (result.ok) {
      feedbackMap[shortlistCandidateId] = Object.assign(feedbackMap[shortlistCandidateId] || {}, { feedback_status: status, feedback_note: note, interview_requested: isInterview });
      var fbEl = document.getElementById('fb-status-' + shortlistCandidateId);
      if (fbEl) fbEl.textContent = 'Saved: ' + status;
      renderCandidates();
    } else {
      alert('Error saving feedback: ' + result.error);
    }
  };

  window.esrSubmitNote = async function (shortlistCandidateId, talentProfileId) {
    var svc = window.ruthkoEmployerFeedback;
    var s   = session();
    if (!svc || !s) return;
    var note = (document.getElementById('note-' + shortlistCandidateId) || {}).value || '';
    var existing = feedbackMap[shortlistCandidateId] || {};
    var result = await svc.submitFeedback({
      shortlist_id: SHORTLIST_ID,
      shortlist_candidate_id: shortlistCandidateId,
      employer_account_id: s.employer_account_id,
      talent_profile_id: talentProfileId,
      feedback_status: existing.feedback_status || 'maybe',
      feedback_note: note,
      interview_requested: existing.interview_requested || false
    });
    if (result.ok) {
      feedbackMap[shortlistCandidateId] = Object.assign(existing, { feedback_note: note });
      var fbEl = document.getElementById('fb-status-' + shortlistCandidateId);
      if (fbEl) fbEl.textContent = 'Note saved.';
    }
  };

  window.esrDownloadCSV = function () {
    var s = session();
    var rows = [['Candidate', 'Location', 'Experience', 'Job Type', 'Availability', 'Work Auth', 'Match Score', 'Your Decision', 'Note']];
    allCandidates.forEach(function (sc) {
      var p  = sc.talent_profiles || {};
      var fb = feedbackMap[sc.id] || {};
      rows.push([
        [p.first_name, p.last_name].filter(Boolean).join(' ') || '—',
        [p.city, p.state].filter(Boolean).join(', ') || '—',
        p.experience_level || '—',
        p.desired_job_type || '—',
        p.availability_date || '—',
        p.work_authorization_status || '—',
        sc.match_score || '—',
        fb.feedback_status || '—',
        fb.feedback_note || ''
      ]);
    });
    var csv = rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g,'""') + '"'; }).join(','); }).join('\n');
    var blob = new Blob([csv], { type: 'text/csv' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'shortlist-review-' + SHORTLIST_ID.slice(0, 8) + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  window.esrRequestMore = async function () {
    var svc = window.ruthkoEmployerFeedback;
    var s   = session();
    if (!svc || !s) return;
    var note = prompt('Note for your recruiter (optional):') || '';
    var result = await svc.requestMoreCandidates(s.employer_account_id, s.staffing_order_id, note);
    if (result.ok) alert('Request sent to your Ruthko recruiter.');
    else alert('Error: ' + result.error);
  };

  document.addEventListener('DOMContentLoaded', function () {
    var auth = window.ruthkoEmployerAuth;
    if (!auth || !auth.requireAuth()) return;
    SHORTLIST_ID = qp('shortlist_id') || (auth.getSession() || {}).shortlist_id || '';
    if (!SHORTLIST_ID) { document.body.innerHTML = '<p class="p-10 text-red-400">No shortlist specified.</p>'; return; }
    loadShortlistHeader();
    loadCandidates();
  });
})();
