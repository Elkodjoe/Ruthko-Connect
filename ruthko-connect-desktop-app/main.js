const path = require('path');
const { app, BrowserWindow, shell } = require('electron');

// Thin wrapper, not a bundled copy of the site: this window always loads the
// real production URL, so admin console / employer portal / public pages are
// exactly the same live data as the web dashboard — no separate sync layer
// needed, no local copy to go stale.
const SITE_URL = process.env.RUTHKO_SITE_URL || 'https://ruthkojobs.com';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    title: 'Ruthko Connect',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Login/logout state (admin demo session, employer portal token) persists
  // in this window's own storage across launches, the same way a normal
  // browser profile would — Electron does this automatically, no extra code.
  mainWindow.loadURL(SITE_URL);

  // Anything that isn't the site itself (mailto:, an external link a page
  // opens in a new tab, etc.) should open in the OS's real browser, not
  // navigate this window away from the app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!isSameSite(url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isSameSite(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    if (errorCode === -3) return; // ERR_ABORTED — normal on in-page navigation, not a real failure
    mainWindow.loadURL(
      'data:text/html,' +
        encodeURIComponent(
          `<body style="font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
            <div style="text-align:center;max-width:480px;padding:24px;">
              <h2>Could not reach Ruthko Connect</h2>
              <p style="color:#a1a1aa;">${errorDescription} (${errorCode})</p>
              <p style="color:#a1a1aa;font-size:13px;">Check your internet connection, then reopen the app.</p>
            </div>
          </body>`,
        ),
    );
  });
}

function isSameSite(url) {
  try {
    const target = new URL(url);
    const base = new URL(SITE_URL);
    return target.hostname === base.hostname || target.hostname.endsWith(`.${base.hostname}`);
  } catch {
    return false;
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
