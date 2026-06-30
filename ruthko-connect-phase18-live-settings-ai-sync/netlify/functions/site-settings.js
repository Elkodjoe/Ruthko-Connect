const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const DEFAULT_SETTINGS = {
  contactEmail: 'info@ruthkojobs.com',
  contactPhone1: '+1-701-260-3908',
  contactPhone2: '+1-240-486-5002',
  contactWebsite: 'https://ruthkojobs.com',
  footerMessage: 'Staffing, event organizing, sponsorship, vendors, and partnerships.',
  eventHeadline: 'Ruthko Events and Business Programs',
  eventSubtitle: 'Professional event organizing for summits, vendor programs, sponsor activations, cultural exchanges, and business networking.',
  eventCtaLink: 'intake.html#event',
  eventBannerUrl: 'images/logo.png'
};

const DEFAULT_EMAILS = [
  { template_key: 'employer', trigger_name: 'New employer staffing request', is_active: true, subject: 'Thank you for your staffing request', body: 'Hello {{name}},\n\nThank you for contacting Ruthko. We received your staffing request and our team will review your worker needs, timeline, and next steps.\n\nBest,\nRuthko Connect' },
  { template_key: 'candidate', trigger_name: 'New candidate interest', is_active: true, subject: 'Ruthko received your candidate interest form', body: 'Hello {{name}},\n\nThank you for your interest. Please prepare your resume, credentials, and work authorization details for review.\n\nBest,\nRuthko Connect' },
  { template_key: 'sponsor', trigger_name: 'New sponsor inquiry', is_active: true, subject: 'Thank you for your Ruthko sponsorship interest', body: 'Hello {{name}},\n\nThank you for your sponsorship interest. We will share package details, event visibility options, and the next sponsor call path.\n\nBest,\nRuthko Connect' },
  { template_key: 'vendor', trigger_name: 'New vendor booth request', is_active: true, subject: 'Ruthko received your vendor booth request', body: 'Hello {{name}},\n\nThank you for your booth request. We will review booth availability, payment details, and event setup instructions.\n\nBest,\nRuthko Connect' },
  { template_key: 'event', trigger_name: 'New event RSVP', is_active: true, subject: 'Your Ruthko event RSVP was received', body: 'Hello {{name}},\n\nThank you for your RSVP. We will send event details, check-in instructions, and updates as the date approaches.\n\nBest,\nRuthko Connect' }
];

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'site-settings.json');

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-settings-token',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Content-Type': 'application/json'
  };
}

function json(statusCode, payload) {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(payload) };
}

function hasSupabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseHeaders() {
  return {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  };
}

async function supabaseFetch(pathname, options = {}) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, '');
  const url = `${base}/rest/v1/${pathname}`;
  const response = await fetch(url, { ...options, headers: { ...supabaseHeaders(), ...(options.headers || {}) } });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase ${response.status}: ${text}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

function readLocalStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { settings: DEFAULT_SETTINGS, media: [], emailTemplates: DEFAULT_EMAILS, social: [] };
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return {
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
      media: Array.isArray(parsed.media) ? parsed.media : [],
      emailTemplates: Array.isArray(parsed.emailTemplates) ? parsed.emailTemplates : DEFAULT_EMAILS,
      social: Array.isArray(parsed.social) ? parsed.social : []
    };
  } catch (error) {
    return { settings: DEFAULT_SETTINGS, media: [], emailTemplates: DEFAULT_EMAILS, social: [], warning: error.message };
  }
}

function writeLocalStore(store) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

async function getStore() {
  if (!hasSupabase()) {
    const store = readLocalStore();
    return { ...store, source: 'local-file' };
  }

  const rows = await supabaseFetch('site_settings?select=key,value');
  const settings = { ...DEFAULT_SETTINGS };
  (rows || []).forEach((row) => { settings[row.key] = row.value; });

  let media = [];
  let emailTemplates = DEFAULT_EMAILS;
  let social = [];

  try { media = await supabaseFetch('media_assets?select=id,asset_type,title,url,notes,created_at&order=created_at.desc&limit=50'); } catch (_) {}
  try { emailTemplates = await supabaseFetch('email_automation_templates?select=template_key,trigger_name,is_active,subject,body,updated_at&order=template_key.asc'); } catch (_) {}
  try { social = await supabaseFetch('social_publications?select=id,platform,topic,caption,scheduled_for,status,created_at&order=created_at.desc&limit=100'); } catch (_) {}

  return { settings, media: media || [], emailTemplates: emailTemplates && emailTemplates.length ? emailTemplates : DEFAULT_EMAILS, social: social || [], source: 'supabase' };
}

