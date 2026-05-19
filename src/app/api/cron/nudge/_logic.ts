/**
 * Shared logic for the nudge cron and its dry-run test endpoint.
 *
 * Computes today's prediction (same pipeline as the home screen) and
 * decides whether a Pushover notification is warranted today.
 *
 * Nudge states (and only-on-entry-day for window transitions):
 *   - fertile_approaching   → always nudge while in this state
 *   - fertile_window        → only on entry day (today === fertileWindow.start)
 *   - peak                  → only on entry day (today === peakWindow.start)
 *   - everything else       → skip
 */
import { listEvents } from "@/lib/actions/events";
import { deriveCycles, type EventType } from "@/lib/cycles/derive";
import { predict, type Prediction } from "@/lib/cycles/predict";

export type NudgeDecision = {
  shouldSend: boolean;
  reason: string; // human-readable: state name or why skipped
  title: string | null;
  message: string | null;
};

export type NudgeComputation = {
  todayISO: string;
  prediction: Prediction;
  decision: NudgeDecision;
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function computeNudge(opts?: { now?: string }): Promise<NudgeComputation> {
  const now = opts?.now ?? todayISO();
  const events = await listEvents();

  const eventInputs = events
    .filter((e) => e.type?.value && e.occurred_on)
    .map((e) => ({
      id: e.id,
      type: e.type!.value as EventType,
      occurred_on: e.occurred_on!,
    }));

  const cycles = deriveCycles(eventInputs);

  const sortedStarts = eventInputs
    .filter((e) => e.type === "period_start")
    .map((e) => e.occurred_on)
    .sort();
  const mostRecentStart = sortedStarts[sortedStarts.length - 1] ?? null;
  const currentCycleEvents = mostRecentStart
    ? eventInputs.filter((e) => e.occurred_on >= mostRecentStart)
    : [];

  const prediction = predict({ cycles, currentCycleEvents, now });
  const decision = decideNudge(prediction, now);

  return { todayISO: now, prediction, decision };
}

export function decideNudge(p: Prediction, today: string): NudgeDecision {
  const conf = p.confidence;
  switch (p.todayState) {
    case "fertile_approaching": {
      if (!p.fertileWindow) {
        return { shouldSend: false, reason: "fertile_approaching_no_window", title: null, message: null };
      }
      return {
        shouldSend: true,
        reason: "fertile_approaching",
        title: "Fertile window approaching",
        message: `Predicted: ${p.fertileWindow.start} to ${p.fertileWindow.end}. Confidence: ${conf}.`,
      };
    }
    case "fertile_window": {
      if (!p.fertileWindow || !p.peakWindow) {
        return { shouldSend: false, reason: "fertile_window_no_window", title: null, message: null };
      }
      // Only nudge on entry day
      if (today !== p.fertileWindow.start) {
        return { shouldSend: false, reason: "fertile_window_not_entry_day", title: null, message: null };
      }
      return {
        shouldSend: true,
        reason: "fertile_window_entry",
        title: "Fertile window — day 1",
        message: `Through ${p.fertileWindow.end}. Peak likely ${p.peakWindow.start}–${p.peakWindow.end}.`,
      };
    }
    case "peak": {
      if (!p.peakWindow || !p.predictedOvulation) {
        return { shouldSend: false, reason: "peak_no_window", title: null, message: null };
      }
      if (today !== p.peakWindow.start) {
        return { shouldSend: false, reason: "peak_not_entry_day", title: null, message: null };
      }
      return {
        shouldSend: true,
        reason: "peak_entry",
        title: "Peak fertility",
        message: `Today and tomorrow. Ovulation predicted ${p.predictedOvulation}.`,
      };
    }
    default:
      return { shouldSend: false, reason: p.todayState, title: null, message: null };
  }
}

export function checkCronAuth(req: Request): { ok: true } | { ok: false; status: number } {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return { ok: false, status: 500 };
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${expected}`) {
    return { ok: false, status: 401 };
  }
  return { ok: true };
}
