# Ovulation Tracker — Pitfalls & Risks

Single-user TTC tracker for the developer's wife. Next.js on Vercel + Baserow + Pushover. Below: ten pitfalls, then a day-1 short list.

## 1. Data sensitivity / privacy

This is reproductive health data in a post-Roe US, sitting on a third-party DB (Baserow Cloud encrypts at rest with TLS 1.2+ in transit, but they hold the keys — not you). Realistic threat model is not the FBI; it is (a) Baserow account/email compromise, (b) a future subpoena targeting *her*, (c) you accidentally pushing a `.env` with the Baserow token to GitHub. Concrete moves: do not store free-text symptom notes in cleartext — encrypt the `notes` column app-side with a key in Vercel env vars (dates and enum symptoms can stay plain; you need them for queries). Do not log IPs or user agents in Vercel logs or your app's audit table. Register the Baserow + Pushover + Vercel accounts under an email that is not tied to her real name. Self-hosting Baserow on a Hetzner box you control is the paranoid-but-correct option if this matters.

## 2. Pushover failure modes

Pushover silently fails more than you think: (a) **1,024-char message body cap, 250-char title** — your "weekly summary" notification will get truncated; (b) **10,000 messages/month per app free tier** (changes to per-account May 2026) — irrelevant for one user but you will hit it during a logging-loop bug; (c) device key rotation when she gets a new phone — old user key keeps working but messages go to a dead device until she re-registers; (d) API returns 200 but device is offline / Do-Not-Disturb / app killed by Android battery optimizer. Your cron must: check the `status` and `receipt` fields, log the request_id, and on non-200 fall back to email (Resend) or at minimum write a `notification_failed` row in Baserow so the dashboard can show "last notification: FAILED 2 days ago." Never assume "I called the API" = "she saw it."

## 3. Vercel Cron pitfalls

Vercel Hobby allows cron only at **once-per-day** frequency and may fire anywhere in the specified hour (`0 8 * * *` runs 08:00–08:59). Pro is needed for sub-daily and minute-accurate firing. As of 2026 every plan gets 100 cron jobs per project. Vercel does **not retry failed cron invocations** — a 500 from your function or a deploy-time outage = silently skipped notification. Mitigations: (1) make the cron *idempotent* and have it check "did today's notification already go?" by reading Baserow, so a missed run can be replayed manually; (2) have the cron POST to a healthcheck (healthchecks.io free) every run — you'll get pinged when it misses; (3) put a "last notified" timestamp on the dashboard so she notices stale data even if you don't. If you need a 9am-sharp notification, you need Pro or an external scheduler (GitHub Actions cron, Cloudflare Workers cron) hitting a Vercel route.

## 4. Prediction confidence trap

The single worst UX failure mode: showing "Fertile window: May 14–19, ovulation May 17" with 95% visual confidence after one logged cycle. TTC is emotionally loaded; a wrong "you missed it" or false-positive fertile window causes real distress. With <3 cycles you have no signal — cycle length variance is ~±4 days even for "regular" women. UI rules: (a) show *no* prediction until cycle 2 is complete; (b) cycles 2–3 show a wide range with the words "estimated, low confidence — based on N cycles"; (c) never show a single ovulation *day*, always a window; (d) show the inputs the prediction is based on, not just the output ("predicted from cycles starting Jan 3, Feb 1, Mar 4"); (e) if she logged a positive LH test or temp shift, weight that over the calendar prediction and say so.

## 5. Date / timezone landmines

Cycle data is conceptually date-only (no time-of-day), but JavaScript and Postgres will betray you. Store cycle dates as `YYYY-MM-DD` strings or Postgres `DATE` (not `TIMESTAMP`) — a `TIMESTAMP` logged at midnight UTC becomes "yesterday" in PST. The cron runs in UTC on Vercel; "send notification at 9am her time" means computing her local 9am → UTC at job dispatch, accounting for DST shifts twice a year. Travel: if she logs in Tokyo, "today" should be Tokyo's date, not server UTC. Pick *her* timezone as a constant (e.g. `America/Los_Angeles`) stored in env, do all date math with `date-fns-tz` or `Temporal`, and never use `new Date().toISOString().split('T')[0]` on the server — that's UTC date, not her date. Write one `getTodayLocal()` helper and use it everywhere.

## 6. Baserow production gotchas

