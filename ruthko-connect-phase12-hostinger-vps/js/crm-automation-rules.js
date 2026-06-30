// Phase 27: CRM automation rules engine — manages tasks and follow-up scheduling
(function () {
  'use strict';

  var LOCAL_TASKS_KEY = 'ruthko_automation_tasks_v1';
  var LOCAL_RULES_KEY = 'ruthko_automation_rules_v1';
  var MAX_LOCAL = 500;

  var DEFAULT_RULES = [
    { id: 'default-job-seeker', rule_name: 'Job seeker 24h follow-up', trigger_type: 'form_submit', submission_type: 'job_seeker', is_active: true, delay_hours: 24, action_type: 'create_task', template_key: 'applicant_follow_up', assigned_role: 'editor' },
    { id: 'default-employer', rule_name: 'Employer 4h priority follow-up', trigger_type: 'form_submit', submission_type: 'employer', is_active: true, delay_hours: 4, action_type: 'create_task', template_key: 'employer_follow_up', assigned_role: 'admin' },
    { id: 'default-sponsor', rule_name: 'Sponsor 24h partnership follow-up', trigger_type: 'form_submit', submission_type: 'sponsor', is_active: true, delay_hours: 24, action_type: 'create_task', template_key: 'sponsor_follow_up', assigned_role: 'admin' },
    { id: 'default-partner', rule_name: 'Partner 48h outreach follow-up', trigger_type: 'form_submit', submission_type: 'partner', is_active: true, delay_hours: 48, action_type: 'create_task', template_key: 'partner_follow_up', assigned_role: 'editor' },
    { id: 'default-volunteer', rule_name: 'Volunteer 48h coordinator follow-up', trigger_type: 'form_submit', submission_type: 'volunteer', is_active: true, delay_hours: 48, action_type: 'create_task', template_key: 'volunteer_follow_up', assigned_role: 'editor' },
    { id: 'default-rsvp', rule_name: 'RSVP event day-before reminder', trigger_type: 'form_submit', submission_type: 'event_rsvp', is_active: true, delay_hours: 24, action_type: 'create_task', template_key: 'rsvp_follow_up', assigned_role: 'editor' }
  ];

  function uid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function now() { return new Date().toISOString(); }

  function hoursFromNow(h) {
    var d = new Date();
    d.setHours(d.getHours() + (Number(h) || 24));
    return d.toISOString();
  }

  function getLocalTasks() {
    try { return JSON.parse(localStorage.getItem(LOCAL_TASKS_KEY) || '[]'); } catch (_) { return []; }
  }

  function saveLocalTask(task) {
    var list = getLocalTasks();
    var idx = list.findIndex(function (t) { return t.id === task.id; });
    if (idx >= 0) { list[idx] = task; } else { list.unshift(task); }
    if (list.length > MAX_LOCAL) list.length = MAX_LOCAL;
    localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(list));
  }

  function updateLocalTask(id, changes) {
    var list = getLocalTasks();
    var idx = list.findIndex(function (t) { return t.id === id; });
    if (idx >= 0) {
      list[idx] = Object.assign({}, list[idx], changes, { updated_at: now() });
      localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(list));
      return list[idx];
    }
    return null;
  }

  // ── Rules ─────────────────────────────────────────────────────────────────
  async function getRules(submissionType) {
    var client = window.getRuthkoSupabaseClient ? window.getRuthkoSupabaseClient() : null;
    if (client) {
      try {
        var q = client.from('crm_automation_rules').select('*').eq('is_active', true);
        if (submissionType) q = q.eq('submission_type', submissionType);
        var res = await q;
        if (!res.error && res.data && res.data.length) return res.data;
      } catch (_) {}
    }
    return DEFAULT_RULES.filter(function (r) { return !submissionType || r.submission_type === submissionType; });
  }

  // ── Tasks ─────────────────────────────────────────────────────────────────
  async function createAutomationTask(rule, submission) {
    var client = window.getRuthkoSupabaseClient ? window.getRuthkoSupabaseClient() : null;
    var task = {
      id: uid(),
      rule_id: rule.id || null,
      submission_id: submission.id || null,
      contact_id: null,
      task_type: rule.template_key || rule.rule_name || 'follow_up',
      status: 'pending',
      due_at: hoursFromNow(rule.delay_hours || 24),
      completed_at: null,
      error_message: null,
      created_at: now(),
      updated_at: now()
    };

    if (client) {
      try {
        var res = await client.from('crm_automation_tasks').insert([task]).select().single();
        if (!res.error) {
          saveLocalTask(res.data);
          window.dispatchEvent(new CustomEvent('ruthko:automation-task-created', { detail: res.data }));
          return { ok: true, data: res.data, source: 'supabase' };
        }
      } catch (_) {}
    }

    saveLocalTask(task);
    window.dispatchEvent(new CustomEvent('ruthko:automation-task-created', { detail: task }));
    return { ok: true, data: task, source: 'local' };
  }

  // Process all applicable rules for a submission
  async function processSubmission(submission) {
    if (!submission || !submission.submission_type) return { ok: false, error: 'No submission_type' };
    var rules = await getRules(submission.submission_type);
    var results = [];
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (rule.action_type === 'create_task') {
        var res = await createAutomationTask(rule, submission);
        results.push(res);
      }
    }
    return { ok: true, tasksCreated: results.length, results: results };
  }

  async function getActiveTasks(filters) {
    filters = filters || {};
    var client = window.getRuthkoSupabaseClient ? window.getRuthkoSupabaseClient() : null;
    if (client) {
      try {
        var q = client.from('crm_automation_tasks').select('*').order('due_at', { ascending: true });
        if (filters.status) q = q.eq('status', filters.status);
        if (filters.submission_id) q = q.eq('submission_id', filters.submission_id);
        if (filters.limit) q = q.limit(filters.limit);
        var res = await q;
        if (!res.error) return { data: res.data || [], source: 'supabase' };
      } catch (_) {}
    }
    var local = getLocalTasks();
    if (filters.status) local = local.filter(function (t) { return t.status === filters.status; });
    if (filters.submission_id) local = local.filter(function (t) { return t.submission_id === filters.submission_id; });
    return { data: local, source: 'local' };
  }

  async function getOverdueTasks() {
    var all = await getActiveTasks({ status: 'pending' });
    var nowStr = now();
    var overdue = (all.data || []).filter(function (t) { return t.due_at && t.due_at < nowStr; });
    return { data: overdue, source: all.source };
  }

  async function updateTaskStatus(id, status, errorMessage) {
    var client = window.getRuthkoSupabaseClient ? window.getRuthkoSupabaseClient() : null;
    var patch = {
      status: status,
      updated_at: now(),
      completed_at: (status === 'completed') ? now() : null,
      error_message: errorMessage || null
    };

    if (client) {
      try {
        var res = await client.from('crm_automation_tasks').update(patch).eq('id', id).select().single();
        if (!res.error) {
          updateLocalTask(id, patch);
          window.dispatchEvent(new CustomEvent('ruthko:automation-task-' + status, { detail: { id: id } }));
          return { ok: true, data: res.data };
        }
      } catch (_) {}
    }

    var updated = updateLocalTask(id, patch);
    window.dispatchEvent(new CustomEvent('ruthko:automation-task-' + status, { detail: { id: id } }));
    return { ok: true, data: updated, source: 'local' };
  }

  // Listen for intake submissions to auto-create tasks (Phase 26 integration)
  window.addEventListener('ruthko:intake-submitted', function (e) {
    var sub = e.detail;
    if (sub && sub.submission_type) {
      processSubmission(sub);
    }
  });

  window.ruthkoAutomation = {
    processSubmission: processSubmission,
    createAutomationTask: createAutomationTask,
    getActiveTasks: getActiveTasks,
    getOverdueTasks: getOverdueTasks,
    updateTaskStatus: updateTaskStatus,
    getRules: getRules,
    getLocalTasks: getLocalTasks,
    DEFAULT_RULES: DEFAULT_RULES
  };
})();
