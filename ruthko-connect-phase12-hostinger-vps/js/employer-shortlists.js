(function () {
  'use strict';

  var SHORTLISTS_KEY = 'ruthko_employer_shortlists_v1';
  var SL_CANDS_KEY   = 'ruthko_shortlist_candidates_v1';

  function getClient() {
    if (typeof window.getRuthkoSupabaseClient === 'function') return window.getRuthkoSupabaseClient();
    if (window.RUTHKO_SUPABASE && window.RUTHKO_SUPABASE.sampleMode) return null;
    return null;
  }

  function loadLocal(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (_) { return []; } }
  function saveLocal(key, items, limit) { try { localStorage.setItem(key, JSON.stringify((items || []).slice(0, limit || 500))); } catch (_) {} }
  function genId() { return 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8); }
  function now() { return new Date().toISOString(); }

  function dispatch(name, detail) {
    try { window.dispatchEvent(new CustomEvent(name, { detail: detail || {} })); } catch (_) {}
  }

  function audit(action, meta) {
    if (window.ruthkoAudit && typeof window.ruthkoAudit.log === 'function') {
      window.ruthkoAudit.log(action, meta).catch(function () {});
    }
  }

  // ── Shortlists ────────────────────────────────────────────────────────────────
  async function getShortlists(filters) {
    var f = filters || {};
    var client = getClient();
    if (client) {
      try {
        var q = client.from('employer_shortlists').select('*, employer_shortlist_candidates(count)').order('created_at', { ascending: false });
        if (f.status)        q = q.eq('status', f.status);
        if (f.job_post_id)   q = q.eq('job_post_id', f.job_post_id);
        if (f.limit)         q = q.limit(f.limit);
        var result = await q;
        if (!result.error) {
          saveLocal(SHORTLISTS_KEY, result.data || []);
          return result.data || [];
        }
      } catch (_) {}
    }
    var local = loadLocal(SHORTLISTS_KEY);
    if (f.status) local = local.filter(function (s) { return s.status === f.status; });
    return local;
  }

  async function createShortlist(data) {
    var shortlist = Object.assign({
      id: genId(), status: 'draft', created_at: now(), updated_at: now()
    }, data);
    var client = getClient();
    if (client) {
      try {
        var result = await client.from('employer_shortlists').insert(shortlist).select().single();
        if (!result.error) {
          shortlist = result.data;
          audit('candidate_shortlist_create', { shortlist_id: shortlist.id, name: shortlist.shortlist_name });
          dispatch('ruthko:shortlist-created', shortlist);
          return { ok: true, data: shortlist };
        }
        return { ok: false, error: result.error.message };
      } catch (e) { return { ok: false, error: e.message }; }
    }
    var local = loadLocal(SHORTLISTS_KEY);
    local.unshift(shortlist);
    saveLocal(SHORTLISTS_KEY, local);
    dispatch('ruthko:shortlist-created', shortlist);
    return { ok: true, data: shortlist, local: true };
  }

  async function updateShortlist(id, data) {
    var update = Object.assign({}, data, { updated_at: now() });
    var client = getClient();
    if (client) {
      try {
        var result = await client.from('employer_shortlists').update(update).eq('id', id).select().single();
        if (!result.error) {
          if (data.status === 'sent_to_employer') audit('candidate_shortlist_send', { shortlist_id: id });
          else audit('candidate_shortlist_update', { shortlist_id: id });
          dispatch('ruthko:shortlist-updated', result.data);
          return { ok: true, data: result.data };
        }
        return { ok: false, error: result.error.message };
      } catch (e) { return { ok: false, error: e.message }; }
    }
    var local = loadLocal(SHORTLISTS_KEY);
    var idx = local.findIndex(function (s) { return s.id === id; });
    if (idx !== -1) { local[idx] = Object.assign(local[idx], update); saveLocal(SHORTLISTS_KEY, local); }
    return { ok: true, local: true };
  }

  // ── Shortlist Candidates ──────────────────────────────────────────────────────
  async function getShortlistCandidates(shortlistId) {
    var client = getClient();
    if (client) {
      try {
        var result = await client.from('employer_shortlist_candidates').select('*, talent_profiles(*)').eq('shortlist_id', shortlistId).order('match_score', { ascending: false });
        if (!result.error) return result.data || [];
      } catch (_) {}
    }
    return loadLocal(SL_CANDS_KEY).filter(function (c) { return c.shortlist_id === shortlistId; });
  }

  async function addCandidateToShortlist(shortlistId, profileId, matchScore, adminNotes, jobPostId) {
    var entry = {
      id: genId(), shortlist_id: shortlistId, talent_profile_id: profileId,
      job_post_id: jobPostId || null, match_score: matchScore || 0,
      admin_notes: adminNotes || '', status: 'shortlisted', created_at: now()
    };
    var client = getClient();
    if (client) {
      try {
        // Avoid duplicate
        var existing = await client.from('employer_shortlist_candidates').select('id').match({ shortlist_id: shortlistId, talent_profile_id: profileId }).single();
        if (existing.data) return { ok: true, data: existing.data, duplicate: true };
        var result = await client.from('employer_shortlist_candidates').insert(entry).select().single();
        if (!result.error) {
          // Update talent profile status to shortlisted
          if (window.ruthkoCandidateMatching) {
            window.ruthkoCandidateMatching.updateTalentProfile(profileId, { status: 'shortlisted' }).catch(function () {});
          }
          return { ok: true, data: result.data };
        }
        return { ok: false, error: result.error.message };
      } catch (e) { return { ok: false, error: e.message }; }
    }
    var local = loadLocal(SL_CANDS_KEY);
    local.unshift(entry);
    saveLocal(SL_CANDS_KEY, local);
    return { ok: true, data: entry, local: true };
  }

  async function removeCandidateFromShortlist(shortlistId, profileId) {
    var client = getClient();
    if (client) {
      try {
        var result = await client.from('employer_shortlist_candidates').delete().match({ shortlist_id: shortlistId, talent_profile_id: profileId });
        return result.error ? { ok: false, error: result.error.message } : { ok: true };
      } catch (e) { return { ok: false, error: e.message }; }
    }
    var local = loadLocal(SL_CANDS_KEY).filter(function (c) { return !(c.shortlist_id === shortlistId && c.talent_profile_id === profileId); });
    saveLocal(SL_CANDS_KEY, local);
    return { ok: true, local: true };
  }

  async function sendShortlistToEmployer(id) {
    var result = await updateShortlist(id, { status: 'sent_to_employer' });
    if (result.ok) {
      var svc = window.ruthkoCandidateMatching;
      if (svc && svc.sendEmployerShortlistNotice) svc.sendEmployerShortlistNotice(result.data || { id: id });
    }
    return result;
  }

  async function buildShortlistFromMatches(jobPost, rankedProfiles, shortlistName, employerName, orderId) {
    var slResult = await createShortlist({
      job_post_id: jobPost.id,
      staffing_order_id: orderId || null,
      shortlist_name: shortlistName || ('Shortlist for ' + jobPost.title),
      employer_name: employerName || jobPost.company_name || ''
    });
    if (!slResult.ok) return slResult;
    var shortlistId = slResult.data.id;
    for (var i = 0; i < rankedProfiles.length; i++) {
      var p = rankedProfiles[i];
      await addCandidateToShortlist(shortlistId, p.id, p._matchScore || 0, '', jobPost.id).catch(function () {});
    }
    return { ok: true, data: slResult.data, candidatesAdded: rankedProfiles.length };
  }

  window.ruthkoShortlists = {
    getShortlists: getShortlists,
    createShortlist: createShortlist,
    updateShortlist: updateShortlist,
    getShortlistCandidates: getShortlistCandidates,
    addCandidateToShortlist: addCandidateToShortlist,
    removeCandidateFromShortlist: removeCandidateFromShortlist,
    sendShortlistToEmployer: sendShortlistToEmployer,
    buildShortlistFromMatches: buildShortlistFromMatches
  };
})();
