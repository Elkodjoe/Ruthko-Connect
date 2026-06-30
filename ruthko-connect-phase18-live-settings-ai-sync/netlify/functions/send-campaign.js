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

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function isEligible(recipient) {
  const status = clean(recipient.marketing_status || '').toLowerCase();
  return validEmail(recipient.email) && recipient.marketing_consent === true && status !== 'unsubscribed' && status !== 'suppressed';
}

function buildHtml(campaign, recipient) {
  const body = escapeHtml(campaign.body_text || campaign.body_html || '').replace(/<br>/g, '<br>');
  const name = clean(recipient.contact_person || recipient.name || 'there');
  const unsubscribeBase = process.env.RUTHKO_UNSUBSCRIBE_BASE_URL || '';
  const unsubscribeLink = unsubscribeBase ? `${unsubscribeBase}?email=${encodeURIComponent(recipient.email)}&lead=${encodeURIComponent(recipient.id || '')}` : '';

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:680px;margin:0 auto;">
      <p style="margin:0 0 18px;">Hello ${escapeHtml(name)},</p>
      <div>${body}</div>
      <p style="margin-top:24px;">Best,<br>Ruthko Connect</p>
      <hr style="margin:28px 0;border:none;border-top:1px solid #e5e7eb;" />
      <p style="font-size:12px;color:#6b7280;margin:0;">Ruthko Connect · www.ruthkojobs.com · www.ruthkoevents.com · info@ruthkojobs.com</p>
      ${unsubscribeLink ? `<p style="font-size:12px;color:#6b7280;margin-top:10px;"><a href="${unsubscribeLink}" style="color:#6b7280;">Unsubscribe</a></p>` : ''}
    </div>
  `;
}

async function sendOne(apiKey, from, replyTo, campaign, recipient) {
  const payload = {
    from,
    to: [recipient.email],
    subject: clean(campaign.subject),
    html: buildHtml(campaign, recipient),
    text: `${clean(campaign.body_text || '')}\n\nRuthko Connect\nwww.ruthkojobs.com\nwww.ruthkoevents.com\ninfo@ruthkojobs.com`,
    reply_to: replyTo
  };

  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || 'Resend request failed');
  }

  return response.json();
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(200, { ok: true });
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RUTHKO_CAMPAIGN_FROM || process.env.RUTHKO_AUTOREPLY_FROM || 'Ruthko Connect <onboarding@resend.dev>';
  const replyTo = process.env.RUTHKO_REPLY_TO || 'info@ruthkojobs.com';

  if (!apiKey) return jsonResponse(500, { error: 'Missing RESEND_API_KEY' });

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const campaign = payload.campaign || {};
  const recipients = Array.isArray(payload.recipients) ? payload.recipients : [];

  if (!clean(campaign.subject) || !clean(campaign.body_text || campaign.body_html)) {
    return jsonResponse(400, { error: 'Campaign subject and body are required' });
  }

  const unique = new Map();
  recipients.filter(isEligible).forEach((recipient) => {
    const email = clean(recipient.email).toLowerCase();
    if (!unique.has(email)) unique.set(email, { ...recipient, email });
  });

  const eligibleRecipients = Array.from(unique.values()).slice(0, 100);
  if (!eligibleRecipients.length) return jsonResponse(400, { error: 'No eligible recipients' });

  let sent = 0;
  const failed = [];

  for (const recipient of eligibleRecipients) {
    try {
      await sendOne(apiKey, from, replyTo, campaign, recipient);
      sent += 1;
    } catch (error) {
      failed.push({ email: recipient.email, error: error.message });
    }
  }

  return jsonResponse(200, {
    ok: true,
    sent,
    failed,
    skipped: recipients.length - eligibleRecipients.length,
    limit: 100
  });
};
