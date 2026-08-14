(function () {
  'use strict';

  var PROFILES_KEY   = 'ruthko_talent_profiles_v1';
  var SCORES_KEY     = 'ruthko_candidate_match_scores_v1';
  var SHORTLISTS_KEY = 'ruthko_employer_shortlists_v1';
  var SL_CANDS_KEY   = 'ruthko_shortlist_candidates_v1';
  var NOTES_KEY      = 'ruthko_candidate_notes_v1';

  var CANDIDATE_STATUSES = ['new','screening','qualified','not_qualified','active_pool','shortlisted','submitted_to_employer','interviewing','hired','inactive','archived'];
  var SHORTLIST_STATUSES = ['draft','review','sent_to_employer','employer_reviewing','interview_selected','filled','closed'];

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

  // ── Talent Profiles ───────────────────────────────────────────────────────────
  async function getTalentProfiles(filters) {
    var f = filters || {};
    var client = getClient();
    if (client) {
      try {
        var q = client.from('talent_profiles').select('*, candidate_skills(*), candidate_certifications(*)').order('created_at', { ascending: false });
        if (f.status)                    q = q.eq('status', f.status);
        if (f.desired_job_type)          q = q.eq('desired_job_type', f.desired_job_type);
        if (f.experience_level)          q = q.eq('experience_level', f.experience_level);
        if (f.work_authorization_status) q = q.eq('work_authorization_status', f.work_authorization_status);
        if (f.preferred_language)        q = q.eq('preferred_language', f.preferred_language);
        if (f.preferred_shift)           q = q.eq('preferred_shift', f.preferred_shift);
        if (f.assigned_to)               q = q.eq('assigned_to', f.assigned_to);
        if (f.keyword) q = q.or('first_name.ilike.%' + f.keyword + '%,last_name.ilike.%' + f.keyword + '%,email.ilike.%' + f.keyword + '%,city.ilike.%' + f.keyword + '%,desired_job_type.ilike.%' + f.keyword + '%');
        if (f.availability_before) q = q.lte('availability_date', f.availability_before);
        if (f.limit) q = q.limit(f.limit);
        var result = await q;
        if (!result.error) {
          saveLocal(PROFILES_KEY, result.data || []);
          return result.data || [];
        }
      } catch (_) {}
    }
    var local = loadLocal(PROFILES_KEY);
    if (f.status) local = local.filter(function (p) { return p.status === f.status; });
    if (f.desired_job_type) local = local.filter(function (p) { return p.desired_job_type === f.desired_job_type; });
    if (f.keyword) {
      var q = f.keyword.toLowerCase();
      local = local.filter(function (p) {
        return [(p.first_name||''),(p.last_name||''),(p.email||''),(p.city||''),(p.desired_job_type||'')].some(function (v) { return v.toLowerCase().includes(q); });
      });
    }
    return local;
  }

  async function getTalentProfile(id) {
    var client = getClient();
    if (client) {
      try {
        var result = await client.from('talent_profiles').select('*, candidate_skills(*), candidate_certifications(*)').eq('id', id).single();
        if (!result.error) return result.data;
      } catch (_) {}
    }
    return loadLocal(PROFILES_KEY).find(function (p) { return p.id === id; }) || null;
  }

  async function createTalentProfile(data) {
    var profile = Object.assign({
      id: genId(), status: 'new', preferred_language: 'en',
      profile_json: {}, created_at: now(), updated_at: now()
    }, data);
    var client = getClient();
    if (client) {
      try {
        var result = await client.from('talent_profiles').insert(profile).select().single();
        if (!result.error) {
          profile = result.data;
          audit('talent_profile_create', { profile_id: profile.id, name: profile.first_name + ' ' + profile.last_name });
          dispatch('ruthko:talent-profile-created', profile);
          return { ok: true, data: profile };
        }
        return { ok: false, error: result.error.message };
      } catch (e) { return { ok: false, error: e.message }; }
    }
    var local = loadLocal(PROFILES_KEY);
    local.unshift(profile);
    saveLocal(PROFILES_KEY, local);
    dispatch('ruthko:talent-profile-created', profile);
    return { ok: true, data: profile, local: true };
  }

  async function updateTalentProfile(id, data) {
    var update = Object.assign({}, data, { updated_at: now() });
    var client = getClient();
    if (client) {
      try {
        var result = await client.from('talent_profiles').update(update).eq('id', id).select().single();
        if (!result.error) {
          if (data.status) audit('talent_profile_status_change', { profile_id: id, status: data.status });
          else if (data.assigned_to) audit('candidate_assignment_change', { profile_id: id });
          else audit('talent_profile_update', { profile_id: id });
          dispatch('ruthko:talent-profile-updated', result.data);
          return { ok: true, data: result.data };
        }
        return { ok: false, error: result.error.message };
      } catch (e) { return { ok: false, error: e.message }; }
    }
    var local = loadLocal(PROFILES_KEY);
    var idx = local.findIndex(function (p) { return p.id === id; });
    if (idx !== -1) { local[idx] = Object.assign(local[idx], update); saveLocal(PROFILES_KEY, local); }
    return { ok: true, local: true };
  }

  async function upsertProfileFromSubmission(submission) {
    var details = submission.details_json || {};
    var skills = details.skills ? String(details.skills).split(',').map(function (s) { return s.trim(); }).filter(Boolean) : [];
    var certs  = details.certifications ? String(details.certifications).split(',').map(function (c) { return c.trim(); }).filter(Boolean) : [];
    // Check if profile already exists for this submission
    var client = getClient();
    if (client) {
      try {
        var existing = await client.from('talent_profiles').select('id').eq('crm_submission_id', submission.id).single();
        if (existing.data) return updateTalentProfile(existing.data.id, {
          first_name: submission.first_name, last_name: submission.last_name,
          email: submission.email, phone: submission.phone,
          city: submission.city, state: submission.state, country: submission.country,
          preferred_language: submission.preferred_language || 'en',
          desired_job_type: details.desired_job_type || '',
          experience_level: details.experience_level || '',
          work_authorization_status: details.work_authorization || '',
          preferred_location: details.preferred_location || '',
          availability_date: details.availability_date || null,
          resume_url: details.resume_link || '',
          profile_json: details
        });
      } catch (_) {}
    }
    var profileData = {
      crm_submission_id: submission.id,
      first_name: submission.first_name, last_name: submission.last_name,
      email: submission.email, phone: submission.phone,
      city: submission.city, state: submission.state, country: submission.country,
      preferred_language: submission.preferred_language || 'en',
      desired_job_type: details.desired_job_type || '',
      experience_level: details.experience_level || '',
      work_authorization_status: details.work_authorization || '',
      preferred_location: details.preferred_location || '',
      preferred_shift: details.shift_preference || '',
      availability_date: details.availability_date || null,
      resume_url: details.resume_link || '',
      profile_json: Object.assign({}, details, { skills: skills, certifications: certs })
    };
    var result = await createTalentProfile(profileData);
    if (result.ok && result.data && skills.length) {
      for (var i = 0; i < skills.length; i++) {
        await addSkill(result.data.id, { skill_name: skills[i] }).catch(function () {});
      }
    }
    if (result.ok && result.data && certs.length) {
      for (var j = 0; j < certs.length; j++) {
        await addCertification(result.data.id, { certification_name: certs[j] }).catch(function () {});
      }
    }
    return result;
  }

  async function getTalentStats() {
    var client = getClient();
    if (client) {
      try {
        var result = await client.from('talent_profiles').select('status');
        if (!result.error) {
          var rows = result.data || [];
          return {
            total: rows.length,
            active: rows.filter(function (r) { return r.status === 'active_pool'; }).length,
            shortlisted: rows.filter(function (r) { return r.status === 'shortlisted'; }).length,
            hired: rows.filter(function (r) { return r.status === 'hired'; }).length,
            new: rows.filter(function (r) { return r.status === 'new'; }).length
          };
        }
      } catch (_) {}
    }
    var local = loadLocal(PROFILES_KEY);
    return {
      total: local.length,
      active: local.filter(function (r) { return r.status === 'active_pool'; }).length,
      shortlisted: local.filter(function (r) { return r.status === 'shortlisted'; }).length,
      hired: local.filter(function (r) { return r.status === 'hired'; }).length,
      new: local.filter(function (r) { return r.status === 'new'; }).length
    };
  }

  // ── Skills ────────────────────────────────────────────────────────────────────
  async function addSkill(profileId, data) {
    var skill = Object.assign({ id: genId(), talent_profile_id: profileId, created_at: now() }, data);
    var client = getClient();
    if (client) {
      try {
        var result = await client.from('candidate_skills').insert(skill).select().single();
        if (!result.error) return { ok: true, data: result.data };
        return { ok: false, error: result.error.message };
      } catch (e) { return { ok: false, error: e.message }; }
    }
    return { ok: true, data: skill, local: true };
  }

  async function deleteSkill(id) {
    var client = getClient();
    if (client) {
      try {
        var result = await client.from('candidate_skills').delete().eq('id', id);
        return result.error ? { ok: false, error: result.error.message } : { ok: true };
      } catch (e) { return { ok: false, error: e.message }; }
    }
    return { ok: true, local: true };
  }

  // ── Certifications ────────────────────────────────────────────────────────────
  async function addCertification(profileId, data) {
    var cert = Object.assign({ id: genId(), talent_profile_id: profileId, created_at: now() }, data);
    var client = getClient();
    if (client) {
      try {
        var result = await client.from('candidate_certifications').insert(cert).select().single();
        if (!result.error) return { ok: true, data: result.data };
        return { ok: false, error: result.error.message };
      } catch (e) { return { ok: false, error: e.message }; }
    }
    return { ok: true, data: cert, local: true };
  }

  async function deleteCertification(id) {
    var client = getClient();
    if (client) {
      try {
        var result = await client.from('candidate_certifications').delete().eq('id', id);
        return result.error ? { ok: false, error: result.error.message } : { ok: true };
      } catch (e) { return { ok: false, error: e.message }; }
    }
    return { ok: true, local: true };
  }

  // ── Match Scores ──────────────────────────────────────────────────────────────
  async function saveMatchScore(profileId, jobPostId, scoreData) {
    var record = {
      id: genId(), talent_profile_id: profileId, job_post_id: jobPostId,
      score: scoreData.score, label: scoreData.label, score_json: scoreData.breakdown || {},
      created_at: now()
    };
    var client = getClient();
    if (client) {
      try {
        // Upsert: delete old then insert new
        await client.from('candidate_match_scores').delete().match({ talent_profile_id: profileId, job_post_id: jobPostId });
        var result = await client.from('candidate_match_scores').insert(record).select().single();
        if (!result.error) {
          audit('candidate_match_run', { profile_id: profileId, job_post_id: jobPostId, score: scoreData.score });
          var scores = loadLocal(SCORES_KEY);
          scores = scores.filter(function (s) { return !(s.talent_profile_id === profileId && s.job_post_id === jobPostId); });
          scores.unshift(result.data);
          saveLocal(SCORES_KEY, scores);
          return { ok: true, data: result.data };
        }
        return { ok: false, error: result.error.message };
      } catch (e) { return { ok: false, error: e.message }; }
    }
    var scores = loadLocal(SCORES_KEY);
    scores = scores.filter(function (s) { return !(s.talent_profile_id === profileId && s.job_post_id === jobPostId); });
    scores.unshift(record);
    saveLocal(SCORES_KEY, scores);
    return { ok: true, data: record, local: true };
  }

  async function getMatchScoresForJob(jobPostId) {
    var client = getClient();
    if (client) {
      try {
        var result = await client.from('candidate_match_scores').select('*, talent_profiles(*)').eq('job_post_id', jobPostId).order('score', { ascending: false });
        if (!result.error) return result.data || [];
      } catch (_) {}
    }
    return loadLocal(SCORES_KEY).filter(function (s) { return s.job_post_id === jobPostId; });
  }

  // ── Candidate Notes ───────────────────────────────────────────────────────────
  async function getNotes(profileId) {
    var client = getClient();
    if (client) {
      try {
        var result = await client.from('candidate_notes').select('*').eq('talent_profile_id', profileId).order('created_at', { ascending: false });
        if (!result.error) return result.data || [];
      } catch (_) {}
    }
    return loadLocal(NOTES_KEY).filter(function (n) { return n.talent_profile_id === profileId; });
  }

  async function addNote(profileId, noteText, noteType) {
    var note = {
      id: genId(), talent_profile_id: profileId,
      note_text: noteText, note_type: noteType || 'general',
      created_at: now()
    };
    var client = getClient();
    if (client) {
      try {
        var result = await client.from('candidate_notes').insert(note).select().single();
        if (!result.error) {
          audit('candidate_note_create', { profile_id: profileId });
          return { ok: true, data: result.data };
        }
        return { ok: false, error: result.error.message };
      } catch (e) { return { ok: false, error: e.message }; }
    }
    var local = loadLocal(NOTES_KEY);
    local.unshift(note);
    saveLocal(NOTES_KEY, local);
    return { ok: true, data: note, local: true };
  }

  // ── Export ────────────────────────────────────────────────────────────────────
  function exportTalentCsv(profiles) {
    var headers = ['ID','First Name','Last Name','Email','Phone','City','State','Country','Language','Job Type','Experience','Work Auth','Shift','Availability','Status','Resume URL','Created'];
    var rows = (profiles || []).map(function (p) {
      return [p.id,p.first_name,p.last_name,p.email,p.phone,p.city,p.state,p.country,p.preferred_language,p.desired_job_type,p.experience_level,p.work_authorization_status,p.preferred_shift,p.availability_date,p.status,p.resume_url,p.created_at].map(function (v) {
        return '"' + String(v || '').replace(/"/g, '""') + '"';
      }).join(',');
    });
    var csv = [headers.join(',')].concat(rows).join('\n');
    var blob = new Blob([csv], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'ruthko-talent-pool-' + Date.now() + '.csv';
    a.click(); URL.revokeObjectURL(url);
    audit('candidate_export_csv', { count: profiles.length });
  }

  // ── Phase 27 email placeholders ───────────────────────────────────────────────
  function sendCandidateShortlistedNotice(profile, shortlist) {
    if (window.ruthkoEmailAutomation && typeof window.ruthkoEmailAutomation.send === 'function') {
      // Placeholder: log intent but do not send until email template exists
      console.log('[Phase29] sendCandidateShortlistedNotice placeholder — profile:', profile.email, 'shortlist:', shortlist.shortlist_name);
    }
  }

  function sendEmployerShortlistNotice(shortlist) {
    if (window.ruthkoEmailAutomation && typeof window.ruthkoEmailAutomation.send === 'function') {
      console.log('[Phase29] sendEmployerShortlistNotice placeholder — shortlist:', shortlist.shortlist_name);
    }
  }

  function sendCandidateStatusUpdate(profile, newStatus) {
    if (window.ruthkoEmailAutomation && typeof window.ruthkoEmailAutomation.send === 'function') {
      console.log('[Phase29] sendCandidateStatusUpdate placeholder — profile:', profile.email, 'status:', newStatus);
    }
  }

  // ── Auto-create profile from Phase 26 CRM intake ─────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    window.addEventListener('ruthko:intake-submitted', function (e) {
      var submission = e.detail;
      if (submission && submission.submission_type === 'job_seeker') {
        upsertProfileFromSubmission(submission).catch(function () {});
      }
    });
  });

  // ── Public API ────────────────────────────────────────────────────────────────
  window.ruthkoCandidateMatching = {
    CANDIDATE_STATUSES: CANDIDATE_STATUSES,
    SHORTLIST_STATUSES: SHORTLIST_STATUSES,
    getTalentProfiles: getTalentProfiles,
    getTalentProfile: getTalentProfile,
    createTalentProfile: createTalentProfile,
    updateTalentProfile: updateTalentProfile,
    upsertProfileFromSubmission: upsertProfileFromSubmission,
    getTalentStats: getTalentStats,
    addSkill: addSkill,
    deleteSkill: deleteSkill,
    addCertification: addCertification,
    deleteCertification: deleteCertification,
    saveMatchScore: saveMatchScore,
    getMatchScoresForJob: getMatchScoresForJob,
    getNotes: getNotes,
    addNote: addNote,
    exportTalentCsv: exportTalentCsv,
    sendCandidateShortlistedNotice: sendCandidateShortlistedNotice,
    sendEmployerShortlistNotice: sendEmployerShortlistNotice,
    sendCandidateStatusUpdate: sendCandidateStatusUpdate
  };
})();
