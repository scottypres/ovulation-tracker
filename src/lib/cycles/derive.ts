/**
 * Cycle derivation: walk events ordered by date and (re)build the `cycles` table.
 *
 * A cycle opens on each `period_start` event and closes on the next `period_start`.
 * We pull the most recent LH+ and temp_rise dates within each cycle for prediction inputs.
 *
 * Pure-function design: input arrays, output desired cycles. The caller diffs vs.
 * existing cycles and applies create/update/delete to Baserow.
 */
import { differenceInCalendarDays, parseISO, compareAsc } from "date-fns";

export type EventType = "period_start" | "period_end" | "lh_surge" | "temp_rise";

export type EventInput = {
  id?: number;
  type: EventType;
  occurred_on: string; // ISO date "YYYY-MM-DD"
};

export type DerivedCycle = {
  start_date: string;
  end_date: string | null; // period_end within this cycle, if logged
  length_days: number | null; // computed when the NEXT cycle starts
  lh_surge_on: string | null;
  temp_rise_on: string | null;
  notes: string | null;
};

export function deriveCycles(events: EventInput[]): DerivedCycle[] {
  const byDate = [...events]
    .filter((e) => !!e.occurred_on && !!e.type)
    .sort((a, b) => compareAsc(parseISO(a.occurred_on), parseISO(b.occurred_on)));

  const starts = byDate.filter((e) => e.type === "period_start");
  if (starts.length === 0) return [];

  const cycles: DerivedCycle[] = [];

  for (let i = 0; i < starts.length; i++) {
    const start = starts[i].occurred_on;
    const next = starts[i + 1]?.occurred_on ?? null;

    const inWindow = (d: string) =>
      compareAsc(parseISO(d), parseISO(start)) >= 0 &&
      (next === null || compareAsc(parseISO(d), parseISO(next)) < 0);

    const endEvent = byDate.find((e) => e.type === "period_end" && inWindow(e.occurred_on));
    const lh = byDate
      .filter((e) => e.type === "lh_surge" && inWindow(e.occurred_on))
      .map((e) => e.occurred_on)
      .pop() ?? null;
    const tr = byDate
      .filter((e) => e.type === "temp_rise" && inWindow(e.occurred_on))
      .map((e) => e.occurred_on)
      .pop() ?? null;

    const length =
      next !== null
        ? differenceInCalendarDays(parseISO(next), parseISO(start))
        : null;

    cycles.push({
      start_date: start,
      end_date: endEvent?.occurred_on ?? null,
      length_days: length,
      lh_surge_on: lh,
      temp_rise_on: tr,
      notes: null,
    });
  }

  return cycles;
}

/** Median ignoring nulls; returns null if empty. */
function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Compute the user's personalized luteal-phase length from completed cycles. */
export function personalizedLutealPhase(cycles: DerivedCycle[]): number | null {
  const lps = cycles
    .filter((c) => c.length_days !== null && c.lh_surge_on !== null)
    .map((c) => {
      const surge = parseISO(c.lh_surge_on!);
      const start = parseISO(c.start_date);
      const cd_of_surge = differenceInCalendarDays(surge, start) + 1;
      // LP = cycle_length - (CD of surge + 1) ; ovulation is ~1 day after LH+
      return c.length_days! - cd_of_surge - 1;
    })
    .filter((lp) => lp >= 8 && lp <= 20); // sanity filter

  const m = median(lps);
  if (m === null) return null;
  // Clamp to clinically plausible range
  return Math.max(11, Math.min(17, Math.round(m)));
}

export function meanCycleLength(cycles: DerivedCycle[]): number | null {
  const lens = cycles.map((c) => c.length_days).filter((l): l is number => l !== null);
  if (lens.length === 0) return null;
  return Math.round(lens.reduce((a, b) => a + b, 0) / lens.length);
}
