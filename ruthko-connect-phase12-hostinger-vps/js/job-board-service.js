(function () {
  'use strict';

  var POSTS_KEY   = 'ruthko_job_posts_v1';
  var ORDERS_KEY  = 'ruthko_staffing_orders_v1';
  var APPS_KEY    = 'ruthko_job_applications_v1';

  var JOB_CATEGORIES   = ['CNA','LPN','RN','Caregiver','Hospitality','Warehouse','Agriculture','Teacher','Event staff','Security','General labor','Administrative','Other'];
  var EMPLOYMENT_TYPES = ['Full-time','Part-time','Contract','Temporary','Seasonal','Sponsorship pathway','International recruitment'];
  var JOB_STATUSES     = ['draft','review','published','paused','filled','closed','archived'];
  var ORDER_STATUSES   = ['new','reviewing','quoted','approved','recruiting','partially_filled','filled','closed','cancelled'];
  var APP_STATUSES     = ['new','reviewing','contacted','screening','interview','offered','hired','rejected','withdrawn'];

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function getClient() {
    if (typeof window.getRuthkoSupabaseClient === 'function') return window.getRuthkoSupabaseClient();
    if (window.RUTHKO_SUPABASE && window.RUTHKO_SUPABASE.sampleMode) return null;
    return null;
  }

  function loadLocal(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (_) { return []; }
  }

  function saveLocal(key, items, limit) {
    try { localStorage.setItem(key, JSON.stringify((items || []).slice(0, limit || 500))); } catch (_) {}
  }

  function genId() {
    return 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  }

  function now() { return new Date().toISOString(); }

  function makeSlug(title) {
    return String(title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) + '-' + Date.now().toString(36);
  }

  function dispatch(name, detail) {
    try { window.dispatchEvent(new CustomEvent(name, { detail: detail || {} })); } catch (_) {}
  }

  function audit(action, meta) {
    if (window.ruthkoAudit && typeof window.ruthkoAudit.log === 'function') {
      window.ruthkoAudit.log(action, meta).catch(function () {});
    }
  }

  // ── Job Posts ─────────────────────────────────────────────────────────────────
  async function getPublishedJobs(filters) {
    var f = filters || {};
    var client = getClient();
    if (client) {
      try {
        var q = client.from('job_posts').select('*').eq('is_public', true).eq('status', 'published').order('published_at', { ascending: false });
        if (f.job_category) q = q.eq('job_category', f.job_category);
        if (f.employment_type) q = q.eq('employment_type', f.employment_type);
        if (f.shift_type) q = q.eq('shift_type', f.shift_type);
        if (f.housing_support) q = q.eq('housing_support', true);
        if (f.transportation_support) q = q.eq('transportation_support', true);
        if (f.keyword) q = q.or('title.ilike.%' + f.keyword + '%,short_description.ilike.%' + f.keyword + '%,city.ilike.%' + f.keyword + '%');
        if (f.location) q = q.or('city.ilike.%' + f.location + '%,state.ilike.%' + f.location + '%,country.ilike.%' + f.location + '%');
        if (f.limit) q = q.limit(f.limit);
        var result = await q;
        if (!result.error) return result.data || [];
      } catch (_) {}
    }
    var local = loadLocal(POSTS_KEY).filter(function (p) { return p.is_public && p.status === 'published'; });
    return applyJobFilters(local, f);
  }

  async function getAllJobPosts(filters) {
    var f = filters || {};
    var client = getClient();
    if (client) {
      try {
        var q = client.from('job_posts').select('*').order('created_at', { ascending: false });
        if (f.status) q = q.eq('status', f.status);
        if (f.job_category) q = q.eq('job_category', f.job_category);
        if (f.staffing_order_id) q = q.eq('staffing_order_id', f.staffing_order_id);
        if (f.keyword) q = q.or('title.ilike.%' + f.keyword + '%,company_name.ilike.%' + f.keyword + '%');
        if (f.limit) q = q.limit(f.limit);
        var result = await q;
        if (!result.error) {
          saveLocal(POSTS_KEY, result.data || []);
          return result.data || [];
        }
      } catch (_) {}
    }
    var local = loadLocal(POSTS_KEY);
    if (f.status) local = local.filter(function (p) { return p.status === f.status; });
    return local;
  }

  async function getJobPost(id) {
    var client = getClient();
    if (client) {
      try {
        var result = await client.from('job_posts').select('*').eq('id', id).single();
        if (!result.error) return result.data;
      } catch (_) {}
    }
    return loadLocal(POSTS_KEY).find(function (p) { return p.id === id; }) || null;
  }

  async function createJobPost(data) {
    var post = Object.assign({
      id: genId(),
      status: 'draft',
      is_public: false,
      language: 'en',
      job_category: 'Other',
      employment_type: 'Full-time',
      country: 'United States',
      show_company_name: false,
      housing_support: false,
      transportation_support: false,
      requirements_json: [],
      benefits_json: [],
      created_at: now(),
      updated_at: now()
    }, data);
    post.slug = post.slug || makeSlug(post.title);
    var client = getClient();
    if (client) {
      try {
        var result = await client.from('job_posts').insert(post).select().single();
        if (!result.error) {
          post = result.data;
          audit('job_post_create', { job_post_id: post.id, title: post.title });
          dispatch('ruthko:job-created', post);
          return { ok: true, data: post };
        }
        return { ok: false, error: result.error.message };
      } catch (e) { return { ok: false, error: e.message }; }
    }
    var local = loadLocal(POSTS_KEY);
    local.unshift(post);
    saveLocal(POSTS_KEY, local);
    dispatch('ruthko:job-created', post);
    return { ok: true, data: post, local: true };
  }

  async function updateJobPost(id, data) {
    var update = Object.assign({}, data, { updated_at: now() });
    var client = getClient();
    if (client) {
      try {
        var result = await client.from('job_posts').update(update).eq('id', id).select().single();
        if (!result.error) {
          audit('job_post_update', { job_post_id: id });
          dispatch('ruthko:job-updated', result.data);
          return { ok: true, data: result.data };
        }
        return { ok: false, error: result.error.message };
      } catch (e) { return { ok: false, error: e.message }; }
    }
    var local = loadLocal(POSTS_KEY);
    var idx = local.findIndex(function (p) { return p.id === id; });
    if (idx !== -1) { local[idx] = Object.assign(local[idx], update); saveLocal(POSTS_KEY, local); }
    return { ok: true, local: true };
  }

  async function publishJob(id) {
    var result = await updateJobPost(id, { status: 'published', is_public: true, published_at: now() });
    if (result.ok) audit('job_post_publish', { job_post_id: id });
    return result;
  }

  async function pauseJob(id) {
    var result = await updateJobPost(id, { status: 'paused', is_public: false });
    if (result.ok) audit('job_post_pause', { job_post_id: id });
    return result;
  }

  async function closeJob(id) {
    var result = await updateJobPost(id, { status: 'closed', is_public: false });
    if (result.ok) audit('job_post_close', { job_post_id: id });
    return result;
  }

  async function deleteJobPost(id) {
    var client = getClient();
    if (client) {
      try {
        var result = await client.from('job_posts').delete().eq('id', id);
        if (!result.error) {
          audit('job_post_delete', { job_post_id: id });
          return { ok: true };
        }
        return { ok: false, error: result.error.message };
      } catch (e) { return { ok: false, error: e.message }; }
    }
    var local = loadLocal(POSTS_KEY).filter(function (p) { return p.id !== id; });
    saveLocal(POSTS_KEY, local);
    return { ok: true, local: true };
  }

  async function duplicateJobPost(id) {
    var post = await getJobPost(id);
    if (!post) return { ok: false, error: 'Post not found' };
    var copy = Object.assign({}, post, {
      id: undefined,
      title: post.title + ' (Copy)',
      slug: undefined,
      status: 'draft',
      is_public: false,
      published_at: null,
      created_at: now(),
      updated_at: now()
    });
    delete copy.id;
    return createJobPost(copy);
  }

  // ── Staffing Orders ──────────────────────────────────────────────────────────
  async function getStaffingOrders(filters) {
    var f = filters || {};
    var client = getClient();
    if (client) {
      try {
        var q = client.from('employer_staffing_orders').select('*').order('created_at', { ascending: false });
        if (f.order_status) q = q.eq('order_status', f.order_status);
        if (f.priority)     q = q.eq('priority', f.priority);
        if (f.keyword)      q = q.or('company_name.ilike.%' + f.keyword + '%,industry.ilike.%' + f.keyword + '%');
        if (f.limit)        q = q.limit(f.limit);
        var result = await q;
        if (!result.error) {
          saveLocal(ORDERS_KEY, result.data || []);
          return result.data || [];
        }
      } catch (_) {}
    }
    var local = loadLocal(ORDERS_KEY);
    if (f.order_status) local = local.filter(function (o) { return o.order_status === f.order_status; });
    return local;
  }

  async function createStaffingOrder(data) {
    var order = Object.assign({
      id: genId(),
      order_status: 'new',
      priority: 'normal',
      housing_support: false,
      transportation_support: false,
      details_json: {},
      created_at: now(),
      updated_at: now()
    }, data);
    var client = getClient();
    if (client) {
      try {
        var result = await client.from('employer_staffing_orders').insert(order).select().single();
        if (!result.error) {
          order = result.data;
          audit('staffing_order_create', { order_id: order.id, company: order.company_name });
          dispatch('ruthko:staffing-order-created', order);
          return { ok: true, data: order };
        }
        return { ok: false, error: result.error.message };
      } catch (e) { return { ok: false, error: e.message }; }
    }
    var local = loadLocal(ORDERS_KEY);
    local.unshift(order);
    saveLocal(ORDERS_KEY, local);
    dispatch('ruthko:staffing-order-created', order);
    return { ok: true, data: order, local: true };
  }

  async function updateStaffingOrder(id, data) {
    var update = Object.assign({}, data, { updated_at: now() });
    var client = getClient();
    if (client) {
      try {
        var result = await client.from('employer_staffing_orders').update(update).eq('id', id).select().single();
        if (!result.error) {
          if (data.order_status) audit('staffing_order_status_change', { order_id: id, status: data.order_status });
          else audit('staffing_order_update', { order_id: id });
          dispatch('ruthko:staffing-order-updated', result.data);
          return { ok: true, data: result.data };
        }
        return { ok: false, error: result.error.message };
      } catch (e) { return { ok: false, error: e.message }; }
    }
    var local = loadLocal(ORDERS_KEY);
    var idx = local.findIndex(function (o) { return o.id === id; });
    if (idx !== -1) { local[idx] = Object.assign(local[idx], update); saveLocal(ORDERS_KEY, local); }
    return { ok: true, local: true };
  }

  async function convertIntakeToOrder(submission) {
    var details = submission.details_json || {};
    var order = {
      employer_submission_id: submission.id,
      company_name: submission.organization_name || '',
      job_location_city: submission.city || '',
      job_location_state: submission.state || '',
      job_location_country: submission.country || 'United States',
      number_of_workers: parseInt(details.workers_needed) || 1,
      desired_start_date: details.start_date || null,
      pay_range: details.pay_range || '',
      shift_type: details.shift_type || '',
      housing_support: !!details.housing_support,
      transportation_support: !!details.transportation_support,
      order_status: 'reviewing',
      priority: submission.priority || 'normal',
      details_json: details
    };
    return createStaffingOrder(order);
  }

  // ── Job Applications ──────────────────────────────────────────────────────────
  async function getApplications(filters) {
    var f = filters || {};
    var client = getClient();
    if (client) {
      try {
        var q = client.from('job_applications').select('*, job_posts(title)').order('created_at', { ascending: false });
        if (f.status)      q = q.eq('status', f.status);
        if (f.job_post_id) q = q.eq('job_post_id', f.job_post_id);
        if (f.assigned_to) q = q.eq('assigned_to', f.assigned_to);
        if (f.keyword)     q = q.or('first_name.ilike.%' + f.keyword + '%,last_name.ilike.%' + f.keyword + '%,email.ilike.%' + f.keyword + '%');
        if (f.limit)       q = q.limit(f.limit);
        var result = await q;
        if (!result.error) {
          saveLocal(APPS_KEY, result.data || []);
          return result.data || [];
        }
      } catch (_) {}
    }
    var local = loadLocal(APPS_KEY);
    if (f.status)      local = local.filter(function (a) { return a.status === f.status; });
    if (f.job_post_id) local = local.filter(function (a) { return a.job_post_id === f.job_post_id; });
    return local;
  }

  async function createApplication(data) {
    var app = Object.assign({
      id: genId(),
      status: 'new',
      skills_json: [],
      created_at: now(),
      updated_at: now()
    }, data);
    var client = getClient();
    if (client) {
      try {
        var result = await client.from('job_applications').insert(app).select().single();
        if (!result.error) {
          app = result.data;
          audit('job_application_create', { application_id: app.id, job_post_id: app.job_post_id });
          dispatch('ruthko:application-created', app);
          notifyApplicationEmails(app);
          return { ok: true, data: app };
        }
        return { ok: false, error: result.error.message };
      } catch (e) { return { ok: false, error: e.message }; }
    }
    var local = loadLocal(APPS_KEY);
    local.unshift(app);
    saveLocal(APPS_KEY, local);
    dispatch('ruthko:application-created', app);
    return { ok: true, data: app, local: true };
  }

  async function updateApplication(id, data) {
    var update = Object.assign({}, data, { updated_at: now() });
    var client = getClient();
    if (client) {
      try {
        var result = await client.from('job_applications').update(update).eq('id', id).select().single();
        if (!result.error) {
          if (data.status)      audit('job_application_status_change', { application_id: id, status: data.status });
          if (data.assigned_to) audit('job_application_assign', { application_id: id });
          else                  audit('job_application_update', { application_id: id });
          dispatch('ruthko:application-updated', result.data);
          return { ok: true, data: result.data };
        }
        return { ok: false, error: result.error.message };
      } catch (e) { return { ok: false, error: e.message }; }
    }
    var local = loadLocal(APPS_KEY);
    var idx = local.findIndex(function (a) { return a.id === id; });
    if (idx !== -1) { local[idx] = Object.assign(local[idx], update); saveLocal(APPS_KEY, local); }
    return { ok: true, local: true };
  }

  async function getEmployerRequests(filters) {
    var f = filters || {};
    var client = getClient();
    if (client) {
      try {
        var q = client.from('crm_intake_submissions').select('*').eq('submission_type', 'employer').order('created_at', { ascending: false });
        if (f.status) q = q.eq('status', f.status);
        if (f.limit)  q = q.limit(f.limit);
        var result = await q;
        if (!result.error) return result.data || [];
      } catch (_) {}
    }
    var local;
    try { local = JSON.parse(localStorage.getItem('ruthko_intake_submissions_v1') || '[]'); } catch (_) { local = []; }
    return local.filter(function (s) { return s.submission_type === 'employer'; });
  }

  function exportApplicationsCsv(apps) {
    var headers = ['ID','First Name','Last Name','Email','Phone','City','State','Country','Job Post','Status','Experience','Work Auth','Resume URL','Created'];
    var rows = (apps || []).map(function (a) {
      return [a.id, a.first_name, a.last_name, a.email, a.phone, a.city, a.state, a.country, (a.job_posts && a.job_posts.title) || a.job_post_id, a.status, a.experience_level, a.work_authorization_status, a.resume_url, a.created_at].map(function (v) {
        return '"' + String(v || '').replace(/"/g, '""') + '"';
      }).join(',');
    });
    var csv = [headers.join(',')].concat(rows).join('\n');
    var blob = new Blob([csv], { type: 'text/csv' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href = url; a.download = 'ruthko-applications-' + Date.now() + '.csv';
    a.click(); URL.revokeObjectURL(url);
    audit('job_export_csv', { count: apps.length });
  }

  // ── Phase 27 email hooks ──────────────────────────────────────────────────────
  function notifyApplicationEmails(app) {
    var svc = window.ruthkoEmailAutomation;
    if (!svc) return;
    if (app.email && typeof svc.sendApplicantConfirmation === 'function') {
      svc.sendApplicantConfirmation(app).catch(function () {});
    }
    if (typeof svc.notifyAdminOfNewSubmission === 'function') {
      svc.notifyAdminOfNewSubmission(Object.assign({ submission_type: 'job_application' }, app)).catch(function () {});
    }
    if (window.ruthkoAutomation && typeof window.ruthkoAutomation.processSubmission === 'function') {
      window.ruthkoAutomation.processSubmission(Object.assign({ submission_type: 'job_seeker' }, app)).catch(function () {});
    }
  }

  // ── Utility filters ───────────────────────────────────────────────────────────
  function applyJobFilters(posts, f) {
    return posts.filter(function (p) {
      if (f.job_category && p.job_category !== f.job_category) return false;
      if (f.employment_type && p.employment_type !== f.employment_type) return false;
      if (f.shift_type && p.shift_type !== f.shift_type) return false;
      if (f.housing_support && !p.housing_support) return false;
      if (f.transportation_support && !p.transportation_support) return false;
      if (f.keyword) {
        var q = f.keyword.toLowerCase();
        if (!( (p.title||'').toLowerCase().includes(q) || (p.short_description||'').toLowerCase().includes(q) || (p.city||'').toLowerCase().includes(q) )) return false;
      }
      if (f.location) {
        var l = f.location.toLowerCase();
        if (!( (p.city||'').toLowerCase().includes(l) || (p.state||'').toLowerCase().includes(l) || (p.country||'').toLowerCase().includes(l) )) return false;
      }
      return true;
    });
  }

  // ── Public API ────────────────────────────────────────────────────────────────
  window.ruthkoJobBoard = {
    JOB_CATEGORIES: JOB_CATEGORIES,
    EMPLOYMENT_TYPES: EMPLOYMENT_TYPES,
    JOB_STATUSES: JOB_STATUSES,
    ORDER_STATUSES: ORDER_STATUSES,
    APP_STATUSES: APP_STATUSES,
    getPublishedJobs: getPublishedJobs,
    getAllJobPosts: getAllJobPosts,
    getJobPost: getJobPost,
    createJobPost: createJobPost,
    updateJobPost: updateJobPost,
    publishJob: publishJob,
    pauseJob: pauseJob,
    closeJob: closeJob,
    deleteJobPost: deleteJobPost,
    duplicateJobPost: duplicateJobPost,
    getStaffingOrders: getStaffingOrders,
    createStaffingOrder: createStaffingOrder,
    updateStaffingOrder: updateStaffingOrder,
    convertIntakeToOrder: convertIntakeToOrder,
    getApplications: getApplications,
    createApplication: createApplication,
    updateApplication: updateApplication,
    getEmployerRequests: getEmployerRequests,
    exportApplicationsCsv: exportApplicationsCsv
  };
})();
