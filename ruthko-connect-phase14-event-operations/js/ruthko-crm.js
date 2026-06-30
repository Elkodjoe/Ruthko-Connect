const sampleLeads = [
  {
    id: 'sample-001',
    lead_type: 'Employer',
    name: 'Texas Medical Center',
    contact_person: 'HR Director',
    email: 'hr@example.com',
    phone: '+1 555 100 2000',
    status: 'Qualified',
    value: 75000,
    source: 'Staffing request',
    notes: 'RN EB-3 staffing interest',
    created_at: '2026-06-20'
  },
  {
    id: 'sample-002',
    lead_type: 'Sponsor',
    name: 'Global Investment Group',
    contact_person: 'Sponsor Lead',
    email: 'sponsor@example.com',
    phone: '+1 555 300 4000',
    status: 'Proposal',
    value: 50000,
    source: 'Sponsor portal',
    notes: 'Interested in Platinum Sponsor package',
    created_at: '2026-06-22'
  },
  {
    id: 'sample-003',
    lead_type: 'Candidate',
    name: 'Registered Nurse Candidate',
    contact_person: 'Self',
    email: 'candidate@example.com',
    phone: '+1 555 500 6000',
    status: 'New',
    value: 0,
    source: 'Candidate form',
    notes: 'EB-3 nursing interest',
    created_at: '2026-06-24'
  }
];

const state = {
  leads: [],
  filteredLeads: [],
  client: null,
  usingSample: true
};

function money(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function statusClass(status) {
  const value = (status || '').toLowerCase();
  if (value.includes('closed')) return 'bg-green-500/20 text-green-400';
  if (value.includes('qualified')) return 'bg-blue-500/20 text-blue-400';
  if (value.includes('proposal')) return 'bg-yellow-500/20 text-yellow-400';
  if (value.includes('lost')) return 'bg-red-500/20 text-red-400';
  return 'bg-zinc-700 text-zinc-200';
}

function renderStats() {
  const total = state.filteredLeads.length;
  const pipeline = state.filteredLeads.reduce((sum, lead) => sum + Number(lead.value || 0), 0);
  const sponsors = state.filteredLeads.filter(lead => lead.lead_type === 'Sponsor').length;
  const employers = state.filteredLeads.filter(lead => lead.lead_type === 'Employer').length;

  document.getElementById('statTotalLeads').textContent = total;
  document.getElementById('statPipeline').textContent = money(pipeline);
  document.getElementById('statSponsors').textContent = sponsors;
  document.getElementById('statEmployers').textContent = employers;
}

function renderLeads() {
  const container = document.getElementById('leadsTableBody');
  if (!state.filteredLeads.length) {
    container.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-zinc-400">No leads found.</td></tr>`;
    renderStats();
    return;
  }

  container.innerHTML = state.filteredLeads.map(lead => `
    <tr class="border-b border-zinc-800 hover:bg-zinc-900/60">
      <td class="p-4">
        <div class="font-bold">${lead.name || 'Unnamed Lead'}</div>
        <div class="text-xs text-zinc-500">${lead.contact_person || ''}</div>
      </td>
      <td class="p-4 text-sm text-zinc-300">${lead.lead_type || 'Lead'}</td>
      <td class="p-4 text-sm text-zinc-300">
        <div>${lead.email || ''}</div>
        <div class="text-xs text-zinc-500">${lead.phone || ''}</div>
      </td>
      <td class="p-4"><span class="px-3 py-1 rounded-full text-xs font-bold ${statusClass(lead.status)}">${lead.status || 'New'}</span></td>
      <td class="p-4 font-bold text-green-400">${money(lead.value)}</td>
      <td class="p-4 text-sm text-zinc-400">${lead.source || 'Manual'}</td>
      <td class="p-4 text-right">
        <button onclick="openLead('${lead.id}')" class="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold">View</button>
      </td>
    </tr>
  `).join('');
  renderStats();
}

function applyFilters() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const type = document.getElementById('typeFilter').value;
  const status = document.getElementById('statusFilter').value;

  state.filteredLeads = state.leads.filter(lead => {
    const text = `${lead.name || ''} ${lead.contact_person || ''} ${lead.email || ''} ${lead.phone || ''} ${lead.notes || ''}`.toLowerCase();
    const typeOk = !type || lead.lead_type === type;
    const statusOk = !status || lead.status === status;
    const searchOk = !q || text.includes(q);
    return typeOk && statusOk && searchOk;
  });

  renderLeads();
}

