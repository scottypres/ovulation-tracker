# Ovulation Tracker

## One-Liner

A simple, password-protected web app for tracking ovulation and cycle data to support trying-to-conceive (TTC) — minimal logging burden, learning predictions, push-notification nudges.

## Who It's For

A single user: the developer's wife. Not a multi-tenant product. No public signup, no marketing surface. The husband (developer) configures and maintains it; she uses it.

## Core Value (The One Thing That Must Work)

**She opens the app, sees where she is in her cycle and whether she's in (or approaching) her fertile window, with prediction quality that improves over a few cycles as data accumulates.**

If that works, the app succeeds. Everything else is supporting infrastructure.

## Primary Goals

1. **TTC support** — identify and predict the fertile window
2. **Cycle awareness** — understand patterns over time
3. **Low-friction logging** — she's not disciplined about tracking; the app must work with sparse, event-based entry rather than daily logging

## How She Uses It

### Event logging (sparse, when things happen)
- **Period start** — tap on the date bleeding began
- **Period end** — tap on the date bleeding stopped
- **LH surge detected** — tap on the date she got a positive LH strip
- **Ring temp increase** — tap on the date Ringconn showed elevated body temperature

### Symptom logging (arbitrary date/time)
- Exhaustive predefined list: cramping, bloating, breast tenderness, headache, mood changes (irritable / anxious / weepy), fatigue, acne, spotting, nausea, back pain, etc.
- Free-text custom symptom entry
- Logged with date *and* time (not just date) so patterns within a day can surface
- Optional severity / notes per entry

### Viewing
- **Today screen**: where she is in cycle, today's fertility status, predicted fertile window
- **Calendar view**: month view showing periods, fertile window, events, symptoms
- **Charts / graphical view**: cycle length over time, symptom frequency, fertile-window history, LH/temp event timeline relative to cycle days — visual patterns she can scan in seconds
- **PDF export for her fertility doctor**: one-tap export that produces a clean, doctor-friendly PDF report (cycle history table, symptom log, event log, charts, *plus the appointment-notes log*). She brings it to appointments.

### Appointment notes (fertility clinic)
- She has a first consultation with **CNY Fertility** in a few weeks; follow-ups will follow
- A simple "Appointments" section where she can:
  - Create an appointment entry (date, clinic name pre-filled "CNY Fertility", appointment type — e.g. "Initial consultation", "Follow-up", "Ultrasound", "Bloodwork")
  - Take free-text notes during or after the appointment (multi-line, markdown-friendly is fine, plain textarea is also fine)
  - Edit notes after the fact (she may add context later)
- v1 starts with just the initial consultation; supporting any number of follow-up appointments is the same code path — no special-casing the first one
- Appointment notes are included in the PDF export so the doctor (and she) can see continuity across visits

## What The App Does In The Background

- Persists all data in Baserow (single source of truth)
- Maintains a predictive model of her cycle that calibrates over ~2-3 cycles
- Sends Pushover push notifications when fertile window is approaching
- Only her phone gets nudges; the husband does not get notifications

## Prediction Approach

- **Cycles 1-2 (cold start)**: Use population averages — luteal phase ≈ 14 days, ovulation ~14 days before next period. Show predictions with explicit low-confidence markers.
- **Cycles 3+ (calibrated)**: Use her own cycle-length history + LH-surge dates + ring-temp-increase dates to refine the predicted fertile window. Confidence increases with data.
- **LH surge** is treated as the highest-fidelity real-time signal; **ring temp increase** confirms ovulation has occurred.
- The app should be honest about uncertainty. Don't fake precision.

## Non-Goals (Explicit Out of Scope)

- ❌ Multi-user accounts, signups, social features
- ❌ Daily mandatory logging (BBT measurements, manual mucus checks, etc.) — she won't do it
- ❌ Ringconn API integration (no public API known; manual entry of the event is sufficient)
- ❌ Apple HealthKit integration (out of scope for v1)
- ❌ Husband-facing notifications or coordination features
- ❌ Avoiding-pregnancy (FAM/NFP) features — this app is for TTC, not contraception
- ❌ Medical-grade claims or diagnostic conclusions (the PDF export is a *data summary* for her doctor, not a diagnosis)
- ❌ Public hosting / marketing / app store distribution

## Constraints

- **Single user, but treat data as medical-sensitive**: password gate, HTTPS only, no analytics, no third-party trackers
- **Phone-first UX**: she'll use it on her phone almost exclusively. Desktop view should work but is not the focus.
- **Stack defaults** (per developer environment):
  - **Frontend/backend**: Next.js App Router on Vercel
  - **Database**: Baserow (Development workspace) via REST API
  - **Notifications**: Pushover (developer has Pushover keys ready to provide)
  - **Auth**: simple shared-password gate (single-user app — no need for full identity)
- **Honest predictions over impressive predictions**: better to say "we need more data" than to fake precision
- **Design via the `frontend-design:frontend-design` skill**: when we hit the UI/visual design phase, invoke that skill rather than freelancing styles. It produces a coherent visual system (typography, spacing, color, component patterns) that we apply across the today screen, calendar, charts, symptom log, appointments, and PDF — instead of one-off Tailwind choices per screen.

## Success Criteria

The app is successful when:
- [ ] She can log a period-start event in <5 seconds from opening the app
- [ ] She can log a symptom (predefined or custom) in <10 seconds
- [ ] The today-view tells her clearly whether she's in/near her fertile window
- [ ] After 2-3 cycles of data, fertile-window predictions are based on *her* history, not averages
- [ ] She receives a Pushover notification 1-2 days before predicted fertile window begins
- [ ] She can view her cycle data in charts (cycle length over time, event timeline, symptom frequency) on her phone
- [ ] She can tap "Export PDF" and get a clean, doctor-ready report she can hand or email to her fertility doctor
- [ ] All data lives in Baserow, accessible to the developer for inspection / migration / backup
- [ ] No third-party trackers, ads, or analytics ever touch the app
