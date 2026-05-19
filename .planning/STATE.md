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

## Credentials & Inputs — Resolved 2026-05-19

- [x] **GitHub** — push to a private GitHub repo. Repo name: `ovulation-tracker`.
- [x] **Vercel project name** — `ovulation-tracker`. Deploy via Vercel MCP.
- [x] **Baserow** — create a new database in the existing 1Password-managed Baserow workspace. API token lives in 1P (Development vault).
- [x] **Her timezone** — `America/New_York`. Stored in `app_config.timezone`.
- [x] **Initial password** — chosen by developer; bcrypt-hashed at setup time and written to `app_config.password_hash`. Never persisted in plaintext anywhere (not in git, not in env, not in STATE.md).
- [x] **Domain** — default `*.vercel.app` is fine for v1.
- [ ] **Pushover `PUSHOVER_USER`** — **BLOCKER for Phase 5 only**. She doesn't have a user key yet. Solution: she installs Pushover on her phone → she gets her own user key → developer adds it to Vercel env before Phase 5. Phase 5 infrastructure can be scaffolded in parallel; the actual send won't work until the user key is set.
- [ ] **Pushover `PUSHOVER_TOKEN`** — developer creates a new Pushover app at https://pushover.net/apps/build named "Ovulation Tracker" and provides the token. Can be done now, doesn't require her phone.

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
