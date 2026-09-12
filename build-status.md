# Track — build status

All 5 build phases from `architecture.md` are implemented and verified (type-check, `npm run build`, the Vitest domain-layer suite, and end-to-end Playwright smoke tests all pass with zero console/runtime errors).

## What's built

- **Stack**: Vite + React 19 + TypeScript, `vite-plugin-pwa` (manifest + service worker, installable via iPhone Safari "Add to Home Screen"), Dexie (IndexedDB) for storage, `rrule` for recurrence, `ics` for calendar export, Zustand for app state, React Router (HashRouter) for the four-tab navigation.
- **Data layer**: `src/data/db.ts` (Entry schema, all 8 types), `src/data/repositories/entries.ts` (CRUD + by-type/date-range/status queries).
- **Domain layer**: `src/domain/recurrence.ts`, `calendarExport.ts` (.ics generation with per-type VALARM lead times, including the assignment "6pm day before" absolute-trigger special case and meal prep-offset alarms), `backup.ts` (JSON export/import, destructive-restore with confirmation).
- **Views**: Agenda (day/week/month, combines work_shift/assignment/appointment/travel), Tasks (checklist + status/due filters, tasks+errands), Meals (7-day × slot grid, "add ingredients to shopping list" creates linked shopping_item entries), Shopping (checklist grouped by listName), Settings (per-type export defaults, Export to Calendar, backup export/restore).
- **Entry form**: one modal parameterized by type, covering all 8 entry types' payload fields, recurrence picker, calendar-export toggle, and a per-entry "Save & export this entry (.ics)" action alongside the Settings-level bulk export.
- **Tests**: `App/src/domain/__tests__/` — 22 Vitest tests covering recurrence expansion, .ics/VALARM generation per type, and backup round-tripping.

## Verified end-to-end (Playwright, headless Chromium against the production build)

- Create → persists across reload (Phase 1 / AC1.1).
- Recurring work shift → RRULE carried into exported .ics.
- Meal → "add ingredients" → linked shopping_item entries appear grouped under Groceries on the Shopping tab (Phase 3 / AC4.3, one-directional link only — see open item below).
- Settings export produces a real .ics with BEGIN:VEVENT, correct SUMMARY, RRULE, and VALARM triggers (Phase 4 / AC6.2, AC6.3, AC6.6).
- Backup export/restore round-trips entries losslessly (Phase 5 / AC7.1-7.3).
- Re-verified all of the above served under the `/Track/` subpath (matching the GitHub Pages URL shape) with hash-based routing — same clean run, zero console errors.

Not yet individually re-verified against every line of `acceptance-criteria.md` — flagging these as open:
- AC1.3, AC1.5, AC5.4 (delete/validation behavior)
- **AC4.3 is only half-satisfied**: shopping items link back to the meal (`shopping_item.linkedEntryIds` contains the meal id), but the meal's own `linkedEntryIds` is never updated to point at the generated items. AC4.3 as written wants that bidirectional. AC4.4 (what happens to those items if the meal is edited/deleted) also isn't implemented yet — no cascade behavior exists either way.
- AC9.2 (dangling `linkedEntryIds` after a delete), AC9.3 (no stray network requests), AC9.4 (console-clean across all views — checked only for the flows in the Playwright script above, not a full manual pass)
- AC6.1 (the export window isn't explicitly defined/documented — currently it's simply "every entry with `exportToCalendar: true` regardless of date," including past ones; worth deciding if that's actually right)

## Folder naming (read this before assuming `architecture.md`'s prose is literal)

`architecture.md` refers to the app subfolder as `app/` (lowercase) throughout. The actual folder on this machine — and in the git repo, once pushed — is `App/` (capital A), per an explicit instruction given when the project was first delivered here. `CLAUDE.md` has been updated to flag this. It matters most in `.github/workflows/deploy.yml`, which runs on `ubuntu-latest`: that workflow was originally written with lowercase `app` and has been corrected to `App` to match, since a case mismatch there would fail CI outright (case-sensitive filesystem) even though it's invisible on Windows.

## Delivered / on-disk state

Everything below lives directly on this machine at `C:\krish\Claude\Track\` (no zip, written file-by-file via the device bridge):

- `architecture.md`, `acceptance-criteria.md`, `CLAUDE.md`, `build-status.md` (this file) — project docs, root level.
- `App/` — full application source (49 files as originally delivered, plus the `vite.config.ts`/`App.tsx` edits below). `node_modules/` and `dist/` are excluded/gitignored since they regenerate via `npm install` / `npm run build`. User has run `npm install` themselves and confirmed `node_modules` is present.
- `.github/workflows/deploy.yml` — could not be written by remote tooling (dot-folders are a protected path for the device bridge's write tools) — delivered to the user as a standalone file instead. Not yet placed into `.github/workflows/` as of this note; check whether `Track/.github/workflows/deploy.yml` exists before assuming CI is wired up.

## GitHub Pages deployment setup

Target: repo `Track` under the user's personal GitHub account. Deploys to `https://<user>.github.io/Track/`.

Changes made for this:
- `App/vite.config.ts` — added `base: '/Track/'`, and set the PWA manifest's `start_url`/`scope` to match (verified in the built `dist/index.html` and `manifest.webmanifest`).
- `App/src/App.tsx` — switched `BrowserRouter` → `HashRouter` (see "Current status" note in `CLAUDE.md` for why).
- `.github/workflows/deploy.yml` — GitHub Actions workflow: on push to `main`, runs `npm ci && npm test && npm run build` in `App/`, then deploys `App/dist` via `actions/deploy-pages`. Casing corrected to `App` (see above) after being caught during this Claude Code handoff — hadn't been pushed yet, so no wasted CI run.

### Still needed from the user (as of this note)
1. Confirm/place `deploy.yml` at `Track\.github\workflows\deploy.yml` (it may be sitting in a `Claude outputs` folder, waiting to be moved — check there first).
2. `git init` (or connect the existing empty `Track` repo on GitHub), commit, and push `Track/` to `main`.
3. In the repo's Settings → Pages, set Source to "GitHub Actions" (one-time).
4. First push triggers the workflow; the Actions tab shows build/deploy progress and the resulting `https://<user>.github.io/Track/` URL. Watch the first run specifically for the `App` vs `app` casing issue in case anything was missed.

## Not yet done (other next steps)

- Real app icons — the PWA icons are a generated placeholder ("T" on blue), not a designed icon.
- Manual on-device verification: installing via Safari "Add to Home Screen" on the actual iPhone, and opening an exported .ics on that phone to confirm Apple Calendar picks up the VALARM correctly (verified structurally via generated .ics content, not on real iOS hardware) — this is AC6.4 and AC8.1/8.3 in `acceptance-criteria.md`.
- The AC4.3/AC4.4 meal↔shopping-item link gaps noted above.
