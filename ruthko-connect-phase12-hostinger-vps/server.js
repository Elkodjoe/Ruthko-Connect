require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

function loadHandler(functionName) {
  return require(path.join(__dirname, 'netlify', 'functions', `${functionName}.js`)).handler;
}

function makeEvent(req, functionPath) {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  const rawUrl = `${protocol}://${host}${req.originalUrl}`;

  return {
    httpMethod: req.method,
    headers: req.headers,
    body: req.method === 'GET' ? null : JSON.stringify(req.body || {}),
    path: functionPath,
    rawUrl,
    queryStringParameters: req.query || {}
  };
}

async function runFunction(functionName, req, res) {
  try {
    const handler = loadHandler(functionName);
    const result = await handler(makeEvent(req, `/.netlify/functions/${functionName}`));
    const statusCode = result.statusCode || 200;
    const headers = result.headers || {};

    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
    res.status(statusCode).send(result.body || '');
  } catch (error) {
    console.error(`Function failed: ${functionName}`, error);
    res.status(500).json({ ok: false, error: error.message || 'Server function failed' });
  }
}

// Baseline limiter for every function route — blunts scripted abuse without
// affecting normal browsing (the limit only applies to /api and
// /.netlify/functions, never to page/asset requests).
const defaultLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

// Public form-submission endpoints get their own, slightly tighter budget
// so one visitor's traffic can't starve out real submissions from others.
const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

// send-campaign is both privileged (now auth-gated) and expensive (real
// outbound email through Resend) — a tight budget is defense in depth on
// top of the auth check, not a substitute for it.
const campaignLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const FUNCTION_LIMITERS = {
  'notify-lead': formLimiter,
  'ask-ruthko': formLimiter,
  'send-campaign': campaignLimiter,
};

['notify-lead', 'send-auto-reply', 'send-campaign', 'unsubscribe', 'task-health-check', 'ask-ruthko', 'site-settings'].forEach((functionName) => {
  const limiter = FUNCTION_LIMITERS[functionName] || defaultLimiter;
  app.all(`/.netlify/functions/${functionName}`, limiter, (req, res) => runFunction(functionName, req, res));
  app.all(`/api/${functionName}`, limiter, (req, res) => runFunction(functionName, req, res));
});

app.get('/health', (req, res) => {
  res.json({ ok: true, app: 'Ruthko Connect', domain: process.env.APP_DOMAIN || 'local' });
});

// Everything below this point serves files from PUBLIC_DIR, which is also
// where server.js, package.json, .env*, and every internal doc/SQL/script
// file live (this repo was never split into a real public/ web root). An
// allowlist — not a denylist — is the only safe way to serve pages here:
// only js/, images/, top-level *.html pages, and *.json files under data/
// (a public-content fallback mirror js/admin-content-sync.js reads directly
// — non-sensitive, same data site-settings.js already serves over the API)
// are reachable; everything else (docs/, netlify/, nginx/, scripts/,
// supabase/, node_modules/, server.js, package.json, *.sql, *.txt, .env*)
// 404s instead of being downloadable.
const PUBLIC_STATIC_DIRS = new Set(['js', 'images']);
const PUBLIC_JSON_DIRS = new Set(['data']);

app.use((req, res, next) => {
  const urlPath = decodeURIComponent(req.path);
  if (urlPath === '/') return next();

  const segments = urlPath.split('/').filter(Boolean);
  const topSegment = segments[0];

  if (segments.length > 1 && PUBLIC_STATIC_DIRS.has(topSegment)) return next();
  if (segments.length > 1 && PUBLIC_JSON_DIRS.has(topSegment) && path.extname(urlPath).toLowerCase() === '.json') return next();

  if (segments.length === 1) {
    const ext = path.extname(topSegment).toLowerCase();
    if (ext === '.html') return next();
    // Extension-less "pretty URL" (e.g. /admin -> admin.html) — only allowed
    // when a real page file backs it, not for any bare top-level name (this
    // is what let _redirects, a Netlify config file with no extension,
    // through and serve its actual contents instead of 404ing).
    if (ext === '' && fs.existsSync(path.join(PUBLIC_DIR, `${topSegment}.html`))) return next();
  }

  return res.status(404).end();
});

app.use(express.static(PUBLIC_DIR, {
  extensions: ['html'],
  index: 'index.html'
}));

app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Ruthko Connect running on port ${PORT}`);
});
