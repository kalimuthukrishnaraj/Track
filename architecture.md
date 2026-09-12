
# Track — Architecture & Build Spec

**Scope:** tasks, work schedules, school assignment dates, appointments, meal plans, shopping lists/needs, errands, travel dates.
**Platform:** installable web app (PWA), used via iPhone Safari "Add to Home Screen." **Users:** single user. **Hosting:** app code served as static files; all user data stays in on-device browser storage — no backend ever sees it.

**Folder layout:** this document lives at the project root (`Track/`) alongside `CLAUDE.md`. All application source code lives in the `Track/app/` subfolder — everything under "Project setup" and the folder structure below is relative to `app/`, not the project root.

## What is a PWA, and why Track is one

A Progressive Web App is an ordinary website built to behave like an installed app rather than just a page you visit in a tab. Three pieces make that happen, on top of a normal web app (HTML/JS/CSS, no platform-specific native code):

- **A web app manifest** (`manifest.json`) — declares the app's name, icons, and `display: 'standalone'`, which is what lets Safari's "Add to Home Screen" put a real icon on the home screen and open the app full-screen, without the browser's address bar or tab chrome.
- **A service worker** — a background script the browser runs on behalf of the site, which caches the app's files so it still loads and works without an internet connection. This is what makes the app usable offline.
- **Standard web storage for data** — in Track's case, IndexedDB (via Dexie.js). This is what actually holds every entry; the storage is local to that one browser/installed-app instance, on that one device — nothing is transmitted to the host serving the code.

Originally Track was scoped as a React Native/Expo native app. That was reconsidered because the only iPhone available has no Mac behind it: installing a custom-compiled iOS app without Xcode requires EAS Build (cloud compile) *and* an Apple Developer Program membership ($99/year) *and* distribution via TestFlight. A PWA sidesteps all of that — install is just "Add to Home Screen" in Safari, iteration is a page refresh, and there's no app-store account or signing pipeline at all.

**What a PWA can't do that a native app could**, and why it matters here: iOS Safari does not let a home-screen web app schedule local notifications that fire while the app is closed (true web push exists since iOS 16.4, but it requires a server to trigger it, which would break the local-only design). So instead of in-app scheduled notifications, Track relies on **exporting time-critical entries to Apple Calendar** (see Reminder strategy below) — Apple's own Calendar app then delivers the actual alerts, which it's very good at. A couple of other PWA limits worth knowing: storage isn't unlimited (the browser can, in rare low-storage situations, evict data — another reason the backup/export feature matters), and there's no app-store listing, so sharing the app with anyone else means sharing a URL rather than an App Store link.

## Recommended stack

- **App framework:** React + TypeScript, built with Vite.
- **PWA tooling:** `vite-plugin-pwa` for the manifest and service worker (offline caching, installability).
- **Local storage:** IndexedDB via Dexie.js — the standard, well-supported offline data layer for web apps; plays the role SQLite/Drizzle would have played in the native version.
- **Recurrence:** `rrule` (RFC 5545 RRULE strings) — same as originally planned, works identically in a browser.
- **Calendar export:** the `ics` npm package to generate `.ics` files from entries.
- **IDs:** `crypto.randomUUID()` — built into the browser, no library needed.
- **State/UI:** Zustand for app state (selected date range, filters, in-progress forms); React Router (or simple tab state) for navigation between the four sections.
- **Backup:** browser file download (Blob + `<a download>`) for export, an `<input type="file">` picker + `FileReader` for restore — same JSON-dump approach as before, just via standard web APIs instead of `expo-file-system`.

## Hosting note (important, and different from before)

Even though no user data ever leaves the device, the app's *code* still needs to be served from an HTTPS origin — iOS Safari won't reliably install or run a service worker from a `file://` path. The simplest option is a free static host: GitHub Pages or Cloudflare Pages both work well for a Vite build and cost nothing. Nothing about the "local-only" design changes — the hosted part is only the HTML/JS/CSS bundle, never the entries data, which lives solely in the phone's IndexedDB.

## Data schema

Conceptually unchanged from the native version — one `entries` store, one record shape, covering every domain. In Dexie terms:

