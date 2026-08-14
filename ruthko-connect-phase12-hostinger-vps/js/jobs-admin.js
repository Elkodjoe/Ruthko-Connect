(function () {
  'use strict';

  var currentTab = 'job-posts';
  var editingJobId = null;
  var allJobPosts   = [];
  var allOrders     = [];
  var allApps       = [];
  var allRequests   = [];

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function fmtDate(d) {
    if (!d) return '—';
    var dt = new Date(d);
    return isNaN(dt) ? '—' : dt.toLocaleDateString();
  }

  function statusBadge(status, type) {
    var colors = {
      // Job statuses
      published: 'bg-green-900 text-green-300',
      draft: 'bg-zinc-800 text-zinc-400',
      review: 'bg-blue-900 text-blue-300',
      paused: 'bg-yellow-900 text-yellow-300',
      filled: 'bg-purple-900 text-purple-300',
      closed: 'bg-red-900 text-red-300',
      archived: 'bg-zinc-900 text-zinc-500',
      // Order statuses
      new: 'bg-yellow-900 text-yellow-300',
      reviewing: 'bg-blue-900 text-blue-300',
      quoted: 'bg-indigo-900 text-indigo-300',
      approved: 'bg-teal-900 text-teal-300',
      recruiting: 'bg-green-900 text-green-300',
      partially_filled: 'bg-orange-900 text-orange-300',
      cancelled: 'bg-red-900 text-red-300',
      // App statuses
      hired: 'bg-green-900 text-green-300',
      offered: 'bg-teal-900 text-teal-300',
      interview: 'bg-blue-900 text-blue-300',
      contacted: 'bg-indigo-900 text-indigo-300',
      screening: 'bg-purple-900 text-purple-300',
      rejected: 'bg-red-900 text-red-300',
      withdrawn: 'bg-zinc-800 text-zinc-400'
    };
    var cls = colors[status] || 'bg-zinc-800 text-zinc-400';
    return '<span class="px-2 py-0.5 rounded text-xs font-semibold ' + cls + '">' + esc(status) + '</span>';
  }

  function priorityBadge(p) {
    var colors = { urgent:'bg-red-900 text-red-300', high:'bg-orange-900 text-orange-300', normal:'bg-blue-900 text-blue-300', low:'bg-zinc-800 text-zinc-400' };
    return '<span class="px-2 py-0.5 rounded text-xs font-semibold ' + (colors[p] || 'bg-zinc-800 text-zinc-400') + '">' + esc(p) + '</span>';
  }

  // ── Tab switching ─────────────────────────────────────────────────────────────
  window.jaSetTab = function (tab) {
    currentTab = tab;
    ['job-posts','staffing-orders','applications','employer-requests'].forEach(function (t) {
      var btn = document.getElementById('jaTab-' + t);
      var sec = document.getElementById('jaSection-' + t);
      if (btn) btn.className = btn.className.replace(/btn-primary|btn-secondary/g, '').trim() + (t === tab ? ' btn-primary' : ' btn-secondary') + ' px-4 py-2 rounded-xl font-bold text-sm';
      if (sec) sec.classList.toggle('hidden', t !== tab);
    });
    if (tab === 'job-posts')          jaLoadJobPosts();
    if (tab === 'staffing-orders')    jaLoadOrders();
    if (tab === 'applications')       jaLoadApplications();
    if (tab === 'employer-requests')  jaLoadRequests();
  };

  // ── Stats ─────────────────────────────────────────────────────────────────────
  async function loadStats() {
    var svc = window.ruthkoStaffingWorkflow;
    var stats = svc ? await svc.getWorkflowStats().catch(function () { return {}; }) : {};
    var el = document.getElementById('jaStats');
    if (!el) return;
    el.innerHTML = [
      ['Published Jobs', stats.publishedJobs || 0, 'text-green-400'],
      ['Total Orders', stats.totalOrders || 0, 'text-blue-400'],
      ['New Applications', stats.newApplications || 0, 'text-yellow-400'],
      ['Hired', stats.hiredCount || 0, 'text-purple-400']
    ].map(function (s) {
      return '<div class="glass border border-zinc-800 rounded-2xl p-5"><p class="text-3xl font-extrabold ' + s[2] + '">' + s[1] + '</p><p class="text-zinc-400 text-sm mt-1">' + s[0] + '</p></div>';
    }).join('');
  }

  // ── Job Posts ─────────────────────────────────────────────────────────────────
  async function jaLoadJobPosts() {
    var svc = window.ruthkoJobBoard;
    if (!svc) return;
    var statusF = (document.getElementById('jaJobStatus') || {}).value || '';
    var catF    = (document.getElementById('jaJobCategory') || {}).value || '';
    var kwF     = (document.getElementById('jaJobKeyword') || {}).value || '';
    allJobPosts = await svc.getAllJobPosts({ status: statusF || undefined, job_category: catF || undefined, keyword: kwF || undefined, limit: 200 }).catch(function () { return []; });
    jaRenderJobPosts(allJobPosts);
  }
  window.jaLoadJobPosts = jaLoadJobPosts;

  function jaRenderJobPosts(posts) {
    var tbody = document.getElementById('jaJobPostsTable');
    if (!tbody) return;
    if (!posts.length) { tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-zinc-500 text-center">No job posts found. Create one to get started.</td></tr>'; return; }
    tbody.innerHTML = posts.map(function (p) {
      var loc = [p.city, p.state].filter(Boolean).join(', ');
      return '<tr class="border-b border-zinc-900 hover:bg-white/5">' +
        '<td class="p-3 font-medium max-w-xs truncate">' + esc(p.title) + '<br><span class="text-xs text-zinc-500">' + esc(p.job_category) + ' · ' + esc(p.employment_type) + '</span></td>' +
        '<td class="p-3 text-xs text-zinc-400">' + esc(loc) + '</td>' +
        '<td class="p-3">' + statusBadge(p.status) + '</td>' +
        '<td class="p-3 text-xs text-zinc-400">' + fmtDate(p.published_at || p.created_at) + '</td>' +
        '<td class="p-3">' +
          '<select onchange="jaQuickJobStatus(\'' + esc(p.id) + '\',this.value)" class="bg-black border border-zinc-800 rounded-lg p-1.5 text-xs">' +
          window.ruthkoJobBoard.JOB_STATUSES.map(function (s) { return '<option' + (s === p.status ? ' selected' : '') + '>' + s + '</option>'; }).join('') +
          '</select>' +
        '</td>' +
        '<td class="p-3 flex gap-1 flex-wrap">' +
          '<button onclick="jaEditJob(\'' + esc(p.id) + '\')" class="btn-secondary px-2 py-1 rounded-lg text-xs font-bold">Edit</button>' +
          '<button onclick="jaDuplicateJob(\'' + esc(p.id) + '\')" class="btn-secondary px-2 py-1 rounded-lg text-xs font-bold">Dup</button>' +
          (p.status !== 'published' ? '<button onclick="jaPublishJob(\'' + esc(p.id) + '\')" class="bg-green-900 text-green-300 px-2 py-1 rounded-lg text-xs font-bold">Publish</button>' : '') +
          (p.status === 'published' ? '<button onclick="jaPauseJob(\'' + esc(p.id) + '\')" class="bg-yellow-900 text-yellow-300 px-2 py-1 rounded-lg text-xs font-bold">Pause</button>' : '') +
          '<button onclick="jaDeleteJob(\'' + esc(p.id) + '\')" class="bg-red-900 text-red-300 px-2 py-1 rounded-lg text-xs font-bold">Del</button>' +
        '</td></tr>';
    }).join('');
  }

  window.jaQuickJobStatus = async function (id, status) {
    var svc = window.ruthkoJobBoard;
    if (!svc) return;
    if (status === 'published') { await svc.publishJob(id); }
    else if (status === 'paused') { await svc.pauseJob(id); }
    else if (status === 'closed') { await svc.closeJob(id); }
    else { await svc.updateJobPost(id, { status: status }); }
    await jaLoadJobPosts();
    await loadStats();
  };

  window.jaPublishJob = async function (id) {
    var svc = window.ruthkoJobBoard;
    if (!svc) return;
    await svc.publishJob(id);
    await jaLoadJobPosts();
    await loadStats();
  };

  window.jaPauseJob = async function (id) {
    var svc = window.ruthkoJobBoard;
    if (!svc) return;
    await svc.pauseJob(id);
    await jaLoadJobPosts();
  };

  window.jaDeleteJob = async function (id) {
    if (!confirm('Delete this job post?')) return;
    var svc = window.ruthkoJobBoard;
    if (!svc) return;
    await svc.deleteJobPost(id);
    await jaLoadJobPosts();
    await loadStats();
  };

  window.jaDuplicateJob = async function (id) {
    var svc = window.ruthkoJobBoard;
    if (!svc) return;
    var result = await svc.duplicateJobPost(id);
    if (result.ok) { await jaLoadJobPosts(); }
  };

  window.jaEditJob = async function (id) {
    var svc = window.ruthkoJobBoard;
    if (!svc) return;
    var post = await svc.getJobPost(id).catch(function () { return null; });
    if (!post) return;
    editingJobId = id;
    jaOpenJobModal(post);
  };

  // ── Job Modal ────────────────────────────────────────────────────────────────
  window.jaOpenNewJobModal = function (orderId) {
    editingJobId = null;
    var defaults = orderId ? { staffing_order_id: orderId } : {};
    jaOpenJobModal(defaults);
  };

  function jaOpenJobModal(data) {
    var d = data || {};
    var svc = window.ruthkoJobBoard;
    var cats  = svc ? svc.JOB_CATEGORIES   : [];
    var types = svc ? svc.EMPLOYMENT_TYPES  : [];
    var modal = document.getElementById('jaJobModal');
    if (!modal) return;
    document.getElementById('jaJobModalTitle').textContent = editingJobId ? 'Edit Job Post' : 'Create Job Post';
    var catOpts  = cats.map(function (c) { return '<option' + (c === d.job_category ? ' selected' : '') + '>' + c + '</option>'; }).join('');
    var typeOpts = types.map(function (t2) { return '<option' + (t2 === d.employment_type ? ' selected' : '') + '>' + t2 + '</option>'; }).join('');
    document.getElementById('jaJobForm').innerHTML =
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">' +
      '<input id="jfTitle" placeholder="Job title *" required value="' + esc(d.title) + '" class="bg-black border border-zinc-800 rounded-xl p-3 md:col-span-2" />' +
      '<select id="jfCategory" class="bg-black border border-zinc-800 rounded-xl p-3"><option value="">Category</option>' + catOpts + '</select>' +
      '<select id="jfType" class="bg-black border border-zinc-800 rounded-xl p-3"><option value="">Employment type</option>' + typeOpts + '</select>' +
      '<input id="jfCompany" placeholder="Company name" value="' + esc(d.company_name) + '" class="bg-black border border-zinc-800 rounded-xl p-3" />' +
      '<input id="jfPayRange" placeholder="Pay range (e.g. $20–$26/hr)" value="' + esc(d.pay_range) + '" class="bg-black border border-zinc-800 rounded-xl p-3" />' +
      '<input id="jfCity" placeholder="City" value="' + esc(d.city) + '" class="bg-black border border-zinc-800 rounded-xl p-3" />' +
      '<input id="jfState" placeholder="State" value="' + esc(d.state) + '" class="bg-black border border-zinc-800 rounded-xl p-3" />' +
      '<input id="jfCountry" placeholder="Country" value="' + esc(d.country || 'United States') + '" class="bg-black border border-zinc-800 rounded-xl p-3" />' +
      '<input id="jfShift" placeholder="Shift (Day / Night / Flexible)" value="' + esc(d.shift_type) + '" class="bg-black border border-zinc-800 rounded-xl p-3" />' +
      '<input id="jfStartDate" type="date" value="' + esc(d.start_date) + '" class="bg-black border border-zinc-800 rounded-xl p-3" />' +
      '<div class="flex items-center gap-4 text-sm">' +
        '<label class="flex items-center gap-2"><input type="checkbox" id="jfHousing" ' + (d.housing_support ? 'checked' : '') + ' class="w-4 h-4 accent-yellow-400" /> Housing support</label>' +
        '<label class="flex items-center gap-2"><input type="checkbox" id="jfTransport" ' + (d.transportation_support ? 'checked' : '') + ' class="w-4 h-4 accent-yellow-400" /> Transport support</label>' +
        '<label class="flex items-center gap-2"><input type="checkbox" id="jfShowCompany" ' + (d.show_company_name ? 'checked' : '') + ' class="w-4 h-4 accent-yellow-400" /> Show company name</label>' +
      '</div>' +
      '<textarea id="jfShortDesc" placeholder="Short description (shown in listing)" class="bg-black border border-zinc-800 rounded-xl p-3 h-20 md:col-span-2">' + esc(d.short_description) + '</textarea>' +
      '<textarea id="jfFullDesc" placeholder="Full job description" class="bg-black border border-zinc-800 rounded-xl p-3 h-32 md:col-span-2">' + esc(d.full_description) + '</textarea>' +
      '<input type="hidden" id="jfOrderId" value="' + esc(d.staffing_order_id) + '" />' +
      '</div>';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  window.jaCloseJobModal = function () {
    var modal = document.getElementById('jaJobModal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
    editingJobId = null;
  };

  window.jaSaveJob = async function () {
    var svc = window.ruthkoJobBoard;
    if (!svc) return;
    var title = (document.getElementById('jfTitle') || {}).value || '';
    if (!title.trim()) { alert('Job title is required.'); return; }
    var data = {
      title:                 title.trim(),
      job_category:          (document.getElementById('jfCategory') || {}).value || 'Other',
      employment_type:       (document.getElementById('jfType') || {}).value || 'Full-time',
      company_name:          (document.getElementById('jfCompany') || {}).value || '',
      pay_range:             (document.getElementById('jfPayRange') || {}).value || '',
      city:                  (document.getElementById('jfCity') || {}).value || '',
      state:                 (document.getElementById('jfState') || {}).value || '',
      country:               (document.getElementById('jfCountry') || {}).value || 'United States',
      shift_type:            (document.getElementById('jfShift') || {}).value || '',
      start_date:            (document.getElementById('jfStartDate') || {}).value || null,
      housing_support:       !!(document.getElementById('jfHousing') || {}).checked,
      transportation_support:!!(document.getElementById('jfTransport') || {}).checked,
      show_company_name:     !!(document.getElementById('jfShowCompany') || {}).checked,
      short_description:     (document.getElementById('jfShortDesc') || {}).value || '',
      full_description:      (document.getElementById('jfFullDesc') || {}).value || '',
      staffing_order_id:     (document.getElementById('jfOrderId') || {}).value || null
    };
    var result = editingJobId ? await svc.updateJobPost(editingJobId, data) : await svc.createJobPost(data);
    if (result.ok) {
      jaCloseJobModal();
      await jaLoadJobPosts();
      await loadStats();
    } else {
      alert('Error saving job: ' + (result.error || 'Unknown error'));
    }
  };

  // ── Staffing Orders ──────────────────────────────────────────────────────────
  async function jaLoadOrders() {
    var svc = window.ruthkoJobBoard;
    if (!svc) return;
    var statusF = (document.getElementById('jaOrderStatus') || {}).value || '';
    allOrders = await svc.getStaffingOrders({ order_status: statusF || undefined, limit: 200 }).catch(function () { return []; });
    jaRenderOrders(allOrders);
  }
  window.jaLoadOrders = jaLoadOrders;

  function jaRenderOrders(orders) {
    var tbody = document.getElementById('jaOrdersTable');
    if (!tbody) return;
    if (!orders.length) { tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-zinc-500 text-center">No staffing orders found.</td></tr>'; return; }
    tbody.innerHTML = orders.map(function (o) {
      var loc = [o.job_location_city, o.job_location_state].filter(Boolean).join(', ');
      return '<tr class="border-b border-zinc-900 hover:bg-white/5">' +
        '<td class="p-3 font-medium">' + esc(o.company_name || '—') + '<br><span class="text-xs text-zinc-500">' + esc(o.industry) + '</span></td>' +
        '<td class="p-3 text-xs text-zinc-400">' + esc(loc) + '</td>' +
        '<td class="p-3 text-xs text-zinc-400">' + esc(o.number_of_workers) + ' worker(s)</td>' +
        '<td class="p-3">' + statusBadge(o.order_status) + '</td>' +
        '<td class="p-3">' + priorityBadge(o.priority) + '</td>' +
        '<td class="p-3 text-xs text-zinc-400">' + fmtDate(o.created_at) + '</td>' +
        '<td class="p-3 flex gap-1 flex-wrap">' +
          '<select onchange="jaQuickOrderStatus(\'' + esc(o.id) + '\',this.value)" class="bg-black border border-zinc-800 rounded-lg p-1.5 text-xs">' +
          window.ruthkoJobBoard.ORDER_STATUSES.map(function (s) { return '<option' + (s === o.order_status ? ' selected' : '') + '>' + s + '</option>'; }).join('') +
          '</select>' +
          '<button onclick="jaCreateJobFromOrder(\'' + esc(o.id) + '\')" class="btn-primary px-2 py-1 rounded-lg text-xs font-bold">+ Job</button>' +
        '</td></tr>';
    }).join('');
  }

  window.jaQuickOrderStatus = async function (id, status) {
    var svc = window.ruthkoJobBoard;
    if (!svc) return;
    await svc.updateStaffingOrder(id, { order_status: status });
    await jaLoadOrders();
  };

  window.jaCreateJobFromOrder = async function (orderId) {
    var order = allOrders.find(function (o) { return o.id === orderId; });
    if (!order) return;
    editingJobId = null;
    jaOpenJobModal({
      staffing_order_id: order.id,
      company_name: order.company_name,
      city: order.job_location_city,
      state: order.job_location_state,
      country: order.job_location_country,
      shift_type: order.shift_type,
      housing_support: order.housing_support,
      transportation_support: order.transportation_support,
      start_date: order.desired_start_date,
      pay_range: order.pay_range
    });
    jaSetTab('job-posts');
  };

  // ── Applications ─────────────────────────────────────────────────────────────
  async function jaLoadApplications() {
    var svc = window.ruthkoJobBoard;
    if (!svc) return;
    var statusF = (document.getElementById('jaAppStatus') || {}).value || '';
    allApps = await svc.getApplications({ status: statusF || undefined, limit: 300 }).catch(function () { return []; });
    jaRenderApplications(allApps);
  }
  window.jaLoadApplications = jaLoadApplications;

  function jaRenderApplications(apps) {
    var tbody = document.getElementById('jaAppsTable');
    if (!tbody) return;
    if (!apps.length) { tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-zinc-500 text-center">No applications found.</td></tr>'; return; }
    var svc = window.ruthkoJobBoard;
    var statuses = svc ? svc.APP_STATUSES : [];
    tbody.innerHTML = apps.map(function (a) {
      var name = [a.first_name, a.last_name].filter(Boolean).join(' ') || '—';
      var jobTitle = (a.job_posts && a.job_posts.title) || a.job_post_id || '—';
      return '<tr class="border-b border-zinc-900 hover:bg-white/5">' +
        '<td class="p-3 font-medium">' + esc(name) + '<br><span class="text-xs text-zinc-500">' + esc(a.email) + '</span></td>' +
        '<td class="p-3 text-xs text-zinc-400 max-w-xs truncate">' + esc(jobTitle) + '</td>' +
        '<td class="p-3">' + statusBadge(a.status) + '</td>' +
        '<td class="p-3 text-xs text-zinc-400">' + esc(a.experience_level) + '</td>' +
        '<td class="p-3 text-xs text-zinc-400">' + fmtDate(a.created_at) + '</td>' +
        '<td class="p-3 flex gap-1 flex-wrap">' +
          '<select onchange="jaQuickAppStatus(\'' + esc(a.id) + '\',this.value)" class="bg-black border border-zinc-800 rounded-lg p-1.5 text-xs">' +
          statuses.map(function (s) { return '<option' + (s === a.status ? ' selected' : '') + '>' + s + '</option>'; }).join('') +
          '</select>' +
          (a.resume_url ? '<a href="' + esc(a.resume_url) + '" target="_blank" rel="noopener" class="btn-secondary px-2 py-1 rounded-lg text-xs font-bold">CV</a>' : '') +
        '</td></tr>';
    }).join('');
  }

  window.jaQuickAppStatus = async function (id, status) {
    var svc = window.ruthkoJobBoard;
    if (!svc) return;
    await svc.updateApplication(id, { status: status });
    await jaLoadApplications();
    await loadStats();
  };

  window.jaExportApps = function () {
    var svc = window.ruthkoJobBoard;
    if (svc) svc.exportApplicationsCsv(allApps);
  };

  // ── Employer Requests ─────────────────────────────────────────────────────────
  async function jaLoadRequests() {
    var svc = window.ruthkoJobBoard;
    if (!svc) return;
    allRequests = await svc.getEmployerRequests({ limit: 200 }).catch(function () { return []; });
    jaRenderRequests(allRequests);
  }
  window.jaLoadRequests = jaLoadRequests;

  function jaRenderRequests(requests) {
    var tbody = document.getElementById('jaRequestsTable');
    if (!tbody) return;
    if (!requests.length) { tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-zinc-500 text-center">No employer requests yet. They appear here when employers submit the public employer form.</td></tr>'; return; }
    tbody.innerHTML = requests.map(function (r) {
      var name = [r.first_name, r.last_name].filter(Boolean).join(' ') || r.organization_name || '—';
      var loc  = [r.city, r.state].filter(Boolean).join(', ');
      return '<tr class="border-b border-zinc-900 hover:bg-white/5">' +
        '<td class="p-3 font-medium">' + esc(r.organization_name || name) + '<br><span class="text-xs text-zinc-500">' + esc(r.email) + '</span></td>' +
        '<td class="p-3 text-xs text-zinc-400">' + esc(loc) + '</td>' +
        '<td class="p-3">' + statusBadge(r.status) + '</td>' +
        '<td class="p-3">' + priorityBadge(r.priority) + '</td>' +
        '<td class="p-3 text-xs text-zinc-400">' + fmtDate(r.created_at) + '</td>' +
        '<td class="p-3">' +
          '<button onclick="jaConvertToOrder(' + JSON.stringify(JSON.stringify(r)).slice(1,-1).replace(/'/g,"&#39;") + ')" class="btn-primary px-3 py-1 rounded-lg text-xs font-bold" data-id="' + esc(r.id) + '">Convert to Order</button>' +
        '</td></tr>';
    }).join('');
    // Safer approach — bind via data attribute
    document.querySelectorAll('#jaRequestsTable button[data-id]').forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute('data-id');
        var req = allRequests.find(function (r) { return r.id === id; });
        if (req) jaConvertRequest(req);
      };
    });
  }

  async function jaConvertRequest(submission) {
    var wf = window.ruthkoStaffingWorkflow;
    if (!wf) { alert('Workflow service not loaded.'); return; }
    var result = await wf.convertToStaffingOrder(submission);
    if (result.ok) {
      alert('Converted to staffing order successfully.');
      jaSetTab('staffing-orders');
    } else {
      alert('Error: ' + (result.error || 'Unknown'));
    }
  }

  window.jaConvertToOrder = function () {}; // placeholder — real logic via data-id above

  // ── Init ──────────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    loadStats();
    jaSetTab('job-posts');
  });
})();
