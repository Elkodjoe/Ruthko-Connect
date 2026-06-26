// ============================================================
// Ruthko Connect — send-auto-reply.js
// Netlify Function: sends a tailored confirmation email to
// the person who just submitted an intake form.
//
// Environment variables:
//   RESEND_API_KEY          required
//   RUTHKO_AUTOREPLY_FROM   optional (default: Ruthko Connect <onboarding@resend.dev>)
//   RUTHKO_REPLY_TO         optional (default: emmakodjoe1@gmail.com)
// ============================================================

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") return cors(200, "");
  if (event.httpMethod !== "POST")    return cors(405, JSON.stringify({ error: "Method not allowed" }));

  var apiKey  = process.env.RESEND_API_KEY;
  var from    = process.env.RUTHKO_AUTOREPLY_FROM || "Ruthko Connect <onboarding@resend.dev>";
  var replyTo = process.env.RUTHKO_REPLY_TO       || "emmakodjoe1@gmail.com";

  if (!apiKey) {
    console.warn("send-auto-reply: RESEND_API_KEY not set — skipping.");
    return cors(200, JSON.stringify({ skipped: true }));
  }

  var payload;
  try { payload = JSON.parse(event.body || "{}"); } catch (e) {
    return cors(400, JSON.stringify({ error: "Invalid JSON" }));
  }

  var toEmail = payload.email;
  var name    = payload.name || "there";
  var type    = payload.type || "general";

  if (!toEmail || !toEmail.includes("@")) {
    return cors(200, JSON.stringify({ skipped: true, reason: "no valid email" }));
  }

  var subject = buildSubject(type, name);
  var html    = buildHtml(type, name, payload);

  try {
    var res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ from: from, to: [toEmail], reply_to: replyTo, subject: subject, html: html })
    });

    var body = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      console.error("Resend auto-reply error:", body);
      return cors(502, JSON.stringify({ error: "Resend error", detail: body }));
    }
    return cors(200, JSON.stringify({ ok: true, id: body.id }));
  } catch (err) {
    console.error("send-auto-reply error:", err.message);
    return cors(500, JSON.stringify({ error: err.message }));
  }
};

// ── Subject lines ─────────────────────────────────────────────
function buildSubject(type, name) {
  var subjects = {
    employer:  "We received your staffing request, " + firstName(name) + " — Ruthko Connect",
    candidate: "Your application is in, " + firstName(name) + " — Ruthko Connect",
    sponsor:   "Thank you for your sponsorship interest, " + firstName(name) + " — Ruthko Connect",
    vendor:    "Your vendor booth request is confirmed, " + firstName(name) + " — Ruthko Connect",
    event:     "You're registered! Here's what's next, " + firstName(name) + " — Ruthko Connect",
    invoice:   "Invoice request received, " + firstName(name) + " — Ruthko Connect"
  };
  return subjects[type] || "Thank you for contacting Ruthko Connect, " + firstName(name);
}

// ── HTML builders ─────────────────────────────────────────────
function buildHtml(type, name, data) {
  var sections = {
    employer:  employerHtml(name, data),
    candidate: candidateHtml(name, data),
    sponsor:   sponsorHtml(name, data),
    vendor:    vendorHtml(name, data),
    event:     eventHtml(name, data),
    invoice:   invoiceHtml(name, data)
  };
  var content = sections[type] || genericHtml(name);
  return wrap(content);
}

function employerHtml(name, data) {
  return [
    hero("#3b82f6", "💼", "Staffing Request Received"),
    greeting(name),
    '<p style="' + bodyText + '">Thank you for reaching out to <strong>Ruthko Connect</strong>. We\'ve received your staffing request and our team will review it within <strong>24–48 hours</strong>.</p>',
    sectionTitle("What Happens Next"),
    timeline([
      { step: "1", label: "Needs Review",     desc: "Our staffing team reviews your job requirements and visa type." },
      { step: "2", label: "Candidate Match",  desc: "We match qualified candidates from our pre-vetted pool." },
      { step: "3", label: "Shortlist Sent",   desc: "You receive a shortlist of top candidates within 5–7 business days." },
      { step: "4", label: "Interview & Hire", desc: "You interview and select. We handle the visa and onboarding paperwork." }
    ]),
    data.industry ? infoRow("Industry", data.industry) : "",
    data.visa_type ? infoRow("Visa Type", data.visa_type) : "",
    data.worker_count ? infoRow("Workers Needed", data.worker_count) : "",
    cta("https://wa.me/17012603908", "💬 Chat With Our Team on WhatsApp"),
    closingNote("Questions? Reply to this email or WhatsApp us anytime.")
  ].join("");
}