```ts
// src/data/db.ts
import Dexie, { Table } from 'dexie';

export interface Entry {
  id: string;                 // uuid v4
  type: 'task' | 'work_shift' | 'assignment' | 'appointment'
      | 'meal' | 'shopping_item' | 'errand' | 'travel';
  title: string;
  startAt?: number;           // unix ms, UTC
  endAt?: number;             // unix ms, UTC
  allDay: boolean;
  recurrenceRule?: string;    // RFC5545 RRULE string
  category?: string;
  tags?: string[];
  status: 'pending' | 'done' | 'cancelled';
  notes?: string;
  linkedEntryIds?: string[];
  payload?: Record<string, unknown>;   // type-specific, see table below
  exportToCalendar: boolean;  // whether this entry is included in .ics export
  createdAt: number;
  updatedAt: number;
}

export class TrackDB extends Dexie {
  entries!: Table<Entry, string>;
  constructor() {
    super('track');
    this.version(1).stores({
      entries: 'id, type, startAt, status',
    });
  }
}
```

Store all timestamps as UTC unix ms; convert to local time only at display/export time.

**`payload` shape per type** (all fields optional unless noted):

| type | payload fields |
|---|---|
| `task` | `priority?: 'low'\|'med'\|'high'` |
| `work_shift` | `location?: string` |
| `assignment` | `subject?: string`, `course?: string` |
| `appointment` | `location?: string`, `provider?: string` |
| `meal` | `mealSlot: 'breakfast'\|'lunch'\|'dinner'\|'snack'` (required), `recipeUrl?: string`, `prepStartOffsetMin?: number` |
| `shopping_item` | `quantity?: string`, `listName: string` (required), `checked: boolean` (required) |
| `errand` | `location?: string` |
| `travel` | `origin?: string`, `destination?: string`, `confirmationCode?: string` |

`linkedEntryIds` is how a meal links to the shopping items it generated, or a travel entry links to a related task ("pack bags").

## Reminder strategy (replaces native notifications)

**Primary mechanism — Calendar export.** Time-critical entries default to `exportToCalendar: true`: `appointment`, `travel`, `work_shift`, and `assignment` (matching the original "on by default" tier). An **"Export to Calendar"** action (available from Settings and from each entry) generates a `.ics` file containing every entry flagged for export, with a `VALARM` matching the original lead-time table below, and triggers a browser download. On iOS, opening that downloaded `.ics` file (from the Files app or the share sheet) prompts Apple's native "Add to Calendar" flow — from that point, Calendar itself delivers the alert, which is far more reliable than anything a web app could schedule.

| type | export default | alarm lead time |
|---|---|---|
| `appointment` | on | 60 min before |
| `travel` | on | 1 day before + 3 hours before (two alarms) |
| `work_shift` | on | 60 min before |
| `assignment` | on | 1 day before, 6pm local |
| `task` / `errand` (with due date) | off (opt-in per entry) | 60 min before |
| `meal` (prep step) | off (opt-in per entry) | at computed prep start time |
| `shopping_item` | off | not applicable — see below |

This is a **manual, repeatable action**, not a live sync: exporting doesn't create a subscription, so re-export (and re-import into Calendar) whenever entries change meaningfully — e.g. weekly, or whenever you add something new and time-sensitive. This is the one place where "local-only" costs real convenience compared to the native-app plan, and it's worth being upfront about that trade-off rather than pretending it's fully automatic.

**Secondary mechanism — in-app surfacing.** For everything not exported (tasks/errands without an explicit export choice, meal prep, shopping), the Agenda and Tasks screens visually highlight anything due today/overdue. The Notification API can also fire while the tab is open/backgrounded, which is a nice bonus for anything time-sensitive that happens while you're actively using the phone, but it must never be the only mechanism for something that matters — it doesn't survive the app being closed.

**Shopping's weekly "shopping day" reminder** becomes: an entry of its own (e.g. a recurring `task` for "shopping day") that the user opts into exporting to Calendar like anything else, rather than a separate special-cased notification system.

## Screens & navigation

Same four-section layout as originally designed, now as React views/routes instead of Expo Router screens:

