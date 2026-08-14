// Phase 26: CRM intake service — public submissions and admin management
(function () {
  'use strict';

  var LOCAL_KEY = 'ruthko_intake_submissions_v1';
  var LOCAL_CONTACTS_KEY = 'ruthko_intake_contacts_v1';
  var MAX_LOCAL = 200;

  function uid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function now() { return new Date().toISOString(); }

  function getLocalSubmissions() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch (_) { return []; }
  }

  function saveLocalSubmission(record) {
    var list = getLocalSubmissions();
    var existing = list.findIndex(function (r) { return r.id === record.id; });
    if (existing >= 0) { list[existing] = record; } else { list.unshift(record); }
    if (list.length > MAX_LOCAL) list.length = MAX_LOCAL;
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  }

  function updateLocalById(key, id, changes) {
    try {
      var list = JSON.parse(localStorage.getItem(key) || '[]');
      var idx = list.findIndex(function (r) { return r.id === id; });
      if (idx >= 0) {
        list[idx] = Object.assign({}, list[idx], changes, { updated_at: now() });
        localStorage.setItem(key, JSON.stringify(list));
        return list[idx];
      }
    } catch (_) {}
    return null;
  }

  // ── Public: submit a form ────────────────────────────────────────────────
  async function submitIntake(data) {
    var client = window.getRuthkoSupabaseClient ? window.getRuthkoSupabaseClient() : null;
    var record = Object.assign({
      id: uid(),
      status: 'new',
      priority: 'normal',
      created_at: now(),
      updated_at: now()
    }, data);

    if (!record.consent_given) {
      return { ok: false, error: 'Consent is required.' };
    }

    if (client) {
      var res = await client.from('crm_intake_submissions').insert([record]).select().single();
      if (!res.error) {
        saveLocalSubmission(res.data);
        window.dispatchEvent(new CustomEvent('ruthko:intake-submitted', { detail: res.data }));
        _fireNotifications(res.data);
        return { ok: true, data: res.data, source: 'supabase' };
      }
    }

    // sample / offline fallback
    saveLocalSubmission(record);
    window.dispatchEvent(new CustomEvent('ruthko:intake-submitted', { detail: record }));
    _fireNotifications(record);
    return { ok: true, data: record, source: 'local' };
  }

  // ── Admin: load submissions with filters ─────────────────────────────────
  async function getSubmissions(filters) {
    filters = filters || {};
    var client = window.getRuthkoSupabaseClient ? window.getRuthkoSupabaseClient() : null;

    if (client) {
      var q = client.from('crm_intake_submissions').select('*').order('created_at', { ascending: false });
      if (filters.submission_type && filters.submission_type !== 'all') q = q.eq('submission_type', filters.submission_type);
      if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters.priority && filters.priority !== 'all') q = q.eq('priority', filters.priority);
      if (filters.preferred_language) q = q.eq('preferred_language', filters.preferred_language);
      if (filters.assigned_to) q = q.eq('assigned_to', filters.assigned_to);
      if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
      if (filters.dateTo) q = q.lte('created_at', filters.dateTo + 'T23:59:59');
      if (filters.search) {
        var s = filters.search;
        q = q.or('first_name.ilike.%' + s + '%,last_name.ilike.%' + s + '%,email.ilike.%' + s + '%,organization_name.ilike.%' + s + '%');
      }
      if (filters.limit) q = q.limit(filters.limit);
      var result = await q;
      if (!result.error) return { data: result.data || [], source: 'supabase' };
    }

    var local = getLocalSubmissions();
    if (filters.submission_type && filters.submission_type !== 'all') local = local.filter(function (r) { return r.submission_type === filters.submission_type; });
    if (filters.status && filters.status !== 'all') local = local.filter(function (r) { return r.status === filters.status; });
    if (filters.search) {
      var srch = (filters.search || '').toLowerCase();
      local = local.filter(function (r) { return ((r.first_name || '') + ' ' + (r.last_name || '') + ' ' + (r.email || '')).toLowerCase().includes(srch); });
    }
    return { data: local, source: 'local' };
  }

  // ── Admin: update a submission ───────────────────────────────────────────
  async function updateSubmission(id, changes) {
    var client = window.getRuthkoSupabaseClient ? window.getRuthkoSupabaseClient() : null;
    var patch = Object.assign({}, changes, { updated_at: now() });

    if (client) {
      var res = await client.from('crm_intake_submissions').update(patch).eq('id', id).select().single();
      if (!res.error) {
        updateLocalById(LOCAL_KEY, id, patch);
        window.dispatchEvent(new CustomEvent('ruthko:intake-updated', { detail: { id: id, changes: patch } }));
        return { ok: true, data: res.data };
      }
    }

    var updated = updateLocalById(LOCAL_KEY, id, patch);
    window.dispatchEvent(new CustomEvent('ruthko:intake-updated', { detail: { id: id, changes: patch } }));
    return { ok: true, data: updated, source: 'local' };
  }

  // ── Admin: create a CRM contact from submission ──────────────────────────
  async function createContact(submission) {
    var client = window.getRuthkoSupabaseClient ? window.getRuthkoSupabaseClient() : null;
    var contact = {
      id: uid(),
      first_name: submission.first_name || '',
      last_name: submission.last_name || '',
      email: submission.email || '',
      phone: submission.phone || '',
      city: submission.city || '',
      state: submission.state || '',
      country: submission.country || '',
      preferred_language: submission.preferred_language || 'en',
      contact_type: submission.submission_type || 'general',
      tags: [submission.submission_type].filter(Boolean),
      source: submission.source_page || 'intake-form',
      created_at: now(),
      updated_at: now()
    };

    if (client) {
      var res = await client.from('crm_contacts').insert([contact]).select().single();
      if (!res.error) {
        _saveLocalItem(LOCAL_CONTACTS_KEY, res.data);
        window.dispatchEvent(new CustomEvent('ruthko:contact-created', { detail: res.data }));
        return { ok: true, data: res.data, source: 'supabase' };
      }
    }

    _saveLocalItem(LOCAL_CONTACTS_KEY, contact);
    window.dispatchEvent(new CustomEvent('ruthko:contact-created', { detail: contact }));
    return { ok: true, data: contact, source: 'local' };
  }

  // ── Admin: create a pipeline item ───────────────────────────────────────
  async function createPipelineItem(opts) {
    var client = window.getRuthkoSupabaseClient ? window.getRuthkoSupabaseClient() : null;
    var item = {
      id: uid(),
      contact_id: opts.contact_id || null,
      submission_id: opts.submission_id || null,
      pipeline_type: opts.pipeline_type || opts.submission_type || 'general',
      stage: 'new',
      priority: opts.priority || 'normal',
      assigned_to: opts.assigned_to || null,
      notes: opts.notes || '',
      created_at: now(),
      updated_at: now()
    };

    if (client) {
      var res = await client.from('crm_pipeline_items').insert([item]).select().single();
      if (!res.error) return { ok: true, data: res.data, source: 'supabase' };
    }
    return { ok: true, data: item, source: 'local' };
  }

  // ── Admin: archive / mark duplicate ─────────────────────────────────────
  async function archiveSubmission(id) {
    return updateSubmission(id, { status: 'archived' });
  }

  async function markDuplicate(id) {
    return updateSubmission(id, { status: 'archived', priority: 'low' });
  }

  // ── Phase 27 notification stubs ──────────────────────────────────────────
  function notifyAdminOfNewSubmission(sub) {
    console.log('[Phase 27 hook] notifyAdminOfNewSubmission:', sub && sub.submission_type);
    return Promise.resolve({ queued: true });
  }

  function sendApplicantConfirmation(sub) {
    console.log('[Phase 27 hook] sendApplicantConfirmation:', sub && sub.email);
    return Promise.resolve({ queued: true });
  }

  function sendEmployerConfirmation(sub) {
    console.log('[Phase 27 hook] sendEmployerConfirmation:', sub && sub.email);
    return Promise.resolve({ queued: true });
  }

  function sendSponsorConfirmation(sub) {
    console.log('[Phase 27 hook] sendSponsorConfirmation:', sub && sub.email);
    return Promise.resolve({ queued: true });
  }

  function _fireNotifications(sub) {
    notifyAdminOfNewSubmission(sub);
    if (sub.submission_type === 'job_seeker') sendApplicantConfirmation(sub);
    if (sub.submission_type === 'employer') sendEmployerConfirmation(sub);
    if (sub.submission_type === 'sponsor') sendSponsorConfirmation(sub);
  }

  function _saveLocalItem(key, item) {
    try {
      var list = JSON.parse(localStorage.getItem(key) || '[]');
      list.unshift(item);
      if (list.length > MAX_LOCAL) list.length = MAX_LOCAL;
      localStorage.setItem(key, JSON.stringify(list));
    } catch (_) {}
  }

  window.ruthkoCrmIntake = {
    submit: submitIntake,
    getSubmissions: getSubmissions,
    updateSubmission: updateSubmission,
    createContact: createContact,
    createPipelineItem: createPipelineItem,
    archive: archiveSubmission,
    markDuplicate: markDuplicate,
    getLocal: getLocalSubmissions,
    notifyAdminOfNewSubmission: notifyAdminOfNewSubmission,
    sendApplicantConfirmation: sendApplicantConfirmation,
    sendEmployerConfirmation: sendEmployerConfirmation,
    sendSponsorConfirmation: sendSponsorConfirmation
  };
})();
