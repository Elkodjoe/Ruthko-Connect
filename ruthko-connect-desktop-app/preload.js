// Intentionally empty — this is a thin wrapper around the live site, the
// page never needs Node or Electron APIs, so nothing is exposed via
// contextBridge. Keeping nodeIntegration off and this preload minimal is
// the safer default for loading remote, non-bundled content.
