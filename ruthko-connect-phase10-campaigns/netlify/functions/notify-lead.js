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

function buildEmail(payload) {
  const lead = payload.lead || {};
  const formType = clean(payload.formType || lead.lead_type || 'lead');
  const submittedAt = new Date().toLocaleString('en-US', { timeZone: 'America/Denver' });
  const subject = `New Ruthko ${clean(lead.lead_type || formType)} lead: ${clean(lead.name || 'New lead')}`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:680px;margin:0 auto;">
      <h2 style="margin:0 0 16px;color:#111827;">New Ruthko Connect Lead</h2>
      <p style="margin:0 0 20px;color:#4b5563;">A new public form was submitted and saved to your CRM.</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;">
        <tr><td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold;">Lead type</td><td style="padding:10px;border:1px solid #e5e7eb;">${escapeHtml(lead.lead_type || formType)}</td></tr>
        <tr><td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold;">Name</td><td style="padding:10px;border:1px solid #e5e7eb;">${escapeHtml(lead.name)}</td></tr>
        <tr><td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold;">Contact person</td><td style="padding:10px;border:1px solid #e5e7eb;">${escapeHtml(lead.contact_person)}</td></tr>
        <tr><td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold;">Email</td><td style="padding:10px;border:1px solid #e5e7eb;">${escapeHtml(lead.email)}</td></tr>
        <tr><td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold;">Phone</td><td style="padding:10px;border:1px solid #e5e7eb;">${escapeHtml(lead.phone)}</td></tr>
        <tr><td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold;">Value</td><td style="padding:10px;border:1px solid #e5e7eb;">${money(lead.value)}</td></tr>
        <tr><td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold;">Source</td><td style="padding:10px;border:1px solid #e5e7eb;">${escapeHtml(lead.source)}</td></tr>
        <tr><td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold;">Submitted</td><td style="padding:10px;border:1px solid #e5e7eb;">${escapeHtml(submittedAt)} Mountain Time</td></tr>
        <tr><td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold;vertical-align:top;">Notes</td><td style="padding:10px;border:1px solid #e5e7eb;">${escapeHtml(lead.notes)}</td></tr>
      </table>
      <p style="margin-top:20px;color:#4b5563;">Open the Ruthko Connect CRM to follow up.</p>
    </div>
  `;

  const text = [
    'New Ruthko Connect Lead',
    `Lead type: ${clean(lead.lead_type || formType)}`,
    `Name: ${clean(lead.name)}`,
    `Contact person: ${clean(lead.contact_person)}`,
    `Email: ${clean(lead.email)}`,
    `Phone: ${clean(lead.phone)}`,
    `Value: ${money(lead.value)}`,
    `Source: ${clean(lead.source)}`,
    `Submitted: ${submittedAt} Mountain Time`,
    `Notes: ${clean(lead.notes)}`
  ].join('\n');

  return { subject, html, text };
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

  const apiKey = process.env.RESEND_API_KEY;
  const notifyTo = process.env.RUTHKO_NOTIFY_TO || 'info@ruthkojobs.com';
  const notifyFrom = process.env.RUTHKO_NOTIFY_FROM || 'Ruthko Connect <onboarding@resend.dev>';

  if (!apiKey) {
    return jsonResponse(200, {
      ok: true,
      skipped: true,
      reason: 'RESEND_API_KEY is not set. Lead was saved, email was skipped.'
    });
  }

  const email = buildEmail(payload);

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: notifyFrom,
        to: [notifyTo],
        subject: email.subject,
        html: email.html,
        text: email.text
      })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return jsonResponse(502, { ok: false, error: 'Resend email failed', details: result });
    }

    return jsonResponse(200, { ok: true, emailId: result.id || null });
  } catch (error) {
    return jsonResponse(500, { ok: false, error: error.message || 'Email notification failed' });
  }
};
