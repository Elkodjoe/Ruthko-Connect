# Ruthko Connect — Mobile

A thin Capacitor shell over the live site at `https://ruthkojobs.com`
(`capacitor.config.json`'s `server.url`). No bundled copy of the app, no
separate sync layer — always the real production site.

## Build the Android debug APK

```
npm install
npx cap add android   # first time only
npx cap sync
cd android && ./gradlew assembleDebug
```

APK lands in `android/app/build/outputs/apk/debug/app-debug.apk`.

## Point at a different environment

Edit `server.url` in `capacitor.config.json`, then `npx cap sync`.
