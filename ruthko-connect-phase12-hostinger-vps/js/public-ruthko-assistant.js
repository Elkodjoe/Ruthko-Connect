(function () {
  const knowledge = window.RUTHKO_KNOWLEDGE_BASE || {};
  const quickAnswers = [
    { keys: ['job', 'staff', 'hire', 'employer', 'workers', 'nurse', 'recruit'], answer: 'Ruthko supports staffing and recruitment requests. Employers should start with the staffing request form, and candidates should use the candidate interest form.', link: 'intake.html#employer', label: 'Start staffing request' },
    { keys: ['event', 'summit', 'rsvp', 'ticket', 'guest', 'attend'], answer: 'Ruthko organizes events, summits, networking programs, cultural exchange programs, and business gatherings. Event guests should review the events page or submit an RSVP inquiry.', link: 'events.html', label: 'View events' },
    { keys: ['sponsor', 'package', 'visibility', 'brand', 'platinum', 'gold', 'silver'], answer: 'Ruthko offers sponsor packages for events and business programs. Sponsors may review package options and submit interest for follow-up.', link: 'sponsors.html', label: 'View sponsor options' },
    { keys: ['vendor', 'booth', 'table', 'exhibit'], answer: 'Vendors may request booth space for Ruthko events and programs. Use the vendor interest form to share your business details.', link: 'intake.html#vendor', label: 'Request vendor booth' },
    { keys: ['partner', 'partnership', 'collaborate', 'collaboration'], answer: 'Ruthko works with employers, sponsors, vendors, community groups, and business partners. Use the partner inquiry path to begin.', link: 'partners.html', label: 'Partner with Ruthko' },
    { keys: ['pay', 'payment', 'invoice', 'stripe', 'ticket'], answer: 'Payments for sponsors, vendors, tickets, and invoices are handled through the payments page once the correct option is selected.', link: 'payments.html', label: 'Open payments' },
    { keys: ['contact', 'email', 'phone', 'call', 'reach'], answer: 'You may contact Ruthko at info@ruthkojobs.com, +1-701-260-3908, or +1-240-486-5002.', link: 'intake.html', label: 'Open contact form' }
  ];

  function localAnswer(question) {
    const q = String(question || '').toLowerCase();
    const match = quickAnswers.find(item => item.keys.some(key => q.includes(key)));
    if (match) return match;
    return {
      answer: 'Ruthko Connect supports staffing, event organizing, sponsors, vendors, partners, payments, and public inquiry forms. Choose a topic or submit your request so Ruthko may follow up.',
      link: 'intake.html',
      label: 'Submit inquiry'
    };
  }

  async function askServer(question) {
    try {
      const response = await fetch('/api/ask-ruthko', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, source: 'public-site' })
      });
      if (!response.ok) throw new Error('Server unavailable');
      const data = await response.json();
      if (data && data.answer) return data;
    } catch (error) {}
    return localAnswer(question);
  }

  function injectStyles() {
    if (document.getElementById('ruthkoAssistantStyles')) return;
    const style = document.createElement('style');
    style.id = 'ruthkoAssistantStyles';
    style.textContent = `
      .ruthko-assistant-button{position:fixed;right:20px;bottom:20px;z-index:80;border:0;border-radius:999px;background:linear-gradient(135deg,#facc15,#f59e0b);color:#000;font-weight:800;padding:14px 18px;box-shadow:0 16px 40px rgba(0,0,0,.35);cursor:pointer}
      .ruthko-assistant-panel{position:fixed;right:20px;bottom:82px;z-index:80;width:min(380px,calc(100vw - 32px));background:#09090b;border:1px solid #27272a;border-radius:24px;box-shadow:0 24px 70px rgba(0,0,0,.5);overflow:hidden;display:none;color:#fff}
      .ruthko-assistant-panel.open{display:block}
      .ruthko-assistant-head{padding:16px 18px;border-bottom:1px solid #27272a;display:flex;justify-content:space-between;gap:12px;align-items:center}
      .ruthko-assistant-body{padding:16px;max-height:420px;overflow:auto}
      .ruthko-assistant-bubble{background:#18181b;border:1px solid #27272a;border-radius:16px;padding:12px;margin:10px 0;font-size:14px;line-height:1.5;color:#d4d4d8}
      .ruthko-assistant-bubble strong{color:#fff}
      .ruthko-assistant-input{display:flex;gap:8px;border-top:1px solid #27272a;padding:12px;background:#0a0a0a}
      .ruthko-assistant-input input{flex:1;background:#000;border:1px solid #27272a;border-radius:12px;color:#fff;padding:11px}
      .ruthko-assistant-input button{border:0;border-radius:12px;background:#facc15;color:#000;font-weight:800;padding:0 14px;cursor:pointer}
      .ruthko-assistant-link{display:inline-block;margin-top:10px;color:#facc15;font-weight:800;text-decoration:none}
      .ruthko-chip{display:inline-block;margin:4px 4px 0 0;border:1px solid #3f3f46;border-radius:999px;padding:7px 10px;font-size:12px;color:#e4e4e7;cursor:pointer;background:#111113}
    `;
    document.head.appendChild(style);
  }

  function renderAssistant() {
    if (document.getElementById('ruthkoAssistantPanel')) return;
    injectStyles();
    const panel = document.createElement('div');
    panel.id = 'ruthkoAssistantPanel';
    panel.className = 'ruthko-assistant-panel';
    panel.innerHTML = `
      <div class="ruthko-assistant-head">
        <div><strong>Ask Ruthko</strong><div style="font-size:12px;color:#a1a1aa">Staffing, events, sponsors, vendors, partners</div></div>
        <button id="ruthkoAssistantClose" style="background:#18181b;color:#fff;border:1px solid #27272a;border-radius:10px;padding:7px 10px;cursor:pointer">Close</button>
      </div>
      <div class="ruthko-assistant-body" id="ruthkoAssistantMessages">
        <div class="ruthko-assistant-bubble"><strong>Hello.</strong><br>Ask about Ruthko staffing, events, sponsors, vendors, partnerships, payments, or contact details.</div>
        <span class="ruthko-chip" data-question="How do I request staff?">Request staff</span>
        <span class="ruthko-chip" data-question="How do I sponsor a Ruthko event?">Sponsor</span>
        <span class="ruthko-chip" data-question="How do I get a vendor booth?">Vendor booth</span>
        <span class="ruthko-chip" data-question="How do I contact Ruthko?">Contact</span>
      </div>
      <form class="ruthko-assistant-input" id="ruthkoAssistantForm">
        <input id="ruthkoAssistantQuestion" placeholder="Ask Ruthko..." autocomplete="off" />
        <button type="submit">Ask</button>
      </form>
    `;
    const button = document.createElement('button');
    button.id = 'ruthkoAssistantButton';
    button.className = 'ruthko-assistant-button';
    button.textContent = 'Ask Ruthko';
    document.body.appendChild(panel);
    document.body.appendChild(button);

    button.addEventListener('click', () => panel.classList.toggle('open'));
    document.getElementById('ruthkoAssistantClose').addEventListener('click', () => panel.classList.remove('open'));
    document.querySelectorAll('.ruthko-chip').forEach(chip => chip.addEventListener('click', () => submitQuestion(chip.dataset.question)));
    document.getElementById('ruthkoAssistantForm').addEventListener('submit', function (event) {
      event.preventDefault();
      const input = document.getElementById('ruthkoAssistantQuestion');
      submitQuestion(input.value);
      input.value = '';
    });
  }

  async function submitQuestion(question) {
    if (!question || !question.trim()) return;
    const messages = document.getElementById('ruthkoAssistantMessages');
    messages.insertAdjacentHTML('beforeend', `<div class="ruthko-assistant-bubble"><strong>You:</strong><br>${escapeHtml(question)}</div>`);
    messages.insertAdjacentHTML('beforeend', `<div class="ruthko-assistant-bubble" id="ruthkoThinking">Checking Ruthko information...</div>`);
    messages.scrollTop = messages.scrollHeight;
    const data = await askServer(question);
    const thinking = document.getElementById('ruthkoThinking');
    if (thinking) thinking.remove();
    const link = data.link ? `<a class="ruthko-assistant-link" href="${data.link}">${data.label || 'Open page'}</a>` : '';
    messages.insertAdjacentHTML('beforeend', `<div class="ruthko-assistant-bubble"><strong>Ruthko:</strong><br>${escapeHtml(data.answer)}${link}</div>`);
    messages.scrollTop = messages.scrollHeight;
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"]/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char];
    });
  }

  document.addEventListener('DOMContentLoaded', renderAssistant);
})();
