# Track

A single-user, local-only Progressive Web App for tasks, work schedules, school
assignments, appointments, meal plans, shopping lists, errands, and travel
dates — installed to your phone's home screen via Safari, with every entry
stored only in that device's browser storage. No account, no backend, no data
ever leaves the device.

**Live app:** https://kalimuthukrishnaraj.github.io/Track/

## Why local-only

Track was deliberately built without a backend or cloud sync — see
[`architecture.md`](architecture.md) for the reasoning. That also means there's
no way to recover lost data except a manual backup: **Settings → Export
backup** in the app is the actual disaster-recovery path, not optional.

## Repo layout

This top-level folder holds project docs only. All application source lives
under [`App/`](App) (capital A) — see [`App/README.md`](App/README.md) for
local dev setup, build/test commands, and the project's code layout.

| File | What it's for |
| --- | --- |
| [`architecture.md`](architecture.md) | Authoritative design spec: stack, data schema, screens, reminder/backup strategy |
| [`acceptance-criteria.md`](acceptance-criteria.md) | Testable pass/fail checks (AC1.1, AC6.4, …) behind each build phase |
| [`build-status.md`](build-status.md) | Running log of what's built, tested, decided, and still open |
| [`CLAUDE.md`](CLAUDE.md) | Instructions for working on this repo with Claude Code |

## Status

All 5 build phases are implemented, deployed, and live via GitHub Actions →
GitHub Pages on every push to `main`. See `build-status.md` for the current
state, verified acceptance-criteria results, and open items.
