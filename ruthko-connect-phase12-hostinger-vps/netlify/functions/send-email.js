// Phase 27: Unified email sender for public form confirmations and admin notifications
// Supports: Resend (default), SendGrid, Mailgun — set EMAIL_PROVIDER env var
// No API keys are ever sent to the browser; all secrets live server-side only.

const RESEND_URL = 'https://api.resend.com/emails';
const SENDGRID_URL = 'https://api.sendgrid.com/v3/mail/send';

function jsonResponse(code, body) {
  return {
    statusCode: code,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

function clean(v) { return String(v || '').replace(/[<>]/g, '').trim(); }

function esc(v) {
  return clean(v)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

// ── HTML template generators ─────────────────────────────────────────────────

function wrapEmail(bodyHtml) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 16px;">
<table width="100%" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
<tr><td style="background:#000000;padding:24px 32px;">
<span style="color:#facc15;font-size:22px;font-weight:bold;letter-spacing:-0.5px;">Ruthko Connect</span>
<span style="color:#9ca3af;font-size:13px;display:block;margin-top:4px;">Staffing · Events · Partnerships</span>
</td></tr>
<tr><td style="padding:32px;">${bodyHtml}</td></tr>
<tr><td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;">
<p style="margin:0;font-size:12px;color:#6b7280;">Ruthko Connect · info@ruthkojobs.com · ruthkojobs.com</p>
<p style="margin:6px 0 0;font-size:12px;color:#6b7280;">You received this because you submitted a form on our website.</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

function field(label, value) {
  if (!clean(value)) return '';
  return `<tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;color:#374151;width:40%;white-space:nowrap;">${esc(label)}</td><td style="padding:8px 12px;border:1px solid #e5e7eb;color:#111827;">${esc(value)}</td></tr>`;
}

function buildApplicantConfirmation(s) {
  const name = clean(s.first_name || 'there');
  const d = s.details_json || {};
  const html = `
<h2 style="margin:0 0 8px;color:#111827;font-size:22px;">Application Received ✅</h2>
<p style="margin:0 0 20px;color:#6b7280;font-size:15px;">Your job seeker application has been received.</p>
<p style="color:#374151;margin:0 0 20px;">Hello ${esc(name)},</p>
<p style="color:#374151;margin:0 0 20px;">Thank you for applying through Ruthko Connect. A recruiter will review your application and reach out within 2–3 business days.</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
${field('Name', `${s.first_name} ${s.last_name}`)}
${field('Email', s.email)}
${field('Phone', s.phone)}
${field('Location', [s.city, s.state, s.country].filter(Boolean).join(', '))}
${field('Job Type', d.desired_job_type)}
${field('Experience', d.experience_level)}
${field('Available', d.availability_date)}
</table>
<p style="color:#374151;margin:0 0 16px;"><strong>Next steps:</strong></p>
<ul style="color:#374151;padding-left:20px;margin:0 0 24px;">
<li style="margin-bottom:8px;">Prepare your resume and any relevant certifications.</li>
<li style="margin-bottom:8px;">Watch your inbox for a follow-up from a Ruthko recruiter.</li>
<li style="margin-bottom:8px;">Questions? Reply to this email or call +1-701-260-3908.</li>
</ul>
<a href="{{site_url}}/jobs.html" style="display:inline-block;background:#facc15;color:#000;font-weight:bold;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;">Browse Open Positions →</a>`;
  return { html: wrapEmail(html), subject: `Ruthko Connect — Application Received (${clean(s.first_name)} ${clean(s.last_name)})` };
}

function buildEmployerConfirmation(s) {
  const name = clean(s.first_name || 'there');
  const d = s.details_json || {};
  const html = `
<h2 style="margin:0 0 8px;color:#111827;font-size:22px;">Staffing Request Received ✅</h2>
<p style="margin:0 0 20px;color:#6b7280;font-size:15px;">Your employer staffing request has been received.</p>
<p style="color:#374151;margin:0 0 20px;">Hello ${esc(name)},</p>
<p style="color:#374151;margin:0 0 20px;">Thank you for choosing Ruthko Connect for your staffing needs. Our team will review your request and follow up within 1 business day.</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
${field('Company', s.organization_name)}
${field('Contact', `${s.first_name} ${s.last_name}`)}
${field('Email', s.email)}
${field('Role Needed', d.hiring_needs)}
${field('Workers', d.workers_needed)}
${field('Location', d.job_location)}
${field('Start Date', d.start_date)}
${field('Pay Range', d.pay_range)}
</table>
<p style="color:#374151;margin:0 0 16px;"><strong>What happens next:</strong></p>
<ul style="color:#374151;padding-left:20px;margin:0 0 24px;">
<li style="margin-bottom:8px;">A Ruthko staffing coordinator will review your requirements.</li>
<li style="margin-bottom:8px;">We will confirm role fit and candidate availability.</li>
<li style="margin-bottom:8px;">You will receive candidate profiles or a follow-up call within 1 business day.</li>
</ul>
<a href="{{site_url}}/intake.html" style="display:inline-block;background:#facc15;color:#000;font-weight:bold;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;">Contact Ruthko →</a>`;
  return { html: wrapEmail(html), subject: `Ruthko Connect — Staffing Request Received (${clean(s.organization_name || s.first_name)})` };
}

function buildSponsorConfirmation(s) {
  const name = clean(s.first_name || 'there');
  const d = s.details_json || {};
  const html = `
<h2 style="margin:0 0 8px;color:#111827;font-size:22px;">Sponsor Application Received ✅</h2>
<p style="margin:0 0 20px;color:#6b7280;font-size:15px;">Your sponsor application has been received.</p>
<p style="color:#374151;margin:0 0 20px;">Hello ${esc(name)},</p>
<p style="color:#374151;margin:0 0 20px;">Thank you for your interest in sponsoring Ruthko Connect events and programs. Our partnerships team will review your application and reach out within 2 business days.</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
${field('Organization', s.organization_name)}
${field('Contact', `${s.first_name} ${s.last_name}`)}
${field('Email', s.email)}
${field('Sponsor Level', d.sponsor_level)}
${field('Budget Range', d.budget_range)}
${field('Event Interest', d.event_interest)}
</table>
<p style="color:#374151;margin:0 0 24px;">We look forward to building a great partnership with you.</p>
<a href="{{site_url}}/sponsors.html" style="display:inline-block;background:#facc15;color:#000;font-weight:bold;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;">View Sponsorship Packages →</a>`;
  return { html: wrapEmail(html), subject: `Ruthko Connect — Sponsor Application Received (${clean(s.organization_name || s.first_name)})` };
}

function buildPartnerConfirmation(s) {
  const name = clean(s.first_name || 'there');
  const d = s.details_json || {};
  const html = `
<h2 style="margin:0 0 8px;color:#111827;font-size:22px;">Partner Application Received ✅</h2>
<p style="margin:0 0 20px;color:#6b7280;font-size:15px;">Your partner application has been received.</p>
<p style="color:#374151;margin:0 0 20px;">Hello ${esc(name)},</p>
<p style="color:#374151;margin:0 0 20px;">Thank you for your interest in partnering with Ruthko Connect. Our team will review your application and reach out soon to discuss collaboration opportunities.</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
${field('Organization', s.organization_name)}
${field('Contact', `${s.first_name} ${s.last_name}`)}
${field('Email', s.email)}
${field('Partnership Type', d.partnership_type)}
${field('Target Audience', d.target_audience)}
${field('Website', d.website)}
</table>
<a href="{{site_url}}/partners.html" style="display:inline-block;background:#facc15;color:#000;font-weight:bold;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;">Learn About Partners →</a>`;
  return { html: wrapEmail(html), subject: `Ruthko Connect — Partner Application Received (${clean(s.organization_name || s.first_name)})` };
}

function buildVolunteerConfirmation(s) {
  const name = clean(s.first_name || 'there');
  const d = s.details_json || {};
  const html = `
<h2 style="margin:0 0 8px;color:#111827;font-size:22px;">Volunteer Application Received ✅</h2>
<p style="margin:0 0 20px;color:#6b7280;font-size:15px;">Thank you for volunteering with Ruthko Connect.</p>
<p style="color:#374151;margin:0 0 20px;">Hello ${esc(name)},</p>
<p style="color:#374151;margin:0 0 20px;">Your volunteer application has been received. A Ruthko coordinator will review your interests and reach out with upcoming volunteer opportunities.</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
${field('Name', `${s.first_name} ${s.last_name}`)}
${field('Email', s.email)}
${field('Role Interest', d.volunteer_role)}
${field('Availability', d.availability)}
${field('Skills', d.skills)}
</table>
<a href="{{site_url}}/events.html" style="display:inline-block;background:#facc15;color:#000;font-weight:bold;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;">See Upcoming Events →</a>`;
  return { html: wrapEmail(html), subject: `Ruthko Connect — Volunteer Application Received (${clean(s.first_name)} ${clean(s.last_name)})` };
}

function buildRsvpConfirmation(s) {
  const name = clean(s.first_name || 'there');
  const d = s.details_json || {};
  const html = `
<h2 style="margin:0 0 8px;color:#111827;font-size:22px;">RSVP Confirmed 🎉</h2>
<p style="margin:0 0 20px;color:#6b7280;font-size:15px;">You're registered for a Ruthko Connect event.</p>
<p style="color:#374151;margin:0 0 20px;">Hello ${esc(name)},</p>
<p style="color:#374151;margin:0 0 20px;">Your RSVP has been confirmed. We'll send event details, location, and any updates to this email address.</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
${field('Event', d.event_name)}
${field('Attendee', `${s.first_name} ${s.last_name}`)}
${field('Email', s.email)}
${field('Guests', d.guests)}
${field('Attendance', d.attendance_type)}
${field('Organization', s.organization_name)}
</table>
<p style="color:#374151;margin:0 0 24px;">Questions? Reply to this email or call +1-701-260-3908.</p>
<a href="{{site_url}}/events.html" style="display:inline-block;background:#facc15;color:#000;font-weight:bold;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;">See More Events →</a>`;
  return { html: wrapEmail(html), subject: `Ruthko Connect — RSVP Confirmed: ${clean(d.event_name || 'Upcoming Event')}` };
}

function buildAdminNotification(s, crmUrl) {
  const typeLabels = {
    job_seeker: 'Job Seeker Application', employer: 'Employer Staffing Request',
    sponsor: 'Sponsor Application', partner: 'Partner Application',
    volunteer: 'Volunteer Application', event_rsvp: 'Event RSVP', general: 'General Inquiry'
  };
  const typeLabel = typeLabels[s.submission_type] || clean(s.submission_type);
  const submittedAt = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
  const d = s.details_json || {};
  const html = `
<h2 style="margin:0 0 8px;color:#111827;font-size:20px;">New Intake Submission: ${esc(typeLabel)}</h2>
<p style="margin:0 0 20px;color:#6b7280;font-size:14px;">Submitted ${esc(submittedAt)} Eastern</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
${field('Type', typeLabel)}
${field('Name', `${s.first_name} ${s.last_name}`)}
${field('Email', s.email)}
${field('Phone', s.phone)}
${field('Organization', s.organization_name)}
${field('City / State', [s.city, s.state, s.country].filter(Boolean).join(', '))}
${field('Language', s.preferred_language)}
${field('Source Page', s.source_page)}
${field('Priority', s.priority)}
${d.event_name ? field('Event', d.event_name) : ''}
${d.hiring_needs ? field('Role Needed', d.hiring_needs) : ''}
${d.sponsor_level ? field('Sponsor Level', d.sponsor_level) : ''}
${d.partnership_type ? field('Partnership Type', d.partnership_type) : ''}
</table>
${s.message ? `<p style="margin:0 0 8px;font-weight:600;color:#374151;">Message:</p><p style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;color:#374151;white-space:pre-wrap;">${esc(s.message)}</p>` : ''}
<a href="${esc(crmUrl)}" style="display:inline-block;background:#facc15;color:#000;font-weight:bold;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;margin-top:16px;">Open CRM Intake Queue →</a>`;
  return { html: wrapEmail(html), subject: `[Ruthko] New ${typeLabel}: ${clean(s.first_name)} ${clean(s.last_name)}` };
}

// ── Email sending via Resend ─────────────────────────────────────────────────

async function sendViaResend({ apiKey, from, to, subject, html }) {
  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || `Resend ${res.status}`);
  return { messageId: data.id || null };
}

async function sendViaSendGrid({ apiKey, from, to, subject, html }) {
  const res = await fetch(SENDGRID_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject,
      content: [{ type: 'text/html', value: html }]
    })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data.errors && data.errors[0] && data.errors[0].message) || `SendGrid ${res.status}`);
  }
  return { messageId: res.headers.get('x-message-id') || null };
}

// ── Main handler ─────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(200, { ok: true });
  if (event.httpMethod !== 'POST') return jsonResponse(405, { ok: false, error: 'Method not allowed' });

  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch (_) { return jsonResponse(400, { ok: false, error: 'Invalid JSON' }); }

  const emailType = clean(payload.emailType);
  const submission = payload.submission || {};

  if (!emailType) return jsonResponse(400, { ok: false, error: 'emailType is required' });

  // Key resolution — spec vars take priority, then fall back to existing project vars
  const provider = clean(process.env.EMAIL_PROVIDER || process.env.RESEND_API_KEY ? 'resend' : 'console').toLowerCase() || 'resend';
  const apiKey = process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY || '';
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.RUTHKO_AUTOREPLY_FROM || 'Ruthko Connect <onboarding@resend.dev>';
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.RUTHKO_NOTIFY_TO || 'info@ruthkojobs.com';
  const siteUrl = clean(process.env.PUBLIC_SITE_URL || process.env.URL || 'https://ruthkojobs.com');

  // No API key — log and skip gracefully (don't fail the form submission)
  if (!apiKey) {
    console.log(`[send-email] API key not set — skipping ${emailType} for ${clean(submission.email)}`);
    return jsonResponse(200, { ok: true, skipped: true, reason: 'Email API key not configured.' });
  }

  // Build email content based on type
  let emailContent;
  const crmUrl = `${siteUrl}/crm.html#intake`;

  try {
    switch (emailType) {
      case 'applicant_confirmation':   emailContent = buildApplicantConfirmation(submission); break;
      case 'employer_confirmation':    emailContent = buildEmployerConfirmation(submission); break;
      case 'sponsor_confirmation':     emailContent = buildSponsorConfirmation(submission); break;
      case 'partner_confirmation':     emailContent = buildPartnerConfirmation(submission); break;
      case 'volunteer_confirmation':   emailContent = buildVolunteerConfirmation(submission); break;
      case 'rsvp_confirmation':        emailContent = buildRsvpConfirmation(submission); break;
      case 'admin_notification':       emailContent = buildAdminNotification(submission, crmUrl); break;
      default:
        return jsonResponse(400, { ok: false, error: `Unknown emailType: ${emailType}` });
    }
  } catch (err) {
    return jsonResponse(500, { ok: false, error: `Template error: ${err.message}` });
  }

  // Inject site URL into template
  emailContent.html = emailContent.html.replace(/\{\{site_url\}\}/g, siteUrl);

  // Determine recipient
  const isAdminEmail = emailType === 'admin_notification';
  const recipient = isAdminEmail ? adminEmail : clean(submission.email);

  if (!recipient || !recipient.includes('@')) {
    return jsonResponse(200, { ok: true, skipped: true, reason: 'No valid recipient email.' });
  }

  // Send
  try {
    let result;
    if (provider === 'sendgrid') {
      result = await sendViaSendGrid({ apiKey, from: fromAddress, to: recipient, ...emailContent });
    } else {
      result = await sendViaResend({ apiKey, from: fromAddress, to: recipient, ...emailContent });
    }
    return jsonResponse(200, { ok: true, messageId: result.messageId, subject: emailContent.subject });
  } catch (err) {
    console.error(`[send-email] Provider error (${emailType}):`, err.message);
    return jsonResponse(502, { ok: false, error: err.message });
  }
};
