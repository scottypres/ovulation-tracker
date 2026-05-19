/**
 * Daily Pushover nudge cron.
 *
 * Runs once per day (see vercel.json). Computes today's prediction and
 * sends a calm notification if today is a fertile-window transition.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}`.
 * Recipient: Baserow `app_config.pushover_user_key`. If empty, the cron
 * no-ops with `{skipped: "no_user_key"}` — expected before first-time setup.
 */
import { NextResponse } from "next/server";
import { getConfig } from "@/lib/baserow/client";
import { sendPushover } from "@/lib/pushover";
import { computeNudge, checkCronAuth } from "./_logic";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = checkCronAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: auth.status });
  }

  const userKey = await getConfig("pushover_user_key");
  if (!userKey || userKey.trim() === "") {
    console.log("[cron/nudge] skipped: no_user_key");
    return NextResponse.json({ ok: true, skipped: "no_user_key" });
  }

  const { todayISO, prediction, decision } = await computeNudge();

  if (!decision.shouldSend) {
    console.log(
      `[cron/nudge] skipped today=${todayISO} state=${prediction.todayState} reason=${decision.reason}`,
    );
    return NextResponse.json({
      ok: true,
      sent: false,
      state: prediction.todayState,
      skipped: decision.reason,
    });
  }

  const result = await sendPushover({
    user: userKey,
    title: decision.title!,
    message: decision.message!,
  });

  console.log(
    `[cron/nudge] today=${todayISO} state=${prediction.todayState} sent=${result.ok} status=${result.status}` +
      (result.error ? ` error=${result.error}` : ""),
  );

  return NextResponse.json({
    ok: result.ok,
    sent: result.ok,
    state: prediction.todayState,
    status: result.status,
    error: result.error,
  });
}