function adminAuthorized(event) {
  const requiredToken = process.env.ADMIN_SETTINGS_TOKEN;
  if (!requiredToken) return true;
  const headers = event.headers || {};
  const supplied = headers['x-admin-settings-token'] || headers['X-Admin-Settings-Token'];
  return supplied === requiredToken;
}

async function saveToSupabase(payload) {
  if (payload.settings) {
    const rows = Object.entries(payload.settings).map(([key, value]) => ({ key, value: String(value || ''), updated_at: new Date().toISOString() }));
    if (rows.length) await supabaseFetch('site_settings?on_conflict=key', { method: 'POST', body: JSON.stringify(rows), headers: { Prefer: 'resolution=merge-duplicates,return=representation' } });
  }

  if (payload.mediaAsset) {
    await supabaseFetch('media_assets', { method: 'POST', body: JSON.stringify({ asset_type: payload.mediaAsset.asset_type || 'flyer', title: payload.mediaAsset.title, url: payload.mediaAsset.url, notes: payload.mediaAsset.notes || null, updated_at: new Date().toISOString() }) });
  }

  if (payload.deleteMediaId) {
    await supabaseFetch(`media_assets?id=eq.${encodeURIComponent(payload.deleteMediaId)}`, { method: 'DELETE' });
  }

  if (Array.isArray(payload.emailTemplates)) {
    const rows = payload.emailTemplates.map((tpl) => ({ template_key: tpl.template_key || tpl.id, trigger_name: tpl.trigger_name || tpl.trigger || tpl.template_key || tpl.id, is_active: Boolean(tpl.is_active ?? tpl.active), subject: tpl.subject || '', body: tpl.body || '', updated_at: new Date().toISOString() }));
    if (rows.length) await supabaseFetch('email_automation_templates?on_conflict=template_key', { method: 'POST', body: JSON.stringify(rows), headers: { Prefer: 'resolution=merge-duplicates,return=representation' } });
  }

  if (payload.socialPublication) {
    await supabaseFetch('social_publications', { method: 'POST', body: JSON.stringify({ platform: payload.socialPublication.platform, topic: payload.socialPublication.topic || null, caption: payload.socialPublication.caption, scheduled_for: payload.socialPublication.date || payload.socialPublication.scheduled_for || null, status: payload.socialPublication.status || 'draft', updated_at: new Date().toISOString() }) });
  }

  if (payload.deleteSocialId) {
    await supabaseFetch(`social_publications?id=eq.${encodeURIComponent(payload.deleteSocialId)}`, { method: 'DELETE' });
  }
}

async function saveToLocal(payload) {
  const store = readLocalStore();
  if (payload.settings) store.settings = { ...store.settings, ...payload.settings };
  if (payload.mediaAsset) store.media.unshift({ id: randomUUID(), asset_type: payload.mediaAsset.asset_type || 'flyer', title: payload.mediaAsset.title, url: payload.mediaAsset.url, notes: payload.mediaAsset.notes || '', created_at: new Date().toISOString() });
  if (payload.deleteMediaId) store.media = store.media.filter((m) => m.id !== payload.deleteMediaId);
  if (Array.isArray(payload.emailTemplates)) store.emailTemplates = payload.emailTemplates.map((tpl) => ({ template_key: tpl.template_key || tpl.id, trigger_name: tpl.trigger_name || tpl.trigger || tpl.template_key || tpl.id, is_active: Boolean(tpl.is_active ?? tpl.active), subject: tpl.subject || '', body: tpl.body || '' }));
  if (payload.socialPublication) store.social.unshift({ id: randomUUID(), platform: payload.socialPublication.platform, topic: payload.socialPublication.topic || '', caption: payload.socialPublication.caption, scheduled_for: payload.socialPublication.date || payload.socialPublication.scheduled_for || '', status: payload.socialPublication.status || 'draft', created_at: new Date().toISOString() });
  if (payload.deleteSocialId) store.social = store.social.filter((p) => p.id !== payload.deleteSocialId);
  writeLocalStore(store);
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders(), body: '' };

  try {
    if (event.httpMethod === 'GET') {
      const store = await getStore();
      return json(200, { ok: true, ...store });
    }

    if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });
    if (!adminAuthorized(event)) return json(401, { ok: false, error: 'Admin settings token required' });

    const payload = JSON.parse(event.body || '{}');
    if (hasSupabase()) await saveToSupabase(payload);
    else await saveToLocal(payload);

    const store = await getStore();
    return json(200, { ok: true, saved: true, ...store });
  } catch (error) {
    return json(500, { ok: false, error: error.message || 'Site settings failed' });
  }
};
