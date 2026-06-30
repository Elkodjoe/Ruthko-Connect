// Ruthko Connect live public site settings reader
(function () {
  const STORE_KEY = 'ruthko_site_settings_v1';
  const API_URL = '/.netlify/functions/site-settings';
  const defaults = {
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

  function localSettings() {
    try {
      return { ...defaults, ...(JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}) };
    } catch (_) {
      return { ...defaults };
    }
  }

  function apply(settings) {
    const safe = { ...defaults, ...(settings || {}) };
    const map = {
      contactEmail: safe.contactEmail,
      contactPhone1: safe.contactPhone1,
      contactPhone2: safe.contactPhone2,
      contactWebsite: safe.contactWebsite,
      footerMessage: safe.footerMessage,
      eventHeadline: safe.eventHeadline,
      eventSubtitle: safe.eventSubtitle
    };

    Object.entries(map).forEach(([key, value]) => {
      document.querySelectorAll(`[data-setting="${key}"]`).forEach((el) => { el.textContent = value || ''; });
    });

    document.querySelectorAll('[data-contact-line]').forEach((el) => {
      el.textContent = `${safe.contactEmail} • ${safe.contactPhone1} • ${safe.contactPhone2}`;
    });

    document.querySelectorAll('[data-event-cta-link]').forEach((el) => {
      el.setAttribute('href', safe.eventCtaLink || 'intake.html#event');
    });

    document.querySelectorAll('[data-event-banner-img]').forEach((el) => {
      el.setAttribute('src', safe.eventBannerUrl || 'images/logo.png');
    });

    document.querySelectorAll('[data-contact-email-link]').forEach((el) => {
      el.setAttribute('href', `mailto:${safe.contactEmail}`);
    });

    document.querySelectorAll('[data-contact-phone-link]').forEach((el) => {
      el.setAttribute('href', `tel:${String(safe.contactPhone1 || '').replace(/[^+\d]/g, '')}`);
    });

    document.querySelectorAll('[data-whatsapp-link]').forEach((el) => {
      const phone = String(safe.contactPhone1 || '').replace(/[^\d]/g, '');
      el.setAttribute('href', `https://wa.me/${phone}`);
    });
  }

  async function loadLive() {
    const response = await fetch(API_URL, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) throw new Error('Live settings unavailable');
    const data = await response.json();
    if (!data.ok || !data.settings) throw new Error(data.error || 'Live settings unavailable');
    localStorage.setItem(STORE_KEY, JSON.stringify(data.settings));
    return data.settings;
  }

  async function load() {
    const local = localSettings();
    apply(local);

    try {
      const live = await loadLive();
      apply(live);
      window.dispatchEvent(new CustomEvent('ruthko:settings-loaded', { detail: live }));
    } catch (_) {
      window.dispatchEvent(new CustomEvent('ruthko:settings-loaded', { detail: local }));
    }
  }

  window.ruthkoApplySiteSettings = apply;
  window.ruthkoGetLocalSiteSettings = localSettings;
  document.addEventListener('DOMContentLoaded', load);
})();