function candidateHtml(name, data) {
  return [
    hero("#10b981", "🌍", "Application Received"),
    greeting(name),
    '<p style="' + bodyText + '">Thank you for registering your interest with <strong>Ruthko Connect</strong>. We work with employers across the United States who are actively sponsoring workers through <strong>EB-3, H-2B, and H-1B visa programs</strong>.</p>',
    sectionTitle("Your Next Steps"),
    timeline([
      { step: "1", label: "Profile Review",    desc: "Our placement team reviews your background and profession." },
      { step: "2", label: "Employer Match",    desc: "We match you to employers looking for your skill set." },
      { step: "3", label: "Interview Prep",    desc: "We guide you through the employer interview process." },
      { step: "4", label: "Visa & Relocation", desc: "Our team assists with all visa paperwork and relocation support." }
    ]),
    data.profession   ? infoRow("Profession", data.profession)   : "",
    data.experience   ? infoRow("Experience", data.experience)   : "",
    data.country      ? infoRow("Country",    data.country)      : "",
    data.visa_status  ? infoRow("Visa Status",data.visa_status)  : "",
    sectionTitle("While You Wait"),
    tips([
      "Make sure your resume/CV is up to date and in English.",
      "Gather copies of your certificates, licenses, and work experience letters.",
      "Ensure your passport is valid for at least 2 years.",
      "Join our WhatsApp group for updates on new job openings."
    ]),
    cta("https://wa.me/17012603908", "💬 Join Our WhatsApp Group"),
    closingNote("We'll reach out as soon as we find a match. This usually takes 2–4 weeks.")
  ].join("");
}

function sponsorHtml(name, data) {
  return [
    hero("#facc15", "👑", "Sponsorship Interest Confirmed"),
    greeting(name),
    '<p style="' + bodyText + '">Thank you for your interest in sponsoring a Ruthko Connect event. We\'re excited about the opportunity to partner with <strong>' + esc(data.organization || "your organization") + '</strong> and will send you a full proposal within <strong>48 hours</strong>.</p>',
    data.package ? '<div style="background:#fefce8;border:2px solid #facc15;border-radius:12px;padding:16px 20px;margin:20px 0;text-align:center;"><span style="font-size:13px;color:#713f12;">Selected Package</span><br><strong style="font-size:22px;color:#0a0a0a;">' + esc(data.package) + '</strong></div>' : "",
    sectionTitle("What Your Proposal Includes"),
    bullets([
      "Full sponsorship package breakdown and benefits",
      "Event attendance projections and audience demographics",
      "Branding placement examples and media reach",
      "Payment schedule and contract terms",
      "Custom sponsorship options if needed"
    ]),
    data.event_interest ? infoRow("Event Interest", data.event_interest) : "",
    cta("https://wa.me/17012603908", "💬 Fast-Track via WhatsApp"),
    closingNote("Reply to this email to request a call or ask any questions.")
  ].join("");
}

