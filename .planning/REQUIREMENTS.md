# Requirements (v1)

Scope is grouped by capability. Each requirement has a stable ID for traceability into phase plans.

## Auth & Access

- **REQ-A1** — App is gated by a single shared password. Unauthenticated requests redirect to `/login`.
- **REQ-A2** — The bcrypt'd password lives in a Baserow `app_config` row, NOT in an env var. Rotating = edit a row.
- **REQ-A3** — Login sets a signed httpOnly cookie; logout clears it. No "remember me" toggle (always remember on her phone).
- **REQ-A4** — Middleware enforces auth on every route except `/login`, `/api/auth/login`, `/api/cron/*` (protected by `CRON_SECRET`), and static assets.

## Baserow Schema (single source of truth)

- **REQ-B1** — Baserow tables created in the developer's Development workspace, one database per app:
  - `app_config` (id, key, value) — stores the password hash and any per-app settings
  - `events` (id, type, occurred_on [date], cycle_id [link, optional], notes, created_at) — types: `period_start`, `period_end`, `lh_surge`, `temp_rise`
  - `cycles` (id, start_date, end_date [null until next period], length_days [computed], luteal_length [computed], lh_surge_on, temp_rise_on, notes)
  - `symptoms` (id, name, category, severity, logged_at [datetime], notes, custom [bool])
  - `appointments` (id, occurred_on [date], clinic_name [default "CNY Fertility"], appointment_type, notes [long text], created_at, updated_at)
- **REQ-B2** — The Baserow client wrapper references fields by **Baserow field ID** (`field_1234`), never by display name — schema renames in the UI must not break the app.
- **REQ-B3** — The wrapper uses `user_field_names=true` only for human-readable debug views, not in production calls.
- **REQ-B4** — A nightly Vercel cron exports all rows from all tables to JSON (Vercel Blob or returned-as-response then forwarded somewhere durable). Backups are part of v1, not a v2 nice-to-have.

## Event Logging (sparse, when things happen)

- **REQ-L1** — She can log a **period start** in ≤1 tap on the today screen ("Period started today") and ≤2 taps for "yesterday" / pick-a-date.
- **REQ-L2** — She can log a **period end** with the same UX.
- **REQ-L3** — She can log an **LH surge** event with the date the LH strip was positive.
- **REQ-L4** — She can log a **ring temp rise** event with the date Ringconn showed elevated body temp.
- **REQ-L5** — All event logs are reversible: delete or edit the date.
- **REQ-L6** — Logging an event with the same type+date as an existing one is upserted, not duplicated.

## Symptom Logging

- **REQ-S1** — Predefined symptom catalog (≥15 items): cramping, bloating, breast tenderness, headache, irritable, anxious, weepy, fatigue, acne, spotting, nausea, back pain, hot flash, dizziness, food cravings.
- **REQ-S2** — Each symptom logged with date *and* time (default: now), optional severity (1-3 or low/med/high), optional notes.
- **REQ-S3** — Free-text **custom** symptom entry — saves the name so it shows up in autocomplete next time.
- **REQ-S4** — Symptom logging UI uses the "recent symptoms" chips + search box + categorized accordion pattern (not a 40-tile grid).
- **REQ-S5** — Symptoms can be backdated and edited.

## Appointment Notes

- **REQ-N1** — Create an appointment entry: date, clinic name (default "CNY Fertility"), appointment type (free text or short picklist: Initial consultation, Follow-up, Ultrasound, Bloodwork, Other), multi-line notes.
- **REQ-N2** — Edit notes any time after the appointment (she may add context days later).
- **REQ-N3** — All appointment notes appear in the PDF doctor report, ordered chronologically.

## Cycle Model & Prediction

