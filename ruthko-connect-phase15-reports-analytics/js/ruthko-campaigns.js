const RuthkoCampaigns = (() => {
  let leads = [];
  let campaigns = [];
  let currentSegment = [];

  const sampleLeads = [
    { id: 'lead-1', lead_type: 'Sponsor', name: 'Global Investment Group', contact_person: 'Ama Boateng', email: 'ama@example.com', phone: '+1 555 100 1000', status: 'Proposal', value: 50000, source: 'Sponsor Portal', notes: 'Interested in Platinum Sponsor', marketing_consent: true, marketing_status: 'Subscribed', created_at: new Date().toISOString() },
    { id: 'lead-2', lead_type: 'Employer', name: 'Texas Care Center', contact_person: 'HR Manager', email: 'hr@example.com', phone: '+1 555 200 2000', status: 'Qualified', value: 75000, source: 'Employer staffing request', notes: 'Needs CNAs and RNs', marketing_consent: true, marketing_status: 'Subscribed', created_at: new Date().toISOString() },
    { id: 'lead-3', lead_type: 'Candidate', name: 'Nurse Candidate', contact_person: 'Nurse Candidate', email: 'candidate@example.com', phone: '+233 000 000', status: 'New', value: 0, source: 'Candidate form', notes: 'Interested in EB-3', marketing_consent: true, marketing_status: 'Subscribed', created_at: new Date().toISOString() },
    { id: 'lead-4', lead_type: 'Vendor', name: 'Cultural Foods LLC', contact_person: 'Vendor Lead', email: 'vendor@example.com', phone: '+1 555 300 3000', status: 'New', value: 3500, source: 'Vendor booth request', notes: 'Food booth', marketing_consent: false, marketing_status: 'Unsubscribed', created_at: new Date().toISOString() }
  ];

  function getClient() {
    return window.getRuthkoSupabaseClient ? window.getRuthkoSupabaseClient() : null;
  }

  function text(value) {
    return String(value || '').trim();
  }

  function escapeHtml(value) {
    return text(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function money(value) {
    const amount = Number(value || 0);
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  }

  function isEligible(lead) {
    const status = text(lead.marketing_status || '').toLowerCase();
    return Boolean(lead.email) && lead.marketing_consent === true && status !== 'unsubscribed' && status !== 'suppressed';
  }

  function getLocalLeads() {
    const stored = JSON.parse(localStorage.getItem('ruthkoLocalLeads') || '[]');
    if (!stored.length) return sampleLeads;
    return stored.map((lead) => ({
      ...lead,
      marketing_consent: lead.marketing_consent === true || lead.marketing_consent === 'true' || lead.marketing_consent === 'on',
      marketing_status: lead.marketing_status || (lead.marketing_consent ? 'Subscribed' : 'Unknown')
    }));
  }

  function getLocalCampaigns() {
    return JSON.parse(localStorage.getItem('ruthkoCampaigns') || '[]');
  }

  function saveLocalCampaign(campaign) {
    const stored = getLocalCampaigns();
    stored.unshift(campaign);
    localStorage.setItem('ruthkoCampaigns', JSON.stringify(stored));
  }

  async function loadLive(client) {
    const { data: leadData, error: leadError } = await client
      .from('leads')
      .select('id, lead_type, name, contact_person, email, phone, status, value, source, notes, marketing_consent, marketing_status, created_at')
      .order('created_at', { ascending: false });
    if (leadError) throw leadError;

    const { data: campaignData, error: campaignError } = await client
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    if (campaignError) throw campaignError;

    leads = leadData || [];
    campaigns = campaignData || [];
  }

  async function loadData() {
    const client = getClient();
    const status = document.getElementById('campaignConnectionStatus');
    try {
      if (client) {
        await loadLive(client);
        if (status) {
          status.textContent = 'Connected to Supabase campaign database.';
          status.className = 'text-xs text-green-400 mt-2';
        }
      } else {
        leads = getLocalLeads();
        campaigns = getLocalCampaigns();
        if (status) {
          status.textContent = 'Sample mode. Campaigns and segments save to browser storage until Supabase keys are added.';
          status.className = 'text-xs text-yellow-400 mt-2';
        }
      }
    } catch (error) {
      console.error(error);
      leads = getLocalLeads();
      campaigns = getLocalCampaigns();
      if (status) {
        status.textContent = 'Campaign database not ready. Showing sample mode.';
        status.className = 'text-xs text-red-400 mt-2';
      }
    }
    applySegment();
    renderCampaigns();
    renderStats();
  }

  function applySegment() {
    const type = document.getElementById('segmentType')?.value || 'all';
    const status = document.getElementById('segmentStatus')?.value || '';
    const search = text(document.getElementById('segmentSearch')?.value).toLowerCase();

    currentSegment = leads.filter((lead) => {
      const eligible = isEligible(lead);
      const typeMatch = type === 'all' || lead.lead_type === type;
      const statusMatch = !status || lead.status === status;
      const haystack = [lead.name, lead.contact_person, lead.email, lead.phone, lead.notes, lead.source].join(' ').toLowerCase();
      const searchMatch = !search || haystack.includes(search);
      return eligible && typeMatch && statusMatch && searchMatch;
    });

    renderSegment();
    renderStats();
  }

  function renderStats() {
    const eligible = leads.filter(isEligible).length;
    const suppressed = leads.filter((lead) => !isEligible(lead) && lead.email).length;
    const drafts = campaigns.filter((campaign) => campaign.status !== 'Sent').length;
    const sent = campaigns.filter((campaign) => campaign.status === 'Sent').length;

    document.getElementById('statEligible').textContent = eligible;
    document.getElementById('statSuppressed').textContent = suppressed;
    document.getElementById('statDrafts').textContent = drafts;
    document.getElementById('statSent').textContent = sent;
  }

  function renderSegment() {
    const body = document.getElementById('segmentTableBody');
    const count = document.getElementById('segmentCount');
    const message = document.getElementById('segmentMessage');
    if (!body) return;

    if (count) count.textContent = `${currentSegment.length} contact${currentSegment.length === 1 ? '' : 's'}`;
    if (message) message.textContent = currentSegment.length ? 'Segment ready.' : 'No eligible contacts match this segment.';

    body.innerHTML = currentSegment.map((lead) => `
      <tr class="border-t border-zinc-800 hover:bg-zinc-900/40">
        <td class="p-4"><div class="font-bold">${escapeHtml(lead.name)}</div><div class="text-xs text-zinc-500">${escapeHtml(lead.contact_person)}</div></td>
        <td class="p-4"><span class="px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-xs">${escapeHtml(lead.lead_type)}</span></td>
        <td class="p-4 text-zinc-300">${escapeHtml(lead.email)}</td>
        <td class="p-4 text-zinc-400">${escapeHtml(lead.status)}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" class="p-6 text-zinc-400">No contacts found.</td></tr>';
  }

  function renderCampaigns() {
    const target = document.getElementById('campaignList');
    if (!target) return;
    target.innerHTML = campaigns.map((campaign) => `
      <article class="p-5 hover:bg-zinc-900/40">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="font-bold text-lg">${escapeHtml(campaign.name)}</h3>
            <p class="text-sm text-zinc-400 mt-1">${escapeHtml(campaign.subject)}</p>
            <p class="text-xs text-zinc-500 mt-2">${escapeHtml(campaign.segment_type || 'all')} · ${escapeHtml(campaign.status || 'Draft')} · ${Number(campaign.recipient_count || 0)} recipients</p>
          </div>
          <span class="text-xs px-2 py-1 rounded-full ${campaign.status === 'Sent' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}">${escapeHtml(campaign.status || 'Draft')}</span>
        </div>
      </article>
    `).join('') || '<div class="p-6 text-zinc-400">No campaigns saved yet.</div>';
  }

  function campaignFromForm(status = 'Draft') {
    const form = document.getElementById('campaignForm');
    const data = Object.fromEntries(new FormData(form).entries());
    return {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name: text(data.name),
      campaign_type: text(data.campaign_type || 'Email'),
      segment_type: document.getElementById('segmentType')?.value || 'all',
      segment_status: document.getElementById('segmentStatus')?.value || '',
      subject: text(data.subject),
      preview_text: text(data.preview_text),
      body_text: text(data.body_text),
      body_html: text(data.body_text).split('\n').map((line) => `<p>${escapeHtml(line)}</p>`).join(''),
      status,
      recipient_count: currentSegment.length,
      created_at: new Date().toISOString()
    };
  }

  async function saveDraft(event) {
    event.preventDefault();
    const message = document.getElementById('campaignMessage');
    const campaign = campaignFromForm('Draft');
    if (!campaign.name || !campaign.subject || !campaign.body_text) {
      if (message) message.textContent = 'Add campaign name, subject, and body.';
      return;
    }

    const client = getClient();
    try {
      if (client) {
        const { error } = await client.from('campaigns').insert([campaign]);
        if (error) throw error;
      } else {
        saveLocalCampaign(campaign);
      }
      if (message) message.textContent = 'Draft saved.';
      await loadData();
    } catch (error) {
      console.error(error);
      if (message) {
        message.textContent = 'Draft save failed. Run the Phase 10 SQL file.';
        message.className = 'text-sm font-bold text-red-400';
      }
    }
  }

  function previewCampaign() {
    const campaign = campaignFromForm('Draft');
    const panel = document.getElementById('previewPanel');
    const content = document.getElementById('previewContent');
    if (!panel || !content) return;
    content.innerHTML = `
      <p style="font-size:12px;color:#6b7280;margin:0 0 8px;">${escapeHtml(campaign.preview_text)}</p>
      <h1 style="font-size:24px;margin:0 0 16px;">${escapeHtml(campaign.subject)}</h1>
      <div style="font-size:15px;line-height:1.6;">${campaign.body_html}</div>
      <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;" />
      <p style="font-size:12px;color:#6b7280;">Ruthko Connect · www.ruthkojobs.com · www.ruthkoevents.com · info@ruthkojobs.com</p>
    `;
    panel.classList.remove('hidden');
  }

  async function sendCampaign() {
    const message = document.getElementById('campaignMessage');
    const confirmed = document.getElementById('confirmConsent')?.checked;
    const campaign = campaignFromForm('Sending');

    if (!confirmed) {
      if (message) {
        message.textContent = 'Confirm consent before sending.';
        message.className = 'text-sm font-bold text-red-400';
      }
      return;
    }

    if (!currentSegment.length) {
      if (message) {
        message.textContent = 'No eligible contacts in this segment.';
        message.className = 'text-sm font-bold text-red-400';
      }
      return;
    }

    try {
      if (message) {
        message.textContent = 'Sending campaign...';
        message.className = 'text-sm font-bold text-yellow-400';
      }

      const response = await fetch('/.netlify/functions/send-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign, recipients: currentSegment })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Campaign send failed');

      campaign.status = 'Sent';
      campaign.sent_at = new Date().toISOString();
      campaign.recipient_count = result.sent || currentSegment.length;

      const client = getClient();
      if (client) {
        await client.from('campaigns').insert([campaign]);
        await client.from('campaign_sends').insert(currentSegment.map((lead) => ({
          campaign_id: campaign.id,
          lead_id: lead.id,
          email: lead.email,
          status: 'Sent'
        })));
      } else {
        saveLocalCampaign(campaign);
      }

      if (message) {
        message.textContent = `Campaign sent to ${campaign.recipient_count} contact${campaign.recipient_count === 1 ? '' : 's'}.`;
        message.className = 'text-sm font-bold text-green-400';
      }
      await loadData();
    } catch (error) {
      console.error(error);
      if (message) {
        message.textContent = 'Send failed. Use netlify dev and check RESEND_API_KEY.';
        message.className = 'text-sm font-bold text-red-400';
      }
    }
  }

  function exportSegment() {
    const headers = ['name', 'lead_type', 'contact_person', 'email', 'phone', 'status', 'value', 'source', 'notes'];
    const rows = currentSegment.map((lead) => headers.map((field) => `"${String(lead[field] || '').replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ruthko-segment-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function bindEvents() {
    document.getElementById('refreshSegmentButton')?.addEventListener('click', applySegment);
    document.getElementById('exportSegmentButton')?.addEventListener('click', exportSegment);
    document.getElementById('segmentType')?.addEventListener('change', applySegment);
    document.getElementById('segmentStatus')?.addEventListener('change', applySegment);
    document.getElementById('segmentSearch')?.addEventListener('input', applySegment);
    document.getElementById('campaignForm')?.addEventListener('submit', saveDraft);
    document.getElementById('previewButton')?.addEventListener('click', previewCampaign);
    document.getElementById('sendCampaignButton')?.addEventListener('click', sendCampaign);
  }

  function init() {
    bindEvents();
    loadData();
  }

  return { init, applySegment };
})();

window.addEventListener('DOMContentLoaded', RuthkoCampaigns.init);
