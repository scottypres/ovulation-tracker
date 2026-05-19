# Project State

> Last updated: 2026-05-19 (initialized)

## Current Position

**Phase:** Pre-execution. Initialization complete.

**Next action:** `/gsd:plan-phase 1` to plan Phase 1 (Foundation).

## Completed

- [x] PROJECT.md (vision + scope + constraints)
- [x] config.json (YOLO / Quick / Parallel / Research-first)
- [x] 4 parallel research streams (`research/01-prediction-algorithm.md`, `02-stack-patterns.md`, `03-similar-app-ux.md`, `04-pitfalls.md`)
- [x] REQUIREMENTS.md (v1 scope, grouped by capability)
- [x] ROADMAP.md (5 phases, quick depth)
- [x] STATE.md (this file)

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | Foundation | not started |
| 2 | Logging Surfaces | not started |
| 3 | Visual Design + Today/Calendar Views | not started |
| 4 | Charts + Doctor PDF + Backup | not started |
| 5 | Pushover Notifications | not started |

## Credentials & Inputs Needed From User Before Phase 1 Executes

The husband (developer) needs to provide / confirm before we can scaffold:

- [ ] **GitHub repo decision** — keep `ovulation-tracker` local-only? Or push to a private GitHub repo? Vercel deploys from Git.
- [ ] **Vercel project name** — default is `ovulation-tracker`.
- [ ] **Baserow** — confirm the existing Development workspace is where we create the database, or specify another. (Will use Baserow MCP `list_databases` to confirm.)
- [ ] **Baserow API token** — needs `read+write` scope on the new database. To be stored in Vercel as `BASEROW_API_TOKEN`.
- [ ] **Pushover credentials** — developer said he has them ready:
  - `PUSHOVER_TOKEN` (app token — one per app)
  - `PUSHOVER_USER` (her user/group key — *not* his)
- [ ] **Her timezone** — for the daily cron (e.g. `America/New_York`). Stored in `app_config`.
- [ ] **Initial password for her** — chosen by the husband, bcrypt-hashed at setup time, written to `app_config`.
- [ ] **Custom domain?** — or use the default `*.vercel.app`? (Recommend default for v1; a real domain is fine if he wants it.)

## Decisions Locked

These are settled and should not be re-debated unless circumstances change:

- Stack: Next.js App Router on Vercel, TypeScript, Tailwind, shadcn/ui
- DB: Baserow (Cloud), accessed via hand-rolled fetch wrapper with Zod + Baserow field IDs
- Auth: bcrypt password in Baserow `app_config`, signed httpOnly cookie, middleware-enforced
- Notifications: Pushover via Vercel Cron (daily, Hobby plan acceptable)
- PDF: `@react-pdf/renderer` v4+, server-streamed from Route Handler
- Charts: shadcn-charts (Recharts); CSS-grid for calendar heatmap
- Predictions: anchor backward from next-period; LH+ overrides; ≥2 cycles to personalize; honest cold-start labeling
- Backup: nightly JSON dump to Vercel Blob, 30-day retention
- Design: produced via `frontend-design:frontend-design` skill in Phase 3, applied across all surfaces + PDF
- Out of scope for v1: husband features, HealthKit, Ringconn API, multi-user, FAM/NFP

## Open Questions / To Resolve Before Phase 3

- Confirm cycle-day naming with her: do we show "Day 12 of cycle" or "CD12"? (clinical shorthand is "CD12" but may feel cold)
- For the calendar drawer: does she want a free-text "day notes" field separate from symptom logs?
- For the PDF: include her name? Husband's name? Date of birth? (Doctor will ask — pre-filling these is a nice touch.)

## Known Risks (from research/04-pitfalls.md)

Highest-leverage things to watch:
- Baserow field-rename can silently break the app — always reference by field ID
- Vercel Hobby cron has 1-hour fire window and no auto-retry
- Cold-start predictions are emotionally fraught for TTC users — UX must label uncertainty
- Pushover changes from per-app to per-account quotas on 2026-05-01
