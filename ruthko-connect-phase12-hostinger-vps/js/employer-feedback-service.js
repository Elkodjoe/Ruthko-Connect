(function () {
  'use strict';

  var FEEDBACK_KEY  = 'ruthko_employer_feedback_v1';
  var ACCOUNTS_KEY  = 'ruthko_employer_accounts_v1';
  var ACCESS_KEY    = 'ruthko_employer_portal_access_v1';
  var MESSAGES_KEY  = 'ruthko_employer_messages_v1';

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

  var FEEDBACK_STATUSES = ['interested', 'maybe', 'not_a_fit', 'request_interview', 'need_more_information', 'rejected'];

  // ── Employer Accounts ─────────────────────────────────────────────────────────
  async function getEmployerAccounts(filters) {
    var f = filters || {};
    var client = getClient();
    if (client) {
      try {
        var q = client.from('employer_accounts').select('*').order('created_at', { ascending: false });
        if (f.is_active !== undefined) q = q.eq('is_active', f.is_active);
        if (f.email) q = q.ilike('email', '%' + f.email + '%');
        var r = await q;
        if (!r.error) { saveLocal(ACCOUNTS_KEY, r.data || []); return r.data || []; }
      } catch (_) {}
    }
    return loadLocal(ACCOUNTS_KEY);
  }

  async function createEmployerAccount(data) {
    var acct = Object.assign({ id: genId(), is_active: true, created_at: now(), updated_at: now() }, data);
    var client = getClient();
    if (client) {
      try {
        var r = await client.from('employer_accounts').insert(acct).select().single();
        if (!r.error) {
          audit('employer_account_create', { employer_account_id: r.data.id, email: r.data.email });
          dispatch('ruthko:employer-account-created', r.data);
          return { ok: true, data: r.data };
        }
        return { ok: false, error: r.error.message };
      } catch (e) { return { ok: false, error: e.message }; }
    }
    var local = loadLocal(ACCOUNTS_KEY); local.unshift(acct); saveLocal(ACCOUNTS_KEY, local);
    return { ok: true, data: acct, local: true };
  }

  async function updateEmployerAccount(id, data) {
    var update = Object.assign({}, data, { updated_at: now() });
    var client = getClient();
    if (client) {
      try {
        var r = await client.from('employer_accounts').update(update).eq('id', id).select().single();
        if (!r.error) { dispatch('ruthko:employer-account-updated', r.data); return { ok: true, data: r.data }; }
        return { ok: false, error: r.error.message };
      } catch (e) { return { ok: false, error: e.message }; }
    }
    var local = loadLocal(ACCOUNTS_KEY);
    var idx = local.findIndex(function (a) { return a.id === id; });
    if (idx !== -1) { local[idx] = Object.assign(local[idx], update); saveLocal(ACCOUNTS_KEY, local); }
    return { ok: true, local: true };
  }

  // ── Portal Access ─────────────────────────────────────────────────────────────
  async function createPortalAccess(data) {
    var hash = data.access_token_hash;
    var entry = Object.assign({ id: genId(), access_status: 'active', created_at: now(), updated_at: now() }, data, { access_token_hash: hash });
    var client = getClient();
    if (client) {
      try {
        var r = await client.from('employer_portal_access').insert(entry).select().single();
        if (!r.error) {
          audit('employer_portal_access_create', { access_id: r.data.id, employer_account_id: r.data.employer_account_id });
          dispatch('ruthko:employer-portal-access-created', r.data);
          return { ok: true, data: r.data };
        }
        return { ok: false, error: r.error.message };
      } catch (e) { return { ok: false, error: e.message }; }
    }
    var local = loadLocal(ACCESS_KEY); local.unshift(entry); saveLocal(ACCESS_KEY, local);
    return { ok: true, data: entry, local: true };
  }

  async function revokePortalAccess(id) {
    var client = getClient();
    if (client) {
      try {
        var r = await client.from('employer_portal_access').update({ access_status: 'revoked', updated_at: now() }).eq('id', id).select().single();
        if (!r.error) {
          audit('employer_portal_access_revoke', { access_id: id });
          return { ok: true, data: r.data };
        }
        return { ok: false, error: r.error.message };
      } catch (e) { return { ok: false, error: e.message }; }
    }
    var local = loadLocal(ACCESS_KEY);
    var idx = local.findIndex(function (a) { return a.id === id; });
    if (idx !== -1) { local[idx].access_status = 'revoked'; local[idx].updated_at = now(); saveLocal(ACCESS_KEY, local); }
    return { ok: true, local: true };
  }

  async function getPortalAccessList(filters) {
    var f = filters || {};
    var client = getClient();
    if (client) {
      try {
        var q = client.from('employer_portal_access').select('*, employer_accounts(company_name, contact_name, email), employer_shortlists(shortlist_name), employer_staffing_orders(job_title, order_status)').order('created_at', { ascending: false });
        if (f.employer_account_id) q = q.eq('employer_account_id', f.employer_account_id);
        if (f.access_status)      q = q.eq('access_status', f.access_status);
        var r = await q;
        if (!r.error) { saveLocal(ACCESS_KEY, r.data || []); return r.data || []; }
      } catch (_) {}
    }
    return loadLocal(ACCESS_KEY);
  }

  // ── Share Shortlist (admin action) ────────────────────────────────────────────
  async function shareShortlistWithEmployer(shortlistId, employerAccountId, orderId, expiresAt) {
    var auth = window.ruthkoEmployerAuth;
    if (!auth) return { ok: false, error: 'Auth service not loaded.' };

    // Generate a random token, hash it
    var rawToken = [Date.now(), Math.random().toString(36).slice(2), Math.random().toString(36).slice(2)].join('-');
    var tokenHash = await auth.hashToken(rawToken);

    var result = await createPortalAccess({
      employer_account_id: employerAccountId,
      shortlist_id: shortlistId,
      staffing_order_id: orderId || null,
      access_token_hash: tokenHash,
      expires_at: expiresAt || null
    });

    if (!result.ok) return result;

    // Mark shortlist as sent_to_employer
    if (window.ruthkoShortlists) {
      await window.ruthkoShortlists.updateShortlist(shortlistId, { status: 'sent_to_employer' }).catch(function () {});
    }

    audit('employer_shortlist_share', { shortlist_id: shortlistId, employer_account_id: employerAccountId });
    dispatch('ruthko:shortlist-shared', { shortlist_id: shortlistId, employer_account_id: employerAccountId });

    // Email placeholder
    sendShortlistSharedNotice(employerAccountId, shortlistId, rawToken);

    return { ok: true, data: result.data, rawToken: rawToken };
  }

  // ── Feedback ──────────────────────────────────────────────────────────────────
  async function getFeedback(filters) {
    var f = filters || {};
    var client = getClient();
    if (client) {
      try {
        var q = client.from('employer_shortlist_feedback').select('*, talent_profiles(first_name, last_name, desired_job_type, city, state, status)').order('updated_at', { ascending: false });
        if (f.shortlist_id)          q = q.eq('shortlist_id', f.shortlist_id);
        if (f.employer_account_id)   q = q.eq('employer_account_id', f.employer_account_id);
        if (f.feedback_status)       q = q.eq('feedback_status', f.feedback_status);
        if (f.interview_requested)   q = q.eq('interview_requested', true);
        var r = await q;
        if (!r.error) { saveLocal(FEEDBACK_KEY, r.data || []); return r.data || []; }
      } catch (_) {}
    }
    var local = loadLocal(FEEDBACK_KEY);
    if (f.shortlist_id)        local = local.filter(function (x) { return x.shortlist_id === f.shortlist_id; });
    if (f.employer_account_id) local = local.filter(function (x) { return x.employer_account_id === f.employer_account_id; });
    return local;
  }

  async function submitFeedback(data) {
    // Upsert: delete existing then insert
    var entry = Object.assign({ id: genId(), feedback_status: 'maybe', interview_requested: false, created_at: now(), updated_at: now() }, data);
    var client = getClient();
    if (client) {
      try {
        // Check for existing by shortlist_candidate_id + employer_account_id
        var existing = await client.from('employer_shortlist_feedback').select('id').match({
          shortlist_candidate_id: data.shortlist_candidate_id,
          employer_account_id: data.employer_account_id
        }).single();
        var r;
        if (existing.data) {
          r = await client.from('employer_shortlist_feedback').update(Object.assign({}, data, { updated_at: now() })).eq('id', existing.data.id).select().single();
        } else {
          r = await client.from('employer_shortlist_feedback').insert(entry).select().single();
        }
        if (!r.error) {
          var action = data.interview_requested ? 'employer_interview_request' : 'employer_candidate_feedback';
          audit(action, { shortlist_id: data.shortlist_id, talent_profile_id: data.talent_profile_id, feedback_status: data.feedback_status });
          dispatch('ruthko:employer-feedback-submitted', r.data);
          if (data.interview_requested) sendInterviewRequestedNotice(data);
          else sendEmployerFeedbackNotice(data);
          return { ok: true, data: r.data };
        }
        return { ok: false, error: r.error.message };
      } catch (e) { return { ok: false, error: e.message }; }
    }
    var local = loadLocal(FEEDBACK_KEY);
    var idx = local.findIndex(function (x) { return x.shortlist_candidate_id === data.shortlist_candidate_id && x.employer_account_id === data.employer_account_id; });
    if (idx !== -1) { local[idx] = Object.assign(local[idx], data, { updated_at: now() }); }
    else { local.unshift(entry); }
    saveLocal(FEEDBACK_KEY, local, 300);
    return { ok: true, data: entry, local: true };
  }

  // ── Messages ──────────────────────────────────────────────────────────────────
  async function getMessages(staffingOrderId) {
    var client = getClient();
    if (client) {
      try {
        var r = await client.from('employer_order_messages').select('*').eq('staffing_order_id', staffingOrderId).order('created_at', { ascending: true });
        if (!r.error) return r.data || [];
      } catch (_) {}
    }
    return loadLocal(MESSAGES_KEY).filter(function (m) { return m.staffing_order_id === staffingOrderId; });
  }

  async function sendMessage(employerAccountId, staffingOrderId, text, senderType) {
    var msg = {
      id: genId(), employer_account_id: employerAccountId, staffing_order_id: staffingOrderId,
      sender_type: senderType || 'employer', message_text: text, is_read: false, created_at: now()
    };
    var client = getClient();
    if (client) {
      try {
        var r = await client.from('employer_order_messages').insert(msg).select().single();
        if (!r.error) {
          audit('employer_message_create', { employer_account_id: employerAccountId, staffing_order_id: staffingOrderId });
          dispatch('ruthko:employer-message-sent', r.data);
          return { ok: true, data: r.data };
        }
        return { ok: false, error: r.error.message };
      } catch (e) { return { ok: false, error: e.message }; }
    }
    var local = loadLocal(MESSAGES_KEY); local.push(msg); saveLocal(MESSAGES_KEY, local, 300);
    return { ok: true, data: msg, local: true };
  }

  async function requestMoreCandidates(employerAccountId, staffingOrderId, note) {
    audit('employer_more_candidates_request', { employer_account_id: employerAccountId, staffing_order_id: staffingOrderId });
    return sendMessage(employerAccountId, staffingOrderId, '[System] Employer requested more candidates. Note: ' + (note || 'none.'), 'system');
  }

  // ── Email Placeholders ────────────────────────────────────────────────────────
  function sendEmployerPortalInvite(employerAccountId, email) {
    console.log('[Phase30] sendEmployerPortalInvite → employer_account_id:', employerAccountId, 'email:', email);
    _logEmailPlaceholder('employer_portal_invite', email, 'Ruthko Connect — Employer Portal Access');
  }

  function sendShortlistSharedNotice(employerAccountId, shortlistId, rawToken) {
    console.log('[Phase30] sendShortlistSharedNotice → shortlist_id:', shortlistId, 'token (first 8):', rawToken ? rawToken.slice(0, 8) : 'n/a');
    _logEmailPlaceholder('employer_shortlist_shared', null, 'Your candidate shortlist is ready for review');
  }

  function sendEmployerFeedbackNotice(feedback) {
    console.log('[Phase30] sendEmployerFeedbackNotice → talent_profile_id:', feedback.talent_profile_id, 'status:', feedback.feedback_status);
    _logEmailPlaceholder('employer_feedback_notice', null, 'Employer submitted candidate feedback');
  }

  function sendInterviewRequestedNotice(feedback) {
    console.log('[Phase30] sendInterviewRequestedNotice → talent_profile_id:', feedback.talent_profile_id);
    _logEmailPlaceholder('employer_interview_requested', null, 'Interview requested by employer');
  }

  function _logEmailPlaceholder(emailType, recipient, subject) {
    try {
      var logs = JSON.parse(localStorage.getItem('ruthko_email_logs_v1') || '[]');
      logs.unshift({ id: 'local-' + Date.now(), email_type: emailType, recipient_email: recipient || 'employer@portal', subject: subject, status: 'pending', created_at: new Date().toISOString() });
      localStorage.setItem('ruthko_email_logs_v1', JSON.stringify(logs.slice(0, 300)));
    } catch (_) {}
  }

  // ── Stats for admin dashboard ─────────────────────────────────────────────────
  async function getPortalStats() {
    var client = getClient();
    if (client) {
      try {
        var [accts, accesses, feedbacks, messages] = await Promise.all([
          client.from('employer_accounts').select('id, is_active', { count: 'exact' }),
          client.from('employer_portal_access').select('id, access_status', { count: 'exact' }),
          client.from('employer_shortlist_feedback').select('id, feedback_status, interview_requested'),
          client.from('employer_order_messages').select('id, is_read, sender_type')
        ]);
        var fb = (feedbacks.data || []);
        var msgs = (messages.data || []);
        return {
          totalAccounts:     (accts.data || []).length,
          activeAccounts:    (accts.data || []).filter(function (a) { return a.is_active; }).length,
          activeAccesses:    (accesses.data || []).filter(function (a) { return a.access_status === 'active'; }).length,
          totalFeedback:     fb.length,
          interviewRequests: fb.filter(function (f) { return f.interview_requested; }).length,
          unreadMessages:    msgs.filter(function (m) { return !m.is_read && m.sender_type === 'employer'; }).length
        };
      } catch (_) {}
    }
    var fb = loadLocal(FEEDBACK_KEY);
    return {
      totalAccounts: loadLocal(ACCOUNTS_KEY).length,
      activeAccounts: loadLocal(ACCOUNTS_KEY).filter(function (a) { return a.is_active; }).length,
      activeAccesses: loadLocal(ACCESS_KEY).filter(function (a) { return a.access_status === 'active'; }).length,
      totalFeedback: fb.length,
      interviewRequests: fb.filter(function (f) { return f.interview_requested; }).length,
      unreadMessages: loadLocal(MESSAGES_KEY).filter(function (m) { return !m.is_read && m.sender_type === 'employer'; }).length
    };
  }

  window.ruthkoEmployerFeedback = {
    FEEDBACK_STATUSES: FEEDBACK_STATUSES,
    getEmployerAccounts: getEmployerAccounts,
    createEmployerAccount: createEmployerAccount,
    updateEmployerAccount: updateEmployerAccount,
    createPortalAccess: createPortalAccess,
    revokePortalAccess: revokePortalAccess,
    getPortalAccessList: getPortalAccessList,
    shareShortlistWithEmployer: shareShortlistWithEmployer,
    getFeedback: getFeedback,
    submitFeedback: submitFeedback,
    getMessages: getMessages,
    sendMessage: sendMessage,
    requestMoreCandidates: requestMoreCandidates,
    getPortalStats: getPortalStats,
    sendEmployerPortalInvite: sendEmployerPortalInvite,
    sendShortlistSharedNotice: sendShortlistSharedNotice,
    sendEmployerFeedbackNotice: sendEmployerFeedbackNotice,
    sendInterviewRequestedNotice: sendInterviewRequestedNotice
  };
})();
