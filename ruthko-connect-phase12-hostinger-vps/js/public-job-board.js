(function () {
  'use strict';

  var APPLY_BASE = 'apply.html';

  var i18nLabels = {
    en: {
      loading: 'Loading jobs…',
      noJobs: 'No jobs match your search. Check back soon or submit your interest.',
      apply: 'Apply Now',
      housing: 'Housing included',
      transport: 'Transport included',
      filterKeyword: 'Search jobs…',
      filterLocation: 'City or state…',
      filterCategory: 'All categories',
      filterType: 'All types',
      filterShift: 'Any shift',
      btnFilter: 'Filter',
      btnClear: 'Clear',
      headline: 'Current Job Openings',
      sub: 'Browse open positions and apply directly. New jobs added regularly.',
      startDate: 'Start',
      payRange: 'Pay'
    },
    fr: {
      loading: 'Chargement des emplois…',
      noJobs: 'Aucun emploi ne correspond. Revenez bientôt ou soumettez votre intérêt.',
      apply: 'Postuler',
      housing: 'Logement inclus',
      transport: 'Transport inclus',
      filterKeyword: 'Rechercher des emplois…',
      filterLocation: 'Ville ou état…',
      filterCategory: 'Toutes catégories',
      filterType: 'Tous types',
      filterShift: 'Tout quart',
      btnFilter: 'Filtrer',
      btnClear: 'Effacer',
      headline: 'Offres d\'emploi actuelles',
      sub: 'Parcourez les postes ouverts et postulez directement.',
      startDate: 'Début',
      payRange: 'Salaire'
    },
    es: {
      loading: 'Cargando empleos…',
      noJobs: 'Ningún empleo coincide. Vuelva pronto o envíe su interés.',
      apply: 'Aplicar ahora',
      housing: 'Alojamiento incluido',
      transport: 'Transporte incluido',
      filterKeyword: 'Buscar empleos…',
      filterLocation: 'Ciudad o estado…',
      filterCategory: 'Todas las categorías',
      filterType: 'Todos los tipos',
      filterShift: 'Cualquier turno',
      btnFilter: 'Filtrar',
      btnClear: 'Limpiar',
      headline: 'Empleos disponibles',
      sub: 'Explore los puestos abiertos y aplique directamente.',
      startDate: 'Inicio',
      payRange: 'Pago'
    }
  };

  function getLang() {
    try { return localStorage.getItem('ruthko_lang') || 'en'; } catch (_) { return 'en'; }
  }

  function t(key) {
    var lang = getLang();
    return (i18nLabels[lang] && i18nLabels[lang][key]) || (i18nLabels['en'] && i18nLabels['en'][key]) || key;
  }

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function renderJobCard(job) {
    var badges = [];
    if (job.housing_support) badges.push('<span class="inline-flex items-center gap-1 bg-green-900/60 text-green-300 text-xs font-semibold px-2 py-0.5 rounded-full">🏠 ' + t('housing') + '</span>');
    if (job.transportation_support) badges.push('<span class="inline-flex items-center gap-1 bg-blue-900/60 text-blue-300 text-xs font-semibold px-2 py-0.5 rounded-full">🚌 ' + t('transport') + '</span>');
    var location = [job.city, job.state, job.country].filter(Boolean).join(', ');
    var applyUrl = APPLY_BASE + '?job_id=' + encodeURIComponent(job.id) + '&job_title=' + encodeURIComponent(job.title);
    return '<article class="glass border border-zinc-800 rounded-3xl p-6 flex flex-col gap-4 hover:border-yellow-400/40 transition">' +
      '<div class="flex items-start justify-between gap-3">' +
        '<div>' +
          '<h3 class="text-xl font-bold text-white">' + esc(job.title) + '</h3>' +
          (job.show_company_name && job.company_name ? '<p class="text-zinc-400 text-sm mt-1">' + esc(job.company_name) + '</p>' : '') +
          '<p class="text-zinc-500 text-sm mt-1">' + esc(location) + '</p>' +
        '</div>' +
        '<span class="shrink-0 bg-yellow-400/10 text-yellow-400 font-semibold text-xs px-3 py-1 rounded-full border border-yellow-400/20">' + esc(job.job_category) + '</span>' +
      '</div>' +
      '<div class="flex flex-wrap gap-2 text-sm text-zinc-400">' +
        '<span class="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1">' + esc(job.employment_type) + '</span>' +
        (job.shift_type ? '<span class="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1">' + esc(job.shift_type) + '</span>' : '') +
        (job.pay_range ? '<span class="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1">' + t('payRange') + ': ' + esc(job.pay_range) + '</span>' : '') +
        (job.start_date ? '<span class="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1">' + t('startDate') + ': ' + esc(job.start_date) + '</span>' : '') +
      '</div>' +
      (badges.length ? '<div class="flex flex-wrap gap-2">' + badges.join('') + '</div>' : '') +
      (job.short_description ? '<p class="text-zinc-300 text-sm leading-relaxed">' + esc(job.short_description) + '</p>' : '') +
      '<a href="' + esc(applyUrl) + '" class="inline-flex btn-primary px-5 py-3 rounded-xl font-bold text-sm self-start">' + t('apply') + '</a>' +
    '</article>';
  }

  function getFilters() {
    return {
      keyword: (document.getElementById('jbKeyword') || {}).value || '',
      location: (document.getElementById('jbLocation') || {}).value || '',
      job_category: (document.getElementById('jbCategory') || {}).value || '',
      employment_type: (document.getElementById('jbType') || {}).value || '',
      shift_type: (document.getElementById('jbShift') || {}).value || '',
      housing_support: !!(document.getElementById('jbHousing') || {}).checked,
      transportation_support: !!(document.getElementById('jbTransport') || {}).checked
    };
  }

  function clearFilters() {
    ['jbKeyword','jbLocation','jbCategory','jbType','jbShift'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.value = '';
    });
    ['jbHousing','jbTransport'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.checked = false;
    });
    loadJobs();
  }

  function loadJobs() {
    var container = document.getElementById('jbJobList');
    if (!container) return;
    container.innerHTML = '<p class="col-span-full text-zinc-500 text-center py-10">' + t('loading') + '</p>';
    var svc = window.ruthkoJobBoard;
    var filters = getFilters();
    var promise = svc ? svc.getPublishedJobs(filters) : Promise.resolve([]);
    promise.then(function (jobs) {
      if (!jobs || !jobs.length) {
        container.innerHTML = '<div class="col-span-full glass border border-zinc-800 rounded-3xl p-10 text-center"><p class="text-zinc-400">' + t('noJobs') + '</p><a href="apply.html" class="btn-primary inline-flex mt-4 px-5 py-3 rounded-xl font-bold text-sm">Submit Interest →</a></div>';
        return;
      }
      container.innerHTML = jobs.map(renderJobCard).join('');
    }).catch(function () {
      container.innerHTML = '<p class="col-span-full text-zinc-500 text-center py-10">' + t('noJobs') + '</p>';
    });
  }

  function buildFilterBar() {
    var el = document.getElementById('jbFilterBar');
    if (!el) return;
    var svc = window.ruthkoJobBoard;
    var cats = svc ? svc.JOB_CATEGORIES : ['CNA','LPN','RN','Caregiver','Hospitality','Warehouse','Agriculture','Teacher','Event staff','Security','General labor','Administrative','Other'];
    var types = svc ? svc.EMPLOYMENT_TYPES : ['Full-time','Part-time','Contract','Temporary','Seasonal','Sponsorship pathway','International recruitment'];
    var catOptions = cats.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('');
    var typeOptions = types.map(function (t2) { return '<option value="' + esc(t2) + '">' + esc(t2) + '</option>'; }).join('');
    el.innerHTML = '<div class="flex flex-wrap gap-3 items-end">' +
      '<input id="jbKeyword" placeholder="' + t('filterKeyword') + '" class="bg-black border border-zinc-800 rounded-xl p-3 text-sm flex-1 min-w-40" oninput="if(window.ruthkoPublicJobBoard)window.ruthkoPublicJobBoard.load()" />' +
      '<input id="jbLocation" placeholder="' + t('filterLocation') + '" class="bg-black border border-zinc-800 rounded-xl p-3 text-sm flex-1 min-w-40" oninput="if(window.ruthkoPublicJobBoard)window.ruthkoPublicJobBoard.load()" />' +
      '<select id="jbCategory" class="bg-black border border-zinc-800 rounded-xl p-3 text-sm" onchange="if(window.ruthkoPublicJobBoard)window.ruthkoPublicJobBoard.load()"><option value="">' + t('filterCategory') + '</option>' + catOptions + '</select>' +
      '<select id="jbType" class="bg-black border border-zinc-800 rounded-xl p-3 text-sm" onchange="if(window.ruthkoPublicJobBoard)window.ruthkoPublicJobBoard.load()"><option value="">' + t('filterType') + '</option>' + typeOptions + '</select>' +
      '<select id="jbShift" class="bg-black border border-zinc-800 rounded-xl p-3 text-sm" onchange="if(window.ruthkoPublicJobBoard)window.ruthkoPublicJobBoard.load()"><option value="">Any shift</option><option>Day</option><option>Night</option><option>Evening</option><option>Flexible</option><option>Rotating</option></select>' +
      '<label class="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer"><input type="checkbox" id="jbHousing" class="w-4 h-4 accent-yellow-400" onchange="if(window.ruthkoPublicJobBoard)window.ruthkoPublicJobBoard.load()" /> Housing</label>' +
      '<label class="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer"><input type="checkbox" id="jbTransport" class="w-4 h-4 accent-yellow-400" onchange="if(window.ruthkoPublicJobBoard)window.ruthkoPublicJobBoard.load()" /> Transport</label>' +
      '<button onclick="if(window.ruthkoPublicJobBoard)window.ruthkoPublicJobBoard.clear()" class="btn-secondary px-4 py-3 rounded-xl font-bold text-sm">' + t('btnClear') + '</button>' +
    '</div>';
  }

  function init() {
    buildFilterBar();
    loadJobs();
    window.addEventListener('ruthko:lang-changed', function () {
      buildFilterBar();
      loadJobs();
    });
  }

  window.ruthkoPublicJobBoard = {
    load: loadJobs,
    clear: clearFilters,
    init: init
  };

  document.addEventListener('DOMContentLoaded', init);
})();
