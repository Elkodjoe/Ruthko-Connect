// ============================================================
// Ruthko Connect CRM — ruthko-crm.js
// Depends on: supabase-config.js, @supabase/supabase-js CDN
// ============================================================

(function () {
  "use strict";

  // ── Sample data (used when sampleMode: true) ─────────────
  const SAMPLE_LEADS = [
    { id:"s1", created_at:"2026-05-15T10:00:00Z", type:"employer",  name:"Global Medical Center",      email:"hr@globalmed.com",         phone:"+1 713 555 0100", organization:"Global Medical Center",      status:"qualified", priority:"high",   deal_value:75000, package:"EB-3 Placement",          source:"intake-form", notes:"", next_followup:"2026-07-01", details:{industry:"Healthcare",   visa_type:"EB-3",           worker_count:5}  },
    { id:"s2", created_at:"2026-05-18T14:30:00Z", type:"candidate", name:"Ama Boateng",               email:"ama.boateng@email.com",     phone:"+233 24 555 0201",organization:"",                            status:"new",       priority:"medium", deal_value:0,     package:null,                      source:"intake-form", notes:"", next_followup:null,         details:{profession:"Nursing",    country:"Ghana",            experience:"3–5 years"} },
    { id:"s3", created_at:"2026-05-20T09:15:00Z", type:"sponsor",   name:"Diallo Ventures LLC",       email:"info@diallovc.com",         phone:"+1 832 555 0302", organization:"Diallo Ventures LLC",        status:"contacted", priority:"high",   deal_value:50000, package:"Platinum — $50,000",      source:"intake-form", notes:"Called May 21, very interested.", next_followup:"2026-06-28", details:{event_interest:"Cultural Handshake Summit"} },
    { id:"s4", created_at:"2026-05-22T11:45:00Z", type:"sponsor",   name:"Texas Workforce Board",     email:"events@twb.org",            phone:"+1 512 555 0403", organization:"Texas Workforce Board",      status:"qualified", priority:"high",   deal_value:15000, package:"Gold — $15,000",          source:"intake-form", notes:"", next_followup:"2026-07-05", details:{event_interest:"Cultural Handshake Summit"} },
    { id:"s5", created_at:"2026-06-01T08:00:00Z", type:"vendor",    name:"Afro Cuisine Catering",     email:"hello@afrocuisine.com",     phone:"+1 281 555 0504", organization:"Afro Cuisine Catering",      status:"new",       priority:"medium", deal_value:3500,  package:"Vendor Booth — $3,500",   source:"intake-form", notes:"", next_followup:null,         details:{event:"Cultural Handshake Summit"} },
    { id:"s6", created_at:"2026-06-03T16:20:00Z", type:"event",     name:"Dr. Kwame Asante",          email:"k.asante@university.edu",   phone:"+1 346 555 0605", organization:"University of Houston",      status:"new",       priority:"low",    deal_value:250,   package:"General Ticket — $250",   source:"intake-form", notes:"", next_followup:null,         details:{role:"Speaker / Panelist"} },
    { id:"s7", created_at:"2026-06-05T10:30:00Z", type:"employer",  name:"Lone Star Hospitality Grp", email:"hr@lonestar.com",           phone:"+1 214 555 0706", organization:"Lone Star Hospitality Group",status:"new",       priority:"high",   deal_value:45000, package:"H-2B Placement",          source:"intake-form", notes:"", next_followup:"2026-07-10", details:{industry:"Hospitality",  visa_type:"H-2B",           worker_count:12} },
    { id:"s8", created_at:"2026-06-08T13:00:00Z", type:"invoice",   name:"Heritage Bank of Commerce", email:"finance@heritagebank.com",  phone:"+1 713 555 0807", organization:"Heritage Bank of Commerce",  status:"contacted", priority:"high",   deal_value:15000, package:"Gold — $15,000",          source:"invoice-form",notes:"Invoice sent June 9.",  next_followup:"2026-07-01", details:{billing_address:"1200 Main St, Houston TX"} }
  ];

  // ── State ─────────────────────────────────────────────────
  var supabase  = null;
  var leads     = [];
  var filtered  = [];
  var editingId = null;

  var filter = { type: "all", status: "all", search: "" };

  // ── Bootstrap ─────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    var cfg = window.RUTHKO_CONFIG;

    if (!cfg.sampleMode) {
      var { createClient } = window.supabase;
      supabase = createClient(cfg.supabase.url, cfg.supabase.anonKey);
    }

    bindControls();
    loadLeads();
  });

  // ── Load data ─────────────────────────────────────────────
  async function loadLeads() {
    setTableLoading(true);
    try {
      if (window.RUTHKO_CONFIG.sampleMode) {
        leads = SAMPLE_LEADS.slice();
      } else {
        var { data, error } = await supabase
          .from("leads")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        leads = data || [];
      }
    } catch (err) {
      showToast("Error loading leads: " + err.message, "error");
      leads = SAMPLE_LEADS.slice();
    }
    applyFilter();
    renderStats();
    setTableLoading(false);
  }

  // ── Filter & render ───────────────────────────────────────
  function applyFilter() {
    var q = filter.search.toLowerCase();
    filtered = leads.filter(function (l) {
      if (filter.type   !== "all" && l.type   !== filter.type)   return false;
      if (filter.status !== "all" && l.status !== filter.status) return false;
      if (q && !(
        (l.name         || "").toLowerCase().includes(q) ||
        (l.email        || "").toLowerCase().includes(q) ||
        (l.organization || "").toLowerCase().includes(q) ||
        (l.package      || "").toLowerCase().includes(q)
      )) return false;
      return true;
    });
    renderTable();
    renderCount();
  }

  function renderCount() {
    var el = document.getElementById("crm-count");
    if (el) el.textContent = filtered.length + " lead" + (filtered.length !== 1 ? "s" : "");
  }

  function renderStats() {
    var total     = leads.length;
    var pipeline  = leads.reduce(function(s,l){ return s + (Number(l.deal_value)||0); }, 0);
    var converted = leads.filter(function(l){ return l.status === "converted"; }).length;
    var highPri   = leads.filter(function(l){ return l.priority === "high"; }).length;

    setText("stat-total",     total);
    setText("stat-pipeline",  "$" + formatMoney(pipeline));
    setText("stat-converted", converted);
    setText("stat-high-pri",  highPri);
  }

  function renderTable() {
    var tbody = document.getElementById("crm-tbody");
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="px-4 py-12 text-center text-zinc-500">No leads match your filters.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(function (l) {
      var date = l.created_at ? l.created_at.slice(0,10) : "—";
      return [
        '<tr class="border-t border-zinc-800 hover:bg-zinc-900/40 transition cursor-pointer" onclick="CRM.openDetail(\'' + l.id + '\')">',
        '  <td class="px-4 py-3 whitespace-nowrap">',
        '    <div class="font-semibold text-sm">' + esc(l.name) + '</div>',
        '    <div class="text-xs text-zinc-500">' + esc(l.organization || "") + '</div>',
        '  </td>',
        '  <td class="px-4 py-3"><span class="' + typeBadge(l.type) + '">' + cap(l.type) + '</span></td>',
        '  <td class="px-4 py-3"><span class="' + statusBadge(l.status) + '">' + cap(l.status) + '</span></td>',
        '  <td class="px-4 py-3"><span class="' + priorityBadge(l.priority) + '">' + cap(l.priority) + '</span></td>',
        '  <td class="px-4 py-3 text-sm font-semibold ' + (l.deal_value > 0 ? "text-green-400" : "text-zinc-500") + '">' + (l.deal_value > 0 ? "$" + formatMoney(l.deal_value) : "—") + '</td>',
        '  <td class="px-4 py-3 text-sm text-zinc-400">' + esc(l.package || "—") + '</td>',
        '  <td class="px-4 py-3 text-xs text-zinc-500">' + date + '</td>',
        '  <td class="px-4 py-3">',
        '    <div class="flex gap-1">',
        '      <button onclick="event.stopPropagation(); CRM.openEdit(\'' + l.id + '\')" class="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded-lg transition">Edit</button>',
        '      <button onclick="event.stopPropagation(); CRM.deleteLead(\'' + l.id + '\')" class="px-2 py-1 text-xs bg-red-900/40 hover:bg-red-800/60 text-red-400 rounded-lg transition">Del</button>',
        '    </div>',
        '  </td>',
        '</tr>'
      ].join("\n");
    }).join("");
  }

  // ── Controls ──────────────────────────────────────────────
  function bindControls() {
    on("crm-search", "input",  function(){ filter.search = this.value; applyFilter(); });
    on("filter-type",   "change", function(){ filter.type   = this.value; applyFilter(); });
    on("filter-status", "change", function(){ filter.status = this.value; applyFilter(); });
    on("btn-refresh", "click",  loadLeads);
    on("btn-export",  "click",  exportCSV);
    on("btn-add",     "click",  function(){ openModal(); });
    on("modal-close", "click",  closeModal);
    on("lead-form",   "submit", saveLead);
    on("detail-close","click",  closeDetail);
    on("detail-edit", "click",  function(){
      var id = document.getElementById("detail-panel").dataset.leadId;
      closeDetail();
      openEdit(id);
    });
  }

  // ── Add / Edit modal ─────────────────────────────────────
  function openModal(lead) {
    editingId = lead ? lead.id : null;
    var form  = document.getElementById("lead-form");
    if (!form) return;

    form.reset();
    if (lead) {
      setVal("f-name",     lead.name);
      setVal("f-email",    lead.email);
      setVal("f-phone",    lead.phone);
      setVal("f-org",      lead.organization);
      setVal("f-type",     lead.type);
      setVal("f-status",   lead.status);
      setVal("f-priority", lead.priority);
      setVal("f-value",    lead.deal_value);
      setVal("f-package",  lead.package);
      setVal("f-source",   lead.source);
      setVal("f-notes",    lead.notes);
      setVal("f-followup", lead.next_followup || "");
    }

    var title = document.getElementById("modal-title");
    if (title) title.textContent = lead ? "Edit Lead" : "Add New Lead";

    show("lead-modal");
  }

  function closeModal() { hide("lead-modal"); editingId = null; }

  async function saveLead(e) {
    e.preventDefault();
    var payload = {
      name:          getVal("f-name"),
      email:         getVal("f-email"),
      phone:         getVal("f-phone"),
      organization:  getVal("f-org"),
      type:          getVal("f-type"),
      status:        getVal("f-status"),
      priority:      getVal("f-priority"),
      deal_value:    parseFloat(getVal("f-value")) || 0,
      package:       getVal("f-package"),
      source:        getVal("f-source") || "manual",
      notes:         getVal("f-notes"),
      next_followup: getVal("f-followup") || null
    };

    if (window.RUTHKO_CONFIG.sampleMode) {
      if (editingId) {
        leads = leads.map(function(l){ return l.id === editingId ? Object.assign({}, l, payload) : l; });
      } else {
        leads.unshift(Object.assign({ id: "s" + Date.now(), created_at: new Date().toISOString(), details: {} }, payload));
      }
      showToast(editingId ? "Lead updated (sample mode)." : "Lead added (sample mode).");
    } else {
      try {
        if (editingId) {
          var { error } = await supabase.from("leads").update(payload).eq("id", editingId);
          if (error) throw error;
        } else {
          var { error } = await supabase.from("leads").insert([payload]);
          if (error) throw error;
        }
        showToast(editingId ? "Lead updated." : "Lead added.");
        await loadLeads();
      } catch (err) {
        showToast("Save failed: " + err.message, "error"); return;
      }
    }

    closeModal();
    applyFilter();
    renderStats();
  }

  // ── Delete ────────────────────────────────────────────────
  window.CRM = {
    openDetail: openDetail,
    openEdit:   function(id){ var l = leads.find(function(x){ return x.id===id; }); if(l) openModal(l); },
    deleteLead: async function(id) {
      if (!confirm("Delete this lead? This cannot be undone.")) return;
      if (window.RUTHKO_CONFIG.sampleMode) {
        leads = leads.filter(function(l){ return l.id !== id; });
        showToast("Lead deleted (sample mode).");
      } else {
        var { error } = await supabase.from("leads").delete().eq("id", id);
        if (error) { showToast("Delete failed: " + error.message, "error"); return; }
        showToast("Lead deleted.");
        await loadLeads();
      }
      applyFilter();
      renderStats();
    }
  };

  function openEdit(id) {
    var l = leads.find(function(x){ return x.id===id; });
    if (l) openModal(l);
  }

  // ── Detail panel ──────────────────────────────────────────
  function openDetail(id) {
    var l = leads.find(function(x){ return x.id===id; });
    if (!l) return;

    var panel = document.getElementById("detail-panel");
    if (!panel) return;
    panel.dataset.leadId = l.id;

    setText("detail-name",    l.name);
    setText("detail-type",    cap(l.type));
    setText("detail-status",  cap(l.status));
    setText("detail-email",   l.email || "—");
    setText("detail-phone",   l.phone || "—");
    setText("detail-org",     l.organization || "—");
    setText("detail-value",   l.deal_value > 0 ? "$" + formatMoney(l.deal_value) : "—");
    setText("detail-package", l.package || "—");
    setText("detail-source",  l.source || "—");
    setText("detail-notes",   l.notes || "No notes.");
    setText("detail-followup",l.next_followup || "Not set");
    setText("detail-created", l.created_at ? l.created_at.slice(0,10) : "—");

    var detailsEl = document.getElementById("detail-extra");
    if (detailsEl && l.details) {
      var items = Object.entries(l.details).map(function(pair){
        return '<div class="flex justify-between text-sm py-1 border-b border-zinc-800"><span class="text-zinc-400">' + esc(pair[0].replace(/_/g," ")) + '</span><span>' + esc(String(pair[1])) + '</span></div>';
      });
      detailsEl.innerHTML = items.length ? items.join("") : '<p class="text-zinc-500 text-sm">No additional details.</p>';
    }

    show("detail-panel");
  }

  function closeDetail() { hide("detail-panel"); }

  // ── CSV Export ────────────────────────────────────────────
  function exportCSV() {
    var cols = ["id","created_at","type","name","email","phone","organization","status","priority","deal_value","package","source","notes","next_followup"];
    var rows = [cols.join(",")].concat(filtered.map(function(l){
      return cols.map(function(c){
        var v = l[c] == null ? "" : String(l[c]);
        return '"' + v.replace(/"/g,'""') + '"';
      }).join(",");
    }));
    var blob = new Blob([rows.join("\n")], { type: "text/csv" });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement("a");
    a.href   = url;
    a.download = "ruthko-leads-" + new Date().toISOString().slice(0,10) + ".csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV exported — " + filtered.length + " leads.");
  }

  // ── Toast ─────────────────────────────────────────────────
  function showToast(msg, type) {
    var el = document.getElementById("crm-toast");
    if (!el) return;
    el.textContent    = msg;
    el.className      = "fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl font-semibold text-sm shadow-2xl z-50 transition " +
      (type === "error" ? "bg-red-600 text-white" : "bg-green-600 text-white");
    el.style.display  = "block";
    setTimeout(function(){ el.style.display = "none"; }, 3000);
  }

  // ── Helpers ───────────────────────────────────────────────
  function setTableLoading(on) {
    var el = document.getElementById("crm-loading");
    if (el) el.style.display = on ? "block" : "none";
  }

  function typeBadge(t) {
    var m = { employer:"bg-blue-500/20 text-blue-400", candidate:"bg-emerald-500/20 text-emerald-400", sponsor:"bg-yellow-500/20 text-yellow-400", vendor:"bg-orange-500/20 text-orange-400", event:"bg-purple-500/20 text-purple-400", invoice:"bg-pink-500/20 text-pink-400" };
    return "text-xs px-2 py-1 rounded-full font-medium " + (m[t] || "bg-zinc-700 text-zinc-300");
  }
  function statusBadge(s) {
    var m = { new:"bg-zinc-700 text-zinc-300", contacted:"bg-blue-700/40 text-blue-300", qualified:"bg-yellow-700/40 text-yellow-300", converted:"bg-green-700/40 text-green-300", lost:"bg-red-700/40 text-red-300" };
    return "text-xs px-2 py-1 rounded-full font-medium " + (m[s] || "bg-zinc-700 text-zinc-300");
  }
  function priorityBadge(p) {
    var m = { high:"text-red-400", medium:"text-yellow-400", low:"text-zinc-400" };
    return "text-xs font-semibold " + (m[p] || "text-zinc-400");
  }

  function cap(s)        { return s ? s[0].toUpperCase() + s.slice(1) : ""; }
  function esc(s)        { return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function formatMoney(n){ return Number(n).toLocaleString(); }
  function setText(id,v) { var el=document.getElementById(id); if(el) el.textContent=v; }
  function setVal(id,v)  { var el=document.getElementById(id); if(el) el.value=v||""; }
  function getVal(id)    { var el=document.getElementById(id); return el ? el.value.trim() : ""; }
  function show(id)      { var el=document.getElementById(id); if(el) el.classList.remove("hidden"); }
  function hide(id)      { var el=document.getElementById(id); if(el) el.classList.add("hidden"); }
  function on(id,ev,fn)  { var el=document.getElementById(id); if(el) el.addEventListener(ev,fn); }

})();
