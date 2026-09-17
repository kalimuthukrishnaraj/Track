# Track

*Single-user, local-only. No account, no server, no tracking. Created by Krishnaraj Kalimuthu.*

Everything Track does, and where to find it — the Agenda, Tasks, Meals and Shopping tabs, the eight entry types, calendar export, and backup.

**Open in Safari:** https://kalimuthukrishnaraj.github.io/Track/

- [Install it on your phone](#install-it-on-your-phone)
- [The four tabs](#the-four-tabs)
- [Entry types, at a glance](#entry-types-at-a-glance)
- [Adding & editing an entry](#adding--editing-an-entry)
- [Calendar export](#calendar-export)
- [Backup & restore](#backup--restore)

## Install it on your phone

Track is a web app, not an App Store app — you install it straight from Safari. Do this before anything else: it changes how iOS treats your data.

1. Open **https://kalimuthukrishnaraj.github.io/Track/** in Safari.
2. Tap the **Share** icon, then **Add to Home Screen**.

An install banner with these same steps also shows at the top of the Agenda tab until you install, or until you dismiss it.

> **⚠️ Why this actually matters**
> iOS clears storage for sites you haven't opened in 7 days — including Track's entries. An installed, home-screen app is exempt from that cleanup. Since Track has no cloud sync, skipping install risks silently losing everything if you go a week without opening it in a regular Safari tab.

## The four tabs

The bottom nav groups your eight entry types by how you'd actually manage them, not by their raw type — that's why Settings lists more types than there are tabs.

| Tab | What it's for | Entry types |
| --- | --- | --- |
| 📅 **Agenda** | Day / Week / Month calendar. Everything with a real slot in your schedule lives here. | Work Shift, Assignment, Appointment, Travel |
| ✓ **Tasks** | To-dos and errands. Search, filter by status or due date, check off without opening the entry. | Task, Errand |
| 🍽️ **Meals** | A 7-day × 4-slot grid. Plan a meal, then push its ingredients straight to Shopping. | Meal |
| 🛒 **Shopping** | Checklist items grouped by list name — Groceries, Hardware, whatever you name it. | Shopping Item |

### Agenda

- **View switch** — Day, Week, or Month: same data, different zoom level.
- **Range nav** — step to the previous/next period, or jump back to Today.
- **Colored dot** on each row matches the entry's type color (see [Entry types](#entry-types-at-a-glance) below). Tap any row to edit it; recurring entries (like a weekly shift) expand automatically into every occurrence in range.

### Tasks

- **Search** filters by title as you type.
- **Status filter** — Pending / Done / All.
- **Due-date filter** — Overdue, Today, Upcoming, or items with No due date.
- **Checkbox** marks an item done in one tap, no need to open the entry.

### Meals

- Tap an **empty slot** ("+ Add") to plan a meal for that day and slot.
- Tap a **planned meal** to open it, then use "Add ingredients to shopping list" — each line becomes a Shopping entry linked back to this meal (visible from both sides).

### Shopping

- Items are grouped by whatever you type into **List name** — e.g. Groceries, Hardware. This field is required: an item can't be saved without one.
- **Checked items** sort to the bottom with a strikethrough but stay on the list until you delete them.

## Entry types, at a glance

Every entry is one of these eight types. The type decides its icon and color everywhere in the app, which tab it lives on, and whether it's eligible for calendar export at all.

| Type | Lives on | Exportable | Default export |
| --- | --- | --- | --- |
| ✓ Task | Tasks | Yes | Off |
| 💼 Work Shift | Agenda | Yes | On |
| 📚 Assignment | Agenda | Yes | On |
| 🗓️ Appointment | Agenda | Yes | On |
| 🍽️ Meal | Meals | No | — |
| 🛒 Shopping Item | Shopping | No | — |
| 📍 Errand | Tasks | Yes | Off |
| ✈️ Travel | Agenda | Yes | On |

## Adding & editing an entry

The same form handles all eight types — it just shows different fields depending which one you pick.

1. **Pick a type** first — the rest of the form adjusts to it (e.g. Meal shows a meal-slot picker, Shopping Item shows List name).
2. **Repeats** — Daily / Weekly / Monthly / Yearly. Recurring entries expand automatically wherever they'd fall: Agenda, and calendar export.
3. **Include in calendar export** toggle — pre-filled from your Settings default for this type, but it's per-entry; flip it here to override just this one.
4. **Delete** only appears once you're editing an existing entry, and asks you to confirm — it removes the entry for good.

> **💡 Required fields are enforced**
> A Shopping Item can't be saved with a blank List name — Save is blocked and an inline message tells you why. This keeps the Shopping tab's grouping accurate instead of silently falling back to a default.

## Calendar export

Track generates a standard `.ics` file you open on your phone to drop reminders straight into Apple Calendar — export is a manual, repeatable action, not a live sync.

- **Export to Calendar** (Settings) downloads one `.ics` with every entry currently flagged for export — recurring ones included regardless of date, one-off entries only if today or later.
- **Per-type defaults** (Settings → Export defaults by type) set what a *new* entry of that type starts with.

> **⚠️ Defaults aren't retroactive**
> Flipping a type on in Settings only changes what *new* entries of that type start with. Entries you created earlier keep whatever the toggle was set to back then — open each one and flip its own "Include in calendar export" switch if you want it included now.

Reminder lead time per type, applied automatically on export:

| Type | Reminder |
| --- | --- |
| Appointment, Work Shift, Task, Errand | 60 minutes before |
| Travel | 24 hours before, and 3 hours before |
| Assignment | 6:00 PM the day before it's due |
| Meal | Your chosen prep-time offset, if you set one |

## Backup & restore

Your data lives only in this browser, on this device. There's no account and nothing to sync — a backup file is the only way to move or recover it.

1. **Export backup** — Settings → Export backup (JSON) downloads every entry currently in Track, exactly as stored.
2. **Keep it somewhere safe** — iCloud Drive, email it to yourself, wherever you won't lose it. The file is your only copy outside this device.
3. **Restore from file** — Settings → Restore from backup, pick the file, then confirm. This is destructive on purpose: it replaces everything currently in Track with the backup's contents.

> **⚠️ Restore replaces, it doesn't merge**
> Whatever's in Track when you restore gets wiped and swapped for the backup's contents. Export a fresh backup first if there's anything since your last one you don't want to lose.

---

*That's everything Track does.*