function vendorHtml(name, data) {
  return [
    hero("#f97316", "🏪", "Vendor Booth Request Received"),
    greeting(name),
    '<p style="' + bodyText + '">Your vendor booth request for <strong>' + esc(data.business_name || "your business") + '</strong> has been received. Our events team will confirm your booth assignment and send payment details within <strong>24 hours</strong>.</p>',
    data.booth_count ? '<div style="background:#fff7ed;border:2px solid #f97316;border-radius:12px;padding:16px 20px;margin:20px 0;text-align:center;"><span style="font-size:13px;color:#9a3412;">Booth Selection</span><br><strong style="font-size:18px;color:#0a0a0a;">' + esc(data.booth_count) + '</strong></div>' : "",
    sectionTitle("What to Prepare"),
    bullets([
      "Business cards, banners, and branded signage",
      "Product samples or display materials",
      "A tablet or laptop for digital demos",
      "Square or Stripe card reader for on-site sales",
      "Team members (2 exhibitor badges included)"
    ]),
    data.event ? infoRow("Event", data.event) : "",
    sectionTitle("Booth Assignment Timeline"),
    timeline([
      { step: "1", label: "Confirmation",   desc: "We confirm your booth and send your invoice within 24 hours." },
      { step: "2", label: "Payment",        desc: "Complete payment to secure your spot." },
      { step: "3", label: "Setup Details",  desc: "Receive your booth number, setup time, and event guide 1 week before." },
      { step: "4", label: "Event Day",      desc: "Set up starts 2 hours before doors open. Our team will assist you." }
    ]),
    cta("https://wa.me/17012603908", "💬 WhatsApp for Fast Confirmation"),
    closingNote("Questions about your booth? Reply here or WhatsApp us.")
  ].join("");
}

function eventHtml(name, data) {
  return [
    hero("#a855f7", "🎟️", "You're Registered!"),
    greeting(name),
    '<p style="' + bodyText + '">Your RSVP for <strong>' + esc(data.event || "the Ruthko Connect Event") + '</strong> is confirmed. We\'re excited to see you there!</p>',
    data.event ? '<div style="background:#faf5ff;border:2px solid #a855f7;border-radius:12px;padding:16px 20px;margin:20px 0;text-align:center;"><span style="font-size:13px;color:#6b21a8;">Event</span><br><strong style="font-size:17px;color:#0a0a0a;">' + esc(data.event) + '</strong></div>' : "",
    sectionTitle("Event Highlights"),
    bullets([
      "Keynote speeches from industry leaders",
      "Visa-sponsored job fair with top US employers",
      "Networking lunch and evening reception",
      "Sponsor & vendor expo floor",
      "Live Q&A panels with immigration attorneys"
    ]),
    data.role      ? infoRow("Attending As", data.role)      : "",
    data.attendees ? infoRow("Attendees",    data.attendees) : "",
    sectionTitle("What to Bring"),
    tips([
      "Your confirmation email (this email) or print it out.",
      "Business cards — this is a high-value networking event.",
      "A notepad or device for taking notes.",
      "Resume/CV if you're a job seeker attending the job fair.",
      "Arrive 30 minutes early for check-in."
    ]),
    cta("https://wa.me/17012603908", "💬 Join Our Event WhatsApp Group"),
    closingNote("Ticket and venue details will be emailed 7 days before the event.")
  ].join("");
}

function invoiceHtml(name, data) {
  return [
    hero("#ec4899", "🧾", "Invoice Request Received"),
    greeting(name),
    '<p style="' + bodyText + '">Thank you for your invoice request. Our finance team will prepare and send your invoice to this email address within <strong>24 hours</strong>.</p>',
    data.package ? infoRow("Package", data.package) : "",
    sectionTitle("Payment Options We Accept"),
    bullets([
      "Bank wire transfer (ACH & international wire)",
      "Company check (made payable to Ruthko Connect LLC)",
      "Stripe secure online payment (link included in invoice)",
      "Zelle or Cashapp (for amounts under $5,000)"
    ]),
    cta("https://wa.me/17012603908", "💬 Confirm Details via WhatsApp"),
    closingNote("Reply to this email if you need to update the billing address or package.")
  ].join("");
}

function genericHtml(name) {
  return [
    hero("#facc15", "✅", "Submission Received"),
    greeting(name),
    '<p style="' + bodyText + '">Thank you for contacting <strong>Ruthko Connect</strong>. We\'ve received your submission and will get back to you within <strong>48 hours</strong>.</p>',
    cta("https://wa.me/17012603908", "💬 Reach Us on WhatsApp"),
    closingNote("We look forward to connecting with you.")
  ].join("");
}

// ── Email component helpers ────────────────────────────────────
var bodyText = "font-size:15px;color:#3f3f46;line-height:1.7;margin:0 0 16px;";

