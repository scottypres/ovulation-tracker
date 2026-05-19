# Prediction Algorithm — Research Notes

Scope: predicting the fertile window from sparse events (period start/end, positive LH strip date, Ringconn temperature-rise date). TTC, not contraception. No BBT, no daily mucus, no HealthKit.

Key clinical constants (cited):
- Fertile window = 6 days: ovulation day + 5 days prior (Wilcox et al., NEJM 1995).
- Sperm survival: ~94% of pregnancies from sperm <3 days old; none from sperm >5 days old (Wilcox 1995).
- Luteal phase: mean 14.13 ± 1.41 days; normative range 11–17 days; full observed range 7–18 (Lenton et al., 1984).
- LH surge → ovulation: onset ~36h before, peak ~10–12h before; ovulation typically 24–36h after a positive OPK (RMA, Healthline).
- BBT/skin-temp rise lags ovulation by ~1–3 days, driven by progesterone (StatPearls; Tempdrop).

## 1. Best simple prediction approach

Use a **luteal-phase-anchored backward calculation** instead of forward "ovulation = day 14." Luteal length is far more stable within a woman than follicular length, so anchoring from the next expected period is the standard defensible move.

Per-cycle inputs after onboarding (>=2 completed cycles):
- `cycle_lengths[]` = days between consecutive period starts
- `LH_offsets[]` = (LH+ date − cycle start) for each cycle that has one
- `temp_offsets[]` = (ring temp-rise date − cycle start), trimmed by lag

