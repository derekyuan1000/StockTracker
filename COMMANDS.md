# Commands

All commands run from the repo root unless noted otherwise.

---

## Web / Backend

| Command | What it does |
|---|---|
| `npm run dev` | Start the web app + API dev server |
| `npm run build` | Production build |
| `npm run build:dev` | Development-mode build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier across the whole repo |

---

## Database

Run from repo root. Reads credentials from `.dev.vars`.

| Command | What it does |
|---|---|
| `npm run db:generate` | Generate Drizzle migration files from schema changes |
| `npm run db:migrate` | Apply pending migrations to the database |
| `npm run db:studio` | Open Drizzle Studio (visual DB browser) |
| `npm run db:reset` | Reset the database (destructive) |
| `npm run db:backfill-names` | Backfill ticker display names |
| `npm run db:backfill-owner` | Backfill owner field |

---

## Mobile (run from `apps/mobile`)

```bash
cd apps/mobile
```

### Dev

| Command | What it does |
|---|---|
| `npm run start` | Start Expo dev server (scan QR with Expo Go) |
| `npm run android` | Build & run on connected Android device / emulator |
| `npm run ios` | Build & run on connected iOS device / simulator |
| `npm run web` | Start Expo web target |

### EAS Builds (requires `eas-cli`, builds on Expo servers)

| Command | What it does |
|---|---|
| `eas build --profile development --platform android` | Dev APK with dev client + widget provider (needed for widget testing) |
| `eas build --profile preview --platform android` | Internal preview APK (release-like, no dev tools) |
| `eas build --profile development --platform ios` | Dev iOS build |
| `eas build --profile preview --platform ios` | Internal preview iOS build |

> **Widget note:** The Android home-screen widget requires a native build. After installing a fresh `development` or `preview` APK, long-press the home screen → Widgets → StockTracker Portfolio.

---

## TypeScript

| Command | Where | What it does |
|---|---|---|
| `npx tsc --noEmit` | `apps/mobile` | Type-check the mobile app |
| `npx tsc --noEmit` | repo root | Type-check the web app |
