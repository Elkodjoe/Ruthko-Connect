// Phase 27: Email automation service — frontend bridge to Netlify send-email function
// No API keys. All secrets stay server-side. Frontend only posts submission data.
(function () {
  'use strict';

  var SEND_ENDPOINT = '/.netlify/functions/send-email';
  var AUTOMATION_ENDPOINT = '/.netlify/functions/process-crm-automation';
  var LOCAL_EMAIL_LOG_KEY = 'ruthko_email_logs_v1';
  var MAX_LOCAL_LOGS = 300;

  function uid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function now() { return new Date().toISOString(); }

  function getLocalLogs() {
    try { return JSON.parse(localStorage.getItem(LOCAL_EMAIL_LOG_KEY) || '[]'); } catch (_) { return []; }
  }

  function saveLocalLog(record) {
    var list = getLocalLogs();
    var idx = list.findIndex(function (r) { return r.id === record.id; });
    if (idx >= 0) { list[idx] = record; } else { list.unshift(record); }
    if (list.length > MAX_LOCAL_LOGS) list.length = MAX_LOCAL_LOGS;
    localStorage.setItem(LOCAL_EMAIL_LOG_KEY, JSON.stringify(list));
  }

  async function persistEmailLog(logRecord) {
    saveLocalLog(logRecord);
    var client = window.getRuthkoSupabaseClient ? window.getRuthkoSupabaseClient() : null;
    if (!client) return;
    try {
      await client.from('crm_email_logs').insert([logRecord]);
    } catch (_) {}
  }

  async function updateEmailLog(id, changes) {
    var list = getLocalLogs();
    var idx = list.findIndex(function (r) { return r.id === id; });
    if (idx >= 0) { list[idx] = Object.assign({}, list[idx], changes); localStorage.setItem(LOCAL_EMAIL_LOG_KEY, JSON.stringify(list)); }
    var client = window.getRuthkoSupabaseClient ? window.getRuthkoSupabaseClient() : null;
    if (!client) return;
    try { await client.from('crm_email_logs').update(changes).eq('id', id); } catch (_) {}
  }

  // ── Core send function ─────────────────────────────────────────────────────
  async function sendEmail(emailType, submission) {
    var logId = uid();
    var logRecord = {
      id: logId,
      submission_id: submission.id || null,
      contact_id: null,
      email_type: emailType,
      recipient_email: emailType === 'admin_notification' ? (submission._adminEmail || 'admin') : (submission.email || ''),
      subject: null,
      status: 'pending',
      provider_response: null,
      error_message: null,
      sent_at: null,
      created_at: now()
    };

    await persistEmailLog(logRecord);
    window.dispatchEvent(new CustomEvent('ruthko:email-send-attempt', { detail: { emailType: emailType, logId: logId } }));

    try {
      var response = await fetch(SEND_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailType: emailType, submission: submission })
      });

      var data = {};
      try { data = await response.json(); } catch (_) { data = { ok: false, error: 'Invalid response' }; }

      if (data.skipped) {
        await updateEmailLog(logId, { status: 'skipped', provider_response: { reason: data.reason }, sent_at: now() });
        window.dispatchEvent(new CustomEvent('ruthko:email-skipped', { detail: { emailType: emailType, reason: data.reason } }));
        return { ok: true, skipped: true, logId: logId };
      }

      if (data.ok) {
        await updateEmailLog(logId, { status: 'sent', subject: data.subject || null, provider_response: { messageId: data.messageId }, sent_at: now() });
        window.dispatchEvent(new CustomEvent('ruthko:email-sent', { detail: { emailType: emailType, logId: logId } }));
        return { ok: true, logId: logId, messageId: data.messageId };
      }

      // Provider returned ok:false
      var errMsg = data.error || 'Send failed';
      await updateEmailLog(logId, { status: 'failed', error_message: errMsg, provider_response: data });
      window.dispatchEvent(new CustomEvent('ruthko:email-failed', { detail: { emailType: emailType, error: errMsg } }));
      return { ok: false, error: errMsg, logId: logId };

    } catch (err) {
      // Network error — form submission already saved, don't block user
      var netErr = err.message || 'Network error';
      await updateEmailLog(logId, { status: 'failed', error_message: netErr });
      window.dispatchEvent(new CustomEvent('ruthko:email-failed', { detail: { emailType: emailType, error: netErr } }));
      return { ok: false, error: netErr, logId: logId };
    }
  }

  // ── Public form notification suite ─────────────────────────────────────────
  async function notifyAdminOfNewSubmission(submission) {
    return sendEmail('admin_notification', submission);
  }

  async function sendApplicantConfirmation(submission) {
    return sendEmail('applicant_confirmation', submission);
  }

  async function sendEmployerConfirmation(submission) {
    return sendEmail('employer_confirmation', submission);
  }

  async function sendSponsorConfirmation(submission) {
    return sendEmail('sponsor_confirmation', submission);
  }

  async function sendPartnerConfirmation(submission) {
    return sendEmail('partner_confirmation', submission);
  }

  async function sendVolunteerConfirmation(submission) {
    return sendEmail('volunteer_confirmation', submission);
  }

  async function sendRsvpConfirmation(submission) {
    return sendEmail('rsvp_confirmation', submission);
  }

  // ── Resend a failed email (admin action) ──────────────────────────────────
  async function resendEmail(logId) {
    var logs = getLocalLogs();
    var log = logs.find(function (l) { return l.id === logId; });
    if (!log) return { ok: false, error: 'Log not found' };
    window.dispatchEvent(new CustomEvent('ruthko:email-resend', { detail: { logId: logId } }));
    // Re-use the stored email_type; submission must be re-fetched from intake if needed
    return { ok: true, queued: true, note: 'Resend queued — load submission from intake to re-trigger' };
  }

  // ── Admin: get email logs ─────────────────────────────────────────────────
  async function getEmailLogs(filters) {
    filters = filters || {};
    var client = window.getRuthkoSupabaseClient ? window.getRuthkoSupabaseClient() : null;
    if (client) {
      try {
        var q = client.from('crm_email_logs').select('*').order('created_at', { ascending: false });
        if (filters.status) q = q.eq('status', filters.status);
        if (filters.email_type) q = q.eq('email_type', filters.email_type);
        if (filters.submission_id) q = q.eq('submission_id', filters.submission_id);
        if (filters.limit) q = q.limit(filters.limit);
        var res = await q;
        if (!res.error) return { data: res.data || [], source: 'supabase' };
      } catch (_) {}
    }
    var local = getLocalLogs();
    if (filters.status) local = local.filter(function (l) { return l.status === filters.status; });
    if (filters.email_type) local = local.filter(function (l) { return l.email_type === filters.email_type; });
    if (filters.limit) local = local.slice(0, filters.limit);
    return { data: local, source: 'local' };
  }

  // ── Trigger automation tasks via Netlify function ─────────────────────────
  async function triggerAutomation(submissionId, submissionType, contactId) {
    try {
      var res = await fetch(AUTOMATION_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: submissionId, submissionType: submissionType, contactId: contactId || null })
      });
      var data = await res.json().catch(function () { return {}; });
      window.dispatchEvent(new CustomEvent('ruthko:automation-triggered', { detail: data }));
      return data;
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // ── Patch Phase 26 notification stubs when ruthkoCrmIntake is available ───
  function patchPhase26Stubs() {
    if (!window.ruthkoCrmIntake) return;
    window.ruthkoCrmIntake.notifyAdminOfNewSubmission = notifyAdminOfNewSubmission;
    window.ruthkoCrmIntake.sendApplicantConfirmation = sendApplicantConfirmation;
    window.ruthkoCrmIntake.sendEmployerConfirmation = sendEmployerConfirmation;
    window.ruthkoCrmIntake.sendSponsorConfirmation = sendSponsorConfirmation;
  }

  document.addEventListener('DOMContentLoaded', function () {
    patchPhase26Stubs();
    // Patch ruthko:intake-submitted to also trigger automation
    window.addEventListener('ruthko:intake-submitted', function (e) {
      var sub = e.detail || {};
      if (sub.id && sub.submission_type) {
        triggerAutomation(sub.id, sub.submission_type, null);
      }
    });
  });

  window.ruthkoEmailAutomation = {
    send: sendEmail,
    notifyAdminOfNewSubmission: notifyAdminOfNewSubmission,
    sendApplicantConfirmation: sendApplicantConfirmation,
    sendEmployerConfirmation: sendEmployerConfirmation,
    sendSponsorConfirmation: sendSponsorConfirmation,
    sendPartnerConfirmation: sendPartnerConfirmation,
    sendVolunteerConfirmation: sendVolunteerConfirmation,
    sendRsvpConfirmation: sendRsvpConfirmation,
    resendEmail: resendEmail,
    getEmailLogs: getEmailLogs,
    triggerAutomation: triggerAutomation,
    getLocalLogs: getLocalLogs
  };
})();
