(function () {
  'use strict';

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function fmtDate(d) { if (!d) return '—'; var dt = new Date(d); return isNaN(dt) ? '—' : dt.toLocaleDateString(); }
  function qp(name) { return new URLSearchParams(window.location.search).get(name) || ''; }

  var ORDER_ID = '';

  function getClient() {
    if (typeof window.getRuthkoSupabaseClient === 'function') return window.getRuthkoSupabaseClient();
    if (window.RUTHKO_SUPABASE && window.RUTHKO_SUPABASE.sampleMode) return null;
    return null;
  }

  function session() {
    var auth = window.ruthkoEmployerAuth;
    return auth ? auth.getSession() : null;
  }

  // ── Load order ────────────────────────────────────────────────────────────────
  async function loadOrder() {
    var el = document.getElementById('eosOrderDetail');
    if (!el) return;
    var s = session();

    var client = getClient();
    var order  = null;

    if (client && ORDER_ID) {
      try {
        var r = await client.from('employer_staffing_orders').select('*').eq('id', ORDER_ID).single();
        if (!r.error) order = r.data;
      } catch (_) {}
    }

    if (!order) {
      order = {
        id: ORDER_ID || 'sample-order-001',
        job_title: 'CNA / Healthcare',
        company_name: (s || {}).company_name || 'Your Company',
        order_status: 'shortlisted',
        workers_requested: 5,
        workers_shortlisted: 2,
        workers_selected: 0,
        workers_hired: 0,
        start_date: null,
        city: 'Atlanta',
        state: 'GA',
        priority: 'high',
        assigned_admin: 'Ruthko Recruiter',
        updated_at: new Date().toISOString()
      };
    }

    var statusColor = {
      pending_review: 'bg-yellow-900 text-yellow-300',
      approved: 'bg-blue-900 text-blue-300',
      recruiting: 'bg-indigo-900 text-indigo-300',
      shortlisted: 'bg-purple-900 text-purple-300',
      interviewing: 'bg-orange-900 text-orange-300',
      filled: 'bg-green-900 text-green-300',
      cancelled: 'bg-red-900 text-red-300',
      on_hold: 'bg-zinc-800 text-zinc-400'
    };

    el.innerHTML =
      '<div class="glass border border-zinc-800 rounded-2xl p-6 mb-6">' +
        '<div class="flex items-center justify-between mb-4">' +
          '<h2 class="text-2xl font-extrabold">' + esc(order.job_title || 'Staffing Order') + '</h2>' +
          '<span class="px-3 py-1 rounded-full text-sm font-bold ' + (statusColor[order.order_status] || 'bg-zinc-800 text-zinc-400') + '">' + esc(order.order_status || 'pending') + '</span>' +
        '</div>' +
        '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">' +
          stat('Requested', order.workers_requested || 0, 'text-zinc-300') +
          stat('Shortlisted', order.workers_shortlisted || 0, 'text-purple-400') +
          stat('For Interview', order.workers_selected || 0, 'text-blue-400') +
          stat('Hired', order.workers_hired || 0, 'text-green-400') +
        '</div>' +
        '<div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">' +
          field('Company', order.company_name) +
          field('Location', [order.city, order.state].filter(Boolean).join(', ') || '—') +
          field('Start Date', fmtDate(order.start_date)) +
          field('Priority', order.priority || '—') +
          field('Assigned Recruiter', order.assigned_admin || 'Ruthko Connect Team') +
          field('Last Update', fmtDate(order.updated_at)) +
        '</div>' +
      '</div>';
  }

  function stat(label, val, color) {
    return '<div class="glass border border-zinc-800 rounded-xl p-4 text-center"><p class="text-2xl font-extrabold ' + color + '">' + esc(val) + '</p><p class="text-xs text-zinc-500 mt-1">' + label + '</p></div>';
  }

  function field(label, val) {
    return '<div class="glass border border-zinc-900 rounded-xl p-3"><p class="text-zinc-500 text-xs">' + label + '</p><p class="font-semibold text-sm mt-0.5">' + esc(val || '—') + '</p></div>';
  }

  // ── Messages ──────────────────────────────────────────────────────────────────
  async function loadMessages() {
    var el = document.getElementById('eosMessages');
    if (!el) return;
    var svc = window.ruthkoEmployerFeedback;
    var s   = session();
    if (!svc || !s) return;
    var msgs = await svc.getMessages(ORDER_ID).catch(function () { return []; });
    if (!msgs.length) { el.innerHTML = '<p class="text-zinc-500 text-sm">No messages yet. Send a message to your recruiter below.</p>'; return; }
    el.innerHTML = msgs.map(function (m) {
      var isEmployer = m.sender_type === 'employer';
      return '<div class="flex ' + (isEmployer ? 'justify-end' : 'justify-start') + '">' +
        '<div class="max-w-md px-4 py-2 rounded-2xl text-sm ' + (isEmployer ? 'bg-yellow-400 text-black' : 'glass border border-zinc-700 text-white') + '">' +
          '<p>' + esc(m.message_text) + '</p>' +
          '<p class="text-xs mt-1 ' + (isEmployer ? 'text-black/50' : 'text-zinc-500') + '">' + fmtDate(m.created_at) + ' · ' + esc(m.sender_type) + '</p>' +
        '</div>' +
      '</div>';
    }).join('');
    el.scrollTop = el.scrollHeight;
  }

  window.eosSendMessage = async function () {
    var svc = window.ruthkoEmployerFeedback;
    var s   = session();
    if (!svc || !s) return;
    var input = document.getElementById('eosMsgInput');
    var text  = input ? input.value.trim() : '';
    if (!text) return;
    var result = await svc.sendMessage(s.employer_account_id, ORDER_ID, text, 'employer');
    if (result.ok) {
      input.value = '';
      loadMessages();
    } else {
      alert('Error sending message: ' + result.error);
    }
  };

  window.eosRequestMoreCandidates = async function () {
    var svc = window.ruthkoEmployerFeedback;
    var s   = session();
    if (!svc || !s) return;
    var note = prompt('Optional note for your recruiter:') || '';
    var result = await svc.requestMoreCandidates(s.employer_account_id, ORDER_ID, note);
    if (result.ok) { alert('Request sent!'); loadMessages(); }
    else alert('Error: ' + result.error);
  };

  document.addEventListener('DOMContentLoaded', function () {
    var auth = window.ruthkoEmployerAuth;
    if (!auth || !auth.requireAuth()) return;
    ORDER_ID = qp('order_id') || (auth.getSession() || {}).staffing_order_id || '';
    if (!ORDER_ID) { document.body.innerHTML = '<p class="p-10 text-red-400">No order specified.</p>'; return; }
    loadOrder();
    loadMessages();
  });
})();
