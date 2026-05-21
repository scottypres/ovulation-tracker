import { getConfig } from "@/lib/baserow/client";
import { formatDateMDY, toAppDate } from "@/lib/format/dates";
import { listEvents } from "@/lib/actions/events";
import { listSymptoms } from "@/lib/actions/symptoms";
import { deriveCycles, type EventType } from "@/lib/cycles/derive";
import { predict } from "@/lib/cycles/predict";
import { CycleRing } from "@/components/cycle-ring";
import { QuickActions } from "@/components/quick-actions";

export const dynamic = "force-dynamic";

const EVENT_LABELS: Record<string, string> = {
  period_start: "Period started",
  period_end: "Period ended",
  lh_surge: "LH surge",
  temp_rise: "Temp rise",
};

const EVENT_DOTS: Record<string, string> = {
  period_start: "var(--period)",
  period_end: "var(--period-soft)",
  lh_surge: "var(--ovu-pred)",
  temp_rise: "var(--ovu-conf)",
};

function todayPretty(): string {
  const d = new Date();
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function todayISO() {
  return toAppDate(new Date().toISOString()) ?? new Date().toISOString().slice(0, 10);
}

function firstName(name: string | null): string {
  if (!name) return "there";
  return name.trim().split(/\s+/)[0] || "there";
}

export default async function TodayPage() {
  const [userName, events, symptoms] = await Promise.all([
    getConfig("user_name"),
    listEvents(),
    listSymptoms(),
  ]);

  const eventInputs = events
    .filter((e) => e.type?.value && e.occurred_on)
    .map((e) => ({
      id: e.id,
      type: e.type!.value as EventType,
      occurred_on: e.occurred_on!,
    }));

  const cycles = deriveCycles(eventInputs);

  // Find most recent period_start to scope "currentCycleEvents"
  const sortedStarts = eventInputs
    .filter((e) => e.type === "period_start")
    .map((e) => e.occurred_on)
    .sort();
  const mostRecentStart = sortedStarts[sortedStarts.length - 1] ?? null;

  const currentCycleEvents = mostRecentStart
    ? eventInputs.filter((e) => e.occurred_on >= mostRecentStart)
    : [];

  const prediction = predict({ cycles, currentCycleEvents });

  const today = todayISO();

  // Items already logged today
  const todaysEvents = eventInputs.filter((e) => e.occurred_on === today);
  const todaysSymptoms = symptoms.filter((s) => {
    if (!s.logged_at) return false;
    return toAppDate(s.logged_at) === today;
  });

  const cycleLength = (() => {
    const lens = cycles
      .map((c) => c.length_days)
      .filter((n): n is number => typeof n === "number" && n > 15 && n < 60);
    if (lens.length === 0) return 28;
    const avg = lens.reduce((a, b) => a + b, 0) / lens.length;
    return Math.round(avg);
  })();

  const confidenceLabel =
    prediction.confidence === "high"
      ? "High confidence"
      : prediction.confidence === "medium"
      ? "Medium confidence"
      : "Low confidence";

  const confidenceDotColor =
    prediction.confidence === "high"
      ? "var(--fertile)"
      : prediction.confidence === "medium"
      ? "var(--ovu-conf)"
      : "var(--muted-foreground)";

  return (
    <main className="flex flex-col gap-6 pb-4">
      {/* Date as the hero header. Greeting demoted to a chip on the right. */}
      <header className="flex items-baseline justify-between px-5 pt-6">
        <h1 className="font-display text-2xl tracking-tight text-foreground">
          {todayPretty()}
        </h1>
        <span className="text-[11px] text-muted-foreground">
          Hi, {firstName(userName)}
        </span>
      </header>

      {/* Ring with confidence/personalization caption directly underneath */}
      <section className="flex flex-col items-center gap-2 px-2 pt-1">
        <CycleRing
          cycleDay={prediction.cycleDay}
          cycleLength={cycleLength}
          prediction={prediction}
        />
        <div className="flex flex-col items-center gap-0.5 text-center">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <span
              aria-hidden
              className="size-1.5 rounded-full"
              style={{ backgroundColor: confidenceDotColor }}
            />
            {confidenceLabel}
          </span>
          {!prediction.isPersonalized ? (
            <p className="text-[11px] text-muted-foreground">
              Predictions improve after 2 cycles of data.
            </p>
          ) : null}
        </div>
      </section>

      {/* Quick actions */}
      <section className="flex flex-col gap-3">
        <h2 className="px-5 font-display text-base text-foreground">Quick log</h2>
        <QuickActions today={today} />
      </section>

      {/* Today list */}
      <section className="flex flex-col gap-3 px-5">
        <h2 className="font-display text-base text-foreground">Today</h2>
        {todaysEvents.length === 0 && todaysSymptoms.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground shadow-sm">
            Nothing logged yet today.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {todaysEvents.map((e) => (
              <li
                key={`e-${e.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm shadow-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden
                    className="inline-block size-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        EVENT_DOTS[e.type] ?? "var(--muted-foreground)",
                    }}
                  />
                  <span className="text-foreground">
                    {EVENT_LABELS[e.type] ?? e.type}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDateMDY(e.occurred_on)}
                </span>
              </li>
            ))}
            {todaysSymptoms.map((s) => (
              <li
                key={`s-${s.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm shadow-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden
                    className="inline-block size-2.5 shrink-0 rounded-full bg-muted-foreground"
                  />
                  <span className="text-foreground">{s.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {s.severity?.value ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
