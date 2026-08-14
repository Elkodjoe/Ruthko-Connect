(function () {
  'use strict';

  // Main employer portal dashboard — shows orders and shortlists for logged-in employer.

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function fmtDate(d) { if (!d) return '—'; var dt = new Date(d); return isNaN(dt) ? '—' : dt.toLocaleDateString(); }

  function getClient() {
    if (typeof window.getRuthkoSupabaseClient === 'function') return window.getRuthkoSupabaseClient();
    if (window.RUTHKO_SUPABASE && window.RUTHKO_SUPABASE.sampleMode) return null;
    return null;
  }

  function session() {
    var auth = window.ruthkoEmployerAuth;
    return auth ? auth.getSession() : null;
  }

  // ── Init header ───────────────────────────────────────────────────────────────
  function initHeader() {
    var s = session();
    if (!s) return;
    var nameEl = document.getElementById('epCompanyName');
    var emailEl = document.getElementById('epEmail');
    if (nameEl) nameEl.textContent = s.company_name || 'Employer Portal';
    if (emailEl) emailEl.textContent = s.email || '';
  }

  // ── Load orders ───────────────────────────────────────────────────────────────
  async function loadOrders() {
    var s = session();
    if (!s) return;
    var el = document.getElementById('epOrdersList');
    if (!el) return;
    el.innerHTML = '<p class="text-zinc-500 text-sm">Loading orders…</p>';

    var client = getClient();
    var orders = [];

    if (client && s.staffing_order_id) {
      try {
        var r = await client.from('employer_staffing_orders').select('*').eq('id', s.staffing_order_id);
        if (!r.error) orders = r.data || [];
      } catch (_) {}
    } else {
      // sample
      orders = [{ id: s.staffing_order_id || 'sample-order-001', job_title: 'CNA / Healthcare', company_name: s.company_name || 'Acme Co', order_status: 'shortlisted', workers_requested: 5, start_date: null, city: 'Atlanta', state: 'GA', priority: 'high', created_at: new Date().toISOString() }];
    }

    if (!orders.length) { el.innerHTML = '<p class="text-zinc-500 text-sm">No active staffing orders found.</p>'; return; }
    el.innerHTML = orders.map(function (o) {
      return '<a href="employer-order-status.html?order_id=' + esc(o.id) + '" class="glass border border-zinc-800 rounded-2xl p-5 block hover:border-yellow-400/40 transition">' +
        '<div class="flex items-center justify-between mb-2">' +
          '<h3 class="font-bold text-white">' + esc(o.job_title || 'Staffing Order') + '</h3>' +
          '<span class="px-2 py-0.5 rounded text-xs font-semibold bg-blue-900 text-blue-300">' + esc(o.order_status || 'pending') + '</span>' +
        '</div>' +
        '<p class="text-zinc-400 text-sm">' + esc(o.company_name || '') + ' · ' + esc([o.city, o.state].filter(Boolean).join(', ') || '—') + '</p>' +
        '<p class="text-zinc-500 text-xs mt-1">Workers requested: ' + esc(o.workers_requested || '—') + ' · Start: ' + fmtDate(o.start_date) + '</p>' +
      '</a>';
    }).join('');
  }

  // ── Load shortlists ───────────────────────────────────────────────────────────
  async function loadShortlists() {
    var s = session();
    if (!s) return;
    var el = document.getElementById('epShortlistsList');
    if (!el) return;
    el.innerHTML = '<p class="text-zinc-500 text-sm">Loading shortlists…</p>';

    var client = getClient();
    var shortlists = [];

    if (client && s.shortlist_id) {
      try {
        var r = await client.from('employer_shortlists').select('*, employer_shortlist_candidates(count)').eq('id', s.shortlist_id);
        if (!r.error) shortlists = r.data || [];
      } catch (_) {}
    } else {
      shortlists = [{ id: s.shortlist_id || 'sample-sl-001', shortlist_name: 'CNA Candidate Shortlist', status: 'sent_to_employer', employer_name: s.company_name, created_at: new Date().toISOString() }];
    }

    if (!shortlists.length) { el.innerHTML = '<p class="text-zinc-500 text-sm">No shortlists shared yet. Your Ruthko recruiter will share candidates soon.</p>'; return; }
    el.innerHTML = shortlists.map(function (sl) {
      var count = sl.employer_shortlist_candidates ? (Array.isArray(sl.employer_shortlist_candidates) ? sl.employer_shortlist_candidates.length : (sl.employer_shortlist_candidates[0] || {}).count || 0) : '—';
      return '<a href="employer-shortlist-review.html?shortlist_id=' + esc(sl.id) + '" class="glass border border-zinc-800 rounded-2xl p-5 block hover:border-yellow-400/40 transition">' +
        '<div class="flex items-center justify-between mb-2">' +
          '<h3 class="font-bold text-white">' + esc(sl.shortlist_name || 'Candidate Shortlist') + '</h3>' +
          '<span class="px-2 py-0.5 rounded text-xs font-semibold bg-purple-900 text-purple-300">' + esc(sl.status || 'review') + '</span>' +
        '</div>' +
        '<p class="text-zinc-500 text-xs">Candidates: ' + esc(count) + ' · Shared: ' + fmtDate(sl.created_at) + '</p>' +
        '<p class="text-yellow-400 text-xs mt-2 font-semibold">Click to review candidates →</p>' +
      '</a>';
    }).join('');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var auth = window.ruthkoEmployerAuth;
    if (!auth || !auth.requireAuth()) return;
    initHeader();
    loadOrders();
    loadShortlists();
  });
})();
