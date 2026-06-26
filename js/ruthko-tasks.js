// ============================================================
// Ruthko Connect Tasks — ruthko-tasks.js
// Depends on: supabase-config.js, ruthko-auth.js
// ============================================================

(function () {
  "use strict";

  // ── Sample data ───────────────────────────────────────────
  var today   = new Date();
  function daysFromNow(n) { var d = new Date(today); d.setDate(d.getDate() + n); return d.toISOString().slice(0,10); }

  var SAMPLE_TASKS = [
    { id:"t1", created_at:"2026-06-20T09:00:00Z", lead_id:"s3", lead_name:"Diallo Ventures LLC",       title:"Send sponsorship proposal",         due_date: daysFromNow(0),  priority:"high",   done:false, notes:"" },
    { id:"t2", created_at:"2026-06-20T09:01:00Z", lead_id:"s3", lead_name:"Diallo Ventures LLC",       title:"Schedule intro call",               due_date: daysFromNow(2),  priority:"high",   done:false, notes:"" },
    { id:"t3", created_at:"2026-06-20T09:02:00Z", lead_id:"s1", lead_name:"Global Medical Center",     title:"Call to discuss staffing needs",     due_date: daysFromNow(-2), priority:"high",   done:false, notes:"" },
    { id:"t4", created_at:"2026-06-20T09:03:00Z", lead_id:"s1", lead_name:"Global Medical Center",     title:"Send candidate shortlist",           due_date: daysFromNow(3),  priority:"high",   done:false, notes:"" },
    { id:"t5", created_at:"2026-06-20T09:04:00Z", lead_id:"s7", lead_name:"Lone Star Hospitality Grp", title:"Confirm visa type & worker count",   due_date: daysFromNow(-1), priority:"medium", done:false, notes:"" },
    { id:"t6", created_at:"2026-06-20T09:05:00Z", lead_id:"s2", lead_name:"Ama Boateng",               title:"Request resume / CV",               due_date: daysFromNow(1),  priority:"medium", done:false, notes:"" },
    { id:"t7", created_at:"2026-06-20T09:06:00Z", lead_id:"s2", lead_name:"Ama Boateng",               title:"Match to open employer listings",   due_date: daysFromNow(4),  priority:"high",   done:false, notes:"" },
    { id:"t8", created_at:"2026-06-20T09:07:00Z", lead_id:"s5", lead_name:"Afro Cuisine Catering",     title:"Confirm booth assignment",           due_date: daysFromNow(0),  priority:"high",   done:false, notes:"" },
    { id:"t9", created_at:"2026-06-20T09:08:00Z", lead_id:"s5", lead_name:"Afro Cuisine Catering",     title:"Send booth invoice",                due_date: daysFromNow(1),  priority:"high",   done:false, notes:"" },
    { id:"t10",created_at:"2026-06-20T09:09:00Z", lead_id:"s4", lead_name:"Texas Workforce Board",     title:"Follow up if no response",          due_date: daysFromNow(6),  priority:"medium", done:false, notes:"" },
    { id:"t11",created_at:"2026-06-19T08:00:00Z", lead_id:"s8", lead_name:"Heritage Bank of Commerce", title:"Prepare and send invoice",          due_date: daysFromNow(-3), priority:"high",   done:true,  notes:"Invoice emailed June 9." },
    { id:"t12",created_at:"2026-06-19T08:01:00Z", lead_id:"s6", lead_name:"Dr. Kwame Asante",          title:"Add to attendee list",              due_date: daysFromNow(-1), priority:"medium", done:true,  notes:"" }
  ];

  // ── State ─────────────────────────────────────────────────
  var supabase = null;
  var tasks    = [];
  var filtered = [];
  var filter   = { view: "pending", priority: "all" };

  // ── Bootstrap ─────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    var cfg = window.RUTHKO_CONFIG;
    if (!cfg.sampleMode && window.supabase) {
      supabase = window.supabase.createClient(cfg.supabase.url, cfg.supabase.anonKey);
    }
    bindControls();
    loadTasks();
  });

  // ── Load ──────────────────────────────────────────────────
  async function loadTasks() {
    setLoading(true);
    try {
      if (window.RUTHKO_CONFIG.sampleMode) {
        // Hydrate lead_name from sample leads if available
        tasks = SAMPLE_TASKS.map(function(t){ return Object.assign({},t); });
      } else {
        // Join with leads to get lead name
        var { data, error } = await supabase
          .from("tasks")
          .select("*, leads(name)")
          .order("due_date", { ascending: true });
        if (error) throw error;
        tasks = (data || []).map(function(t){
          return Object.assign({}, t, { lead_name: t.leads ? t.leads.name : "" });
        });
      }
    } catch (err) {
      showToast("Error loading tasks: " + err.message, "error");
      tasks = SAMPLE_TASKS.slice();
    }
    renderStats();
    applyFilter();
    setLoading(false);
  }

  // ── Stats ─────────────────────────────────────────────────
  function renderStats() {
    var todayStr  = new Date().toISOString().slice(0,10);
    var total     = tasks.length;
    var pending   = tasks.filter(function(t){ return !t.done; }).length;
    var overdue   = tasks.filter(function(t){ return !t.done && t.due_date && t.due_date < todayStr; }).length;
    var dueToday  = tasks.filter(function(t){ return !t.done && t.due_date === todayStr; }).length;
    var completed = tasks.filter(function(t){ return t.done; }).length;

    setText("stat-total",     total);
    setText("stat-pending",   pending);
    setText("stat-overdue",   overdue);
    setText("stat-today",     dueToday);
    setText("stat-completed", completed);

    // Flash overdue count red
    var el = document.getElementById("stat-overdue");
    if (el) el.className = "text-2xl font-bold " + (overdue > 0 ? "text-red-400" : "text-zinc-300");
  }

  // ── Filter ────────────────────────────────────────────────
  function applyFilter() {
    var todayStr = new Date().toISOString().slice(0,10);

    filtered = tasks.filter(function (t) {
      if (filter.priority !== "all" && t.priority !== filter.priority) return false;
      if (filter.view === "pending")   return !t.done;
      if (filter.view === "overdue")   return !t.done && t.due_date && t.due_date < todayStr;
      if (filter.view === "today")     return !t.done && t.due_date === todayStr;
      if (filter.view === "completed") return t.done;
      return true; // "all"
    });

    // Sort: overdue first, then by date, then undated
    filtered.sort(function (a, b) {
      var ad = a.due_date || "9999";
      var bd = b.due_date || "9999";
      if (ad < bd) return -1;
      if (ad > bd) return 1;
      return 0;
    });

    renderList();
    setText("tasks-count", filtered.length + " task" + (filtered.length !== 1 ? "s" : ""));
  }

  // ── Render task list ──────────────────────────────────────
  function renderList() {
    var el = document.getElementById("task-list");
    if (!el) return;

    if (filtered.length === 0) {
      el.innerHTML = '<div class="py-16 text-center text-zinc-500">No tasks in this view.</div>';
      return;
    }

    var todayStr = new Date().toISOString().slice(0,10);

    el.innerHTML = filtered.map(function (t) {
      var overdue   = !t.done && t.due_date && t.due_date < todayStr;
      var dueToday  = !t.done && t.due_date === todayStr;
      var dueLbl    = t.due_date ? formatDueDate(t.due_date) : "No date";

      return [
        '<div class="flex items-start gap-4 p-4 rounded-2xl border ' + (t.done ? "border-zinc-800 opacity-50" : overdue ? "border-red-500/40 bg-red-500/5" : "border-zinc-800") + ' transition group" id="task-row-' + t.id + '">',
        '  <button onclick="Tasks.toggle(\'' + t.id + '\')" class="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 ' + (t.done ? "bg-green-500 border-green-500" : overdue ? "border-red-400" : "border-zinc-600 hover:border-yellow-400") + ' transition flex items-center justify-center" title="' + (t.done ? "Mark incomplete" : "Mark complete") + '">',
        t.done ? '    <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>' : "",
        '  </button>',
        '  <div class="flex-1 min-w-0">',
        '    <p class="font-semibold text-sm ' + (t.done ? "line-through text-zinc-500" : "text-white") + '">' + esc(t.title) + '</p>',
        t.lead_name ? '    <p class="text-xs text-zinc-500 mt-0.5">' + esc(t.lead_name) + '</p>' : "",
        t.notes ? '    <p class="text-xs text-zinc-600 mt-1 italic">' + esc(t.notes) + '</p>' : "",
        '  </div>',
        '  <div class="flex items-center gap-3 flex-shrink-0">',
        '    <span class="' + priorityDot(t.priority) + '" title="' + t.priority + ' priority"></span>',
        '    <span class="text-xs font-medium ' + (overdue ? "text-red-400" : dueToday ? "text-yellow-400" : "text-zinc-400") + '">' + dueLbl + '</span>',
        '    <button onclick="Tasks.delete(\'' + t.id + '\')" class="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition text-xs px-1.5 py-0.5 rounded">✕</button>',
        '  </div>',
        '</div>'
      ].join("\n");
    }).join("\n");
  }

  // ── Controls ──────────────────────────────────────────────
  function bindControls() {
    // View filter tabs
    document.querySelectorAll("[data-view]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        filter.view = this.dataset.view;
        document.querySelectorAll("[data-view]").forEach(function(b){ b.classList.remove("active-tab"); });
        this.classList.add("active-tab");
        applyFilter();
      });
    });

    // Priority filter
    on("filter-priority", "change", function(){ filter.priority = this.value; applyFilter(); });

    // Refresh
    on("btn-refresh", "click", loadTasks);

    // Add task form
    on("add-task-form", "submit", addTask);

    // Modal
    on("btn-add-task",    "click",  function(){ show("add-task-modal"); });
    on("modal-close",     "click",  function(){ hide("add-task-modal"); });
    on("modal-cancel",    "click",  function(){ hide("add-task-modal"); });
  }

  // ── Add task ──────────────────────────────────────────────
  async function addTask(e) {
    e.preventDefault();
    var payload = {
      title:    getVal("f-title"),
      due_date: getVal("f-due") || null,
      priority: getVal("f-priority"),
      notes:    getVal("f-notes"),
      done:     false,
      lead_id:  null
    };
    if (!payload.title) return;

    if (window.RUTHKO_CONFIG.sampleMode) {
      tasks.unshift(Object.assign({ id: "t" + Date.now(), created_at: new Date().toISOString(), lead_name: "" }, payload));
      showToast("Task added (sample mode).");
    } else {
      var { error } = await supabase.from("tasks").insert([payload]);
      if (error) { showToast("Error: " + error.message, "error"); return; }
      showToast("Task added.");
      await loadTasks();
      return;
    }

    hide("add-task-modal");
    document.getElementById("add-task-form").reset();
    renderStats();
    applyFilter();
  }

  // ── Public API ────────────────────────────────────────────
  window.Tasks = {
    toggle: async function (id) {
      var t = tasks.find(function(x){ return x.id===id; });
      if (!t) return;
      var newDone = !t.done;

      if (window.RUTHKO_CONFIG.sampleMode) {
        t.done = newDone;
        showToast(newDone ? "Task completed." : "Task reopened.");
      } else {
        var { error } = await supabase.from("tasks").update({ done: newDone }).eq("id", id);
        if (error) { showToast("Error: " + error.message, "error"); return; }
        t.done = newDone;
        showToast(newDone ? "Task completed." : "Task reopened.");
      }
      renderStats();
      applyFilter();
    },

    delete: async function (id) {
      if (!confirm("Delete this task?")) return;
      if (window.RUTHKO_CONFIG.sampleMode) {
        tasks = tasks.filter(function(t){ return t.id!==id; });
        showToast("Task deleted (sample mode).");
      } else {
        var { error } = await supabase.from("tasks").delete().eq("id", id);
        if (error) { showToast("Error: " + error.message, "error"); return; }
        tasks = tasks.filter(function(t){ return t.id!==id; });
        showToast("Task deleted.");
      }
      renderStats();
      applyFilter();
    }
  };

  // ── Helpers ───────────────────────────────────────────────
  function formatDueDate(dateStr) {
    var todayStr = new Date().toISOString().slice(0,10);
    if (dateStr === todayStr) return "Today";
    var d = new Date(dateStr + "T00:00:00");
    var t = new Date(todayStr + "T00:00:00");
    var diff = Math.round((d - t) / 86400000);
    if (diff === 1)  return "Tomorrow";
    if (diff === -1) return "Yesterday";
    if (diff < -1)  return Math.abs(diff) + "d overdue";
    if (diff < 7)   return "In " + diff + "d";
    return dateStr;
  }

  function priorityDot(p) {
    var m = { high:"w-2 h-2 rounded-full bg-red-500", medium:"w-2 h-2 rounded-full bg-yellow-500", low:"w-2 h-2 rounded-full bg-zinc-600" };
    return m[p] || m.medium;
  }

  function setLoading(on) { var el = document.getElementById("tasks-loading"); if(el) el.style.display = on?"block":"none"; }
  function setText(id,v)  { var el = document.getElementById(id); if(el) el.textContent = v; }
  function getVal(id)     { var el = document.getElementById(id); return el ? el.value.trim() : ""; }
  function show(id)       { var el = document.getElementById(id); if(el) el.classList.remove("hidden"); }
  function hide(id)       { var el = document.getElementById(id); if(el) el.classList.add("hidden"); }
  function on(id,ev,fn)   { var el = document.getElementById(id); if(el) el.addEventListener(ev,fn); }
  function esc(s)         { return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

  function showToast(msg, type) {
    var el = document.getElementById("tasks-toast");
    if (!el) return;
    el.textContent   = msg;
    el.className     = "fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl font-semibold text-sm shadow-2xl z-50 " + (type==="error" ? "bg-red-600 text-white" : "bg-green-600 text-white");
    el.style.display = "block";
    clearTimeout(el._t);
    el._t = setTimeout(function(){ el.style.display="none"; }, 3000);
  }

})();
