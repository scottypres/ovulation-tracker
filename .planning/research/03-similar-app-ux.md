# Similar App UX Research: What to Steal, What to Skip

Single-user TTC tracker. Opinionated picks only.

## Today / Home Screen: One-Glance Cycle Position

Every major app (Flo, Clue, Ovia, Stardust, Natural Cycles) centers the home screen on a **single dominant element** that answers "where am I?" Patterns:

- **Flo + Clue**: large central circle/donut. Color = phase (pink period, blue fertile, white luteal). Center text = "Day 14" with a phase label.
- **Natural Cycles**: ditches the ring entirely and shows a flat color status — Red Day / Green Day — optimized for "can I have sex without a condom right now."
- **Ovia**: a numeric **fertility score** (0-10) + cycle day, no ring.
- **Stardust**: a beautiful cosmic ring, but recent updates buried the cycle day itself, which users hated.

**Recommendation — copy Clue's circle, simplified.** A single ring with the cycle day number ("Day 14") large in the center, a phase label below ("Fertile Window"), and a soft color fill matching the phase (red = period, green = fertile, blue = ovulation predicted, gray = luteal). No horoscopes, no insights cards above the fold. Underneath: one "Log" button. That's the whole home screen.

## Period Start: Tap Count Target

- **Flo**: tap "Log Period" tile → calendar → tap today → confirm. ~3 taps, plus a paywall interstitial in some builds.
- **Apple Health Cycle Tracking**: swipe to day → tap oval → done. **2 taps.**
- **sCycle / Period Tracker by GP Apps**: marketed as "one tap to start period." 1 tap on home, modal closes itself.
- **Clue**: tap "+" → tap "Period" → tap "Light/Medium/Heavy" → save. ~3-4 taps.

**Recommendation — target 1 tap for "today," 2 taps for "yesterday."** Home screen has a primary "Log Period Start" button. Single tap = logs today, toast says "Period started today — undo." For yesterday/earlier, the button long-presses or expands to a date picker pre-set to today with arrow keys for ±days. Same pattern for period end. Do not ask for flow heaviness at log time — it's a TTC app, the doctor wants start/end dates, not flow intensity.

## Symptom Logging: Cleanest Pattern

Where consumer apps fail: Flo shows ~40 symptom tiles in a grid with no hierarchy; Clue uses categorized tabs but still drowns in icons; Stardust adds astrology categories on top.

What actually works:
- **Recent-first list.** Last 5 symptoms she logged appear at the top as one-tap chips.
- **Search box** above a categorized list (Physical / Cervical Mucus / Mood / Custom). Type "cra" → cramps. Beats scrolling a 40-tile grid every time.
- **Date+time defaults to "now"** with an inline edit. Backdating must be 1 tap to "yesterday."
- **Custom entry inline.** No separate "create custom symptom" screen — type a new name in the search box, hit "+ Add as new."

**Recommendation:** Top section = "Recent" chips. Search-first input. Categorized accordion below for browse. Custom symptoms created inline. Default timestamp = now, editable. This is the Ovia "tap counter + minimal options" philosophy applied to a search-first UI.

## Calendar View: Universal Conventions

Conventions she'll already recognize from any tracker she's tried:

