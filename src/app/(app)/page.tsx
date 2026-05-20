import Link from "next/link";
import { getConfig } from "@/lib/baserow/client";
import { listEvents } from "@/lib/actions/events";
import { listSymptoms } from "@/lib/actions/symptoms";
import { listAppointments } from "@/lib/actions/appointments";
import { deriveCycles, type EventType } from "@/lib/cycles/derive";
import { predict } from "@/lib/cycles/predict";
import { CycleRing } from "@/components/cycle-ring";
import { QuickActions } from "@/components/quick-actions";
import { NewAppointmentButton } from "@/components/appointment-editor";

export const dynamic = "force-dynamic";

const EVENT_LABELS: Record<string, string> = {
  period_start: "Period started",
  period_end: "Period ended",
  lh_surge: "LH surge",
  temp_rise: "Temp rise",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function firstName(name: string | null): string {
  if (!name) return "there";
  return name.trim().split(/\s+/)[0] || "there";
}

export default async function TodayPage() {
  const [userName, events, symptoms, appointments] = await Promise.all([
    getConfig("user_name"),
    listEvents(),
    listSymptoms(),
    listAppointments(),
  ]);

  const lastAppointment = [...appointments]
    .filter((a) => a.occurred_on)
    .sort((a, b) => (b.occurred_on ?? "").localeCompare(a.occurred_on ?? ""))[0];

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
    return s.logged_at.slice(0, 10) === today;
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

  return (
    <main className="flex flex-col gap-6 pb-4">
      {/* Slim header */}
      <header className="flex items-baseline justify-between px-5 pt-6">
        <div>
          <p className="text-sm text-muted-foreground">Hello, {firstName(userName)}</p>
          <h1 className="sr-only">Today</h1>
        </div>
        {prediction.cycleDay !== null ? (
          <span className="inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-foreground">
            Cycle Day {prediction.cycleDay}
          </span>
        ) : null}
      </header>

      {/* Ring */}
      <section className="px-2 pt-2">
        <CycleRing
          cycleDay={prediction.cycleDay}
          cycleLength={cycleLength}
          prediction={prediction}
        />
      </section>

      {/* Confidence row */}
      <section className="flex flex-col items-center gap-1 px-5 text-center">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
        >
          <span
            aria-hidden
            className="size-1.5 rounded-full"
            style={{
              backgroundColor:
                prediction.confidence === "high"
                  ? "var(--fertile)"
                  : prediction.confidence === "medium"
                  ? "var(--ovu-conf)"
                  : "var(--muted-foreground)",
            }}
          />
          {confidenceLabel}
        </span>
        {!prediction.isPersonalized ? (
          <p className="text-[11px] text-muted-foreground">
            Predictions improve after 2 cycles of data.
          </p>
        ) : null}
      </section>

      {/* Quick actions */}
      <section className="flex flex-col gap-3">
        <h2 className="px-5 font-display text-base text-foreground">Quick log</h2>
        <QuickActions today={today} />
      </section>

      {/* Appointments */}
      <section className="flex flex-col gap-3 px-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-base text-foreground">Appointments</h2>
          <Link
            href="/appointments"
            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Capture notes during a CNY Fertility visit or other clinic check-in.
          </p>
          <NewAppointmentButton />
          {lastAppointment ? (
            <Link
              href="/appointments"
              className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <span className="text-foreground">Last visit:</span>{" "}
              {lastAppointment.appointment_type?.value ?? "Appointment"}
              {" · "}
              {lastAppointment.occurred_on}
              {lastAppointment.clinic_name
                ? ` · ${lastAppointment.clinic_name}`
                : ""}
            </Link>
          ) : null}
        </div>
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
                className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm shadow-sm"
              >
                <span className="text-foreground">
                  {EVENT_LABELS[e.type] ?? e.type}
                </span>
                <span className="text-xs text-muted-foreground">{e.occurred_on}</span>
              </li>
            ))}
            {todaysSymptoms.map((s) => (
              <li
                key={`s-${s.id}`}
                className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm shadow-sm"
              >
                <span className="text-foreground">{s.name}</span>
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