- **REQ-P1** — Each `period_start` event opens a new cycle; the previous cycle's `end_date` and `length_days` are computed on the next period_start.
- **REQ-P2** — Personalized luteal phase: once ≥2 confirmed cycles exist with LH+ data, use her own LP median (clamped to 11-17 days). Until then, default LP = 14.
- **REQ-P3** — Fertile window for the current cycle is computed as `[predicted_ovulation - 5, predicted_ovulation + 1]`; peak = `[predicted_ovulation - 2, predicted_ovulation]` (Wilcox 1995).
- **REQ-P4** — Predicted ovulation is computed *backward* from predicted next period (`next_period - personalized_LP`), not forward from last period.
- **REQ-P5** — If an LH+ is logged in the current cycle, predictions defer to that signal: `ovulation ≈ LH_surge_date + 1 day` and the calendar forecast is suppressed for the rest of the cycle.
- **REQ-P6** — If a temp_rise is logged, ovulation is treated as *confirmed* (it's a confirmatory, lagging signal — 1-3 day lag).
- **REQ-P7** — **Cold-start rule**: before cycle 3 (i.e. <2 completed cycles with data), the today screen shows the wide range (CD 8–17 as possible fertile) labeled "not yet personalized" — no narrow predictions.
- **REQ-P8** — Confidence tier shown to user: Low / Medium / High. No fake percentages.

## Today Screen

- **REQ-T1** — Single central cycle ring (Clue-style) showing cycle day + phase label, color-coded.
- **REQ-T2** — 5 today-states: `menstrual`, `follicular_low`, `fertile_approaching`, `peak`, `confirmed_or_luteal`. Optional 6th: `late`.
- **REQ-T3** — One-tap "Log period start" and "Log symptom" actions visible without scrolling.
- **REQ-T4** — Shows confidence tier and, when relevant, the "we need more data" message instead of a fake prediction.

## Calendar View

- **REQ-C1** — Month view with these conventions:
  - Red dot — period day
  - Light green band — fertile window
  - Blue bullseye — predicted ovulation
  - Gold star — confirmed ovulation (LH+ or temp rise present)
  - Small symbol(s) — symptom logged that day
- **REQ-C2** — Tap a day → drawer with that day's events, symptoms, and a "log on this day" affordance.
- **REQ-C3** — Swipe / arrow to past/future months.

## Charts (Graphical View)

- **REQ-G1** — Cycle length over time (bar or line) — last 12 cycles.
- **REQ-G2** — LH-surge / temp-rise day relative to cycle start, per cycle (scatter or timeline).
- **REQ-G3** — Symptom frequency by category, last 90 days (bar chart).
- **REQ-G4** — Built with shadcn-charts (Recharts under the hood). Calendar heatmap via CSS grid, not a charting lib.

## PDF Export for Doctor

- **REQ-D1** — One-tap "Export PDF" from a top-level menu.
- **REQ-D2** — Page 1 = summary table: cycle #, start date, end date, length (days), LH+ day, ovulation confirmed Y/N, notes.
- **REQ-D3** — Page 2+ = one BBT-chart-shape page per cycle (cycle day on X, available data points on Y, vertical line at confirmed/predicted ovulation, red shading at period days). When BBT-like temp data is absent, show LH+/temp_rise markers only.
- **REQ-D4** — Appendix: symptom log (chronological) + appointment notes (chronological).
- **REQ-D5** — Footer on every page: "Patient-logged data. Not a clinical measurement." plus her name and the export timestamp.
- **REQ-D6** — Generated server-side with `@react-pdf/renderer` v4+, streamed from a Next.js Route Handler.

## Notifications (Pushover)

- **REQ-NT1** — Daily Vercel cron at ~08:00 her timezone (`0 13 * * *` UTC for ET-ish; final cron line set per her timezone) checks current cycle state.
- **REQ-NT2** — Sends Pushover push when: (a) we're 1-2 days before predicted fertile window starts, (b) entering peak window, or (c) prediction confidence is High and her last action was >7 days ago (nudge to log something).
- **REQ-NT3** — Title ≤250 chars, body ≤1024 chars (Pushover limits).
- **REQ-NT4** — On Pushover API failure, log to a Baserow `notification_log` row with the error. No retry — Hobby cron runs daily, next day handles it.
- **REQ-NT5** — Cron route handler is protected by `Authorization: Bearer ${CRON_SECRET}`.

## Operational

- **REQ-O1** — Nightly JSON backup of all Baserow tables (see REQ-B4).
- **REQ-O2** — No third-party analytics, ads, or trackers — ever.
- **REQ-O3** — All HTTPS. No HTTP redirects to login.
- **REQ-O4** — Honest about timezone: store events as date-only (no time) or datetime in UTC (for symptoms). The "today" pivot is computed in her configured timezone (stored in `app_config`).

## Visual Design

- **REQ-V1** — UI design is produced via the `frontend-design:frontend-design` skill before Phase 3 (the visual phase). It defines tokens, typography, spacing, color, and component patterns applied uniformly across today screen, calendar, charts, symptom log, appointments, and PDF.

---

## Deferred to v2 (NOT in scope now)

- Husband-facing UI / co-tracking
- HealthKit / Ringconn API integration
- Multi-user accounts
- Avoiding-pregnancy (FAM/NFP) mode
- Doctor-facing portal or shared-link export
- Native iOS/Android apps
- AI-generated insights / horoscope-style narratives

## Out of Scope (NOT planned)

- Selling, sharing, or analyzing user data
- Streaks, gamification, social features
- Mood/water/sleep/exercise scope creep beyond the symptom log
- Diagnostic claims of any kind
