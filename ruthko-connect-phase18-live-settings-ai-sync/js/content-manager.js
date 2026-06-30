// Ruthko Connect Live Quick Change Center
(function () {
  const STORE_KEY = 'ruthko_site_settings_v1';
  const STORE_CACHE_KEY = 'ruthko_live_content_store_v1';
  const TOKEN_KEY = 'ruthko_admin_settings_token_v1';
  const API_URL = '/.netlify/functions/site-settings';

  const defaultSettings = {
    contactEmail: 'info@ruthkojobs.com',
    contactPhone1: '+1-701-260-3908',
    contactPhone2: '+1-240-486-5002',
    contactWebsite: 'https://ruthkojobs.com',
    footerMessage: 'Staffing, event organizing, sponsorship, vendors, and partnerships.',
    eventHeadline: 'Ruthko Events and Business Programs',
    eventSubtitle: 'Professional event organizing for summits, vendor programs, sponsor activations, cultural exchanges, and business networking.',
    eventCtaLink: 'intake.html#event',
    eventBannerUrl: 'images/logo.png'
  };

  const defaultEmails = [
    { template_key: 'employer', trigger_name: 'New employer staffing request', is_active: true, subject: 'Thank you for your staffing request', body: 'Hello {{name}},\n\nThank you for contacting Ruthko. We received your staffing request and our team will review your worker needs, timeline, and next steps.\n\nBest,\nRuthko Connect' },
    { template_key: 'candidate', trigger_name: 'New candidate interest', is_active: true, subject: 'Ruthko received your candidate interest form', body: 'Hello {{name}},\n\nThank you for your interest. Please prepare your resume, credentials, and work authorization details for review.\n\nBest,\nRuthko Connect' },
    { template_key: 'sponsor', trigger_name: 'New sponsor inquiry', is_active: true, subject: 'Thank you for your Ruthko sponsorship interest', body: 'Hello {{name}},\n\nThank you for your sponsorship interest. We will share package details, event visibility options, and the next sponsor call path.\n\nBest,\nRuthko Connect' },
    { template_key: 'vendor', trigger_name: 'New vendor booth request', is_active: true, subject: 'Ruthko received your vendor booth request', body: 'Hello {{name}},\n\nThank you for your booth request. We will review booth availability, payment details, and event setup instructions.\n\nBest,\nRuthko Connect' },
    { template_key: 'event', trigger_name: 'New event RSVP', is_active: true, subject: 'Your Ruthko event RSVP was received', body: 'Hello {{name}},\n\nThank you for your RSVP. We will send event details, check-in instructions, and updates as the date approaches.\n\nBest,\nRuthko Connect' }
  ];

  let liveStore = { settings: { ...defaultSettings }, media: [], emailTemplates: defaultEmails, social: [], source: 'browser' };

  function $(id) { return document.getElementById(id); }

  function getLocal(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch (_) { return fallback; }
  }

  function setLocal(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

  function escapeHtml(value) { return String(value || '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function escapeAttr(value) { return escapeHtml(value).replace(/'/g, '&#39;'); }

  function setStatus(id, message, good) {
    const el = $(id); if (!el) return;
    el.textContent = message;
    el.className = good ? 'text-sm text-green-400 mt-3 font-bold' : 'text-sm text-red-400 mt-3 font-bold';
  }

  function setGlobalSync(message, good) {
    const el = $('liveSyncStatus');
    if (!el) return;
    el.textContent = message;
    el.className = good ? 'text-sm text-green-400 font-bold' : 'text-sm text-yellow-400 font-bold';
  }

  function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
  function setToken(value) { value ? localStorage.setItem(TOKEN_KEY, value) : localStorage.removeItem(TOKEN_KEY); }

  function normalizeStore(data) {
    return {
      settings: { ...defaultSettings, ...(data.settings || {}) },
      media: Array.isArray(data.media) ? data.media : [],
      emailTemplates: Array.isArray(data.emailTemplates) && data.emailTemplates.length ? data.emailTemplates : defaultEmails,
      social: Array.isArray(data.social) ? data.social : [],
      source: data.source || 'browser'
    };
  }

  async function fetchLiveStore() {
    const cached = getLocal(STORE_CACHE_KEY, liveStore);
    liveStore = normalizeStore(cached);
    applyStoreToUi();

    const response = await fetch(API_URL, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load live settings.');
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || 'Could not load live settings.');
    liveStore = normalizeStore(data);
    setLocal(STORE_CACHE_KEY, liveStore);
    setLocal(STORE_KEY, liveStore.settings);
    applyStoreToUi();
    setGlobalSync(`Live sync connected through ${liveStore.source}. Changes will show on phone and computer after refresh.`, true);
  }

  async function saveLive(payload) {
    const token = getToken();
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { 'x-admin-settings-token': token } : {}) },
      body: JSON.stringify(payload)
    });

    if (response.status === 401) {
      const entered = prompt('Enter the Admin Settings Token from your VPS .env file.');
      if (entered) {
        setToken(entered.trim());
        return saveLive(payload);
      }
    }

    if (!response.ok) throw new Error(`Save failed: ${response.status}`);
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || 'Save failed');
    liveStore = normalizeStore(data);
    setLocal(STORE_CACHE_KEY, liveStore);
    setLocal(STORE_KEY, liveStore.settings);
    applyStoreToUi();
    setGlobalSync(`Saved live through ${liveStore.source}. Refresh the public website on any device to see it.`, true);
    return liveStore;
  }

  function applyStoreToUi() {
    const s = liveStore.settings || defaultSettings;
    ['contactEmail','contactPhone1','contactPhone2','contactWebsite','footerMessage','eventHeadline','eventSubtitle','eventCtaLink','eventBannerUrl'].forEach((id) => {
      if ($(id)) $(id).value = s[id] || '';
    });
    if ($('adminSettingsToken')) $('adminSettingsToken').value = getToken();
    updateEventPreview();
    renderEmailTemplates();
    renderFlyers();
    renderSocial();
  }

  function updateEventPreview() {
    const headline = $('eventHeadline')?.value || defaultSettings.eventHeadline;
    const subtitle = $('eventSubtitle')?.value || defaultSettings.eventSubtitle;
    const url = $('eventBannerUrl')?.value || defaultSettings.eventBannerUrl;
    if ($('eventHeadlinePreview')) $('eventHeadlinePreview').textContent = headline;
    if ($('eventSubtitlePreview')) $('eventSubtitlePreview').textContent = subtitle;
    if ($('eventBannerPreview')) $('eventBannerPreview').src = url;
  }

  function renderEmailTemplates() {
    const list = $('emailTemplateList'); if (!list) return;
    const templates = liveStore.emailTemplates || defaultEmails;
    list.innerHTML = templates.map((tpl, index) => {
      const key = tpl.template_key || tpl.id || `template-${index}`;
      return `
      <article class="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
        <div class="flex items-center justify-between gap-3 mb-3"><h4 class="font-bold">${escapeHtml(tpl.trigger_name || tpl.trigger || key)}</h4><label class="text-xs text-zinc-400 flex items-center gap-2"><input type="checkbox" data-email-active="${index}" ${tpl.is_active === false || tpl.active === false ? '' : 'checked'}> Active</label></div>
        <input data-email-key="${index}" type="hidden" value="${escapeAttr(key)}">
        <label class="text-xs text-zinc-500">Subject<input data-email-subject="${index}" class="field mt-1" value="${escapeAttr(tpl.subject)}"></label>
        <label class="text-xs text-zinc-500 block mt-3">Body<textarea data-email-body="${index}" class="field mt-1 h-40">${escapeHtml(tpl.body)}</textarea></label>
      </article>`;
    }).join('');
  }

  function renderFlyers() {
    const list = $('flyerList'); if (!list) return;
    const flyers = liveStore.media || [];
    if (!flyers.length) { list.innerHTML = '<p class="text-zinc-500 text-sm">No flyers saved yet.</p>'; return; }
    list.innerHTML = flyers.map((flyer, index) => `
      <article class="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
        <img src="${escapeAttr(flyer.url)}" class="h-40 w-full object-contain rounded-xl bg-white p-2" alt="${escapeAttr(flyer.title)}">
        <h4 class="font-bold mt-3">${escapeHtml(flyer.title)}</h4>
        <p class="text-xs text-zinc-500 mt-1">${flyer.created_at || flyer.createdAt ? new Date(flyer.created_at || flyer.createdAt).toLocaleString() : ''}</p>
        <div class="flex gap-2 mt-3"><button data-copy-flyer="${index}" class="btn-secondary px-3 py-2 rounded-lg text-xs font-bold">Copy Link</button><button data-delete-flyer="${index}" class="bg-red-500/20 text-red-300 px-3 py-2 rounded-lg text-xs font-bold">Delete</button></div>
      </article>`).join('');
  }

  function renderSocial() {
    const list = $('socialList'); if (!list) return;
    const posts = liveStore.social || [];
    if (!posts.length) { list.innerHTML = '<p class="text-zinc-500 text-sm">No social posts saved yet.</p>'; return; }
    list.innerHTML = posts.map((post, index) => `
      <article class="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
        <div class="flex flex-wrap items-center justify-between gap-3"><p class="font-bold">${escapeHtml(post.platform)} • ${escapeHtml(post.topic)}</p><p class="text-xs text-yellow-400">${escapeHtml(post.scheduled_for || post.date || 'No date')}</p></div>
        <p class="text-sm text-zinc-300 mt-3 whitespace-pre-wrap">${escapeHtml(post.caption)}</p>
        <div class="flex gap-2 mt-3"><button data-copy-social="${index}" class="btn-secondary px-3 py-2 rounded-lg text-xs font-bold">Copy</button><button data-delete-social="${index}" class="bg-red-500/20 text-red-300 px-3 py-2 rounded-lg text-xs font-bold">Delete</button></div>
      </article>`).join('');
  }

  function fileToDataUrl(file, callback) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please choose an image file.'); return; }
    const reader = new FileReader();
    reader.onload = () => callback(reader.result);
    reader.readAsDataURL(file);
  }

  function makeSocialCaption(platform, topic) {
    const cleanTopic = topic || 'Ruthko services';
    if (platform === 'LinkedIn') return `Ruthko Connect supports ${cleanTopic} through staffing, event coordination, sponsor engagement, vendor support, and partner follow-up.\n\nContact Ruthko to discuss how your organization can participate.`;
    if (platform === 'Instagram') return `${cleanTopic}\n\nRuthko connects people, events, sponsors, vendors, and opportunities with clear follow-up.\n\nVisit ruthkojobs.com.`;
    if (platform === 'TikTok') return `Video idea: Show the problem, then show how Ruthko helps with ${cleanTopic}. End with a clear call to action: visit ruthkojobs.com.`;
    return `Ruthko Connect update: ${cleanTopic}. We support staffing, event organizing, sponsors, vendors, and partnerships. Visit ruthkojobs.com to connect with us.`;
  }

  function currentSettingsFromForm() {
    return {
      contactEmail: $('contactEmail').value,
      contactPhone1: $('contactPhone1').value,
      contactPhone2: $('contactPhone2').value,
      contactWebsite: $('contactWebsite').value,
      footerMessage: $('footerMessage').value,
      eventHeadline: $('eventHeadline').value,
      eventSubtitle: $('eventSubtitle').value,
      eventCtaLink: $('eventCtaLink').value,
      eventBannerUrl: $('eventBannerUrl').value
    };
  }

  function emailTemplatesFromForm() {
    const templates = liveStore.emailTemplates || defaultEmails;
    return templates.map((tpl, index) => ({
      template_key: document.querySelector(`[data-email-key="${index}"]`)?.value || tpl.template_key || tpl.id,
      trigger_name: tpl.trigger_name || tpl.trigger || tpl.template_key || tpl.id,
      is_active: document.querySelector(`[data-email-active="${index}"]`)?.checked || false,
      subject: document.querySelector(`[data-email-subject="${index}"]`)?.value || '',
      body: document.querySelector(`[data-email-body="${index}"]`)?.value || ''
    }));
  }

  function bindEvents() {
    document.querySelectorAll('.cms-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cms-tab').forEach(b => b.classList.remove('tab-active'));
        btn.classList.add('tab-active');
        const target = btn.getAttribute('data-cms-tab');
        document.querySelectorAll('.cms-panel').forEach((panel) => panel.classList.toggle('hidden', panel.getAttribute('data-cms-panel') !== target));
      });
    });

    $('saveAdminSettingsTokenBtn')?.addEventListener('click', () => {
      setToken($('adminSettingsToken')?.value.trim() || '');
      setGlobalSync('Admin Settings Token saved in this browser.', true);
    });

    $('refreshLiveSettingsBtn')?.addEventListener('click', async () => {
      try { await fetchLiveStore(); } catch (error) { setGlobalSync(error.message, false); }
    });

    $('saveContactsBtn')?.addEventListener('click', async () => {
      try {
        await saveLive({ settings: {
          contactEmail: $('contactEmail').value,
          contactPhone1: $('contactPhone1').value,
          contactPhone2: $('contactPhone2').value,
          contactWebsite: $('contactWebsite').value,
          footerMessage: $('footerMessage').value
        }});
        setStatus('contactsStatus', 'Contact changes saved live. Refresh public pages on phone and computer.', true);
      } catch (error) { setStatus('contactsStatus', error.message, false); }
    });

    ['eventHeadline','eventSubtitle','eventBannerUrl'].forEach(id => $(id)?.addEventListener('input', updateEventPreview));
    $('eventBannerFile')?.addEventListener('change', (e) => fileToDataUrl(e.target.files[0], (url) => { $('eventBannerUrl').value = url; updateEventPreview(); }));
    $('saveEventBannerBtn')?.addEventListener('click', async () => {
      try {
        await saveLive({ settings: { eventHeadline: $('eventHeadline').value, eventSubtitle: $('eventSubtitle').value, eventCtaLink: $('eventCtaLink').value, eventBannerUrl: $('eventBannerUrl').value }});
        setStatus('eventStatus', 'Event banner saved live. Refresh events page to see it.', true);
      } catch (error) { setStatus('eventStatus', error.message, false); }
    });

    $('flyerFile')?.addEventListener('change', (e) => fileToDataUrl(e.target.files[0], (url) => { $('flyerLink').value = url; }));
    $('addFlyerBtn')?.addEventListener('click', async () => {
      const title = $('flyerTitle').value.trim(); const url = $('flyerLink').value.trim();
      if (!title || !url) { alert('Add a flyer title and link.'); return; }
      try {
        await saveLive({ mediaAsset: { asset_type: 'flyer', title, url }});
        $('flyerTitle').value = ''; $('flyerLink').value = '';
      } catch (error) { alert(error.message); }
    });

    $('saveEmailTemplatesBtn')?.addEventListener('click', async () => {
      try {
        await saveLive({ emailTemplates: emailTemplatesFromForm() });
        alert('Email automation templates saved live.');
      } catch (error) { alert(error.message); }
    });

    $('generateSocialBtn')?.addEventListener('click', () => { $('socialCaption').value = makeSocialCaption($('socialPlatform').value, $('socialTopic').value); });
    $('saveSocialBtn')?.addEventListener('click', async () => {
      const post = { platform: $('socialPlatform').value, topic: $('socialTopic').value || 'Ruthko update', date: $('socialDate').value, caption: $('socialCaption').value, status: 'draft' };
      if (!post.caption.trim()) { alert('Generate or type a caption first.'); return; }
      try { await saveLive({ socialPublication: post }); $('socialCaption').value = ''; } catch (error) { alert(error.message); }
    });
    $('copySocialBtn')?.addEventListener('click', () => navigator.clipboard.writeText($('socialCaption').value || ''));
    $('exportSocialBtn')?.addEventListener('click', exportSocialCsv);

    document.addEventListener('click', async (e) => {
      const copyFlyer = e.target.getAttribute('data-copy-flyer');
      const deleteFlyer = e.target.getAttribute('data-delete-flyer');
      const copySocial = e.target.getAttribute('data-copy-social');
      const deleteSocial = e.target.getAttribute('data-delete-social');

      if (copyFlyer !== null) navigator.clipboard.writeText((liveStore.media || [])[Number(copyFlyer)]?.url || '');
      if (copySocial !== null) navigator.clipboard.writeText((liveStore.social || [])[Number(copySocial)]?.caption || '');

      if (deleteFlyer !== null) {
        const item = (liveStore.media || [])[Number(deleteFlyer)];
        if (item?.id && confirm('Delete this flyer from the live library?')) await saveLive({ deleteMediaId: item.id });
      }

      if (deleteSocial !== null) {
        const item = (liveStore.social || [])[Number(deleteSocial)];
        if (item?.id && confirm('Delete this social draft from the live library?')) await saveLive({ deleteSocialId: item.id });
      }
    });

    document.querySelectorAll('.admin-prompt').forEach(btn => btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-admin-prompt');
      const settings = currentSettingsFromForm();
      const prompts = {
        event: `Act as Ruthko Connect event administrator. Create a clean event update using this headline: ${settings.eventHeadline}. Include audience, sponsor value, vendor opportunity, RSVP path, and next action.`,
        crm: 'Act as Ruthko Connect CRM assistant. Review today\'s employer, candidate, sponsor, vendor, and event leads. Create follow-up priorities, email subjects, call scripts, and overdue task warnings.',
        social: 'Act as Ruthko social media manager. Create a 7-day publication plan for staffing, event organizing, sponsor packages, vendor booths, partner outreach, and public intake forms.'
      };
      $('adminPromptOutput').value = prompts[type] || '';
    }));
    $('copyAdminPromptBtn')?.addEventListener('click', () => navigator.clipboard.writeText($('adminPromptOutput').value || ''));
    $('exportSettingsBtn')?.addEventListener('click', exportSettingsJson);
  }

  function exportSettingsJson() {
    const data = { settings: currentSettingsFromForm(), media: liveStore.media || [], emailTemplates: emailTemplatesFromForm(), social: liveStore.social || [] };
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'ruthko-live-site-settings.json');
  }

  function exportSocialCsv() {
    const posts = liveStore.social || [];
    const rows = [['platform','topic','date','caption','status'], ...posts.map(p => [p.platform,p.topic,p.scheduled_for || p.date,p.caption,p.status])];
    const csv = rows.map(r => r.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    downloadBlob(new Blob([csv], { type: 'text/csv' }), 'ruthko-social-publications.csv');
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (typeof window.ruthkoRequireAdmin === 'function') await window.ruthkoRequireAdmin();
    bindEvents();
    try { await fetchLiveStore(); } catch (error) { setGlobalSync(`${error.message}. Browser fallback is active.`, false); applyStoreToUi(); }
    if (window.lucide) lucide.createIcons();
    document.querySelectorAll('.nav-link').forEach(link => { if (link.getAttribute('data-page') === 'content-manager') link.classList.add('nav-active'); });
  });
})();
