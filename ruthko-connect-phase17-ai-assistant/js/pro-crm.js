
(function () {
  const LEADS_KEY = 'ruthko_pro_crm_leads';
  const TASKS_KEY = 'ruthko_pro_crm_tasks';
  const ACTIVITY_KEY = 'ruthko_pro_crm_activity';
  const stages = ['New', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won'];

  const seedLeads = [
    { id: 'L-1001', name: 'Amina Boateng', company: 'Global Investment Group', email: 'amina@example.com', phone: '+1 555 210 4400', type: 'Sponsor', stage: 'Proposal', value: 50000, need: 'Interested in Platinum sponsorship for Cultural Handshake Summit.', nextAction: 'Send revised sponsor proposal', owner: 'Ruthko Admin', createdAt: '2026-06-20' },
    { id: 'L-1002', name: 'Michael Reyes', company: 'Texas Medical Center Partner', email: 'michael@example.com', phone: '+1 555 340 1250', type: 'Employer', stage: 'Qualified', value: 75000, need: 'Needs RNs and CNAs for long-term placement.', nextAction: 'Schedule staffing discovery call', owner: 'Ruthko Admin', createdAt: '2026-06-21' },
    { id: 'L-1003', name: 'Sandra Smith', company: 'Candidate Lead', email: 'sandra@example.com', phone: '+1 555 778 9120', type: 'Candidate', stage: 'New', value: 0, need: 'Interested in healthcare opportunities.', nextAction: 'Request resume and credentials', owner: 'Ruthko Admin', createdAt: '2026-06-22' },
    { id: 'L-1004', name: 'Kofi Mensah', company: 'Heritage Foods', email: 'kofi@example.com', phone: '+1 555 812 9001', type: 'Vendor', stage: 'Negotiation', value: 3500, need: 'Vendor booth and food sales opportunity.', nextAction: 'Send booth invoice link', owner: 'Ruthko Admin', createdAt: '2026-06-23' },
    { id: 'L-1005', name: 'Lisa Johnson', company: 'Community Guest', email: 'lisa@example.com', phone: '+1 555 431 7777', type: 'Event Guest', stage: 'New', value: 250, need: 'RSVP for Cultural Handshake Summit.', nextAction: 'Confirm event registration', owner: 'Ruthko Admin', createdAt: '2026-06-24' },
    { id: 'L-1006', name: 'Daniel Brooks', company: 'Texas Business Network', email: 'daniel@example.com', phone: '+1 555 981 2200', type: 'Partner', stage: 'Qualified', value: 15000, need: 'Wants partnership and sponsor intro meeting.', nextAction: 'Prepare partner briefing', owner: 'Ruthko Admin', createdAt: '2026-06-24' }
  ];

  const seedTasks = [
    { id: 'T-1', leadId: 'L-1001', title: 'Send sponsor proposal', due: 'Today', priority: 'High', status: 'Open' },
    { id: 'T-2', leadId: 'L-1002', title: 'Book employer discovery call', due: 'Tomorrow', priority: 'High', status: 'Open' },
    { id: 'T-3', leadId: 'L-1003', title: 'Request resume and license documents', due: 'This week', priority: 'Medium', status: 'Open' },
    { id: 'T-4', leadId: 'L-1004', title: 'Send vendor booth payment link', due: 'Today', priority: 'High', status: 'Open' }
  ];

  const automations = [
    { name: 'New employer request', trigger: 'When type is Employer', action: 'Create staffing discovery task and admin email alert' },
    { name: 'New candidate inquiry', trigger: 'When type is Candidate', action: 'Create resume request task and candidate confirmation' },
    { name: 'Sponsor lead', trigger: 'When type is Sponsor', action: 'Create proposal task, payment link task, and follow-up email draft' },
    { name: 'Vendor booth inquiry', trigger: 'When type is Vendor', action: 'Create booth confirmation and payment follow-up task' },
    { name: 'Event RSVP', trigger: 'When type is Event Guest', action: 'Create registration confirmation and campaign segment' }
  ];

  function getLeads() {
    const raw = localStorage.getItem(LEADS_KEY);
    if (!raw) {
      localStorage.setItem(LEADS_KEY, JSON.stringify(seedLeads));
      return seedLeads.slice();
    }
    try { return JSON.parse(raw); } catch (error) { return seedLeads.slice(); }
  }

  function saveLeads(leads) { localStorage.setItem(LEADS_KEY, JSON.stringify(leads)); }
  function getTasks() {
    const raw = localStorage.getItem(TASKS_KEY);
    if (!raw) { localStorage.setItem(TASKS_KEY, JSON.stringify(seedTasks)); return seedTasks.slice(); }
    try { return JSON.parse(raw); } catch (error) { return seedTasks.slice(); }
  }
  function saveTasks(tasks) { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); }
  function getActivity() {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    if (!raw) return [{ time: new Date().toLocaleString(), text: 'Professional CRM opened.' }];
    try { return JSON.parse(raw); } catch (error) { return []; }
  }
  function addActivity(text) {
    const activity = getActivity();
    activity.unshift({ time: new Date().toLocaleString(), text });
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity.slice(0, 50)));
  }

  function money(value) {
    return '$' + Number(value || 0).toLocaleString();
  }

  function filteredLeads() {
    const q = (document.getElementById('crmSearch')?.value || '').toLowerCase();
    const type = document.getElementById('pipelineFilter')?.value || 'all';
    return getLeads().filter(function (lead) {
      const matchesType = type === 'all' || lead.type === type;
      const haystack = [lead.name, lead.company, lead.email, lead.type, lead.stage, lead.need].join(' ').toLowerCase();
      return matchesType && (!q || haystack.includes(q));
    });
  }

  function renderMetrics(leads) {
    const totalValue = leads.reduce((sum, lead) => sum + Number(lead.value || 0), 0);
    const open = leads.filter(l => l.stage !== 'Closed Won').length;
    const won = leads.filter(l => l.stage === 'Closed Won').reduce((sum, lead) => sum + Number(lead.value || 0), 0);
    const tasks = getTasks().filter(t => t.status !== 'Done').length;
    const sponsors = leads.filter(l => l.type === 'Sponsor').length;
    document.getElementById('crmMetrics').innerHTML = [
      ['Pipeline Value', money(totalValue), 'All active values'],
      ['Open Leads', open, 'Needs follow-up'],
      ['Closed Won', money(won), 'Revenue recorded'],
      ['Open Tasks', tasks, 'Admin action queue'],
      ['Sponsors', sponsors, 'Sponsor prospects']
    ].map(m => `<article class="glass p-5 rounded-2xl border border-zinc-800"><p class="text-zinc-400 text-sm">${m[0]}</p><h3 class="text-2xl font-bold mt-2">${m[1]}</h3><p class="text-xs text-zinc-500 mt-1">${m[2]}</p></article>`).join('');
  }

  function renderPipeline(leads) {
    const html = stages.map(stage => {
      const cards = leads.filter(l => l.stage === stage).map(lead => `
        <div class="pipeline-card bg-zinc-900/70 border border-zinc-800 rounded-xl p-3 mb-3">
          <div class="flex items-start justify-between gap-2"><div><p class="font-bold text-sm">${lead.company || lead.name}</p><p class="text-xs text-zinc-400">${lead.type} • ${lead.name}</p></div><span class="text-xs text-yellow-400 font-bold">${money(lead.value)}</span></div>
          <p class="text-xs text-zinc-500 mt-2">${lead.nextAction || 'Follow up'}</p>
          <div class="flex gap-2 mt-3"><button onclick="moveLead('${lead.id}', -1)" class="text-xs bg-zinc-800 px-2 py-1 rounded">Back</button><button onclick="moveLead('${lead.id}', 1)" class="text-xs bg-zinc-800 px-2 py-1 rounded">Next</button></div>
        </div>`).join('') || '<p class="text-xs text-zinc-600">No records</p>';
      return `<div class="bg-black/40 border border-zinc-800 rounded-2xl p-3"><div class="flex items-center justify-between mb-3"><h4 class="font-bold text-sm">${stage}</h4><span class="text-xs bg-zinc-800 rounded-full px-2 py-1">${leads.filter(l => l.stage === stage).length}</span></div>${cards}</div>`;
    }).join('');
    document.getElementById('pipelineBoard').innerHTML = html;
  }

  function renderTable(leads) {
    document.getElementById('crmTable').innerHTML = leads.map(lead => `
      <tr class="border-t border-zinc-800">
        <td class="p-3"><p class="font-bold">${lead.name}</p><p class="text-xs text-zinc-500">${lead.email || ''}</p></td>
        <td class="p-3">${lead.type}</td><td class="p-3">${lead.company || ''}</td>
        <td class="p-3"><select onchange="setStage('${lead.id}', this.value)" class="bg-black border border-zinc-800 rounded-lg p-2">${stages.map(s => `<option ${s === lead.stage ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
        <td class="p-3">${money(lead.value)}</td><td class="p-3 text-zinc-400">${lead.nextAction || ''}</td>
        <td class="p-3"><div class="flex gap-2"><button onclick="createTaskForLead('${lead.id}')" class="text-xs btn-secondary px-3 py-2 rounded-lg font-bold">Task</button><button onclick="deleteLead('${lead.id}')" class="text-xs bg-red-950/60 text-red-300 px-3 py-2 rounded-lg font-bold">Delete</button></div></td>
      </tr>`).join('');
  }

  function renderAssistantSelect(leads) {
    const select = document.getElementById('assistantLead');
    select.innerHTML = leads.map(l => `<option value="${l.id}">${l.company || l.name} • ${l.type}</option>`).join('');
  }

  function renderTasks() {
    const leads = getLeads();
    const tasks = getTasks();
    document.getElementById('crmTasks').innerHTML = tasks.map(task => {
      const lead = leads.find(l => l.id === task.leadId) || {};
      return `<div class="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3"><div class="flex items-start justify-between gap-3"><div><p class="font-bold text-sm">${task.title}</p><p class="text-xs text-zinc-400">${lead.company || lead.name || 'General'} • ${task.due}</p></div><span class="text-xs ${task.priority === 'High' ? 'text-red-400' : 'text-yellow-400'}">${task.priority}</span></div><button onclick="completeTask('${task.id}')" class="mt-3 text-xs bg-zinc-800 rounded-lg px-3 py-2 font-bold">Mark Done</button></div>`;
    }).join('') || '<p class="text-zinc-500 text-sm">No tasks.</p>';
  }

  function renderAutomations() {
    document.getElementById('automationList').innerHTML = automations.map(a => `<div class="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4"><p class="font-bold">${a.name}</p><p class="text-xs text-zinc-400 mt-1">Trigger: ${a.trigger}</p><p class="text-xs text-zinc-500 mt-1">Action: ${a.action}</p></div>`).join('');
  }

  function renderActivity() {
    document.getElementById('activityFeed').innerHTML = getActivity().map(a => `<div class="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3"><p class="text-sm">${a.text}</p><p class="text-xs text-zinc-500 mt-1">${a.time}</p></div>`).join('');
  }

  window.renderCrm = function () {
    const leads = filteredLeads();
    renderMetrics(leads);
    renderPipeline(leads);
    renderTable(leads);
    renderAssistantSelect(leads.length ? leads : getLeads());
    renderTasks();
    renderAutomations();
    renderActivity();
  };

  window.moveLead = function (id, direction) {
    const leads = getLeads();
    const lead = leads.find(l => l.id === id);
    if (!lead) return;
    const i = stages.indexOf(lead.stage);
    lead.stage = stages[Math.max(0, Math.min(stages.length - 1, i + direction))];
    addActivity(`${lead.company || lead.name} moved to ${lead.stage}.`);
    saveLeads(leads);
    renderCrm();
  };

  window.setStage = function (id, stage) {
    const leads = getLeads();
    const lead = leads.find(l => l.id === id);
    if (!lead) return;
    lead.stage = stage;
    addActivity(`${lead.company || lead.name} stage changed to ${stage}.`);
    saveLeads(leads);
    renderCrm();
  };

  window.openLeadModal = function () { document.getElementById('leadModal').classList.remove('hidden'); document.getElementById('leadModal').classList.add('flex'); };
  window.closeLeadModal = function () { document.getElementById('leadModal').classList.add('hidden'); document.getElementById('leadModal').classList.remove('flex'); };

  window.saveLead = function (event) {
    event.preventDefault();
    const leads = getLeads();
    const id = 'L-' + Date.now();
    const type = document.getElementById('leadType').value;
    const nextAction = {
      Employer: 'Schedule staffing discovery call', Candidate: 'Request resume and credentials', Sponsor: 'Send sponsor proposal', Vendor: 'Send booth payment link', 'Event Guest': 'Confirm event registration', Partner: 'Prepare partner briefing'
    }[type] || 'Follow up';
    const lead = {
      id,
      name: document.getElementById('leadName').value,
      company: document.getElementById('leadCompany').value,
      email: document.getElementById('leadEmail').value,
      phone: document.getElementById('leadPhone').value,
      type,
      stage: 'New',
      value: Number(document.getElementById('leadValue').value || 0),
      need: document.getElementById('leadNeed').value,
      nextAction,
      owner: 'Ruthko Admin',
      createdAt: new Date().toISOString().slice(0, 10)
    };
    leads.unshift(lead);
    saveLeads(leads);
    createTask(id, nextAction, type === 'Sponsor' || type === 'Employer' ? 'High' : 'Medium');
    addActivity(`New ${type} lead added: ${lead.company || lead.name}.`);
    closeLeadModal();
    event.target.reset();
    renderCrm();
  };

  function createTask(leadId, title, priority) {
    const tasks = getTasks();
    tasks.unshift({ id: 'T-' + Date.now(), leadId, title, due: 'Next business day', priority, status: 'Open' });
    saveTasks(tasks);
  }

  window.createTaskForLead = function (id) {
    const lead = getLeads().find(l => l.id === id);
    if (!lead) return;
    createTask(id, lead.nextAction || 'Follow up with lead', 'High');
    addActivity(`Task created for ${lead.company || lead.name}.`);
    renderCrm();
  };

  window.completeTask = function (id) {
    const tasks = getTasks().filter(t => t.id !== id);
    saveTasks(tasks);
    addActivity('Task marked done.');
    renderCrm();
  };

  window.deleteLead = function (id) {
    const lead = getLeads().find(l => l.id === id);
    if (!confirm('Delete this lead from local CRM sample data?')) return;
    saveLeads(getLeads().filter(l => l.id !== id));
    saveTasks(getTasks().filter(t => t.leadId !== id));
    addActivity(`Lead deleted: ${(lead && (lead.company || lead.name)) || id}.`);
    renderCrm();
  };

  window.runAutomations = function () {
    const leads = getLeads();
    leads.forEach(lead => {
      const openTask = getTasks().some(t => t.leadId === lead.id && t.status !== 'Done');
      if (!openTask && lead.stage !== 'Closed Won') createTask(lead.id, lead.nextAction || 'Follow up', lead.type === 'Sponsor' || lead.type === 'Employer' ? 'High' : 'Medium');
    });
    addActivity('Automations checked all open leads and created missing tasks.');
    renderCrm();
  };

  window.generateAdminHelp = function (kind) {
    const id = document.getElementById('assistantLead').value;
    const lead = getLeads().find(l => l.id === id) || getLeads()[0];
    if (!lead) return;
    const base = `${lead.name} from ${lead.company || 'unknown company'} is a ${lead.type} lead. Stage: ${lead.stage}. Need: ${lead.need}. Next action: ${lead.nextAction}. Value: ${money(lead.value)}.`;
    const outputs = {
      brief: `Daily CRM Brief\n\n${base}\n\nRecommended action:\n1. Review notes.\n2. Complete the next action today.\n3. Move the lead one stage forward after response.\n4. Add a task if no response after 48 hours.`,
      email: `Subject: Following up from Ruthko Connect\n\nHello ${lead.name},\n\nThank you for connecting with Ruthko Connect. I reviewed your request about ${lead.need || 'your interest'} and wanted to follow up with the next step.\n\nThe best next step is to schedule a short call so we can confirm your needs, timeline, and the right support option.\n\nPlease reply with a good time for you.\n\nBest,\nRuthko Connect`,
      call: `Call Script\n\nOpening: Hello ${lead.name}, this is Ruthko Connect. I am calling about your ${lead.type.toLowerCase()} request.\n\nConfirm need: I want to confirm what you need and your timeline.\n\nAsk:\n1. What outcome are you looking for?\n2. What is your timeline?\n3. Who else needs to approve this?\n4. What would make this successful for you?\n\nClose: The next step is ${lead.nextAction}.`,
      proposal: `Proposal Checklist\n\nLead: ${lead.company || lead.name}\nType: ${lead.type}\nValue: ${money(lead.value)}\n\nInclude:\n1. Problem and goal.\n2. Ruthko service fit.\n3. Scope.\n4. Timeline.\n5. Price or package.\n6. Payment link.\n7. Next meeting date.\n\nNext action: ${lead.nextAction}.`
    };
    document.getElementById('assistantOutput').value = outputs[kind] || base;
    addActivity(`Admin assistant generated ${kind} for ${lead.company || lead.name}.`);
    renderActivity();
  };

  window.copyAssistantOutput = async function () {
    const text = document.getElementById('assistantOutput').value;
    try { await navigator.clipboard.writeText(text); addActivity('Admin assistant output copied.'); renderActivity(); } catch (error) {}
  };

  window.exportCrmCsv = function () {
    const leads = filteredLeads();
    const headers = ['id','name','company','email','phone','type','stage','value','need','nextAction','owner','createdAt'];
    const rows = [headers.join(',')].concat(leads.map(lead => headers.map(h => '"' + String(lead[h] || '').replace(/"/g, '""') + '"').join(',')));
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ruthko-crm-export.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    addActivity('CRM CSV exported.');
    renderActivity();
  };

  document.addEventListener('DOMContentLoaded', function () {
    renderCrm();
  });
})();
