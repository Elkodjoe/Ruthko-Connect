
// Ruthko Event Operations workspace
// Local sample mode first. Supabase wiring can replace localStorage later.
(function () {
  const storeKey = 'ruthko_event_operations_v1';
  let selectedEventId = null;

  const seed = {
    events: [
      { id: 'evt-1', title: 'Cultural Handshake Summit', date: '2026-05-13', city: 'Houston, TX', type: 'Summit', venue: 'Houston Exclusive Ballroom', notes: 'Cultural, business, sponsor, and investor connection event.' },
      { id: 'evt-2', title: 'Global Recruitment Forum', date: '2026-08-20', city: 'Virtual', type: 'Recruitment Forum', venue: 'Online', notes: 'Employer and candidate recruitment conversation.' }
    ],
    speakers: [
      { id: 'sp-1', eventId: 'evt-1', name: 'Immigration Attorney', role: 'Visa and workforce session', email: 'speaker@example.com', status: 'Invited' }
    ],
    sponsors: [
      { id: 'so-1', eventId: 'evt-1', company: 'Platinum Sponsor Prospect', tier: 'Platinum', value: 50000, status: 'Proposal', deliverable: 'Main stage branding, VIP access, booth, media visibility.' }
    ],
    vendors: [
      { id: 've-1', eventId: 'evt-1', business: 'Vendor Booth Prospect', contact: 'Vendor Contact', booth: 'A1', status: 'Pending' }
    ],
    attendees: [
      { id: 'at-1', eventId: 'evt-1', name: 'Sample Guest', email: 'guest@example.com', ticket: 'General', status: 'Registered' }
    ]
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(storeKey);
      if (!raw) return seed;
      const parsed = JSON.parse(raw);
      return Object.assign({}, seed, parsed);
    } catch (error) {
      return seed;
    }
  }

  let state = loadState();
  if (!selectedEventId && state.events.length) selectedEventId = state.events[0].id;

  function saveState() {
    localStorage.setItem(storeKey, JSON.stringify(state));
  }

  function uid(prefix) {
    return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function money(value) {
    return '$' + Number(value || 0).toLocaleString();
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char];
    });
  }

  function currentEvent() {
    return state.events.find((event) => event.id === selectedEventId) || state.events[0] || null;
  }

  function listFor(key) {
    return state[key].filter((item) => item.eventId === selectedEventId);
  }

  function renderStats() {
    const sponsorValue = state.sponsors.reduce((sum, item) => sum + Number(item.value || 0), 0);
    const booths = state.vendors.filter((item) => ['Reserved', 'Paid', 'Checked In'].includes(item.status)).length;
    document.getElementById('statEvents').textContent = state.events.length;
    document.getElementById('statAttendees').textContent = state.attendees.length;
    document.getElementById('statSponsorValue').textContent = money(sponsorValue);
    document.getElementById('statBooths').textContent = booths;
  }

  function renderEvents() {
    const board = document.getElementById('eventBoard');
    if (!board) return;
    board.innerHTML = state.events.map((event) => {
      const active = event.id === selectedEventId;
      const attendees = state.attendees.filter((item) => item.eventId === event.id).length;
      const sponsors = state.sponsors.filter((item) => item.eventId === event.id).length;
      const vendors = state.vendors.filter((item) => item.eventId === event.id).length;
      return `
        <button class="w-full text-left p-5 ${active ? 'bg-yellow-500/10' : 'bg-transparent'} hover:bg-zinc-900/70" data-select-event="${event.id}">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h4 class="font-bold text-lg">${escapeHtml(event.title)}</h4>
              <p class="text-sm text-zinc-400 mt-1">${escapeHtml(event.type)} • ${escapeHtml(event.date)} • ${escapeHtml(event.city)}</p>
              <p class="text-xs text-zinc-500 mt-1">${escapeHtml(event.venue || 'Venue pending')}</p>
            </div>
            <div class="grid grid-cols-3 gap-3 text-center text-xs">
              <span class="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2"><b class="block text-white text-base">${attendees}</b>Guests</span>
              <span class="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2"><b class="block text-white text-base">${sponsors}</b>Sponsors</span>
              <span class="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2"><b class="block text-white text-base">${vendors}</b>Vendors</span>
            </div>
          </div>
        </button>`;
    }).join('') || '<p class="p-5 text-zinc-400">No events yet.</p>';

    document.querySelectorAll('[data-select-event]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedEventId = button.getAttribute('data-select-event');
        renderAll();
      });
    });
  }

  function renderList(id, rows, template) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = rows.length ? rows.map(template).join('') : '<p class="text-sm text-zinc-500">No records yet.</p>';
  }

  function renderWorkspace() {
    const event = currentEvent();
    const label = document.getElementById('selectedEventLabel');
    if (label) label.textContent = event ? `${event.title} • ${event.date} • ${event.city}` : 'Create or select an event.';

    renderList('speakerList', listFor('speakers'), (item) => `
      <div class="p-3 rounded-xl bg-black border border-zinc-800 text-sm">
        <div class="font-bold">${escapeHtml(item.name)}</div>
        <div class="text-zinc-400">${escapeHtml(item.role)} • ${escapeHtml(item.status)}</div>
        <div class="text-zinc-500 text-xs">${escapeHtml(item.email)}</div>
      </div>`);

    renderList('sponsorList', listFor('sponsors'), (item) => `
      <div class="p-3 rounded-xl bg-black border border-zinc-800 text-sm">
        <div class="font-bold">${escapeHtml(item.company)} <span class="text-yellow-400">${escapeHtml(item.tier)}</span></div>
        <div class="text-zinc-400">${money(item.value)} • ${escapeHtml(item.status)}</div>
        <div class="text-zinc-500 text-xs mt-1">${escapeHtml(item.deliverable)}</div>
      </div>`);

    renderList('vendorList', listFor('vendors'), (item) => `
      <div class="p-3 rounded-xl bg-black border border-zinc-800 text-sm">
        <div class="font-bold">${escapeHtml(item.business)} <span class="text-emerald-400">${escapeHtml(item.booth)}</span></div>
        <div class="text-zinc-400">${escapeHtml(item.contact)} • ${escapeHtml(item.status)}</div>
      </div>`);

    renderList('attendeeList', listFor('attendees'), (item) => `
      <div class="p-3 rounded-xl bg-black border border-zinc-800 text-sm flex items-center justify-between gap-3">
        <div>
          <div class="font-bold">${escapeHtml(item.name)} <span class="text-blue-400">${escapeHtml(item.ticket)}</span></div>
          <div class="text-zinc-400">${escapeHtml(item.email)} • ${escapeHtml(item.status)}</div>
        </div>
        <button class="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-bold" data-checkin="${item.id}">${item.status === 'Checked In' ? 'Undo' : 'Check In'}</button>
      </div>`);

    document.querySelectorAll('[data-checkin]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-checkin');
        const attendee = state.attendees.find((item) => item.id === id);
        if (attendee) attendee.status = attendee.status === 'Checked In' ? 'Registered' : 'Checked In';
        saveState();
        renderAll();
      });
    });

    renderRunSheet();
  }

  function renderRunSheet() {
    const event = currentEvent();
    const el = document.getElementById('runSheet');
    if (!el) return;
    if (!event) {
      el.innerHTML = '<p class="text-zinc-400">Create an event first.</p>';
      return;
    }
    const items = [
      ['90 days out', 'Confirm venue, budget, sponsor package, and event offer.'],
      ['60 days out', 'Confirm speakers, vendors, ticket links, and campaign calendar.'],
      ['30 days out', 'Finalize sponsor deliverables, guest list, print needs, and staff roles.'],
      ['7 days out', 'Confirm run sheet, check-in list, payment status, and VIP details.'],
      ['Event day', 'Run check-in, vendor setup, speaker support, sponsor visibility, and live issues.'],
      ['After event', 'Send thank-you emails, sponsor report, attendee follow-up, and revenue review.']
    ];
    el.innerHTML = items.map(([title, body]) => `
      <div class="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
        <p class="font-bold text-white">${title}</p>
        <p class="text-zinc-400 mt-2">${body}</p>
      </div>`).join('');
  }

  function addFormHandler(formId, key, mapFields) {
    const form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const ev = currentEvent();
      if (!ev) return;
      const data = Object.fromEntries(new FormData(form).entries());
      state[key].push(Object.assign({ id: uid(key.slice(0, 2)), eventId: ev.id }, mapFields(data)));
      form.reset();
      saveState();
      renderAll();
    });
  }

  function generateBrief() {
    const event = currentEvent();
    if (!event) return '';
    const speakers = listFor('speakers');
    const sponsors = listFor('sponsors');
    const vendors = listFor('vendors');
    const attendees = listFor('attendees');
    const checkedIn = attendees.filter((item) => item.status === 'Checked In').length;
    return [
      `Ruthko Event Brief: ${event.title}`,
      `Date: ${event.date}`,
      `Location: ${event.city}`,
      `Venue: ${event.venue || 'Pending'}`,
      `Event Type: ${event.type}`,
      '',
      'Purpose:',
      event.notes || 'Connect Ruthko staffing, event, sponsor, vendor, and partner audiences.',
      '',
      `Speakers: ${speakers.length}`,
      speakers.map((item) => `- ${item.name}: ${item.role} (${item.status})`).join('\n') || '- None added yet',
      '',
      `Sponsors: ${sponsors.length}`,
      sponsors.map((item) => `- ${item.company}: ${item.tier}, ${money(item.value)}, ${item.status}`).join('\n') || '- None added yet',
      '',
      `Vendors: ${vendors.length}`,
      vendors.map((item) => `- ${item.business}: Booth ${item.booth || 'TBD'}, ${item.status}`).join('\n') || '- None added yet',
      '',
      `Attendees: ${attendees.length}`,
      `Checked In: ${checkedIn}`,
      '',
      'Next actions:',
      '- Confirm speaker availability.',
      '- Confirm sponsor deliverables and payment status.',
      '- Confirm vendor booth setup and arrival time.',
      '- Export attendee list before event day.',
      '- Prepare post-event sponsor report.'
    ].join('\n');
  }

  function exportCsv(filename, rows) {
    const csv = rows.map((row) => row.map((cell) => '"' + String(cell || '').replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function renderAll() {
    renderStats();
    renderEvents();
    renderWorkspace();
  }

  document.addEventListener('DOMContentLoaded', function () {
    const eventForm = document.getElementById('eventForm');
    if (eventForm) {
      eventForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(eventForm).entries());
        const newEvent = Object.assign({ id: uid('evt') }, data);
        state.events.unshift(newEvent);
        selectedEventId = newEvent.id;
        eventForm.reset();
        saveState();
        renderAll();
      });
    }

    addFormHandler('speakerForm', 'speakers', (data) => data);
    addFormHandler('sponsorForm', 'sponsors', (data) => Object.assign({}, data, { value: Number(data.value || 0) }));
    addFormHandler('vendorForm', 'vendors', (data) => data);
    addFormHandler('attendeeForm', 'attendees', (data) => data);

    const briefButton = document.getElementById('generateBriefButton');
    const briefOutput = document.getElementById('eventBriefOutput');
    if (briefButton && briefOutput) {
      briefButton.addEventListener('click', function () {
        briefOutput.value = generateBrief();
      });
    }

    const copyButton = document.getElementById('copyBriefButton');
    if (copyButton && briefOutput) {
      copyButton.addEventListener('click', async function () {
        if (!briefOutput.value) briefOutput.value = generateBrief();
        await navigator.clipboard.writeText(briefOutput.value);
        document.getElementById('eventOpsMessage').textContent = 'Event brief copied.';
      });
    }

    const exportButton = document.getElementById('exportEventsButton');
    if (exportButton) {
      exportButton.addEventListener('click', function () {
        const rows = [['Title', 'Date', 'City', 'Type', 'Venue', 'Attendees', 'Sponsors', 'Vendors']].concat(state.events.map((event) => [
          event.title,
          event.date,
          event.city,
          event.type,
          event.venue,
          state.attendees.filter((item) => item.eventId === event.id).length,
          state.sponsors.filter((item) => item.eventId === event.id).length,
          state.vendors.filter((item) => item.eventId === event.id).length
        ]));
        exportCsv('ruthko-events.csv', rows);
      });
    }

    renderAll();
  });
})();
