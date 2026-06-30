// Ruthko Connect public site settings reader
(function () {
  const STORE_KEY = 'ruthko_site_settings_v1';
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
  function getClient() { return typeof window.getRuthkoSupabaseClient === 'function' ? window.getRuthkoSupabaseClient() : null; }
  function localSettings() { try { return { ...defaults, ...(JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}) }; } catch (_) { return defaults; } }
  function apply(settings) {
    const map = { contactEmail: settings.contactEmail, contactPhone1: settings.contactPhone1, contactPhone2: settings.contactPhone2, contactWebsite: settings.contactWebsite, footerMessage: settings.footerMessage, eventHeadline: settings.eventHeadline, eventSubtitle: settings.eventSubtitle };
    Object.entries(map).forEach(([key, value]) => document.querySelectorAll(`[data-setting="${key}"]`).forEach(el => { el.textContent = value || ''; }));
    document.querySelectorAll('[data-contact-line]').forEach(el => { el.textContent = `${settings.contactEmail} • ${settings.contactPhone1} • ${settings.contactPhone2}`; });
    document.querySelectorAll('[data-event-cta-link]').forEach(el => { el.setAttribute('href', settings.eventCtaLink || 'intake.html#event'); });
    document.querySelectorAll('[data-event-banner-img]').forEach(el => { el.setAttribute('src', settings.eventBannerUrl || 'images/logo.png'); });
  }
  async function load() {
    let settings = localSettings();
    apply(settings);
    const client = getClient();
    if (client) {
      const { data, error } = await client.from('site_settings').select('key,value');
      if (!error && Array.isArray(data)) {
        data.forEach(row => { settings[row.key] = row.value; });
        localStorage.setItem(STORE_KEY, JSON.stringify(settings));
        apply(settings);
      }
    }
  }
  document.addEventListener('DOMContentLoaded', load);
})();
