/**
 * Prediction engine — turns cycle history + this cycle's events into today's status,
 * a fertile window, peak window, confidence tier, and next-period ETA.
 *
 * Rules captured from .planning/research/01-prediction-algorithm.md:
 * - Anchor backward from next-period (LP is stable, follicular varies)
 * - Cold start (<2 completed cycles with LH data): wide range, label as not personalized
 * - LH+ in current cycle: ovulation ≈ LH+ + 1d; suppress calendar forecast
 * - Temp rise: ovulation CONFIRMED (lagging signal, 1-3 day delay)
 * - Fertile window: ovulation -5..+1; peak: ovulation -2..ovulation (Wilcox)
 */
import { addDays, compareAsc, differenceInCalendarDays, parseISO } from "date-fns";
import {
  type DerivedCycle,
  type EventInput,
  meanCycleLength,
  personalizedLutealPhase,
} from "./derive";

export type TodayState =
  | "menstrual" // currently bleeding (within period_start..period_end)
  | "follicular_low" // post-period, pre-fertile
  | "fertile_approaching" // within ~3 days before fertile window
  | "fertile_window" // in the fertile window but not peak
  | "peak" // ovulation -2..+0
  | "confirmed_or_luteal" // ovulation has been confirmed (LH+ or temp_rise)
  | "late"; // past expected next period without a new period_start

export type Confidence = "low" | "medium" | "high";

export type Prediction = {
  todayState: TodayState;
  cycleDay: number | null;
  predictedOvulation: string | null; // YYYY-MM-DD
  fertileWindow: { start: string; end: string } | null;
  peakWindow: { start: string; end: string } | null;
  nextPeriodEta: string | null;
  confidence: Confidence;
  isPersonalized: boolean;
  reasoning: string;
};

const POPULATION_LP = 14;
const FERTILE_PRE = 5;
const FERTILE_POST = 1;
const PEAK_PRE = 2;
const COLD_START_CYCLES = 2; // need ≥2 completed cycles WITH LH data to personalize

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function today(timezone?: string): string {
  // Use a UTC YYYY-MM-DD for now; a refinement could shift by tz offset.
  void timezone;
  return new Date().toISOString().slice(0, 10);
}