- **Red dot or red fill** = period day (intensity by shade in Clue; we don't need intensity)
- **Blue or green band** = fertile window (Clue uses light blue; Flo uses cyan; Natural Cycles uses solid green/red day fills)
- **Star or bullseye on a single day** = predicted ovulation (Flo uses a sparkle; Ovia uses a target)
- **Open circle / dotted ring** = predicted (not yet logged); solid = confirmed
- **Small icon under date** = logged symptom present

**Recommendation:** Red dot for period, light green band for fertile window, blue bullseye for predicted ovulation, gold star for **confirmed** ovulation (LH+ logged or ring-temp shift detected). Tiny dot under any day with a logged symptom. Solid = recorded, outlined = predicted. Stick to red/green/blue/gold — no rainbow.

## What to AVOID

1. **AI/horoscope/insight cards above the cycle data.** Flo and Stardust bury the actual tracker under "Your daily insight: Mercury is in retrograde, you might feel bloated." For one user who already knows her body, this is pure noise. No content marketing in the app.
2. **Paywall dark patterns / streaks / gamification.** Flo's "complete your daily check-in!" streak nag, Natural Cycles' long onboarding-then-paywall flow, and engagement-bait notifications all exist to drive retention metrics, not to help the user. No streaks, no badges, no "you haven't logged in 3 days" guilt pushes. Pushover notifications should fire only on **actionable events** (predicted fertile window starts tomorrow; LH test reminder; period overdue by X days).
3. **Scope creep into mood/weight/exercise/water/sleep.** Every app eventually adds these and they crowd out the core. This app tracks: period dates, LH surge, temp shift, symptoms. That's it. Resist the urge to add a mood emoji grid.

Bonus avoid: **never share data with third parties.** Flo paid $56M in 2025 for sharing cycle data with Meta. This is a self-hosted single-user app — there's no excuse for any analytics SDK.

## PDF Report for the Fertility Doctor

What reproductive endocrinologists actually look at (per ACOG and RMA guidance):

1. **Cycle length history** — a simple table: cycle #, start date, end date, length in days, plus mean/min/max. Identifies irregularity, anovulatory cycles, luteal phase defects.
2. **BBT-style chart shape** — the standard fertility chart is a line graph: X-axis = cycle day (1-35), Y-axis = temperature, dot per day connected by line, **vertical line at confirmed ovulation**, period days shaded red along the X-axis. Even if she's using ring temp (not oral BBT), the *shape* — pre-ovulatory low plateau, mid-cycle shift, post-ovulatory high plateau — is what the doctor reads in 5 seconds.
3. **LH-positive dates relative to cycle day** — mark on the BBT chart and in the cycle table ("LH+ on CD 13"). This is the single most useful TTC data point.
4. **Symptom log as a timeline** — not a wall of text. Date + symptom, grouped by cycle, only symptoms relevant to fertility (cervical mucus changes, cramping, spotting, breast tenderness). Skip the headache log.
5. **Summary header** — patient name, date range, # cycles, average cycle length, average luteal phase length. The doctor reads this first.

**What makes a PDF junk vs useful:** Junk = app-branded marketing, mood emojis, generic horoscope insights, missing dates. Useful = one chart per cycle (overlay multiple cycles optional), confirmed events distinguished from predictions, printable in black-and-white without losing meaning, page 1 is the summary table.

**Recommendation:** Two-section PDF. Page 1: summary table (cycles, lengths, LH+ days, ovulation confirmed Y/N). Page 2+: one BBT-shape chart per cycle with LH+ and period overlaid. Symptoms as a compact appendix table. Generate it with a real chart library (not screenshots of the app UI).

## 3 to Copy / 3 to Skip

**Copy:**
1. Clue's single central ring with cycle day + phase label (no clutter above the fold).
2. Apple Health's 1-tap "log period today" pattern, expanded for backdating to yesterday with one more tap.
3. Standard BBT chart shape (CD on X, temp on Y, vertical line at ovulation, red shading at period) for the doctor PDF.

**Skip:**
1. Flo/Stardust-style insight/horoscope/article cards above the tracker.
2. Streaks, badges, daily check-in nags, and any engagement gamification.
3. The 40-tile symptom grid — use recent chips + search + categorized accordion instead.

## Sources

- [Flo design critique – IXD@Pratt 2025](https://ixd.prattsi.org/2025/09/design-critique-flo-ios-app/)
- [How Flo evolved its main screen – Flo Health on Medium](https://medium.com/flo-health/how-we-evolved-and-enriched-the-main-screen-of-the-flo-app-part-1-stories-cee6f4035e5)
- [Flo design critique – Emily Tran on Medium](https://medium.com/@emilytranthi/design-critique-for-flo-bc6baffb1dd1)
- [Clue cycle view colors – Clue Support](https://support.helloclue.com/hc/en-us/articles/7955444726164-What-do-the-different-colors-in-the-Cycle-View-mean)
- [Track Your Cycle with Clue Plus](https://helloclue.com/articles/how-to-use-clue/how-to-use-clue-plus)
- [Natural Cycles – how it works](https://www.naturalcycles.com/how-does-natural-cycles-work)
- [Natural Cycles vs Flo vs Clue](https://www.naturalcycles.com/nc-vs-competition)
- [Stardust app review – SheRanked](https://www.sheranked.com/app-reviews/stardust-)
- [Stardust UI breakdown – ScreensDesign](https://screensdesign.com/showcase/stardust-period-pregnancy)
- [Ovia Fertility – how it works](https://www.oviahealth.com/guide/74/how-does-ovia-fertility-work/)
- [Ovia app development analysis](https://medium.com/@itsconsagous/guide-to-developing-a-pregnancy-tracker-app-like-ovia-9fa377ec633e)
- [Apple Cycle Tracking support](https://support.apple.com/en-in/120356)
- [sCycle one-tap period tracker](https://apps.apple.com/us/app/scycle-period-tracker/id6744582445)
- [Femtech Design Desk – Flo + Meta data sharing](https://femtechdesigndesk.substack.com/p/your-period-tracking-app-has-been)
- [Ethical challenges of digital menstrual tracking – Inserm](https://inserm.hal.science/inserm-03830965/document)
- [ACOG – Evaluating Infertility](https://www.acog.org/womens-health/faqs/evaluating-infertility)
- [RMA – Detecting LH Surge with OPKs](https://rmanetwork.com/blog/lh-surge-when-detect-peak-fertility-opk/)
- [Mira – Ovulation Hormone Chart](https://shop.miracare.com/blogs/resources/ovulation-hormone-chart)
- [Taking Charge of Your Fertility – downloadable charts](https://www.tcoyf.com/downloadable-charts/)
- [Cleveland Clinic – BBT method](https://my.clevelandclinic.org/health/articles/21065-basal-body-temperature)
