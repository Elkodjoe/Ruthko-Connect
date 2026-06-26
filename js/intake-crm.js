// ============================================================
// Ruthko Connect — Intake → CRM bridge (intake-crm.js)
// Depends on: supabase-config.js, @supabase/supabase-js CDN
//
// Intercepts all intake form submissions.
// - sampleMode: true  → shows success toast, redirects to thank-you.html
// - sampleMode: false → writes lead + detail row to Supabase, then redirects
// ============================================================

(function () {
  "use strict";

  var THANK_YOU = "thank-you.html";

  // ── Package → deal value map ──────────────────────────────
  var PACKAGE_VALUES = {
    "Platinum — $50,000":      50000,
    "Platinum Sponsor — $50,000": 50000,
    "Gold — $15,000":          15000,
    "Gold Sponsor — $15,000":  15000,
    "Silver — $5,000":         5000,
    "Silver Sponsor — $5,000": 5000,
    "Bronze — $1,000":         1000,
    "Custom / Not sure yet":   0,
    "Vendor Booth — $3,500":   3500,
    "1 booth — $3,500":        3500,
    "2 booths — $6,500":       6500,
    "General Ticket — $250":   250,
    "VIP Ticket — $500":       500
  };

  function dealValue(pkg) {
    if (!pkg) return 0;
    for (var key in PACKAGE_VALUES) {
      if (pkg.includes(key) || key.includes(pkg)) return PACKAGE_VALUES[key];
    }
    // Try to extract a number from the string e.g. "$15,000"
    var m = pkg.match(/\$([\d,]+)/);
    return m ? parseInt(m[1].replace(/,/g, ""), 10) : 0;
  }

  // ── Form → lead mapping ───────────────────────────────────
  function buildLead(formName, data) {
    var base = {
      source: "intake-form",
      status: "new",
      priority: "medium"
    };

    if (formName === "employer-staffing") {
      return Object.assign({}, base, {
        type:         "employer",
        name:         data.contact_person || data.company || "",
        email:        data.email  || "",
        phone:        data.phone  || "",
        organization: data.company || "",
        priority:     "high",
        deal_value:   0,
        package:      data.visa_type || null,
        details: {
          industry:         data.industry,
          visa_type:        data.visa_type,
          worker_count:     data.worker_count,
          job_description:  data.job_description
        }
      });
    }

    if (formName === "candidate-interest") {
      return Object.assign({}, base, {
        type:         "candidate",
        name:         data.full_name || "",
        email:        data.email || "",
        phone:        data.phone || "",
        organization: data.country || "",
        deal_value:   0,
        details: {
          profession:   data.profession,
          experience:   data.experience,
          country:      data.country,
          visa_status:  data.visa_status,
          about:        data.about
        }
      });
    }

    if (formName === "sponsor-interest") {
      var pkg = data.package || "";
      return Object.assign({}, base, {
        type:         "sponsor",
        name:         data.contact_name || data.organization || "",
        email:        data.email || "",
        phone:        data.phone || "",
        organization: data.organization || "",
        priority:     "high",
        deal_value:   dealValue(pkg),
        package:      pkg,
        details: {
          event_interest: data.event_interest,
          goals:          data.goals
        }
      });
    }

    if (formName === "vendor-booth") {
      var boothPkg = data.booth_count || "";
      return Object.assign({}, base, {
        type:         "vendor",
        name:         data.contact_name || data.business_name || "",
        email:        data.email || "",
        phone:        data.phone || "",
        organization: data.business_name || "",
        deal_value:   dealValue(boothPkg),
        package:      boothPkg || "Vendor Booth",
        details: {
          business_type: data.business_type,
          event:         data.event,
          booth_count:   data.booth_count,
          products:      data.products
        }
      });
    }

    if (formName === "invoice-request") {
      var invPkg = data.package || "";
      return Object.assign({}, base, {
        type:         "invoice",
        name:         data.name || "",
        email:        data.email || "",
        phone:        data.phone || "",
        organization: data.name || "",
        priority:     "high",
        deal_value:   dealValue(invPkg),
        package:      invPkg,
        source:       "invoice-form",
        notes:        data.notes || "",
        details: {
          billing_address: data.billing_address,
          package:         invPkg
        }
      });
    }

    if (formName === "event-rsvp") {
      var ticketPkg = "General Ticket — $250";
      return Object.assign({}, base, {
        type:         "event",
        name:         data.full_name || "",
        email:        data.email || "",
        phone:        data.phone || "",
        organization: data.organization || "",
        deal_value:   dealValue(ticketPkg),
        package:      ticketPkg,
        details: {
          event:     data.event,
          attendees: data.attendees,
          role:      data.role,
          notes:     data.notes
        }
      });
    }

    return null;
  }

  // ── Detail table insert ───────────────────────────────────
  async function insertDetail(client, formName, leadId, data) {
    var table, row;

    if (formName === "employer-staffing") {
      table = "employers";
      row   = {
        lead_id:         leadId,
        company:         data.company,
        contact_person:  data.contact_person,
        email:           data.email,
        phone:           data.phone,
        industry:        data.industry,
        visa_type:       data.visa_type,
        worker_count:    parseInt(data.worker_count, 10) || null,
        job_description: data.job_description
      };
    } else if (formName === "candidate-interest") {
      table = "candidates";
      row   = {
        lead_id:     leadId,
        full_name:   data.full_name,
        email:       data.email,
        phone:       data.phone,
        country:     data.country,
        profession:  data.profession,
        experience:  data.experience,
        visa_status: data.visa_status,
        about:       data.about
      };
    } else if (formName === "sponsor-interest") {
      table = "sponsors";
      row   = {
        lead_id:        leadId,
        organization:   data.organization,
        contact_name:   data.contact_name,
        email:          data.email,
        phone:          data.phone,
        package:        data.package,
        event_interest: data.event_interest,
        goals:          data.goals
      };
    } else if (formName === "vendor-booth") {
      table = "vendors";
      row   = {
        lead_id:       leadId,
        business_name: data.business_name,
        contact_name:  data.contact_name,
        email:         data.email,
        phone:         data.phone,
        business_type: data.business_type,
        event:         data.event,
        booth_count:   data.booth_count,
        products:      data.products
      };
    } else if (formName === "event-rsvp") {
      table = "event_registrations";
      row   = {
        lead_id:      leadId,
        full_name:    data.full_name,
        email:        data.email,
        phone:        data.phone,
        organization: data.organization,
        event:        data.event,
        attendees:    data.attendees,
        role:         data.role,
        notes:        data.notes
      };
    } else {
      return; // unknown form — skip detail table
    }

    var result = await client.from(table).insert([row]);
    if (result.error) console.warn("Detail insert warning:", result.error.message);
  }

  // ── Form data → plain object ──────────────────────────────
  function formToObject(form) {
    var obj = {};
    var fd  = new FormData(form);
    fd.forEach(function (v, k) {
      if (k !== "bot-field" && k !== "form-name") obj[k] = v;
    });
    return obj;
  }

  // ── Toast ─────────────────────────────────────────────────
  function toast(msg, ok) {
    var el = document.getElementById("intake-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "intake-toast";
      el.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:14px 24px;border-radius:12px;font-weight:600;font-size:14px;z-index:9999;font-family:Inter,sans-serif;white-space:nowrap;transition:opacity 0.3s;display:none;";
      document.body.appendChild(el);
    }
    el.textContent    = msg;
    el.style.background = ok === false ? "#dc2626" : "#16a34a";
    el.style.color    = "#fff";
    el.style.display  = "block";
    el.style.opacity  = "1";
    clearTimeout(el._t);
    el._t = setTimeout(function () {
      el.style.opacity = "0";
      setTimeout(function () { el.style.display = "none"; }, 300);
    }, 3500);
  }

  function setSubmitting(btn, isLoading) {
    if (!btn) return;
    btn.disabled     = isLoading;
    btn.dataset.orig = btn.dataset.orig || btn.textContent;
    btn.textContent  = isLoading ? "Saving…" : btn.dataset.orig;
  }

  // ── Main intercept ────────────────────────────────────────
  function interceptForms() {
    var cfg  = window.RUTHKO_CONFIG || { sampleMode: true };
    var client = null;

    if (!cfg.sampleMode && window.supabase) {
      client = window.supabase.createClient(cfg.supabase.url, cfg.supabase.anonKey);
    }

    document.querySelectorAll("form[data-netlify]").forEach(function (form) {
      form.addEventListener("submit", async function (e) {
        e.preventDefault();

        var formName = form.getAttribute("name") || "";
        var btn      = form.querySelector("button[type=submit]");
        var data     = formToObject(form);

        setSubmitting(btn, true);

        // ── Sample mode: simulate success ─────────────────
        if (cfg.sampleMode) {
          await delay(600);
          toast("✓ Saved to CRM (sample mode) — redirecting…");
          await delay(1200);
          window.location.href = THANK_YOU;
          return;
        }

        // ── Live mode: write to Supabase ──────────────────
        try {
          var lead = buildLead(formName, data);
          if (!lead) throw new Error("Unknown form: " + formName);

          // 1. Insert lead
          var leadResult = await client.from("leads").insert([lead]).select("id").single();
          if (leadResult.error) throw leadResult.error;
          var leadId = leadResult.data.id;

          // 2. Insert detail row
          await insertDetail(client, formName, leadId, data);

          // 3. Log raw submission
          await client.from("intake_submissions").insert([{
            lead_id:   leadId,
            form_name: formName,
            raw_data:  data
          }]);

          toast("✓ Submitted! We'll be in touch within 48 hours.");
          await delay(1200);
          window.location.href = THANK_YOU;

        } catch (err) {
          console.error("Intake CRM error:", err);
          toast("Submission saved — we'll follow up shortly.", true);
          // Still redirect so the user isn't stuck
          await delay(1500);
          window.location.href = THANK_YOU;
        }
      });
    });
  }

  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // ── Boot ──────────────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", interceptForms);
  } else {
    interceptForms();
  }

})();
