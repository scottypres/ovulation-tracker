/**
 * Dry-run for the nudge cron — same logic, no Pushover send.
 * Returns the prediction and the would-be title/message so we can
 * verify decision logic without burning a notification.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}` (same as the real cron).
 *
 * Optional query param `?now=YYYY-MM-DD` overrides "today" for testing.
 */
import { NextResponse } from "next/server";
import { getConfig } from "@/lib/baserow/client";
import { checkCronAuth, computeNudge } from "../_logic";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = checkCronAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: auth.status });
  }

  const url = new URL(req.url);
  const nowOverride = url.searchParams.get("now") ?? undefined;

  const userKey = await getConfig("pushover_user_key");
  const { todayISO, prediction, decision } = await computeNudge({ now: nowOverride });

  return NextResponse.json({
    ok: true,
    dryRun: true,
    today: todayISO,
    hasUserKey: !!userKey && userKey.trim() !== "",
    prediction: {
      todayState: prediction.todayState,
      cycleDay: prediction.cycleDay,
      predictedOvulation: prediction.predictedOvulation,
      fertileWindow: prediction.fertileWindow,
      peakWindow: prediction.peakWindow,
      nextPeriodEta: prediction.nextPeriodEta,
      confidence: prediction.confidence,
      isPersonalized: prediction.isPersonalized,
      reasoning: prediction.reasoning,
    },
    decision,
  });
}
