// Ruthko Connect Quick Change Center
(function () {
  const STORE_KEY = 'ruthko_site_settings_v1';
  const SOCIAL_KEY = 'ruthko_social_publications_v1';
  const FLYER_KEY = 'ruthko_flyers_v1';
  const EMAIL_KEY = 'ruthko_email_templates_v1';

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
    { id: 'employer', trigger: 'New employer staffing request', active: true, subject: 'Thank you for your staffing request', body: 'Hello {{name}},\n\nThank you for contacting Ruthko. We received your staffing request and our team will review your worker needs, timeline, and next steps.\n\nBest,\nRuthko Connect' },
    { id: 'candidate', trigger: 'New candidate interest', active: true, subject: 'Ruthko received your candidate interest form', body: 'Hello {{name}},\n\nThank you for your interest. Please prepare your resume, credentials, and work authorization details for review.\n\nBest,\nRuthko Connect' },
    { id: 'sponsor', trigger: 'New sponsor inquiry', active: true, subject: 'Thank you for your Ruthko sponsorship interest', body: 'Hello {{name}},\n\nThank you for your sponsorship interest. We will share package details, event visibility options, and the next sponsor call path.\n\nBest,\nRuthko Connect' },
    { id: 'vendor', trigger: 'New vendor booth request', active: true, subject: 'Ruthko received your vendor booth request', body: 'Hello {{name}},\n\nThank you for your booth request. We will review booth availability, payment details, and event setup instructions.\n\nBest,\nRuthko Connect' },
    { id: 'event', trigger: 'New event RSVP', active: true, subject: 'Your Ruthko event RSVP was received', body: 'Hello {{name}},\n\nThank you for your RSVP. We will send event details, check-in instructions, and updates as the date approaches.\n\nBest,\nRuthko Connect' }
  ];

  function getClient() {
    return typeof window.getRuthkoSupabaseClient === 'function' ? window.getRuthkoSupabaseClient() : null;
  }

  function getLocal(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch (_) { return fallback; }
  }

  function setLocal(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

  async function saveSetting(key, value) {
    const current = getLocal(STORE_KEY, defaultSettings);
    current[key] = value;
    setLocal(STORE_KEY, current);
    const client = getClient();
    if (client) {
      await client.from('site_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    }
  }

  async function saveSettingsBulk(values) {
    const current = { ...getLocal(STORE_KEY, defaultSettings), ...values };
    setLocal(STORE_KEY, current);
    const client = getClient();
    if (client) {
      const rows = Object.entries(values).map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }));
      await client.from('site_settings').upsert(rows, { onConflict: 'key' });
    }
  }

  function $(id) { return document.getElementById(id); }

  function setStatus(id, message, good) {
    const el = $(id); if (!el) return;
    el.textContent = message;
    el.className = good ? 'text-sm text-green-400 mt-3 font-bold' : 'text-sm text-red-400 mt-3 font-bold';
  }

  function loadFormValues() {
    const settings = getLocal(STORE_KEY, defaultSettings);
    ['contactEmail','contactPhone1','contactPhone2','contactWebsite','footerMessage','eventHeadline','eventSubtitle','eventCtaLink','eventBannerUrl'].forEach((id) => {
      if ($(id)) $(id).value = settings[id] || '';
    });
    updateEventPreview();
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
    const templates = getLocal(EMAIL_KEY, defaultEmails);
    list.innerHTML = templates.map((tpl, index) => `
      <article class="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
        <div class="flex items-center justify-between gap-3">
          <div><p class="font-bold text-white">${tpl.trigger}</p><p class="text-xs text-zinc-500 mt-1">${tpl.id}</p></div>
          <label class="text-xs text-zinc-400 flex items-center gap-2"><input type="checkbox" data-email-active="${index}" ${tpl.active ? 'checked' : ''}> Active</label>
        </div>
        <label class="text-sm text-zinc-400 block mt-4">Subject<input class="field mt-2" data-email-subject="${index}" value="${escapeAttr(tpl.subject)}"></label>
        <label class="text-sm text-zinc-400 block mt-4">Body<textarea class="field mt-2 h-44" data-email-body="${index}">${escapeHtml(tpl.body)}</textarea></label>
      </article>`).join('');
  }

  function renderFlyers() {
    const list = $('flyerList'); if (!list) return;
    const flyers = getLocal(FLYER_KEY, []);
    if (!flyers.length) { list.innerHTML = '<p class="text-zinc-500 text-sm">No flyers saved yet.</p>'; return; }
    list.innerHTML = flyers.map((flyer, index) => `
      <article class="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
        <img src="${escapeAttr(flyer.url)}" class="w-full h-44 object-contain rounded-xl bg-white p-2" alt="${escapeAttr(flyer.title)}">
        <h4 class="font-bold mt-3">${escapeHtml(flyer.title)}</h4>
        <p class="text-xs text-zinc-500 mt-1">${new Date(flyer.createdAt).toLocaleString()}</p>
        <div class="flex gap-2 mt-3"><button data-copy-flyer="${index}" class="btn-secondary px-3 py-2 rounded-lg text-xs font-bold">Copy Link</button><button data-delete-flyer="${index}" class="bg-red-500/20 text-red-300 px-3 py-2 rounded-lg text-xs font-bold">Delete</button></div>
      </article>`).join('');
  }

  function renderSocial() {
    const list = $('socialList'); if (!list) return;
    const posts = getLocal(SOCIAL_KEY, []);
    if (!posts.length) { list.innerHTML = '<p class="text-zinc-500 text-sm">No social posts saved yet.</p>'; return; }
    list.innerHTML = posts.map((post, index) => `
      <article class="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
        <div class="flex flex-wrap items-center justify-between gap-3"><p class="font-bold">${escapeHtml(post.platform)} • ${escapeHtml(post.topic)}</p><p class="text-xs text-yellow-400">${escapeHtml(post.date || 'No date')}</p></div>
        <p class="text-sm text-zinc-300 mt-3 whitespace-pre-wrap">${escapeHtml(post.caption)}</p>
        <div class="flex gap-2 mt-3"><button data-copy-social="${index}" class="btn-secondary px-3 py-2 rounded-lg text-xs font-bold">Copy</button><button data-delete-social="${index}" class="bg-red-500/20 text-red-300 px-3 py-2 rounded-lg text-xs font-bold">Delete</button></div>
      </article>`).join('');
  }

  function escapeHtml(value) { return String(value || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function escapeAttr(value) { return escapeHtml(value).replace(/'/g, '&#39;'); }

  function fileToDataUrl(file, callback) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please choose an image file.'); return; }
    const reader = new FileReader();
    reader.onload = () => callback(reader.result);
    reader.readAsDataURL(file);
  }

  function makeSocialCaption(platform, topic) {
    const cleanTopic = topic || 'Ruthko services';
    if (platform === 'LinkedIn') return `Ruthko Connect is supporting ${cleanTopic} through organized staffing, event coordination, sponsor engagement, vendor support, and partner follow-up.\n\nContact Ruthko to discuss how your organization can participate.`;
    if (platform === 'Instagram') return `${cleanTopic}\n\nRuthko connects people, events, sponsors, vendors, and opportunities with clear follow-up.\n\nContact us through ruthkojobs.com.`;
    if (platform === 'TikTok') return `Video idea: Show the problem, then show how Ruthko helps with ${cleanTopic}. End with a clear call to action: visit ruthkojobs.com.`;
    return `Ruthko Connect update: ${cleanTopic}. We support staffing, event organizing, sponsors, vendors, and partnerships. Visit ruthkojobs.com to connect with us.`;
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

    $('saveContactsBtn')?.addEventListener('click', async () => {
      await saveSettingsBulk({
        contactEmail: $('contactEmail').value,
        contactPhone1: $('contactPhone1').value,
        contactPhone2: $('contactPhone2').value,
        contactWebsite: $('contactWebsite').value,
        footerMessage: $('footerMessage').value
      });
      setStatus('contactsStatus', 'Contact changes saved. Public pages will use these values when site settings are connected.', true);
    });

    ['eventHeadline','eventSubtitle','eventBannerUrl'].forEach(id => $(id)?.addEventListener('input', updateEventPreview));
    $('eventBannerFile')?.addEventListener('change', (e) => fileToDataUrl(e.target.files[0], (url) => { $('eventBannerUrl').value = url; updateEventPreview(); }));
    $('saveEventBannerBtn')?.addEventListener('click', async () => {
      await saveSettingsBulk({ eventHeadline: $('eventHeadline').value, eventSubtitle: $('eventSubtitle').value, eventCtaLink: $('eventCtaLink').value, eventBannerUrl: $('eventBannerUrl').value });
      setStatus('eventStatus', 'Event banner saved.', true);
    });

    $('flyerFile')?.addEventListener('change', (e) => fileToDataUrl(e.target.files[0], (url) => { $('flyerLink').value = url; }));
    $('addFlyerBtn')?.addEventListener('click', () => {
      const title = $('flyerTitle').value.trim(); const url = $('flyerLink').value.trim();
      if (!title || !url) { alert('Add a flyer title and link.'); return; }
      const flyers = getLocal(FLYER_KEY, []); flyers.unshift({ title, url, createdAt: new Date().toISOString() }); setLocal(FLYER_KEY, flyers);
      $('flyerTitle').value = ''; $('flyerLink').value = ''; renderFlyers();
    });

    $('saveEmailTemplatesBtn')?.addEventListener('click', () => {
      const templates = getLocal(EMAIL_KEY, defaultEmails).map((tpl, index) => ({ ...tpl, active: document.querySelector(`[data-email-active="${index}"]`)?.checked || false, subject: document.querySelector(`[data-email-subject="${index}"]`)?.value || tpl.subject, body: document.querySelector(`[data-email-body="${index}"]`)?.value || tpl.body }));
      setLocal(EMAIL_KEY, templates); alert('Email automation templates saved. Phase 17 can connect these templates to live auto-reply functions.');
    });

    $('generateSocialBtn')?.addEventListener('click', () => { $('socialCaption').value = makeSocialCaption($('socialPlatform').value, $('socialTopic').value); });
    $('saveSocialBtn')?.addEventListener('click', () => {
      const post = { platform: $('socialPlatform').value, topic: $('socialTopic').value || 'Ruthko update', date: $('socialDate').value, caption: $('socialCaption').value, createdAt: new Date().toISOString() };
      if (!post.caption.trim()) { alert('Generate or type a caption first.'); return; }
      const posts = getLocal(SOCIAL_KEY, []); posts.unshift(post); setLocal(SOCIAL_KEY, posts); renderSocial();
    });
    $('copySocialBtn')?.addEventListener('click', () => navigator.clipboard.writeText($('socialCaption').value || ''));
    $('exportSocialBtn')?.addEventListener('click', exportSocialCsv);

    document.addEventListener('click', (e) => {
      const copyFlyer = e.target.getAttribute('data-copy-flyer');
      const deleteFlyer = e.target.getAttribute('data-delete-flyer');
      const copySocial = e.target.getAttribute('data-copy-social');
      const deleteSocial = e.target.getAttribute('data-delete-social');
      if (copyFlyer !== null) navigator.clipboard.writeText(getLocal(FLYER_KEY, [])[Number(copyFlyer)]?.url || '');
      if (deleteFlyer !== null) { const f = getLocal(FLYER_KEY, []); f.splice(Number(deleteFlyer),1); setLocal(FLYER_KEY,f); renderFlyers(); }
      if (copySocial !== null) navigator.clipboard.writeText(getLocal(SOCIAL_KEY, [])[Number(copySocial)]?.caption || '');
      if (deleteSocial !== null) { const p = getLocal(SOCIAL_KEY, []); p.splice(Number(deleteSocial),1); setLocal(SOCIAL_KEY,p); renderSocial(); }
    });

    document.querySelectorAll('.admin-prompt').forEach(btn => btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-admin-prompt');
      const settings = getLocal(STORE_KEY, defaultSettings);
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
    const data = { settings: getLocal(STORE_KEY, defaultSettings), flyers: getLocal(FLYER_KEY, []), emails: getLocal(EMAIL_KEY, defaultEmails), social: getLocal(SOCIAL_KEY, []) };
    const blob = new Blob([JSON.stringify(data,null,2)], { type: 'application/json' });
    downloadBlob(blob, 'ruthko-site-settings.json');
  }

  function exportSocialCsv() {
    const posts = getLocal(SOCIAL_KEY, []);
    const rows = [['platform','topic','date','caption'], ...posts.map(p => [p.platform,p.topic,p.date,p.caption])];
    const csv = rows.map(r => r.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    downloadBlob(new Blob([csv], { type: 'text/csv' }), 'ruthko-social-publications.csv');
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (typeof window.ruthkoRequireAdmin === 'function') await window.ruthkoRequireAdmin();
    loadFormValues(); renderEmailTemplates(); renderFlyers(); renderSocial(); bindEvents();
    if (window.lucide) lucide.createIcons();
    document.querySelectorAll('.nav-link').forEach(link => { if (link.getAttribute('data-page') === 'content-manager') link.classList.add('nav-active'); });
  });
})();
