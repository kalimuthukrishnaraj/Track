# Track — Acceptance Criteria

Detailed, testable criteria for verifying each part of the app against `architecture.md`. Each item is written as a pass/fail check — use these during the testing/verification step of each build phase, and re-run the relevant section any time related code changes. IDs (AC1.1, etc.) are for referencing which checks passed/failed in status reports.

## 1. Data layer & persistence

- **AC1.1** — Creating an entry via the UI persists it to IndexedDB; a full reload (or fully closing and reopening the installed app) still shows it.
- **AC1.2** — Editing an entry updates its `updatedAt` timestamp and the change survives a reload.
- **AC1.3** — Deleting an entry removes it from the visible list and from IndexedDB (confirm it's actually gone, not just hidden).
- **AC1.4** — All eight entry types (`task`, `work_shift`, `assignment`, `appointment`, `meal`, `shopping_item`, `errand`, `travel`) can be created, edited, and deleted without errors.
- **AC1.5** — Required payload fields per type (`mealSlot` for `meal`; `listName` and `checked` for `shopping_item`) are validated before save — the form rejects submission without them.
- **AC1.6** — A recurring entry's RRULE correctly expands into future occurrences shown on the Agenda within the visible date range.
- **AC1.7** — With the device in Airplane Mode, the installed app still loads and both reads and writes entries correctly.

## 2. Agenda / Calendar

- **AC2.1** — Day view shows every entry (including recurring occurrences) whose start falls on the selected day, sorted by start time.
- **AC2.2** — Week and Month views correctly aggregate entries across their respective ranges.
- **AC2.3** — All-day entries (`allDay: true`) are visually distinct from timed entries (no specific time shown).
- **AC2.4** — Tapping an entry opens its detail/edit view pre-filled with its current values.
- **AC2.5** — Entries with no `startAt` (open-ended tasks, unassigned shopping items) do not appear on the Agenda.

## 3. Tasks & Errands

- **AC3.1** — A task created without a due date appears in the Tasks list and defaults to `exportToCalendar: false`.
- **AC3.2** — A task/errand created with a due date follows the opt-in default from the reminder table in `architecture.md` (off by default, user can turn on).
- **AC3.3** — Marking a task/errand "done" updates its status and it's excluded from (or visually distinguished in) the default Tasks list view.
- **AC3.4** — Filtering by status (pending/done) and by due date returns the correct subset.

## 4. Meal Planner

- **AC4.1** — The 7-day × meal-slot grid shows each assigned meal in the correct day/slot.
- **AC4.2** — Assigning a meal to an empty slot creates a `meal` entry with `startAt` matching that day and the correct `mealSlot`.
- **AC4.3** — "Add ingredients to shopping list" creates `shopping_item` entries whose `linkedEntryIds` includes the meal's id, and updates the meal's own `linkedEntryIds` to include those items (link is bidirectional).
- **AC4.4** — Editing or deleting a meal has one clearly defined, consistent effect on shopping items it already generated (either they remain independent, or they're removed too) — pick one behavior and verify it holds every time, rather than being inconsistent.

## 5. Shopping Lists & Needs

- **AC5.1** — Shopping items display grouped by `listName`.
- **AC5.2** — Checking an item toggles `payload.checked` and the state survives a reload.
- **AC5.3** — A new item added from the Shopping view defaults to `exportToCalendar: false`.
- **AC5.4** — Deleting an item removes it from the list and from storage.

## 6. Calendar export (.ics)

- **AC6.1** — "Export to Calendar" generates a `.ics` file containing exactly the entries with `exportToCalendar: true` that are still upcoming (define and document the exact window — e.g. all future flagged entries, or a rolling 60 days — and test against that definition).
- **AC6.2** — Each exported event includes a `VALARM` matching its type's default lead time (or a per-entry override, if one was set) — check this by opening the `.ics` file as text and inspecting the `TRIGGER` values.
- **AC6.3** — Travel entries produce two `VALARM` blocks (1 day before and 3 hours before).
- **AC6.4** — On the iPhone, opening the exported `.ics` file triggers Apple's native "Add to Calendar" flow and produces events in Calendar with the correct title, time, and alarm(s) — this one has to be checked on-device, not just by inspecting the file.
- **AC6.5** — Turning `exportToCalendar` off for an entry (or changing a type's default in Settings) excludes it from the next export.
- **AC6.6** — Recurring entries are either exported correctly as recurring events (with an RRULE Apple Calendar can parse) or explicitly excluded from export, whichever was decided — don't leave this ambiguous; test whichever behavior was chosen.

## 7. Backup & restore

- **AC7.1** — "Export backup" downloads a JSON file containing every entry currently in IndexedDB.
- **AC7.2** — "Restore from file" reads a previously exported JSON file and repopulates IndexedDB, after a confirmation step.
- **AC7.3** — Export → wipe data (or a fresh install) → Restore reproduces every entry losslessly, including its original id.
- **AC7.4** — Cancelling the restore confirmation leaves existing data untouched.
- **AC7.5** — Attempting to restore a malformed or unrelated JSON file shows an error rather than corrupting or partially overwriting the database.

## 8. PWA installability & offline behavior

- **AC8.1** — On iPhone Safari, the site offers "Add to Home Screen," and the installed icon opens the app in standalone mode (no address bar or Safari chrome).
- **AC8.2** — The installed app loads and fully functions with the device in Airplane Mode (duplicate of AC1.7, checked specifically post-install).
- **AC8.3** — The manifest supplies a real name and icon — the home screen icon isn't a generic browser placeholder.

## 9. Cross-cutting checks

- **AC9.1** — All displayed times are shown in the device's local timezone, regardless of being stored as UTC.
- **AC9.2** — Deleting an entry that's linked to others (e.g. a meal linked to shopping items) doesn't crash the app or leave the UI in a broken state; a dangling `linkedEntryIds` reference to a deleted entry is handled gracefully.
- **AC9.3** — With the browser's Network tab open, using the app end-to-end (creating, editing, exporting, backing up) makes no network requests beyond the initial static-asset load — confirming the local-only design is actually honored in the running app, not just on paper.
- **AC9.4** — No errors appear in the browser console during normal use of all four main views (Agenda, Tasks, Meals, Shopping) plus Settings.
