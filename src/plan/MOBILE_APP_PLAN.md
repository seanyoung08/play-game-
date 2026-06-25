# Mobile App Plan

## Goal

Package the current Vite + React shop-management game as an Android app while keeping the browser version working.

## Scope

- Build an Android app with Capacitor.
- Reuse the existing React UI and game rules.
- Keep the current SQLite API path for desktop/browser development.
- Add a mobile-safe local account fallback so the app can run when `/api` is unavailable.
- Document how to build and open the Android project.

## Not In Scope

- iOS packaging, because this Windows environment cannot build iOS apps without macOS and Xcode.
- Publishing to an app store.
- Cloud sync between devices.
- Migrating the current `shop.db` into a hosted backend.

## Architecture

```text
React game
  |
  | browser/dev with API available
  v
Vite proxy -> Python SQLite API -> shop.db

React game in Android WebView
  |
  | API unavailable
  v
localStorage session + localStorage game save
```

## Implementation Steps

1. Add Capacitor dependencies and config.
2. Add Android platform files through Capacitor.
3. Add scripts for mobile build and sync.
4. Add local account fallback in `src/game/storage.ts`.
5. Keep SQLite persistence active when the API is available.
6. Update README with Android build instructions.
7. Run tests and production build.

## Verification

- `npm.cmd test -- --run`
- `npm.cmd run check`
- `npm.cmd run mobile:sync`

## Follow-Up

For real multi-device accounts, replace the local SQLite API with a hosted backend and make the mobile app call that backend directly.