Specific landmines: (a) **Cloud free tier limits 10 concurrent API requests** with a fair-use policy that can throttle you further — fine for one user, dangerous if you add a polling dashboard; (b) **renaming a field changes nothing in the API; deleting and recreating it changes the field ID, which IS the API key (`field_1234`)** — this will break your code silently and is the #1 Baserow footgun. Use *field IDs* in code, never field names, and document the mapping in a `schema.ts` constant; (c) no schema migrations / versioning — manual changes in the UI are unrecoverable; export the schema to JSON in your repo; (d) **no real backup story you control** — Baserow does point-in-time recovery server-side but you can't restore yourself. Add a nightly Vercel cron that snapshots all rows to a JSON file in S3 or a private GitHub repo; (e) Baserow Cloud outages = your app is down with no fallback. The dashboard should degrade gracefully (cached "last known state") rather than show a stack trace.

## 7. Symptom logging open-text trap

If she types "kinda crampy, sorta" one day and "mild cramps" the next, you cannot chart it in 6 months. Rule: every symptom is a structured enum (cramps, headache, mood, cervical mucus type, LH test result) with a *severity* 0–3 and an *optional* free-text note. The free-text is for human memory, never for analysis. Lock the enum list down on day 1 — adding "bloating" in month 3 is fine; renaming "mucus_egg_white" to "fertile_mucus" later means a migration. Pull the taxonomy from an existing app's vocabulary (Kindara, Read Your Body) so you're not reinventing. For LH/pregnancy tests, structured fields only: `test_type`, `result` (neg/faint/pos/strong_pos), `time_of_day`.

## 8. PDF export & doctor liability

The doctor is going to glance at this PDF for 90 seconds. If your "average cycle length: 28 days" silently excludes the cycle where she forgot to log the start, the doctor sees the wrong number and reasons from it. Required: (a) every aggregate shows `n=` and date range; (b) any cycle with missing data is flagged as "incomplete" in the report, not silently dropped; (c) raw daily log table is included as an appendix so the doctor can audit; (d) a header on page 1: *"Patient-logged data. Not a medical device. Timestamps are self-reported and not clinically verified. For discussion with provider only."* (e) include the app version and export date — when you fix a bug in cycle-length math six months from now, the doctor needs to know which version produced the PDF. Do not include predictions in the doctor PDF — only logged facts.

## 9. Scope creep risks

Features that sound like a weekend and aren't: BBT charting with auto-detected temp shift (coverline algorithm is a rabbit hole), partner login / shared access (multi-user auth, permissions, you said single-user), Apple Health / Oura / Whoop sync (each is a separate OAuth + data model), AI symptom analysis or LLM summaries (cost, hallucination risk on health data, you do not want a model speculating), photo logging of LH strips with CV (an entire ML project), pregnancy mode after conception (different data model, different cron, different UI), push notifications via FCM/APNs instead of Pushover (months of native work), social/community features (do not). Cut: everything except date logging, structured symptoms, one prediction, one notification, one PDF.

## 10. The one thing you'll regret in 6 months

**Write an export script on day 1 and run it on every deploy.** A single command that dumps every Baserow row to versioned JSON in the repo (or S3). When Baserow has an outage, when you delete a field by mistake, when you want to migrate off Baserow, when the doctor asks for "all data since January" — you will have it. Six months of cycle data is irreplaceable; she cannot re-log it. The second you can't `git log` your way back to last Tuesday's state, you have a data loss bomb.

---

## Top 3 things to do day 1

1. **Automated nightly JSON export of all Baserow data** to a private location you control (S3 or private GitHub repo). Non-negotiable.
2. **Reference Baserow fields by ID, not name, in code** — store the ID→name mapping in `lib/schema.ts` and never let it drift.
3. **Hard rule in the UI: no predictions before cycle 3, always show a window not a day, always show `n=` and the input cycles.** Bake this into the component, not into your discipline.

---

Sources:
- [Vercel Cron Jobs Usage & Pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [Vercel Cron 100-per-project changelog](https://vercel.com/changelog/cron-jobs-now-support-100-per-project-on-every-plan)
- [Vercel Hobby Plan limits](https://vercel.com/docs/plans/hobby)
- [Pushover message size & frequency limits](https://support.pushover.net/i12-message-size-and-frequency-limitations)
- [Pushover API limit changes May 2026](https://blog.pushover.net/posts/2026/4/app-limits)
- [Pushover API reference](https://pushover.net/api)
- [Baserow FAQ (encryption, backups)](https://baserow.io/faq)
- [Baserow API rate limits discussion](https://community.baserow.io/t/api-limits-throttling/1588)
- [Baserow free tier limits](https://community.baserow.io/t/baserow-free-tier-limits/211)
