# Ruthko Connect — Desktop

A thin Electron shell over the live site at `https://ruthkojobs.com`. There is
no local copy of the app and no separate sync layer — this window always
shows the real production site, so it's automatically in sync with the web
dashboard and everything else. Login sessions persist in this window's own
storage across launches, the same way a normal browser profile would.

## Run

```
npm install
npm start
```

## Build an installer

```
npm run dist
```

Output lands in `release/`.

## Point at a different environment (e.g. local dev)

```
RUTHKO_SITE_URL=http://localhost:3000 npm start
```
