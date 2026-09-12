# Track

A single-user PWA for tracking tasks, work shifts, school assignments,
appointments, meal plans, shopping lists, errands, and travel — installed to
your iPhone's home screen via Safari, with all data stored locally in the
browser (IndexedDB). No backend, no account, no data ever leaves the device.

See `../architecture.md` for the full design spec this app was built from.

## Quick start

```bash
npm install
npm run dev       # local dev server, http://localhost:5173
```

## Build & deploy

```bash
npm run build      # type-checks, then builds to dist/
npm run preview    # serve the production build locally to sanity-check it
```

`dist/` is a static bundle — deploy it to any static host over HTTPS (GitHub
Pages and Cloudflare Pages both work well and are free). iOS Safari requires
HTTPS to install a PWA and register its service worker; a `file://` path
will not work.

Once deployed, open the URL in iPhone Safari and use **Share → Add to Home
Screen** to install it. From then on it opens full-screen like a native app
and works offline.

## Tests

```bash
npm test           # runs the domain-layer unit tests (Vitest)
```

Tests cover the three places correctness actually matters: recurrence
expansion (`src/domain/recurrence.ts`), `.ics` generation and alarm timing
(`src/domain/calendarExport.ts`), and backup export/restore
(`src/domain/backup.ts`). The UI is small enough to stay manually tested, per
the architecture doc's testing strategy.

## Project layout

```
src/
  data/
    db.ts                    Dexie schema (the `entries` table + Entry type)
    repositories/entries.ts  CRUD + query helpers
  domain/
    recurrence.ts            RRULE wrapper (build/parse/expand)
    calendarExport.ts        .ics generation with per-type VALARM reminders
    backup.ts                JSON export/import (the disaster-recovery path)
  store/                     Zustand stores (agenda range, filters, settings, form state)
  components/                Shared UI: entry list rows, the create/edit form, bottom nav
  views/                     Agenda, Tasks, Meals, Shopping, Settings
  constants/exportDefaults.ts  Per-type calendar-export defaults + alarm lead times
```

## How reminders actually work

iOS Safari won't let a home-screen web app schedule notifications while it's
closed, so Track doesn't try. Instead:

1. Time-critical entries (appointments, travel, work shifts, assignments) are
   flagged `exportToCalendar` by default.
2. **Settings → Export to Calendar** generates a single `.ics` file with all
   flagged entries, each with the right `VALARM` lead time, and downloads it.
3. Opening that file on the iPhone hands it to Apple Calendar, which delivers
   the actual alert.

This is a manual, repeatable action, not a live sync — re-export whenever
your schedule changes meaningfully. Every entry's edit screen also has a
"Save & export this entry" button for exporting just one thing right after
creating it, without needing a full re-export.

## Backup is the only safety net

Because everything lives in this browser's IndexedDB, **Settings → Export
backup** (a JSON download) is the actual disaster-recovery path if the phone
is lost, reset, or the PWA is removed. Restore reads a chosen JSON file back
in, replacing all current entries (with a confirmation step first, since it's
destructive).
