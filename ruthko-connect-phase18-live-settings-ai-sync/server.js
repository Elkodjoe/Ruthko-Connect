require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

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

['notify-lead', 'send-auto-reply', 'send-campaign', 'unsubscribe', 'task-health-check', 'ask-ruthko', 'site-settings'].forEach((functionName) => {
  app.all(`/.netlify/functions/${functionName}`, (req, res) => runFunction(functionName, req, res));
  app.all(`/api/${functionName}`, (req, res) => runFunction(functionName, req, res));
});

app.get('/health', (req, res) => {
  res.json({ ok: true, app: 'Ruthko Connect', domain: process.env.APP_DOMAIN || 'local' });
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
