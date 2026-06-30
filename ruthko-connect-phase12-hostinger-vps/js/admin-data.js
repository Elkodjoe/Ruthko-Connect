// Ruthko Connect Phase 21 — Shared Content Layer
// Handles hero text, announcement banners, and CTA links in EN/FR/ES.
// localStorage-first. Supabase sync stub at bottom (Phase 22).
(function () {
  var CONTENT_KEY = 'ruthko_content_v1';
  var ANN_DISMISSED_KEY = 'ruthko_ann_dismissed';

  var defaults = {
    hero: {
      en: {
        title: 'Staffing, events, sponsors, vendors, and partnerships in one Ruthko platform.',
        subtitle: 'Ruthko supports employers, candidates, event guests, sponsors, vendors, and business partners through a clear intake and follow-up system.',
        cta1Text: 'Request Staff',
        cta1Link: 'intake.html#employer',
        cta2Text: 'View Events',
        cta2Link: 'events.html',
        cta3Text: 'Sponsor Ruthko',
        cta3Link: 'sponsors.html'
      },
      fr: {
        title: 'Personnel, événements, sponsors, vendeurs et partenariats sur une seule plateforme Ruthko.',
        subtitle: 'Ruthko soutient les employeurs, candidats, invités aux événements, sponsors, vendeurs et partenaires commerciaux grâce à un système clair d\'accueil et de suivi.',
        cta1Text: 'Demander du personnel',
        cta1Link: 'intake.html#employer',
        cta2Text: 'Voir les événements',
        cta2Link: 'events.html',
        cta3Text: 'Sponsoriser Ruthko',
        cta3Link: 'sponsors.html'
      },
      es: {
        title: 'Personal, eventos, patrocinadores, vendedores y asociaciones en una sola plataforma Ruthko.',
        subtitle: 'Ruthko apoya a empleadores, candidatos, invitados a eventos, patrocinadores, vendedores y socios comerciales a través de un sistema claro de bienvenida y seguimiento.',
        cta1Text: 'Solicitar personal',
        cta1Link: 'intake.html#employer',
        cta2Text: 'Ver eventos',
        cta2Link: 'events.html',
        cta3Text: 'Patrocinar Ruthko',
        cta3Link: 'sponsors.html'
      }
    },
    announcement: {
      active: false,
      link: '',
      en: '',
      fr: '',
      es: ''
    }
  };

  function mergeDeep(target, source) {
    if (!source || typeof source !== 'object') return target;
    var out = Object.assign({}, target);
    Object.keys(source).forEach(function (k) {
      if (source[k] && typeof source[k] === 'object' && !Array.isArray(source[k])) {
        out[k] = mergeDeep(out[k] && typeof out[k] === 'object' ? out[k] : {}, source[k]);
      } else {
        out[k] = source[k];
      }
    });
    return out;
  }

  function getStored() {
    try { return JSON.parse(localStorage.getItem(CONTENT_KEY) || 'null') || {}; } catch (_) { return {}; }
  }

  function getContent() {
    return mergeDeep(JSON.parse(JSON.stringify(defaults)), getStored());
  }

  function saveContent(partial) {
    var merged = mergeDeep(getStored(), partial);
    localStorage.setItem(CONTENT_KEY, JSON.stringify(merged));
    return getContent();
  }

  function resetContent() {
    localStorage.removeItem(CONTENT_KEY);
  }

  function getLang() {
    return localStorage.getItem('ruthko_lang') || 'en';
  }

  function applyContent(lang) {
    lang = lang || getLang();
    var content = getContent();
    var hero = (content.hero || {})[lang] || (content.hero || {}).en || {};

    // Hero title
    document.querySelectorAll('[data-content="hero.title"]').forEach(function (el) {
      if (hero.title) el.textContent = hero.title;
    });

    // Hero subtitle
    document.querySelectorAll('[data-content="hero.subtitle"]').forEach(function (el) {
      if (hero.subtitle) el.textContent = hero.subtitle;
    });

    // Hero CTA 1
    document.querySelectorAll('[data-content="hero.cta1"]').forEach(function (el) {
      if (hero.cta1Text) el.textContent = hero.cta1Text;
      if (hero.cta1Link) el.setAttribute('href', hero.cta1Link);
    });

    // Hero CTA 2
    document.querySelectorAll('[data-content="hero.cta2"]').forEach(function (el) {
      if (hero.cta2Text) el.textContent = hero.cta2Text;
      if (hero.cta2Link) el.setAttribute('href', hero.cta2Link);
    });

    // Hero CTA 3
    document.querySelectorAll('[data-content="hero.cta3"]').forEach(function (el) {
      if (hero.cta3Text) el.textContent = hero.cta3Text;
      if (hero.cta3Link) el.setAttribute('href', hero.cta3Link);
    });

    // Announcement banner
    var ann = content.announcement || {};
    var banner = document.getElementById('ruthkoAnnouncementBanner');
    if (banner) {
      var text = ann[lang] || ann.en || '';
      var isDismissed = sessionStorage.getItem(ANN_DISMISSED_KEY) === '1';
      if (ann.active && text && !isDismissed) {
        var textEl = document.getElementById('ruthkoAnnouncementText');
        var linkEl = document.getElementById('ruthkoAnnouncementLink');
        if (textEl) textEl.textContent = text;
        if (linkEl) {
          if (ann.link) { linkEl.href = ann.link; linkEl.classList.remove('hidden'); }
          else { linkEl.classList.add('hidden'); }
        }
        banner.classList.remove('hidden');
      } else {
        banner.classList.add('hidden');
      }
    }
  }

  function dismissAnnouncement() {
    sessionStorage.setItem(ANN_DISMISSED_KEY, '1');
    var banner = document.getElementById('ruthkoAnnouncementBanner');
    if (banner) banner.classList.add('hidden');
  }

  function exportContent() {
    var blob = new Blob([JSON.stringify(getContent(), null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ruthko-site-content.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function importContent(json) {
    try {
      var data = typeof json === 'string' ? JSON.parse(json) : json;
      saveContent(data);
      applyContent();
      return true;
    } catch (_) { return false; }
  }

  // Hook into i18n setLang so content re-applies after language switches
  document.addEventListener('DOMContentLoaded', function () {
    var origSetLang = window.setLang;
    if (typeof origSetLang === 'function') {
      window.setLang = function (lang) {
        origSetLang(lang);
        setTimeout(function () { applyContent(lang); }, 30);
      };
    }
    applyContent();
  });

  // Public API
  window.ruthkoGetContent   = getContent;
  window.ruthkoSaveContent  = saveContent;
  window.ruthkoResetContent = resetContent;
  window.ruthkoApplyContent = applyContent;
  window.ruthkoExportContent = exportContent;
  window.ruthkoImportContent = importContent;
  window.rutkhoDismissAnnouncement = dismissAnnouncement;

  /* ─── Phase 22: Supabase sync stub ───────────────────────────────────────
  async function syncToSupabase(content) {
    if (!window.supabase) return;
    const { error } = await window.supabase
      .from('site_content')
      .upsert({ key: 'main', value: content }, { onConflict: 'key' });
    return error;
  }
  async function loadFromSupabase() {
    if (!window.supabase) return null;
    const { data } = await window.supabase
      .from('site_content')
      .select('value')
      .eq('key', 'main')
      .single();
    return data ? data.value : null;
  }
  ──────────────────────────────────────────────────────────────────────── */
})();
