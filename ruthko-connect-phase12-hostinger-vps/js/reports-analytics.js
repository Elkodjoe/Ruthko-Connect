// Ruthko Connect Phase 15 Reports & Analytics
(function () {
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const state = { leads: [], payments: [], tasks: [], eventPrograms: [], sponsorDeliverables: [], vendorBooths: [], attendees: [], campaigns: [] };

  const sample = {
    leads: [
      { lead_type: 'Employer', name: 'Texas Medical Center', status: 'Qualified', value: 75000, source: 'Staffing request', created_at: '2026-05-02' },
      { lead_type: 'Sponsor', name: 'Global Investment Group', status: 'Proposal', value: 50000, source: 'Sponsor portal', created_at: '2026-05-12' },
      { lead_type: 'Candidate', name: 'Registered Nurse Candidate', status: 'New', value: 0, source: 'Candidate form', created_at: '2026-05-20' },
      { lead_type: 'Vendor', name: 'Diaspora Market Vendor', status: 'Qualified', value: 3500, source: 'Vendor booth', created_at: '2026-06-01' },
      { lead_type: 'Event', name: 'Cultural Handshake Guest', status: 'New', value: 250, source: 'Event RSVP', created_at: '2026-06-12' },
      { lead_type: 'Partner', name: 'Texas Business Network', status: 'Proposal', value: 15000, source: 'Partner inquiry', created_at: '2026-06-18' }
    ],
    payments: [
      { payment_type: 'Sponsor', payer_name: 'Global Investment Group', amount: 15000, payment_status: 'Paid', created_at: '2026-04-15' },
      { payment_type: 'Vendor Booth', payer_name: 'Diaspora Market Vendor', amount: 3500, payment_status: 'Paid', created_at: '2026-05-22' },
      { payment_type: 'Ticket', payer_name: 'Event Guest', amount: 250, payment_status: 'Paid', created_at: '2026-06-15' }
    ],
    tasks: [
      { title: 'Call sponsor lead', status: 'Open', due_date: '2026-06-30' },
      { title: 'Send vendor invoice', status: 'Completed', due_date: '2026-06-18' },
      { title: 'Review RN candidate documents', status: 'Open', due_date: '2026-06-28' },
      { title: 'Confirm keynote speaker', status: 'Open', due_date: '2026-07-01' }
    ],
    eventPrograms: [
      { title: 'Cultural Handshake Summit', status: 'Planning', event_date: '2026-08-20', city: 'Houston, TX' },
      { title: 'Global Recruitment Forum', status: 'Planning', event_date: '2026-09-10', city: 'Virtual' }
    ],
    sponsorDeliverables: [
      { sponsor_name: 'Global Investment Group', tier: 'Gold', amount: 15000, payment_status: 'Paid', status: 'Open' },
      { sponsor_name: 'Healthcare Partner', tier: 'Silver', amount: 5000, payment_status: 'Pending', status: 'Open' }
    ],
    vendorBooths: [
      { business_name: 'Diaspora Market Vendor', booth_status: 'Paid', payment_status: 'Paid' },
      { business_name: 'Catering Partner', booth_status: 'Reserved', payment_status: 'Pending' }
    ],
    attendees: [
      { name: 'VIP Guest', status: 'Checked In', ticket_type: 'VIP' },
      { name: 'General Guest', status: 'Registered', ticket_type: 'General' },
      { name: 'Sponsor Guest', status: 'Confirmed', ticket_type: 'Sponsor Guest' }
    ],
    campaigns: [
      { name: 'Sponsor outreach', segment: 'Sponsors', sent: 42, replies: 8, created_at: '2026-06-05' },
      { name: 'Employer staffing follow-up', segment: 'Employers', sent: 65, replies: 11, created_at: '2026-06-14' },
      { name: 'Event RSVP push', segment: 'Event Guests', sent: 120, replies: 25, created_at: '2026-06-20' }
    ]
  };

  function byId(id) { return document.getElementById(id); }
  function setText(id, value) { const el = byId(id); if (el) el.textContent = value; }
  function valueSum(rows, field) { return rows.reduce((sum, row) => sum + Number(row[field] || 0), 0); }
  function isPaid(row) { return String(row.payment_status || row.status || '').toLowerCase().includes('paid') || String(row.payment_status || '').toLowerCase().includes('success'); }
  function groupBy(rows, key) {
    return rows.reduce((acc, row) => { const name = row[key] || 'Other'; acc[name] = (acc[name] || 0) + 1; return acc; }, {});
  }
  function monthName(dateLike) {
    const d = new Date(dateLike || Date.now());
    return d.toLocaleString('en-US', { month: 'short' });
  }

  async function loadTable(client, name) {
    const { data, error } = await client.from(name).select('*').limit(500);
    if (error) throw error;
    return data || [];
  }

  async function loadData() {
    const config = window.RUTHKO_SUPABASE_CONFIG || {};
    const sampleMode = config.sampleMode !== false;
    if (sampleMode || !window.supabase || !config.url || !config.anonKey) {
      Object.assign(state, JSON.parse(JSON.stringify(sample)));
      setText('reportsMessage', 'Local sample mode is ready. Connect Supabase for live reports.');
      return;
    }

    try {
      const client = window.supabase.createClient(config.url, config.anonKey);
      const [leads, payments, tasks, eventPrograms, sponsorDeliverables, vendorBooths, attendees] = await Promise.all([
        loadTable(client, 'leads'),
        loadTable(client, 'payments'),
        loadTable(client, 'tasks'),
        loadTable(client, 'event_programs').catch(() => []),
        loadTable(client, 'event_sponsor_deliverables').catch(() => []),
        loadTable(client, 'event_vendor_booths').catch(() => []),
        loadTable(client, 'event_attendees').catch(() => [])
      ]);
      Object.assign(state, { leads, payments, tasks, eventPrograms, sponsorDeliverables, vendorBooths, attendees, campaigns: sample.campaigns });
      setText('reportsMessage', 'Live Supabase reports loaded.');
    } catch (error) {
      console.warn('Reports fell back to sample data:', error);
      Object.assign(state, JSON.parse(JSON.stringify(sample)));
      setText('reportsMessage', 'Could not load Supabase. Showing sample report data.');
    }
  }

  function filteredLeads() {
    const business = byId('businessFilter')?.value || 'all';
    const mapping = { staffing: ['Employer','Candidate'], events: ['Event'], sponsors: ['Sponsor'], vendors: ['Vendor'] };
    if (business === 'all') return state.leads;
    return state.leads.filter(row => (mapping[business] || []).includes(row.lead_type));
  }

  function renderMetrics() {
    const leads = filteredLeads();
    const paidPayments = state.payments.filter(isPaid);
    const sponsorValue = valueSum(state.sponsorDeliverables, 'amount');
    const pipeline = valueSum(leads.filter(row => !['Closed Lost'].includes(row.status)), 'value') + sponsorValue;
    const revenue = valueSum(paidPayments, 'amount') + valueSum(leads.filter(row => row.status === 'Closed Won'), 'value');
    const activeLeads = leads.filter(row => !['Closed Won','Closed Lost'].includes(row.status)).length;
    const completed = state.tasks.filter(row => String(row.status).toLowerCase().includes('complete')).length;
    const health = state.tasks.length ? Math.round((completed / state.tasks.length) * 100) : 0;
    setText('metricPipeline', money.format(pipeline));
    setText('metricRevenue', money.format(revenue));
    setText('metricLeads', String(activeLeads));
    setText('metricTaskHealth', health + '%');
  }

  function renderMonthlyChart() {
    const buckets = {};
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    months.forEach(m => buckets[m] = { revenue: 0, pipeline: 0 });
    state.payments.filter(isPaid).forEach(row => buckets[monthName(row.created_at)].revenue += Number(row.amount || 0));
    filteredLeads().forEach(row => buckets[monthName(row.created_at)].pipeline += Number(row.value || 0));
    const values = Object.values(buckets);
    const max = Math.max(...values.flatMap(v => [v.revenue, v.pipeline]), 1);
    const chart = byId('monthlyChart');
    const labels = byId('monthlyLabels');
    if (!chart || !labels) return;
    chart.innerHTML = months.map(m => {
      const rev = Math.max(8, Math.round((buckets[m].revenue / max) * 250));
      const pipe = Math.max(8, Math.round((buckets[m].pipeline / max) * 250));
      return `<div class="flex items-end gap-1" title="${m}: Revenue ${money.format(buckets[m].revenue)}, Pipeline ${money.format(buckets[m].pipeline)}"><div class="bar" style="height:${rev}px"></div><div class="bar bar-blue" style="height:${pipe}px"></div></div>`;
    }).join('');
    labels.innerHTML = months.map(m => `<span class="w-14 text-center">${m}</span>`).join('');
  }

  function renderLeadMix() {
    const leads = filteredLeads();
    const mix = groupBy(leads, 'lead_type');
    const total = Math.max(leads.length, 1);
    const list = byId('leadMixList');
    if (!list) return;
    list.innerHTML = Object.entries(mix).map(([name, count]) => {
      const pct = Math.round((count / total) * 100);
      return `<div><div class="flex justify-between text-sm mb-1"><span>${name}</span><span class="text-yellow-400">${count} · ${pct}%</span></div><div class="h-2 bg-zinc-800 rounded-full overflow-hidden"><div class="h-full bg-yellow-500" style="width:${pct}%"></div></div></div>`;
    }).join('') || '<p class="text-zinc-500 text-sm">No lead data yet.</p>';
  }

  function card(label, value, detail, color) {
    return `<div class="p-4 rounded-xl bg-zinc-950 border border-zinc-800"><div class="flex justify-between gap-3"><p class="font-bold">${label}</p><span class="text-${color || 'yellow'}-400 font-bold">${value}</span></div><p class="text-zinc-400 text-sm mt-1">${detail}</p></div>`;
  }

  function renderOperationalReports() {
    const eventList = byId('eventReportList');
    const sponsorList = byId('sponsorReportList');
    const campaignList = byId('campaignReportList');
    if (eventList) eventList.innerHTML = [
      card('Active events', state.eventPrograms.length, 'Programs in planning or active status', 'orange'),
      card('Attendees', state.attendees.length, 'Registered, confirmed, and checked-in guests', 'blue'),
      card('Checked in', state.attendees.filter(a => a.status === 'Checked In').length, 'Guests marked as checked in', 'green')
    ].join('');
    if (sponsorList) sponsorList.innerHTML = [
      card('Sponsor value', money.format(valueSum(state.sponsorDeliverables, 'amount')), 'Committed and proposed deliverables', 'yellow'),
      card('Vendor booths', state.vendorBooths.length, 'Reserved, pending, and paid booths', 'green'),
      card('Paid booths', state.vendorBooths.filter(v => String(v.payment_status).toLowerCase() === 'paid').length, 'Vendor booths with payment marked paid', 'blue')
    ].join('');
    if (campaignList) campaignList.innerHTML = state.campaigns.map(c => {
      const rate = c.sent ? Math.round((c.replies / c.sent) * 100) : 0;
      return card(c.name, rate + '%', `${c.segment} · ${c.sent} sent · ${c.replies} replies`, 'purple');
    }).join('');
  }

  function renderAlerts() {
    const alerts = [];
    const overdueOrOpen = state.tasks.filter(row => String(row.status).toLowerCase() === 'open').slice(0, 3);
    overdueOrOpen.forEach(task => alerts.push({ title: task.title, body: `Task is open. Due date: ${task.due_date || 'not set'}` }));
    state.sponsorDeliverables.filter(row => String(row.payment_status).toLowerCase() !== 'paid').forEach(row => alerts.push({ title: `Collect sponsor payment: ${row.sponsor_name}`, body: `${row.tier || 'Sponsor'} package, ${money.format(Number(row.amount || 0))}` }));
    state.vendorBooths.filter(row => String(row.payment_status).toLowerCase() !== 'paid').forEach(row => alerts.push({ title: `Follow vendor booth: ${row.business_name}`, body: `Booth status is ${row.booth_status || 'Pending'}` }));
    const box = byId('actionAlerts');
    if (!box) return;
    box.innerHTML = alerts.slice(0, 8).map(item => `<div class="p-4 rounded-xl bg-zinc-950 border border-zinc-800"><p class="font-bold text-yellow-400">${item.title}</p><p class="text-zinc-400 text-sm mt-1">${item.body}</p></div>`).join('') || '<p class="text-zinc-500 text-sm">No urgent alerts.</p>';
  }

  function generateBrief() {
    const leads = filteredLeads();
    const pipeline = valueSum(leads, 'value') + valueSum(state.sponsorDeliverables, 'amount');
    const revenue = valueSum(state.payments.filter(isPaid), 'amount');
    const openTasks = state.tasks.filter(row => String(row.status).toLowerCase() === 'open').length;
    const brief = `Ruthko Connect Executive Brief\n\nPipeline: ${money.format(pipeline)} across ${leads.length} active lead records.\nClosed revenue: ${money.format(revenue)} from paid payments and closed activity.\nEvent operations: ${state.eventPrograms.length} active events, ${state.attendees.length} attendees, ${state.vendorBooths.length} vendor booths, and ${state.sponsorDeliverables.length} sponsor deliverables.\nTask health: ${openTasks} open tasks need follow-up.\n\nPriority actions:\n1. Follow up with sponsor and vendor records with unpaid status.\n2. Move qualified staffing leads to proposal or closed-won stage.\n3. Review event attendee counts and confirm speaker deliverables.\n4. Export this report before weekly leadership review.\n\nRecommended focus: protect Ruthko's event organizing line as a major business line beside staffing, partnerships, and sponsor work.`;
    const textarea = byId('executiveBrief');
    if (textarea) textarea.value = brief;
    return brief;
  }

  function exportCsv() {
    const rows = [
      ['Section','Metric','Value'],
      ['Pipeline','Total', byId('metricPipeline')?.textContent || ''],
      ['Revenue','Closed', byId('metricRevenue')?.textContent || ''],
      ['Leads','Active', byId('metricLeads')?.textContent || ''],
      ['Tasks','Health', byId('metricTaskHealth')?.textContent || ''],
      ['Events','Active', state.eventPrograms.length],
      ['Attendees','Total', state.attendees.length],
      ['Sponsors','Deliverable Value', valueSum(state.sponsorDeliverables, 'amount')],
      ['Vendor Booths','Total', state.vendorBooths.length]
    ];
    const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"','""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ruthko-connect-reports-snapshot.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyBrief() {
    const brief = generateBrief();
    try { await navigator.clipboard.writeText(brief); setText('reportsMessage', 'Executive brief copied.'); }
    catch { setText('reportsMessage', 'Copy failed. Select the brief text and copy manually.'); }
  }

  function renderAll() {
    renderMetrics();
    renderMonthlyChart();
    renderLeadMix();
    renderOperationalReports();
    renderAlerts();
    generateBrief();
    if (window.lucide) window.lucide.createIcons();
  }

  document.addEventListener('DOMContentLoaded', async function () {
    await loadData();
    renderAll();
    byId('refreshReportsButton')?.addEventListener('click', async () => { await loadData(); renderAll(); });
    byId('periodFilter')?.addEventListener('change', renderAll);
    byId('businessFilter')?.addEventListener('change', renderAll);
    byId('exportReportsButton')?.addEventListener('click', exportCsv);
    byId('downloadSnapshotButton')?.addEventListener('click', exportCsv);
    byId('regenerateBriefButton')?.addEventListener('click', generateBrief);
    byId('copyReportBriefButton')?.addEventListener('click', copyBrief);
  });
})();