function wrap(content) {
  return [
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">',
    '<style>body{margin:0;padding:0;background:#f4f4f5;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;}</style>',
    '</head><body>',
    '<div style="max-width:560px;margin:32px auto 48px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">',
    content,
    '<div style="background:#f9f9f9;padding:20px 32px;text-align:center;border-top:1px solid #e4e4e7;">',
    '  <p style="font-size:12px;color:#a1a1aa;margin:0 0 6px;">© 2026 Ruthko Connect · <a href="https://wa.me/17012603908" style="color:#a1a1aa;">WhatsApp</a> · <a href="https://ruthko-connect.netlify.app" style="color:#a1a1aa;">Website</a></p>',
    '  <p style="font-size:11px;color:#d4d4d8;margin:0;">You\'re receiving this because you submitted a form on ruthko-connect.netlify.app</p>',
    '</div>',
    '</div></body></html>'
  ].join("\n");
}

function hero(color, emoji, title) {
  var textColor = color === "#facc15" ? "#000" : "#fff";
  return '<div style="background:#0a0a0a;padding:32px;text-align:center;">' +
    '<div style="font-size:38px;margin-bottom:12px;">' + emoji + '</div>' +
    '<div style="display:inline-block;background:' + color + ';color:' + textColor + ';padding:6px 18px;border-radius:20px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">' + esc(title) + '</div>' +
    '<div style="margin-top:10px;font-size:13px;color:#71717a;font-weight:600;">Ruthko Connect</div>' +
    '</div>';
}

function greeting(name) {
  return '<div style="padding:28px 32px 0;"><p style="font-size:20px;font-weight:800;color:#0a0a0a;margin:0 0 16px;">Hi ' + esc(firstName(name)) + ',</p></div>';
}

function sectionTitle(text) {
  return '<div style="padding:0 32px;"><p style="font-size:11px;font-weight:700;color:#a1a1aa;text-transform:uppercase;letter-spacing:1.5px;margin:24px 0 10px;">' + esc(text) + '</p></div>';
}

function timeline(steps) {
  var rows = steps.map(function (s) {
    return '<div style="display:flex;gap:14px;margin-bottom:14px;">' +
      '<div style="flex-shrink:0;width:28px;height:28px;background:#0a0a0a;color:#facc15;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;">' + s.step + '</div>' +
      '<div><div style="font-size:14px;font-weight:700;color:#0a0a0a;">' + esc(s.label) + '</div><div style="font-size:13px;color:#71717a;margin-top:2px;">' + esc(s.desc) + '</div></div>' +
      '</div>';
  }).join("");
  return '<div style="padding:0 32px;">' + rows + '</div>';
}

function bullets(items) {
  var lis = items.map(function (i) {
    return '<li style="font-size:14px;color:#3f3f46;margin-bottom:8px;line-height:1.5;">' + esc(i) + '</li>';
  }).join("");
  return '<div style="padding:0 32px;"><ul style="margin:0;padding-left:20px;">' + lis + '</ul></div>';
}

function tips(items) { return bullets(items); }

function infoRow(label, value) {
  return '<div style="padding:0 32px;"><div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f4f4f5;font-size:14px;"><span style="color:#71717a;">' + esc(label) + '</span><span style="font-weight:600;color:#0a0a0a;">' + esc(String(value)) + '</span></div></div>';
}

function cta(href, label) {
  return '<div style="padding:28px 32px 0;text-align:center;"><a href="' + href + '" style="display:inline-block;padding:14px 28px;background:#0a0a0a;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">' + esc(label) + '</a></div>';
}

function closingNote(text) {
  return '<div style="padding:20px 32px 32px;"><p style="font-size:13px;color:#a1a1aa;margin:0;text-align:center;">' + esc(text) + '</p></div>';
}

function firstName(name) {
  return String(name || "").split(" ")[0] || "there";
}

function esc(s) {
  return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function cors(status, body) {
  return {
    statusCode: status,
    headers: {
      "Content-Type":                "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":"Content-Type",
      "Access-Control-Allow-Methods":"POST, OPTIONS"
    },
    body: body
  };
}
