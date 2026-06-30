// Phase 27: Create CRM automation tasks in Supabase after form submission
// Called server-side only — uses service-role key, never exposed to browser.

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

function hoursFromNow(h) {
  const d = new Date();
  d.setHours(d.getHours() + (Number(h) || 0));
  return d.toISOString();
}

// Default automation rules — supplemented by rules stored in crm_automation_rules table
const DEFAULT_RULES = [
  { rule_name: 'Job seeker follow-up', trigger_type: 'form_submit', submission_type: 'job_seeker', action_type: 'create_task', delay_hours: 24, template_key: 'applicant_confirmation' },
  { rule_name: 'Employer priority follow-up', trigger_type: 'form_submit', submission_type: 'employer', action_type: 'create_task', delay_hours: 4, template_key: 'employer_confirmation' },
  { rule_name: 'Sponsor partnership follow-up', trigger_type: 'form_submit', submission_type: 'sponsor', action_type: 'create_task', delay_hours: 24, template_key: 'sponsor_confirmation' },
  { rule_name: 'Partner outreach follow-up', trigger_type: 'form_submit', submission_type: 'partner', action_type: 'create_task', delay_hours: 48, template_key: 'partner_confirmation' },
  { rule_name: 'Volunteer coordinator follow-up', trigger_type: 'form_submit', submission_type: 'volunteer', action_type: 'create_task', delay_hours: 48, template_key: 'volunteer_confirmation' },
  { rule_name: 'RSVP event check-in prep', trigger_type: 'form_submit', submission_type: 'event_rsvp', action_type: 'create_task', delay_hours: 24, template_key: 'rsvp_confirmation' }
];

async function supabaseInsert(tableName, records) {
  const base = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!base || !key) throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');

  const res = await fetch(`${base}/rest/v1/${tableName}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(records)
  });
  const data = await res.json().catch(() => []);
  if (!res.ok) throw new Error(`Supabase ${tableName} insert failed: ${JSON.stringify(data)}`);
  return Array.isArray(data) ? data : [data];
}

async function getActiveRules(submissionType) {
  const base = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!base || !key) return DEFAULT_RULES.filter(r => r.submission_type === submissionType);

  try {
    const res = await fetch(`${base}/rest/v1/crm_automation_rules?is_active=eq.true&submission_type=eq.${encodeURIComponent(submissionType)}&select=*`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }
    });
    if (!res.ok) return DEFAULT_RULES.filter(r => r.submission_type === submissionType);
    const rows = await res.json().catch(() => []);
    // Merge DB rules with defaults (DB wins; if DB empty, use defaults)
    return rows.length > 0 ? rows : DEFAULT_RULES.filter(r => r.submission_type === submissionType);
  } catch (_) {
    return DEFAULT_RULES.filter(r => r.submission_type === submissionType);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(200, { ok: true });
  if (event.httpMethod !== 'POST') return jsonResponse(405, { ok: false, error: 'Method not allowed' });

  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch (_) { return jsonResponse(400, { ok: false, error: 'Invalid JSON' }); }

  const submissionId = clean(payload.submissionId);
  const submissionType = clean(payload.submissionType);
  const contactId = clean(payload.contactId) || null;

  if (!submissionType) return jsonResponse(400, { ok: false, error: 'submissionType is required' });

  // Load applicable rules
  const rules = await getActiveRules(submissionType);
  if (!rules.length) {
    return jsonResponse(200, { ok: true, tasksCreated: 0, message: 'No active rules for this submission type.' });
  }

  // Build task records
  const tasks = rules
    .filter(r => r.action_type === 'create_task')
    .map(r => ({
      rule_id: r.id || null,
      submission_id: submissionId || null,
      contact_id: contactId || null,
      task_type: r.template_key || r.rule_name || 'follow_up',
      status: 'pending',
      due_at: hoursFromNow(r.delay_hours || 24),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

  if (!tasks.length) {
    return jsonResponse(200, { ok: true, tasksCreated: 0 });
  }

  try {
    const created = await supabaseInsert('crm_automation_tasks', tasks);
    return jsonResponse(200, { ok: true, tasksCreated: created.length, tasks: created });
  } catch (err) {
    console.error('[process-crm-automation] Error:', err.message);
    // Don't fail the caller — task creation is non-critical
    return jsonResponse(200, { ok: true, tasksCreated: 0, warning: err.message });
  }
};
