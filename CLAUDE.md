# Track — Project Instructions

Track is a single-user, local-only PWA for tasks, work schedules, school assignments, appointments, meal plans, shopping lists/needs, errands, and travel dates.

**Read `architecture.md` in this folder first — it is the authoritative architecture and build spec.** Follow it for the stack, data schema, screens, and the reminder/backup strategy. Do not introduce a backend, cloud sync, or a native mobile wrapper (React Native/Expo, etc.) — the local-only, browser-based PWA design in that doc was a deliberate decision made after weighing alternatives, not a placeholder to reconsider.

**Read `acceptance-criteria.md` before testing/verifying any phase.** It has the detailed, testable checks (IDs like AC1.1, AC6.4) behind each phase's short "Done when" line in `architecture.md`. Use it as the actual verification checklist, and report which specific IDs passed or failed rather than a vague "it works."

**Read `build-status.md` before doing anything else.** It's the running log of what's already built, tested, and decided — including a couple of decisions that extend or slightly diverge from `architecture.md`'s original wording (folder casing, the router choice for GitHub Pages). Keep it updated as you go: append what changed, what you verified, and what's still open, rather than leaving status only in chat/commit messages.

## Folder layout

This top-level folder (`Track/`) holds project docs only: `architecture.md`, `acceptance-criteria.md`, `build-status.md`, and this file, plus `.github/workflows/` for CI.

**All application source code lives in the `App/` subfolder** — note the capital A. `architecture.md`'s own prose refers to it as `app/` (lowercase); the actual folder on disk is `App/`, chosen when the project was first built out. Everything under "Project setup" and "Suggested folder structure" in `architecture.md` should be read as relative to `App/`, with that one casing correction. This matters concretely in `.github/workflows/deploy.yml`, which runs on `ubuntu-latest` (case-sensitive filesystem) — it already uses `App` throughout; don't "fix" it back to lowercase.

## Current status (see `build-status.md` for full detail)

All 5 build phases are already implemented: data layer, Agenda, Tasks/Meals/Shopping, calendar export (.ics with per-type VALARM), and backup/restore. Type-check, `npm run build`, and the Vitest domain-layer suite (`npm test`, 22 tests) all pass. Don't re-scaffold the Vite project or rebuild phases from scratch — read `build-status.md` first, then work incrementally from there (bug fixes, the remaining acceptance-criteria items, deployment, real app icons, etc.).

Two decisions worth knowing about before touching routing or hosting config:
- **Router**: `src/App.tsx` uses `HashRouter`, not `BrowserRouter`. This is deliberate — GitHub Pages is a static host with no server-side rewrite, so a direct load of a path like `/Track/tasks` would 404 under history-API routing, while hash routes always resolve to `index.html`. Don't switch back to `BrowserRouter` without also solving that 404 problem (e.g. a 404.html redirect trick) and re-testing on the actual host.
- **Vite `base`**: `App/vite.config.ts` sets `base: '/Track/'` to match this repo's name, since it's deployed as a GitHub Pages project site at `https://<user>.github.io/Track/`. If the repo is ever renamed or moved to a `<user>.github.io` root repo, this needs to change too (back to `/`), and the PWA manifest's `start_url`/`scope` (same file) need to stay in sync with it.

GitHub Pages deployment is set up (`.github/workflows/deploy.yml`, builds+tests+deploys on push to `main`) but as of this writing the repo has not been `git init`'d/pushed yet, and GitHub's Settings → Pages hasn't been switched to "GitHub Actions" as the source. Check `build-status.md` for the latest state of this before assuming it's live.

## How to work through this project

Build in the order listed under "Build phases & acceptance criteria" in `architecture.md` — but since all 5 phases are already done, this now means: pick up open items from `build-status.md`, verify against the relevant section(s) of `acceptance-criteria.md` before calling something done, and update `build-status.md` with the result. Report status (including which AC IDs were checked and their result) to the user before moving on to the next thing — don't silently batch multiple unrelated changes into one unreported pass.

If a decision comes up that `architecture.md` doesn't cover, make the call that's most consistent with the existing design (single user, local-only, no backend, minimal dependencies) and say what you decided and why, rather than silently deviating from the spec or guessing without flagging it. Log the decision in `build-status.md` the same way the router/base-path decisions above are logged, so the next session doesn't have to rediscover it.