Personalized estimates:
- `L_med` = median cycle length (use median, not mean — robust to one anovulatory outlier)
- `LP` = personalized luteal phase. If she has an LH+ and a subsequent period for at least one cycle, compute `LP_i = next_period_start − (LH+_i + 1)` (ovulation ≈ LH+ +1 day) and take the median. Otherwise default to 14.
- `predicted_ovulation_day = next_period_start − LP`
- `fertile_window = [ovulation − 5, ovulation + 1]` (7-day inclusive UI band; biologically the 6-day Wilcox window plus the egg's ~24h post-ovulation viability as a safety tail)
- `peak_fertility = [ovulation − 2, ovulation]` — highest per-day conception probability in Wilcox.

Live override rules (current cycle, in priority order):
1. If LH+ logged this cycle → `ovulation = LH+_date + 1`. Recompute fertile window from there. This dominates the calendar prediction.
2. If ring temp-rise logged → `ovulation_confirmed = temp_rise_date − 1` (use 1-day lag as the point estimate; range 1–3). Move state to "ovulation confirmed."
3. If both LH+ and temp-rise exist and are consistent (temp-rise 1–3 days after LH+) → high-confidence confirmation. If inconsistent (>4 days apart, or temp-rise before LH+), flag as ambiguous and degrade confidence rather than silently picking one.

## 2. Cold-start strategy (cycles 1–2)

With zero history:
- Assume `L = 28`, `LP = 14`, so ovulation ≈ day 14, fertile window = days 9–15.
- Label the prediction explicitly: "Population average — not personalized yet." Show a wider visual band (e.g., days 8–17) to honestly represent the Lenton 11–17 LP range.
- Treat the LH strip as the source of truth this cycle. The calendar's only job in cycle 1 is "start testing LH around day 9."
- After cycle 1 with an LH+ logged, immediately recompute LP from that single cycle but keep "low confidence" badge.
- Switch to "personalized" after 2 complete cycles with at least one LH+ event each.

## 3. Confidence model

Three tiers, computed from data quantity + signal agreement:

- **Low**: 0–1 completed cycles, OR no LH+ ever logged, OR cycle-length stdev > 4 days. Show the prediction as a wide range, not a single day. Copy: "Best guess from averages — log an LH strip to sharpen this."
- **Medium**: 2+ cycles with at least one LH+; cycle-length stdev ≤ 4 days. Show a 7-day band with the predicted ovulation day highlighted.
- **High**: 3+ cycles, LH+ logged in ≥2 of them, LP stdev ≤ 1.5 days (matches Lenton SD), and (in current cycle) LH+ already detected. Show a tight 3-day peak window.

Display as a labeled badge ("Low / Medium / High confidence") with a one-line "why." Do not show a fake percentage — the underlying data is too sparse for a calibrated probability.

## 4. Today-screen states (5 states)

1. **Menstrual** — between logged period-start and period-end.
2. **Follicular / low fertility** — post-period, more than 6 days before predicted ovulation. Copy: "Start LH testing on [date]."
3. **Fertile window — approaching** — within predicted window but ovulation is 3–5 days away and no LH+ yet. Copy: "Fertile window open. Test LH daily."
4. **Peak fertility** — predicted ovulation day ±2, OR LH+ logged in the last 48h. Highest-priority "today is the day(s)" message.
5. **Ovulation confirmed → luteal** — temp-rise logged, or ≥2 days past LH+. Copy: "Ovulation likely happened on [date]. Next period expected [date]."

Optional 6th: **Late / cycle uncertain** when current cycle day > L_med + 3 with no period — prompt to log.

## 5. Common pitfalls

1. **The "day 14" trap.** Forward-counting 14 days from period start assumes a 28-day cycle and a fixed follicular phase. Follicular length is the variable part of the cycle; luteal is the stable part. Always anchor backward from the next expected period using LP, not forward from the last one. (Lenton; Marquette variability review.)
2. **Treating BBT/temp-rise as a predictor instead of a confirmation.** The temperature shift happens 1–3 days *after* ovulation, so by the time the ring shows it, the fertile window is essentially closed. Use temp-rise to confirm ovulation and lock the luteal phase clock — never to tell her "today is fertile." (StatPearls; Tempdrop.)
3. **Single-cycle personalization.** Recomputing the model aggressively after one cycle produces wild swings. Require ≥2 cycles before promoting confidence, use medians not means, and cap how far a single new data point can move the estimate. Also: one anovulatory or stress-disrupted cycle is normal and should not be allowed to dominate.
4. (Bonus) **Ignoring LH-without-ovulation.** A positive LH strip doesn't guarantee ovulation; if no temp-rise follows within ~4 days, flag it rather than pretending the cycle was confirmed.

## 6. When to stop trusting the prediction

Once she has a positive LH strip this cycle, the app's calendar prediction is obsolete — the LH+ (and then the ring temp-rise 1–3 days later) is the ground truth, and the UI should defer to those signals instead of any date-based forecast.

## Sources

- [Wilcox AJ, Weinberg CR, Baird DD. Timing of sexual intercourse in relation to ovulation. NEJM 1995](https://www.nejm.org/doi/full/10.1056/NEJM199512073332301) — 6-day fertile window, sperm survival, day-specific conception probabilities.
- [Lenton EA et al., 1984 — Normal variation in luteal phase length (PubMed)](https://pubmed.ncbi.nlm.nih.gov/6743610/) — LP mean 14.13 ± 1.41 days, range 11–17.
- [Variability in the Phases of the Menstrual Cycle — Marquette review (PDF)](https://epublications.marquette.edu/context/nursing_fac/article/1010/viewcontent/auto_convert.pdf) — fertile-window variability across women.
- [Detecting LH Surge — RMA Network](https://rmanetwork.com/blog/lh-surge-when-detect-peak-fertility-opk/) — LH surge onset ~36h, peak ~10–12h before ovulation.
- [LH Surge for Fertility — Healthline](https://www.healthline.com/health/pregnancy/lh-surge) — typical 24–36h LH+ to ovulation.
- [Physiology, Ovulation and Basal Body Temperature — StatPearls / NCBI](https://www.ncbi.nlm.nih.gov/books/NBK546686/) — 0.2–0.5°C post-ovulation progesterone-driven shift.
- [Tempdrop — Temperature shift and ovulation](https://help.tempdrop.com/article/158-temperature-shift-and-ovulation) — 1–3 day lag between ovulation and visible temp shift.
