const sampleTasks = [
  {
    id: 'task-001',
    lead_id: 'sample-001',
    lead_name: 'Texas Medical Center',
    title: 'Call Texas Medical Center about staffing request',
    task_type: 'Call',
    priority: 'High',
    due_date: '2026-06-27',
    status: 'Open',
    owner: 'Ruthko Admin',
    notes: 'Confirm RN count, start date, location, and EB-3 sponsorship needs.',
    created_at: '2026-06-26'
  },
  {
    id: 'task-002',
    lead_id: 'sample-002',
    lead_name: 'Global Investment Group',
    title: 'Prepare sponsor follow-up for Global Investment Group',
    task_type: 'Proposal',
    priority: 'High',
    due_date: '2026-06-28',
    status: 'Open',
    owner: 'Ruthko Admin',
    notes: 'Send Platinum Sponsor package, payment link, and media visibility details.',
    created_at: '2026-06-26'
  },
  {
    id: 'task-003',
    lead_id: 'sample-003',
    lead_name: 'Registered Nurse Candidate',
    title: 'Request resume and credentials from Registered Nurse Candidate',
    task_type: 'Email',
    priority: 'Medium',
    due_date: '2026-06-29',
    status: 'Open',
    owner: 'Ruthko Admin',
    notes: 'Ask for resume, license, education records, and passport page.',
    created_at: '2026-06-26'
  }
];

const taskState = {
  client: null,
  usingSample: true,
  leads: [],
  tasks: [],
  filteredTasks: []
};

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function priorityClass(priority) {
  const value = String(priority || '').toLowerCase();
  if (value === 'high') return 'bg-red-500/20 text-red-300';
  if (value === 'medium') return 'bg-yellow-500/20 text-yellow-300';
  return 'bg-zinc-700 text-zinc-200';
}

function statusClass(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'done') return 'bg-green-500/20 text-green-300';
  if (value === 'snoozed') return 'bg-blue-500/20 text-blue-300';
  return 'bg-zinc-700 text-zinc-200';
}

function dueClass(dueDate, status) {
  if (status === 'Done') return 'text-zinc-500';
  if (!dueDate) return 'text-zinc-400';
  const today = getTodayString();
  if (dueDate < today) return 'text-red-300 font-bold';
  if (dueDate === today) return 'text-yellow-300 font-bold';
  return 'text-zinc-300';
}

function normalizeTask(task) {
  const leadName = task.leads && task.leads.name ? task.leads.name : task.lead_name;
  return { ...task, lead_name: leadName || 'Unlinked lead' };
}

function renderTaskStats() {
  const openTasks = taskState.tasks.filter(task => task.status !== 'Done').length;
  const today = getTodayString();
  const dueToday = taskState.tasks.filter(task => task.status !== 'Done' && task.due_date === today).length;
  const overdue = taskState.tasks.filter(task => task.status !== 'Done' && task.due_date && task.due_date < today).length;
  const highPriority = taskState.tasks.filter(task => task.status !== 'Done' && task.priority === 'High').length;

  document.getElementById('statOpenTasks').textContent = openTasks;
  document.getElementById('statDueToday').textContent = dueToday;
  document.getElementById('statOverdue').textContent = overdue;
  document.getElementById('statHighPriority').textContent = highPriority;
}

function renderLeadOptions() {
  const select = document.getElementById('leadSelect');
  if (!select) return;
  const options = taskState.leads.map(lead => `<option value="${lead.id}">${lead.name || 'Unnamed Lead'} | ${lead.lead_type || 'Lead'}</option>`).join('');
  select.innerHTML = `<option value="">No linked lead</option>${options}`;
}

function renderTasks() {
  const tbody = document.getElementById('tasksTableBody');
  if (!taskState.filteredTasks.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-zinc-400">No tasks found.</td></tr>';
    renderTaskStats();
    return;
  }

  tbody.innerHTML = taskState.filteredTasks.map(task => `
    <tr class="border-b border-zinc-800 hover:bg-zinc-900/60">
      <td class="p-4">
        <div class="font-bold">${task.title || 'Task'}</div>
        <div class="text-xs text-zinc-500 mt-1">${task.notes || ''}</div>
      </td>
      <td class="p-4 text-sm text-zinc-300">${task.lead_name || 'Unlinked lead'}</td>
      <td class="p-4 text-sm text-zinc-300">${task.task_type || 'Follow-up'}</td>
      <td class="p-4"><span class="px-3 py-1 rounded-full text-xs font-bold ${priorityClass(task.priority)}">${task.priority || 'Medium'}</span></td>
      <td class="p-4 text-sm ${dueClass(task.due_date, task.status)}">${task.due_date || 'No date'}</td>
      <td class="p-4"><span class="px-3 py-1 rounded-full text-xs font-bold ${statusClass(task.status)}">${task.status || 'Open'}</span></td>
      <td class="p-4 text-right">
        <div class="flex justify-end gap-2">
          <button onclick="markTaskDone('${task.id}')" class="px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 text-xs font-bold">Done</button>
          <button onclick="snoozeTask('${task.id}')" class="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold">+2 days</button>
        </div>
      </td>
    </tr>
  `).join('');
  renderTaskStats();
}

function applyTaskFilters() {
  const q = document.getElementById('taskSearchInput').value.trim().toLowerCase();
  const priority = document.getElementById('priorityFilter').value;
  const status = document.getElementById('taskStatusFilter').value;

  taskState.filteredTasks = taskState.tasks.filter(task => {
    const text = `${task.title || ''} ${task.lead_name || ''} ${task.task_type || ''} ${task.notes || ''}`.toLowerCase();
    const searchOk = !q || text.includes(q);
    const priorityOk = !priority || task.priority === priority;
    const statusOk = !status || task.status === status;
    return searchOk && priorityOk && statusOk;
  });

  renderTasks();
}

