# Roadmap

5 phases, quick depth. Each phase has a single observable success criterion. We ship the **today + log path** end-to-end first (Phases 1–2), then layer on viewing/charts/PDF/notifications.

## Phase 1 — Foundation

**Goal:** the app exists at a Vercel URL, gated by a password stored in Baserow, with the full data schema provisioned and a sanity-checked Baserow client.

- **1.1** Scaffold Next.js App Router app (TypeScript, Tailwind, shadcn/ui base components: Button, Input, Card, Sheet, Drawer, Calendar, Form, Toast).
- **1.2** Create the Baserow database + 5 tables (`app_config`, `events`, `cycles`, `symptoms`, `appointments`) via the Baserow MCP. Record every field's numeric ID into `lib/baserow/schema.ts`.
- **1.3** Write a typed Baserow fetch wrapper (Zod schemas, field-ID-based, paginated). Smoke test by reading + writing one row of each table.
- **1.4** Implement password gate: bcrypt hash stored in `app_config`, login route, signed httpOnly cookie, middleware enforcement, logout.
- **1.5** Deploy to Vercel. Set env vars (`BASEROW_API_TOKEN`, `BASEROW_DATABASE_ID`, `CRON_SECRET`, `PUSHOVER_TOKEN`, `PUSHOVER_USER`, `SESSION_SECRET`).

**Success:** Visit the deployed URL on her phone → redirected to login → enter password → land on an empty placeholder dashboard. A nightly cron is scheduled (even if it does nothing yet).

**Covers:** REQ-A1..A4, REQ-B1..B3, REQ-O3.

---

## Phase 2 — Logging Surfaces

**Goal:** she can capture every kind of data the app cares about, with the right speed.

- **2.1** Event logging: period start, period end, LH surge, temp rise. One-tap "today" + two-tap "yesterday/pick-date" for each. Upsert by (type, date). Edit / delete affordances.
- **2.2** Symptom logging: predefined catalog (≥15), recent-chips + search + accordion UI, custom symptom save-and-suggest, datetime, severity, notes, edit/delete.
- **2.3** Appointment notes: list + create + edit. Defaults clinic to "CNY Fertility". Multi-line notes field.
- **2.4** Cycle derivation: a server-side computation that walks `events` ordered by date and (re)builds `cycles` rows. Re-run on every event mutation.

**Success:** She can record her last 1-2 cycles' worth of data on her phone in <10 minutes total, including symptoms and her upcoming CNY appointment placeholder, and the `cycles` table reflects what she entered.

**Covers:** REQ-L1..L6, REQ-S1..S5, REQ-N1..N3, REQ-P1.

---

## Phase 3 — Visual Design + Today/Calendar Views

**Goal:** she opens the app and can see — at a glance — where she is and what's coming.

- **3.1** Invoke `frontend-design:frontend-design` skill. Produce design tokens (color, typography, spacing, radii) + component patterns. Output: `docs/design.md` + applied Tailwind theme + reskinned base components from Phase 1.
- **3.2** Today screen: Clue-style cycle ring, 5 today-states, confidence tier, today's logged-events, one-tap "log period" + "log symptom" actions, "we need more data" cold-start message.
- **3.3** Prediction engine: pure functions in `lib/predict/`. Inputs: cycles, events. Outputs: today_state, predicted_ovulation_window, peak_window, confidence_tier, next_period_eta. Implements REQ-P2..P8 including the LH+ override and the cycle-3 cold-start guard.
- **3.4** Calendar view: month view with the red/green/blue/gold conventions, tap-day → drawer, month nav.

**Success:** Open app → see ring, status, confidence; tap calendar → see her real cycle history visualized with the universal conventions. Cold start displays the wide range with the "not personalized" label, not a confident-sounding fake.

**Covers:** REQ-P2..P8, REQ-T1..T4, REQ-C1..C3, REQ-V1.

---

## Phase 4 — Charts + Doctor PDF + Backup

**Goal:** she can show this to her doctor without explaining it.

- **4.1** Charts page: cycle length over time, LH+/temp-rise relative-to-cycle scatter, symptom frequency 90-day bar. shadcn-charts.
- **4.2** PDF export route: `@react-pdf/renderer`, streamed. Page 1 summary table, page 2+ per-cycle BBT-shape, appendix with symptoms + appointment notes, footer disclaimer + name + export timestamp.
- **4.3** Nightly JSON backup cron: dumps all 5 tables to Vercel Blob (private) under `backups/YYYY-MM-DD.json`. Keeps last 30. Pushover alert on failure.

**Success:** Tap "Export PDF" → get a clean, doctor-ready PDF in <10s. A backup ran last night and is in Vercel Blob.

**Covers:** REQ-G1..G4, REQ-D1..D6, REQ-B4, REQ-O1.

---

## Phase 5 — Pushover Notifications

**Goal:** the app proactively nudges her at the right moments.

- **5.1** Daily cron at 08:00 her timezone (`vercel.ts` config), reads `app_config.timezone`. Determines today's state via the Phase-3 prediction engine.
- **5.2** Notification rules: (a) 1-2 days before fertile window, (b) entering peak, (c) >7 days no activity nudge. Pushover POST with 250-char title + 1024-char body limits enforced.
- **5.3** `notification_log` table in Baserow (added in this phase, not Phase 1) records sends + failures. View page in-app to inspect history.

**Success:** She gets a real Pushover push 1-2 days before the next predicted fertile window, with the right wording and link back to the today screen.

**Covers:** REQ-NT1..NT5.

---

## Sequencing & Dependencies

```
Phase 1 ─┬─▶ Phase 2 ─┬─▶ Phase 3 ─┬─▶ Phase 4
         │            │            └─▶ Phase 5
         │            │
         └────────────┴── (cron secret + Pushover wiring stubbed in Phase 1)
```

Phases 4 and 5 are independent and can run in parallel after Phase 3.

## What Counts As "Done"

The whole project is done when:
- She has used the app for at least 2 full cycles
- Predictions in cycle 3+ are personalized (not population-default)
- She has received at least one accurate fertile-window Pushover nudge
- She has handed at least one PDF to her CNY Fertility doctor
- The backup folder in Vercel Blob has at least 14 nightly snapshots

Until those things are true, "v1" is not actually shipped — only released.
