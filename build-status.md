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

### Update (2026-09-11): open AC items re-verified against the live deployed app

Tested directly against `https://kalimuthukrishnaraj-ai.github.io/Track/` (Chromium, via browser automation), inspecting IndexedDB directly to confirm persistence rather than trusting the UI alone.

- **AC1.3 — PASS.** Deleting an entry (tested on a shopping_item) removes it from the UI immediately and from IndexedDB (confirmed via direct DB query after delete — not just hidden).
- **AC5.4 — PASS.** Same `deleteEntry()` code path as AC1.3; same verification.
- **AC1.5 — FAIL.** No validation blocks save when a required payload field is empty. Concretely: cleared "List name" on a shopping_item to `""` and saved — it persisted to IndexedDB as `listName: ""` (the Shopping view's grouping just cosmetically falls back to "Groceries" for *display*, masking the underlying unvalidated empty value). `mealSlot` can't actually go blank since it's a `<select>` with no empty option, so that half is structurally fine, but that's incidental, not real validation. Root cause: `handleSave` in [EntryFormModal.tsx:281](App/src/components/EntryFormModal.tsx#L281) has no field checks before calling `createEntry`/`updateEntry`.
- **AC4.3 — FAIL (unchanged).** Reconfirmed live: created a meal, added 2 ingredients — the resulting shopping_items have `linkedEntryIds: [mealId]`, but the meal's own record has no `linkedEntryIds` field at all. Link is one-directional only. Root cause: `handleAddIngredients` in [EntryFormModal.tsx:317](App/src/components/EntryFormModal.tsx#L317) never patches the meal.
- **AC4.4 — PASS, behavior now documented.** Deleting a meal with linked shopping items leaves those items completely untouched (they become orphaned but independent) — no cascade delete, no cascade edit, in either `deleteEntry` or `updateEntry`. This is consistent every time (there's simply no cascade code path), which satisfies AC4.4's "pick one behavior and verify it holds." **Decision logged**: "remain independent" is the chosen/verified behavior — no code change needed for AC4.4 itself, but see AC4.3 above for the still-open half of the meal↔shopping-item relationship.
- **AC9.2 — PASS.** After deleting the meal above, the two orphaned shopping_items (dangling `linkedEntryIds` pointing at a now-nonexistent id) still render correctly on the Shopping view and open for editing with no console errors and no crash — nothing in the codebase dereferences `linkedEntryIds` targets assuming they exist; it's only ever used as a `.filter()`/`.includes()` membership check.
- **AC9.3 — PASS.** Watched network requests through create/edit/add-ingredients/delete/navigate flows — only same-origin static-asset GETs (JS/CSS bundles), no other requests at any point.
- **AC9.4 — PASS.** No console errors from app code across Agenda, Tasks, Meals, Shopping, Settings, or through the create/edit/delete/add-ingredients flows tested above.
- **AC6.1 — still FAIL / open decision.** `listExportableEntries()` in [entries.ts:84](App/src/data/repositories/entries.ts#L84) returns every `exportToCalendar: true` entry regardless of date — confirmed unchanged, not yet re-verified further since it needs a decision first (see below) before it's meaningful to test against a definition.

**Decision needed (not yet made or implemented) for AC6.1**: recommend filtering the export to (a) all recurring entries regardless of their original `startAt` (their RRULE's DTSTART must stay as-is for correct future-occurrence expansion in Apple Calendar) plus (b) non-recurring entries with `startAt >= start of today`. Flagging this rather than implementing it unilaterally since it changes export output.

**Still open, not yet fixed**:
- AC1.5 — add save-blocking validation for `listName` (and reconsider whether `mealSlot`'s forced-default is actually sufficient or if the intent was broader payload validation).
- AC4.3 — make the meal→shopping-item link bidirectional by patching the meal's `linkedEntryIds` in `handleAddIngredients`.
- AC6.1 — implement the upcoming-window filter above once confirmed.

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

### Update (2026-09-11): repo is now on GitHub

1. ✅ `deploy.yml` moved from `Claude outputs/` into `.github/workflows/deploy.yml` (contents were identical to the standalone copy; the stray `Claude outputs/` folder was deleted after confirming the diff).
2. ✅ `git init`'d at `Track/`, root commit `6607200` (53 files — all docs + `App/` source, `node_modules`/`dist` excluded per `.gitignore`), pushed to `https://github.com/kalimuthukrishnaraj-ai/Track.git` on `main`.

### Update (2026-09-11): live on GitHub Pages

- Repo had to be made **public** — free GitHub Pages (via Actions) doesn't support private repos, and no code here contains personal data (all task/schedule data stays local in IndexedDB, per the local-only design), so this was a low-risk call.
- Runs #1–#2 failed with `Get Pages site failed... Not Found` — expected, since they ran before Settings → Pages → Source was set to "GitHub Actions". Not a code issue.
- Once Source was set to "GitHub Actions", an empty commit (`df87fdc`) retriggered the workflow: **run #3 succeeded** (build 21s, deploy 8s).
- Verified live: **https://kalimuthukrishnaraj-ai.github.io/Track/** loads and renders the Agenda view correctly.

### Still open
- Real app icons (placeholder "T" on blue).
- On-device Safari "Add to Home Screen" + .ics/VALARM verification on actual iPhone (AC6.4, AC8.1/8.3).
- AC4.3/AC4.4 meal↔shopping-item link gaps noted above.

## Not yet done (other next steps)

- Real app icons — the PWA icons are a generated placeholder ("T" on blue), not a designed icon.
- Manual on-device verification: installing via Safari "Add to Home Screen" on the actual iPhone, and opening an exported .ics on that phone to confirm Apple Calendar picks up the VALARM correctly (verified structurally via generated .ics content, not on real iOS hardware) — this is AC6.4 and AC8.1/8.3 in `acceptance-criteria.md`.
- The AC4.3/AC4.4 meal↔shopping-item link gaps noted above.