async function loadLeads() {
  if (taskState.client && !taskState.usingSample) {
    const { data, error } = await taskState.client.from('leads').select('id,name,lead_type,email,phone,status').order('created_at', { ascending: false });
    if (error) throw error;
    taskState.leads = data || [];
  } else {
    taskState.leads = JSON.parse(localStorage.getItem('ruthkoLocalLeads') || 'null') || [
      { id: 'sample-001', name: 'Texas Medical Center', lead_type: 'Employer' },
      { id: 'sample-002', name: 'Global Investment Group', lead_type: 'Sponsor' },
      { id: 'sample-003', name: 'Registered Nurse Candidate', lead_type: 'Candidate' }
    ];
  }
  renderLeadOptions();
}

async function loadTasks() {
  taskState.client = window.getRuthkoSupabaseClient ? window.getRuthkoSupabaseClient() : null;
  taskState.usingSample = !taskState.client;

  try {
    await loadLeads();
    if (taskState.client && !taskState.usingSample) {
      const { data, error } = await taskState.client
        .from('tasks')
        .select('id,lead_id,title,task_type,priority,due_date,status,owner,notes,created_at,leads(name,lead_type)')
        .order('due_date', { ascending: true });
      if (error) throw error;
      taskState.tasks = (data || []).map(normalizeTask);
      document.getElementById('taskConnectionStatus').textContent = 'Connected to Supabase tasks.';
      document.getElementById('taskConnectionStatus').className = 'text-xs text-green-400 mt-2';
    } else {
      const localTasks = JSON.parse(localStorage.getItem('ruthkoLocalTasks') || 'null');
      taskState.tasks = localTasks && localTasks.length ? localTasks : sampleTasks;
      document.getElementById('taskConnectionStatus').textContent = 'Sample mode. Tasks save to browser storage until Supabase keys are added.';
      document.getElementById('taskConnectionStatus').className = 'text-xs text-yellow-400 mt-2';
    }
    taskState.filteredTasks = [...taskState.tasks];
    renderTasks();
  } catch (error) {
    console.error(error);
    taskState.usingSample = true;
    taskState.tasks = sampleTasks;
    taskState.filteredTasks = [...taskState.tasks];
    document.getElementById('taskConnectionStatus').textContent = 'Task database error. Showing sample tasks.';
    document.getElementById('taskConnectionStatus').className = 'text-xs text-red-400 mt-2';
    renderTasks();
  }
}

async function addTask(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const leadId = formData.get('lead_id') || null;
  const linkedLead = taskState.leads.find(lead => lead.id === leadId);
  const task = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    lead_id: leadId,
    lead_name: linkedLead ? linkedLead.name : 'Unlinked lead',
    title: formData.get('title'),
    task_type: formData.get('task_type') || 'Follow-up',
    priority: formData.get('priority') || 'Medium',
    due_date: formData.get('due_date') || addDays(1),
    status: 'Open',
    owner: formData.get('owner') || 'Ruthko Admin',
    notes: formData.get('notes') || '',
    created_at: new Date().toISOString()
  };

  if (taskState.client && !taskState.usingSample) {
    const payload = { ...task };
    delete payload.id;
    delete payload.lead_name;
    const { error } = await taskState.client.from('tasks').insert([payload]);
    if (error) {
      alert('Task save failed. Check the Phase 9 SQL extension and RLS policies.');
      console.error(error);
      return;
    }
  } else {
    taskState.tasks.unshift(task);
    localStorage.setItem('ruthkoLocalTasks', JSON.stringify(taskState.tasks));
  }

  form.reset();
  document.getElementById('taskMessage').textContent = 'Task saved.';
  setTimeout(() => document.getElementById('taskMessage').textContent = '', 2500);
  await loadTasks();
}

async function updateTaskStatus(id, updates) {
  if (taskState.client && !taskState.usingSample) {
    const { error } = await taskState.client.from('tasks').update(updates).eq('id', id);
    if (error) {
      alert('Task update failed.');
      console.error(error);
      return;
    }
  } else {
    taskState.tasks = taskState.tasks.map(task => task.id === id ? { ...task, ...updates } : task);
    localStorage.setItem('ruthkoLocalTasks', JSON.stringify(taskState.tasks));
  }
  await loadTasks();
}

function markTaskDone(id) {
  updateTaskStatus(id, { status: 'Done', completed_at: new Date().toISOString() });
}

function snoozeTask(id) {
  const task = taskState.tasks.find(item => item.id === id);
  const base = task && task.due_date ? new Date(`${task.due_date}T12:00:00`) : new Date();
  base.setDate(base.getDate() + 2);
  updateTaskStatus(id, { status: 'Snoozed', due_date: base.toISOString().slice(0, 10) });
}

function exportTasksCsv() {
  const headers = ['title', 'lead_name', 'task_type', 'priority', 'due_date', 'status', 'owner', 'notes', 'created_at'];
  const rows = taskState.filteredTasks.map(task => headers.map(key => `"${String(task[key] || '').replaceAll('"', '""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ruthko-crm-tasks.csv';
  a.click();
  URL.revokeObjectURL(url);
}

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('taskForm').addEventListener('submit', addTask);
  document.getElementById('taskSearchInput').addEventListener('input', applyTaskFilters);
  document.getElementById('priorityFilter').addEventListener('change', applyTaskFilters);
  document.getElementById('taskStatusFilter').addEventListener('change', applyTaskFilters);
  document.getElementById('exportTasksButton').addEventListener('click', exportTasksCsv);
  loadTasks();
});
