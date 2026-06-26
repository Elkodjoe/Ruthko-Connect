// ============================================================
// Ruthko Connect — notify-lead.js
// Netlify Function: sends admin email alert via Resend
// when a new lead is captured from any intake form.
//
// Environment variables (set in Netlify Dashboard → Site → Env):
//   RESEND_API_KEY       required — from resend.com
//   RUTHKO_NOTIFY_TO     optional — default: emmakodjoe1@gmail.com
//   RUTHKO_NOTIFY_FROM   optional — default: Ruthko Connect <onboarding@resend.dev>
// ============================================================

exports.handler = async function (event) {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return cors(200, "");
  }

  if (event.httpMethod !== "POST") {
    return cors(405, JSON.stringify({ error: "Method not allowed" }));
  }

  var apiKey  = process.env.RESEND_API_KEY;
  var toEmail = process.env.RUTHKO_NOTIFY_TO   || "emmakodjoe1@gmail.com";
  var from    = process.env.RUTHKO_NOTIFY_FROM || "Ruthko Connect <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn("notify-lead: RESEND_API_KEY not set — skipping email.");
    return cors(200, JSON.stringify({ skipped: true, reason: "no api key" }));
  }

  var lead;
  try {
    lead = JSON.parse(event.body || "{}");
  } catch (e) {
    return cors(400, JSON.stringify({ error: "Invalid JSON body" }));
  }

  var subject = buildSubject(lead);
  var html    = buildHtml(lead);

  try {
    var response = await fetch("https://api.resend.com/emails", {
      method:  "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type":  "application/json"
      },
      body: JSON.stringify({
        from:    from,
        to:      [toEmail],
        subject: subject,
        html:    html
      })
    });

    var body = await response.json().catch(function () { return {}; });

    if (!response.ok) {
      console.error("Resend error:", body);
      return cors(502, JSON.stringify({ error: "Resend API error", detail: body }));
    }

    return cors(200, JSON.stringify({ ok: true, id: body.id }));

  } catch (err) {
    console.error("notify-lead fetch error:", err.message);
    return cors(500, JSON.stringify({ error: err.message }));
  }
};

// ── Email builders ────────────────────────────────────────────

function buildSubject(lead) {
  var typeLabels = {
    employer:  "Employer Staffing",
    candidate: "Job Candidate",
    sponsor:   "Sponsor",
    vendor:    "Vendor Booth",
    event:     "Event RSVP",
    invoice:   "Invoice Request"
  };
  var label = typeLabels[lead.type] || lead.type || "Lead";
  var value = lead.deal_value > 0 ? " — $" + Number(lead.deal_value).toLocaleString() : "";
  return "🔔 New " + label + ": " + (lead.name || "Unknown") + value;
}

function buildHtml(lead) {
  var typeColors = {
    employer:  "#3b82f6",
    candidate: "#10b981",
    sponsor:   "#facc15",
    vendor:    "#f97316",
    event:     "#a855f7",
    invoice:   "#ec4899"
  };
  var accent = typeColors[lead.type] || "#facc15";
  var date   = new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });

  var details = "";
  if (lead.details && typeof lead.details === "object") {
    details = Object.entries(lead.details).filter(function (pair) {
      return pair[1] && pair[1] !== "undefined";
    }).map(function (pair) {
      var k = String(pair[0]).replace(/_/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      return row(k, String(pair[1]));
    }).join("");
  }

  return [
    '<!DOCTYPE html>',
    '<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">',
    '<style>',
    '  body{margin:0;padding:0;background:#f4f4f5;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;}',
    '  .wrap{max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);}',
    '  .header{background:#0a0a0a;padding:28px 32px;text-align:center;}',
    '  .logo{font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;}',
    '  .logo span{color:' + accent + ';}',
    '  .badge{display:inline-block;margin-top:12px;padding:5px 14px;background:' + accent + ';color:' + (lead.type==="sponsor"?"#000":"#fff") + ';border-radius:20px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;}',
    '  .body{padding:32px;}',
    '  .name{font-size:24px;font-weight:800;color:#0a0a0a;margin:0 0 4px;}',
    '  .org{font-size:14px;color:#71717a;margin:0 0 24px;}',
    '  .section{margin-bottom:24px;}',
    '  .section-title{font-size:11px;font-weight:700;color:#a1a1aa;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;}',
    '  .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f4f4f5;font-size:14px;}',
    '  .row .label{color:#71717a;}',
    '  .row .value{color:#0a0a0a;font-weight:600;text-align:right;max-width:280px;}',
    '  .value-pill{background:' + accent + ';color:' + (lead.type==="sponsor"?"#000":"#fff") + ';padding:3px 10px;border-radius:6px;font-weight:700;}',
    '  .cta{text-align:center;margin:28px 0 0;}',
    '  .btn{display:inline-block;padding:13px 28px;background:#0a0a0a;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;}',
    '  .footer{background:#f9f9f9;padding:20px 32px;text-align:center;font-size:12px;color:#a1a1aa;border-top:1px solid #e4e4e7;}',
    '</style></head>',
    '<body>',
    '<div class="wrap">',
    '  <div class="header">',
    '    <div class="logo">Ruthko <span>Connect</span></div>',
    '    <div class="badge">' + (lead.type || "lead") + '</div>',
    '  </div>',
    '  <div class="body">',
    '    <p class="name">' + esc(lead.name || "New Lead") + '</p>',
    '    <p class="org">' + esc(lead.organization || "&nbsp;") + '</p>',
    '',
    '    <div class="section">',
    '      <div class="section-title">Contact</div>',
    lead.email ? row("Email",  '<a href="mailto:' + esc(lead.email) + '" style="color:#0a0a0a;">' + esc(lead.email) + '</a>') : "",
    lead.phone ? row("Phone",  '<a href="tel:' + esc(lead.phone) + '" style="color:#0a0a0a;">' + esc(lead.phone) + '</a>') : "",
    '    </div>',
    '',
    '    <div class="section">',
    '      <div class="section-title">Lead Info</div>',
    row("Status",   "New"),
    row("Priority", lead.priority || "Medium"),
    row("Source",   lead.source || "intake-form"),
    lead.package    ? row("Package", lead.package) : "",
    lead.deal_value > 0 ? '<div class="row"><span class="label">Deal Value</span><span class="value"><span class="value-pill">$' + Number(lead.deal_value).toLocaleString() + '</span></span></div>' : "",
    '    </div>',
    '',
    details ? '<div class="section"><div class="section-title">Form Details</div>' + details + '</div>' : "",
    '',
    lead.notes ? '<div class="section"><div class="section-title">Notes</div><p style="font-size:14px;color:#3f3f46;margin:0;">' + esc(lead.notes) + '</p></div>' : "",
    '',
    '    <div class="cta">',
    '      <a href="https://ruthko-connect.netlify.app/crm.html" class="btn">Open CRM Dashboard →</a>',
    '    </div>',
    '  </div>',
    '  <div class="footer">',
    '    Ruthko Connect · ' + date + '<br>',
    '    <a href="https://wa.me/17012603908" style="color:#a1a1aa;">WhatsApp</a>',
    '  </div>',
    '</div>',
    '</body></html>'
  ].join("\n");
}

function row(label, value) {
  return '<div class="row"><span class="label">' + label + '</span><span class="value">' + value + '</span></div>';
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cors(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type":                "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":"Content-Type",
      "Access-Control-Allow-Methods":"POST, OPTIONS"
    },
    body: body
  };
}