- **Agenda** (default view) — day/week/month toggle; entries for the selected range sorted by start time; combines work shifts, assignments, appointments, and travel into one timeline.
- **Tasks** — checklist of tasks and errands; filter by status/due date.
- **Meals** — 7-day × meal-slot grid; "Add ingredients to shopping list" creates linked `shopping_item` entries.
- **Shopping** — checklist grouped by `listName`.

Shared views: entry detail/edit (one form parameterized by `type`), entry create (type picker → same form), and Settings (calendar-export defaults per type, backup/export, restore).

## Project setup

All commands and paths below are run from inside the `app/` subfolder of this project (`Track/app/`), not the project root.

1. From `Track/`, run: `npm create vite@latest app -- --template react-ts` — this creates the `app/` subfolder as the Vite project. `cd app` for the remaining steps.
2. `npm install dexie rrule ics zustand react-router-dom`
3. `npm install -D vite-plugin-pwa`
4. Configure `vite-plugin-pwa` in `vite.config.ts` with a manifest (name, icons, `display: 'standalone'`) so Safari offers "Add to Home Screen" properly.
5. Deploy the production build (`npm run build`) to a free static host (GitHub Pages or Cloudflare Pages) so it's served over HTTPS.
6. Suggested structure inside `app/`:

```
app/
  src/
    data/
      db.ts                 (Dexie schema)
      repositories/
        entries.ts
    domain/
      recurrence.ts          (rrule wrapper)
      calendarExport.ts       (.ics generation)
      backup.ts               (JSON export/import)
    components/
    views/
      Agenda.tsx
      Tasks.tsx
      Meals.tsx
      Shopping.tsx
      EntryForm.tsx
      Settings.tsx
    store/                   (zustand stores)
    constants/
      exportDefaults.ts
```

## Build phases & acceptance criteria

1. **Core data layer** — Vite/React/PWA project scaffolded in `app/` and installable on the iPhone home screen; Dexie schema in place; repository functions for create/read/update/delete/list-by-type/list-by-date-range.
   *Done when:* an entry created via the app is still readable after fully closing and reopening the installed PWA.

2. **Agenda/Calendar** — Agenda view (day/week/month) and entry detail/edit/create for `work_shift`, `assignment`, `appointment`, `travel`.
   *Done when:* creating one of those four types shows it correctly positioned on the Agenda and it persists across a reload.

3. **Tasks, Errands, Meals, Shopping** — Tasks view (with due-date support), Meals grid, Shopping checklist, and the "add ingredients to shopping list" link from a meal.
   *Done when:* assigning a meal and adding its ingredients creates `shopping_item` entries whose `linkedEntryIds` points back to the meal.

4. **Calendar export** — "Export to Calendar" action generating a valid `.ics` file with correct `VALARM` lead times per the table above; per-entry/per-type opt-in toggle; Settings screen to adjust defaults.
   *Done when:* the exported `.ics` file, opened on the iPhone, successfully adds the event(s) with the correct alarm time(s) to Apple Calendar.

5. **Backup/export & restore** — Settings action to export all entries to a JSON file (browser download), and a restore action that reads a chosen file back in (with a confirmation step since it overwrites current data).
   *Done when:* export followed by restore round-trips every entry losslessly.

## Testing strategy

Unit-test the domain layer (`recurrence.ts`, `calendarExport.ts`, `backup.ts`) with Vitest (Vite's native test runner) — this is where correctness actually matters, especially the `.ics` generation and alarm timing. UI can stay manually tested given this is a single-user app.

## Risks / things to decide early

- **Calendar export is manual, not synced.** It's a "re-export when things change" habit, not a live connection — worth deciding up front how often that'll realistically happen (weekly? on every new time-critical entry?) so the design doesn't quietly assume automation that isn't there.
- **Backup is still the only safety net for the data itself.** Installed home-screen PWAs on iOS are generally treated like installed apps for storage-eviction purposes (not subject to Safari's regular 7-day inactive-data cleanup), but a phone can still be lost, reset, or have the PWA removed — export/restore (Phase 5) is the actual disaster-recovery path, same as it would have been for the native app.
- **Future multi-device or sharing** would still mean adding a sync layer later — the repository pattern in the data layer exists specifically so that change doesn't require a rewrite, even though nothing sync-related is being built now.