async function loadLeads() {
  state.client = window.getRuthkoSupabaseClient ? window.getRuthkoSupabaseClient() : null;

  if (!state.client) {
    state.usingSample = true;
    state.leads = JSON.parse(localStorage.getItem('ruthkoLocalLeads') || 'null') || sampleLeads;
    document.getElementById('connectionStatus').textContent = 'Sample mode. Paste Supabase keys to connect live database.';
    document.getElementById('connectionStatus').className = 'text-xs text-yellow-400';
    state.filteredLeads = [...state.leads];
    renderLeads();
    return;
  }

  try {
    state.usingSample = false;
    const { data, error } = await state.client.from('leads').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    state.leads = data || [];
    state.filteredLeads = [...state.leads];
    document.getElementById('connectionStatus').textContent = 'Connected to Supabase.';
    document.getElementById('connectionStatus').className = 'text-xs text-green-400';
    renderLeads();
  } catch (error) {
    state.usingSample = true;
    state.leads = sampleLeads;
    state.filteredLeads = [...state.leads];
    document.getElementById('connectionStatus').textContent = 'Database error. Showing sample data.';
    document.getElementById('connectionStatus').className = 'text-xs text-red-400';
    console.error(error);
    renderLeads();
  }
}

async function addLead(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const lead = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    lead_type: formData.get('lead_type'),
    name: formData.get('name'),
    contact_person: formData.get('contact_person'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    status: formData.get('status'),
    value: Number(formData.get('value') || 0),
    source: formData.get('source') || 'Manual CRM',
    notes: formData.get('notes'),
    created_at: new Date().toISOString()
  };

  if (state.client && !state.usingSample) {
    const { error } = await state.client.from('leads').insert([lead]);
    if (error) {
      alert('Supabase insert failed. Check your table and RLS settings.');
      console.error(error);
      return;
    }
  } else {
    state.leads.unshift(lead);
    localStorage.setItem('ruthkoLocalLeads', JSON.stringify(state.leads));
  }

  form.reset();
  await loadLeads();
  document.getElementById('newLeadMessage').textContent = 'Lead saved.';
  setTimeout(() => document.getElementById('newLeadMessage').textContent = '', 2500);
}

function openLead(id) {
  const lead = state.leads.find(item => item.id === id);
  if (!lead) return;
  document.getElementById('leadDetails').innerHTML = `
    <h3 class="text-xl font-bold text-yellow-400 mb-3">${lead.name || 'Lead Details'}</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
      <p><span class="text-zinc-500">Type:</span> ${lead.lead_type || ''}</p>
      <p><span class="text-zinc-500">Status:</span> ${lead.status || ''}</p>
      <p><span class="text-zinc-500">Contact:</span> ${lead.contact_person || ''}</p>
      <p><span class="text-zinc-500">Value:</span> ${money(lead.value)}</p>
      <p><span class="text-zinc-500">Email:</span> ${lead.email || ''}</p>
      <p><span class="text-zinc-500">Phone:</span> ${lead.phone || ''}</p>
      <p class="md:col-span-2"><span class="text-zinc-500">Source:</span> ${lead.source || ''}</p>
      <p class="md:col-span-2"><span class="text-zinc-500">Notes:</span> ${lead.notes || ''}</p>
    </div>
  `;
  document.getElementById('leadModal').classList.remove('hidden');
}

function closeLeadModal() {
  document.getElementById('leadModal').classList.add('hidden');
}

function exportLeadsCsv() {
  const headers = ['lead_type', 'name', 'contact_person', 'email', 'phone', 'status', 'value', 'source', 'notes', 'created_at'];
  const rows = state.filteredLeads.map(lead => headers.map(key => `"${String(lead[key] || '').replaceAll('"', '""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ruthko-crm-leads.csv';
  a.click();
  URL.revokeObjectURL(url);
}

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('leadForm').addEventListener('submit', addLead);
  document.getElementById('searchInput').addEventListener('input', applyFilters);
  document.getElementById('typeFilter').addEventListener('change', applyFilters);
  document.getElementById('statusFilter').addEventListener('change', applyFilters);
  document.getElementById('exportButton').addEventListener('click', exportLeadsCsv);
  loadLeads();
});
