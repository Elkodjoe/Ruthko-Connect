function htmlResponse(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body
  };
}

function clean(value) {
  return String(value || '').replace(/[<>]/g, '').trim();
}

exports.handler = async (event) => {
  const url = new URL(event.rawUrl || `https://example.com${event.path || ''}`);
  const email = clean(url.searchParams.get('email'));
  const lead = clean(url.searchParams.get('lead'));

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey && email) {
    try {
      const filters = lead ? `id=eq.${encodeURIComponent(lead)}` : `email=eq.${encodeURIComponent(email)}`;
      await fetch(`${supabaseUrl}/rest/v1/leads?${filters}`, {
        method: 'PATCH',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({ marketing_consent: false, marketing_status: 'Unsubscribed', updated_at: new Date().toISOString() })
      });
    } catch (error) {
      console.error(error);
    }
  }

  return htmlResponse(200, `
    <!DOCTYPE html>
    <html lang="en">
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Unsubscribed</title></head>
      <body style="font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;">
        <main style="max-width:560px;background:#18181b;border:1px solid #27272a;border-radius:24px;padding:32px;text-align:center;">
          <h1 style="color:#facc15;margin-top:0;">You are unsubscribed</h1>
          <p style="color:#d4d4d8;">You will no longer receive Ruthko Connect campaign emails at ${email || 'this email address'}.</p>
          <p style="color:#a1a1aa;font-size:14px;">For questions, contact info@ruthkojobs.com.</p>
        </main>
      </body>
    </html>
  `);
};
