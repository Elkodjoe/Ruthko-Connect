const RESEND_ENDPOINT = 'https://api.resend.com/emails';

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

function clean(value) {
  return String(value || '').replace(/[<>]/g, '').trim();
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

function money(value) {
  const amount = Number(value || 0);
  if (!amount) return '$0';
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function baseTemplate({ heading, intro, nextSteps, lead, replyTo }) {
  const safeName = escapeHtml(lead.contact_person || lead.name || 'there');
  const listItems = nextSteps.map((step) => `<li style="margin:0 0 8px;">${escapeHtml(step)}</li>`).join('');
  const textSteps = nextSteps.map((step) => `- ${clean(step)}`).join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#111827;max-width:680px;margin:0 auto;">
      <h2 style="margin:0 0 14px;color:#111827;">${escapeHtml(heading)}</h2>
      <p style="margin:0 0 16px;">Hello ${safeName},</p>
      <p style="margin:0 0 18px;color:#374151;">${escapeHtml(intro)}</p>
      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:18px 0;background:#f9fafb;">
        <p style="font-weight:bold;margin:0 0 10px;">Your submission summary</p>
        <p style="margin:0 0 6px;"><strong>Name:</strong> ${escapeHtml(lead.name)}</p>
        <p style="margin:0 0 6px;"><strong>Email:</strong> ${escapeHtml(lead.email)}</p>
        <p style="margin:0 0 6px;"><strong>Phone:</strong> ${escapeHtml(lead.phone)}</p>
        <p style="margin:0;"><strong>Interest:</strong> ${escapeHtml(lead.source || lead.lead_type)}</p>
      </div>
      <p style="font-weight:bold;margin:18px 0 10px;">Next steps</p>
      <ul style="padding-left:20px;margin:0 0 18px;color:#374151;">${listItems}</ul>
      <p style="margin:18px 0 6px;color:#374151;">Questions? Reply to this email or contact ${escapeHtml(replyTo)}.</p>
      <p style="margin:20px 0 0;color:#111827;font-weight:bold;">Ruthko Connect</p>
    </div>
  `;

  const text = [
    heading,
    `Hello ${clean(lead.contact_person || lead.name || 'there')},`,
    clean(intro),
    '',
    'Your submission summary',
    `Name: ${clean(lead.name)}`,
    `Email: ${clean(lead.email)}`,
    `Phone: ${clean(lead.phone)}`,
    `Interest: ${clean(lead.source || lead.lead_type)}`,
    '',
    'Next steps',
    textSteps,
    '',
    `Questions? Reply to this email or contact ${clean(replyTo)}.`,
    'Ruthko Connect'
  ].join('\n');

  return { html, text };
}

function buildAutoReply(payload, replyTo) {
  const lead = payload.lead || {};
  const type = clean(payload.formType || lead.lead_type || '').toLowerCase();
  const name = clean(lead.name || 'your submission');

  if (type === 'employer') {
    const content = baseTemplate({
      heading: 'Thank you for your staffing request',
      intro: 'We received your employer staffing request. Ruthko Connect will review your workforce needs and prepare the next follow-up step.',
      nextSteps: [
        'We will review your company, location, industry, and staffing need.',
        'We will confirm the role types, expected start date, and sponsorship fit if needed.',
        'A Ruthko team member will follow up with next steps.'
      ],
      lead,
      replyTo
    });
    return { subject: `Ruthko Connect received your staffing request: ${name}`, ...content };
  }

  if (type === 'candidate') {
    const content = baseTemplate({
      heading: 'Thank you for your candidate interest form',
      intro: 'We received your candidate interest form. Ruthko Connect will review your profession, experience, country, and visa interest.',
      nextSteps: [
        'Prepare your resume or CV.',
        'Keep copies of licenses, certifications, passport details, and work history ready.',
        'A Ruthko team member will follow up with screening steps.'
      ],
      lead,
      replyTo
    });
    return { subject: `Ruthko Connect received your candidate form: ${name}`, ...content };
  }

  if (type === 'sponsor') {
    const packageText = clean(lead.notes || '').match(/Package:\s*([^\n]+)/i);
    const packageName = packageText ? packageText[1] : 'your selected sponsorship package';
    const amount = money(lead.value);
    const content = baseTemplate({
      heading: 'Thank you for your sponsor interest',
      intro: `We received your sponsor interest for ${packageName}. Current estimated package value: ${amount}.`,
      nextSteps: [
        'We will review your sponsorship goals and visibility needs.',
        'We will send payment, invoice, or proposal instructions based on your selection.',
        'A Ruthko team member will follow up with sponsor onboarding steps.'
      ],
      lead,
      replyTo
    });
    return { subject: `Ruthko Connect sponsor interest received: ${name}`, ...content };
  }

  if (type === 'vendor') {
    const content = baseTemplate({
      heading: 'Thank you for your vendor booth request',
      intro: 'We received your vendor booth request. Ruthko Connect will review your product or service and booth needs.',
      nextSteps: [
        'We will check booth availability and event fit.',
        'We will send booth payment or invoice instructions.',
        'A Ruthko team member will follow up with vendor onboarding steps.'
      ],
      lead,
      replyTo
    });
    return { subject: `Ruthko Connect vendor booth request received: ${name}`, ...content };
  }

  if (type === 'event') {
    const content = baseTemplate({
      heading: 'Thank you for your event RSVP',
      intro: 'We received your event RSVP. Ruthko Connect will review your event interest and attendee type.',
      nextSteps: [
        'We will confirm event details and registration status.',
        'Watch for any ticket, agenda, or venue updates.',
        'A Ruthko team member will follow up if more information is needed.'
      ],
      lead,
      replyTo
    });
    return { subject: `Ruthko Connect event RSVP received: ${name}`, ...content };
  }

  const content = baseTemplate({
    heading: 'Thank you for contacting Ruthko Connect',
    intro: 'We received your submission and saved it for review.',
    nextSteps: [
      'We will review your information.',
      'A Ruthko team member will follow up with next steps.'
    ],
    lead,
    replyTo
  });
  return { subject: `Ruthko Connect received your submission: ${name}`, ...content };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(200, { ok: true });
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'Method not allowed' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return jsonResponse(400, { ok: false, error: 'Invalid JSON body' });
  }

  const lead = payload.lead || {};
  const recipient = clean(lead.email);
  if (!recipient || !recipient.includes('@')) {
    return jsonResponse(200, { ok: true, skipped: true, reason: 'No valid recipient email on lead.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const replyTo = process.env.RUTHKO_REPLY_TO || process.env.RUTHKO_NOTIFY_TO || 'info@ruthkojobs.com';
  const from = process.env.RUTHKO_AUTOREPLY_FROM || process.env.RUTHKO_NOTIFY_FROM || 'Ruthko Connect <onboarding@resend.dev>';

  if (!apiKey) {
    return jsonResponse(200, {
      ok: true,
      skipped: true,
      reason: 'RESEND_API_KEY is not set. Lead was saved, auto-reply was skipped.'
    });
  }

  const email = buildAutoReply(payload, replyTo);

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        reply_to: replyTo,
        subject: email.subject,
        html: email.html,
        text: email.text
      })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return jsonResponse(502, { ok: false, error: 'Resend auto-reply failed', details: result });
    }

    return jsonResponse(200, { ok: true, emailId: result.id || null });
  } catch (error) {
    return jsonResponse(500, { ok: false, error: error.message || 'Auto-reply failed' });
  }
};