export function predict({
  cycles,
  currentCycleEvents,
  now,
}: {
  cycles: DerivedCycle[]; // completed cycles (most recent last)
  currentCycleEvents: EventInput[]; // events since the most recent period_start
  now?: string; // override "today" for testing
}): Prediction {
  const todayISO = now ?? today();
  const todayDate = parseISO(todayISO);

  // Find the most recent period_start to anchor current cycle
  const mostRecentStart = currentCycleEvents
    .filter((e) => e.type === "period_start")
    .map((e) => e.occurred_on)
    .sort()
    .pop();

  // No cycle started yet → menstrual default unknown
  if (!mostRecentStart) {
    return {
      todayState: "follicular_low",
      cycleDay: null,
      predictedOvulation: null,
      fertileWindow: null,
      peakWindow: null,
      nextPeriodEta: null,
      confidence: "low",
      isPersonalized: false,
      reasoning: "No period_start events logged yet. Log your most recent period to start.",
    };
  }

  const startDate = parseISO(mostRecentStart);
  const cycleDay = differenceInCalendarDays(todayDate, startDate) + 1;

  // Calibration check
  const personalizedLP = personalizedLutealPhase(cycles);
  const personalizedCL = meanCycleLength(cycles);
  const isPersonalized =
    personalizedLP !== null &&
    cycles.filter((c) => c.length_days !== null && c.lh_surge_on !== null).length >= COLD_START_CYCLES;

  const usedLP = isPersonalized ? personalizedLP! : POPULATION_LP;
  const usedCL = personalizedCL ?? 28;

  // LH+ override
  const lhSurge = currentCycleEvents.find((e) => e.type === "lh_surge")?.occurred_on ?? null;
  const tempRise = currentCycleEvents.find((e) => e.type === "temp_rise")?.occurred_on ?? null;
  const periodEnd = currentCycleEvents.find((e) => e.type === "period_end")?.occurred_on ?? null;

  let predictedOvulation: string | null = null;
  let reasoning = "";

  if (tempRise) {
    predictedOvulation = lhSurge ? fmt(addDays(parseISO(lhSurge), 1)) : tempRise;
    reasoning = `Ovulation confirmed by ring-temp rise on ${tempRise}.`;
  } else if (lhSurge) {
    predictedOvulation = fmt(addDays(parseISO(lhSurge), 1));
    reasoning = `LH+ logged on ${lhSurge}; ovulation predicted next day.`;
  } else {
    // Calendar prediction: ovulation = start_date + (cycle_length - LP)
    const ovuOffset = usedCL - usedLP;
    predictedOvulation = fmt(addDays(startDate, ovuOffset));
    reasoning = isPersonalized
      ? `Personalized: avg cycle ${usedCL}d, luteal ${usedLP}d → ovulation ~CD${ovuOffset + 1}.`
      : `Population default: cycle ~${usedCL}d, luteal ~${usedLP}d. Needs more data to personalize.`;
  }

  const ov = parseISO(predictedOvulation);
  const fertileWindow = {
    start: fmt(addDays(ov, -FERTILE_PRE)),
    end: fmt(addDays(ov, FERTILE_POST)),
  };
  const peakWindow = {
    start: fmt(addDays(ov, -PEAK_PRE)),
    end: predictedOvulation,
  };

  const nextPeriodEta = fmt(addDays(parseISO(predictedOvulation), usedLP));

  // State machine
  let todayState: TodayState = "follicular_low";

  // Bleeding window
  if (compareAsc(todayDate, startDate) >= 0 && (!periodEnd || compareAsc(todayDate, parseISO(periodEnd)) <= 0)) {
    // Either no end logged and within last 7 days of start, or before end
    if (!periodEnd && differenceInCalendarDays(todayDate, startDate) <= 6) {
      todayState = "menstrual";
    } else if (periodEnd) {
      todayState = "menstrual";
    }
  }

  if (todayState !== "menstrual") {
    if (tempRise && compareAsc(todayDate, parseISO(tempRise)) >= 0) {
      todayState = "confirmed_or_luteal";
    } else if (
      compareAsc(todayDate, parseISO(peakWindow.start)) >= 0 &&
      compareAsc(todayDate, parseISO(peakWindow.end)) <= 0
    ) {
      todayState = "peak";
    } else if (
      compareAsc(todayDate, parseISO(fertileWindow.start)) >= 0 &&
      compareAsc(todayDate, parseISO(fertileWindow.end)) <= 0
    ) {
      todayState = "fertile_window";
    } else if (
      compareAsc(todayDate, addDays(parseISO(fertileWindow.start), -3)) >= 0 &&
      compareAsc(todayDate, parseISO(fertileWindow.start)) < 0
    ) {
      todayState = "fertile_approaching";
    } else if (compareAsc(todayDate, parseISO(nextPeriodEta)) > 0) {
      todayState = "late";
    } else {
      todayState = compareAsc(todayDate, ov) > 0 ? "confirmed_or_luteal" : "follicular_low";
    }
  }

  // Confidence
  let confidence: Confidence = "low";
  if (tempRise) confidence = "high";
  else if (lhSurge) confidence = "high";
  else if (isPersonalized) confidence = "medium";

  return {
    todayState,
    cycleDay,
    predictedOvulation,
    fertileWindow,
    peakWindow,
    nextPeriodEta,
    confidence,
    isPersonalized,
    reasoning,
  };
}

export const STATE_LABELS: Record<TodayState, string> = {
  menstrual: "Menstrual",
  follicular_low: "Follicular",
  fertile_approaching: "Fertile window approaching",
  fertile_window: "Fertile window",
  peak: "Peak fertility",
  confirmed_or_luteal: "Ovulation confirmed",
  late: "Period is late",
};

export const STATE_COLORS: Record<TodayState, string> = {
  menstrual: "bg-rose-100 text-rose-800 border-rose-200",
  follicular_low: "bg-slate-100 text-slate-700 border-slate-200",
  fertile_approaching: "bg-emerald-50 text-emerald-700 border-emerald-200",
  fertile_window: "bg-emerald-100 text-emerald-800 border-emerald-300",
  peak: "bg-emerald-200 text-emerald-900 border-emerald-400",
  confirmed_or_luteal: "bg-amber-50 text-amber-800 border-amber-200",
  late: "bg-amber-100 text-amber-900 border-amber-300",
};
