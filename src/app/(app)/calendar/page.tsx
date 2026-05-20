import Link from "next/link";
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import { PageHeader } from "@/components/page-header";
import { listAppointments } from "@/lib/actions/appointments";
import { listEvents } from "@/lib/actions/events";
import { listSymptoms } from "@/lib/actions/symptoms";
import {
  deriveCycles,
  meanCycleLength,
  personalizedLutealPhase,
  type EventType,
} from "@/lib/cycles/derive";

export const dynamic = "force-dynamic";

const FERTILE_PRE = 5;
const FERTILE_POST = 1;
const POPULATION_LP = 14;
const POPULATION_CL = 28;

type DayMeta = {
  date: Date;
  iso: string;
  inMonth: boolean;
  today: boolean;
  period: boolean;
  periodEnd: boolean;
  lhSurge: boolean;
  tempRise: boolean;
  fertile: boolean;
  predOvu: boolean;
  confOvu: boolean;
  symptoms: number;
  appointment: boolean;
};

function fmtISO(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseMonthParam(m: string | undefined): Date {
  if (m && /^\d{4}-\d{2}$/.test(m)) {
    const d = parseISO(`${m}-01`);
    if (!isNaN(d.getTime())) return startOfMonth(d);
  }
  return startOfMonth(new Date());
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const params = await searchParams;
  const monthAnchor = parseMonthParam(params.m);

  const [events, symptoms, appointments] = await Promise.all([
    listEvents(),
    listSymptoms(),
    listAppointments(),
  ]);

  const eventInputs = events
    .filter((e) => e.type?.value && e.occurred_on)
    .map((e) => ({
      id: e.id,
      type: e.type!.value as EventType,
      occurred_on: e.occurred_on!,
    }));

  const cycles = deriveCycles(eventInputs);
  const cycleLen = meanCycleLength(cycles) ?? POPULATION_CL;
  const lutealLen = personalizedLutealPhase(cycles) ?? POPULATION_LP;

  // Build sets/maps keyed by ISO date
  const periodDays = new Set<string>();
  const periodEndDays = new Set<string>();
  const lhSurgeDays = new Set<string>();
  const tempRiseDays = new Set<string>();
  const fertileDays = new Set<string>();
  const predOvuDays = new Set<string>();
  const confOvuDays = new Set<string>();

  // Raw event days: render dots on the exact day the user logged in Quick Log
  for (const e of eventInputs) {
    if (e.type === "period_end") periodEndDays.add(e.occurred_on);
    if (e.type === "lh_surge") lhSurgeDays.add(e.occurred_on);
    if (e.type === "temp_rise") tempRiseDays.add(e.occurred_on);
  }

  // Period spans: for each period_start, include start..end (if end logged)
  // or start..start+6 if no end (and no following start before that).
  const sortedStarts = eventInputs
    .filter((e) => e.type === "period_start")
    .map((e) => e.occurred_on)
    .sort();
  const sortedEnds = eventInputs
    .filter((e) => e.type === "period_end")
    .map((e) => e.occurred_on)
    .sort();

  for (let i = 0; i < sortedStarts.length; i++) {
    const start = parseISO(sortedStarts[i]);
    const nextStart = sortedStarts[i + 1] ? parseISO(sortedStarts[i + 1]) : null;
    // Find period_end >= start and (no nextStart OR < nextStart)
    const endStr = sortedEnds.find((e) => {
      const ed = parseISO(e);
      if (differenceInCalendarDays(ed, start) < 0) return false;
      if (nextStart && differenceInCalendarDays(ed, nextStart) >= 0) return false;
      return true;
    });
    let last: Date;
    if (endStr) {
      last = parseISO(endStr);
    } else {
      // fallback ~6 days, but don't bleed into next start
      const fallback = addDays(start, 6);
      last = nextStart && differenceInCalendarDays(fallback, nextStart) >= 0
        ? addDays(nextStart, -1)
        : fallback;
    }
    let cursor = start;
    while (differenceInCalendarDays(cursor, last) <= 0) {
      periodDays.add(fmtISO(cursor));
      cursor = addDays(cursor, 1);
    }
  }

  // For each cycle (derived), compute predicted ovulation + fertile window + confirmed ovulation
  for (const c of cycles) {
    const start = parseISO(c.start_date);

    // Determine ovulation: prefer LH+ +1, else temp_rise, else calendar
    let ovu: Date | null = null;
    if (c.lh_surge_on) {
      ovu = addDays(parseISO(c.lh_surge_on), 1);
    } else if (c.temp_rise_on) {
      ovu = parseISO(c.temp_rise_on);
    } else {
      // Use cycle length if known, else mean
      const cl = c.length_days ?? cycleLen;
      ovu = addDays(start, cl - lutealLen);
    }

    if (ovu) {
      predOvuDays.add(fmtISO(ovu));
      // Fertile window: ovu-5..+1
      for (let off = -FERTILE_PRE; off <= FERTILE_POST; off++) {
        fertileDays.add(fmtISO(addDays(ovu, off)));
      }
    }

    // Confirmed ovulation: if LH+ AND/OR temp_rise present
    if (c.lh_surge_on) {
      confOvuDays.add(fmtISO(addDays(parseISO(c.lh_surge_on), 1)));
    }
    if (c.temp_rise_on) {
      confOvuDays.add(fmtISO(parseISO(c.temp_rise_on)));
    }
  }

  // Symptom counts per day
  const symptomCounts = new Map<string, number>();
  for (const s of symptoms) {
    if (!s.logged_at) continue;
    const d = s.logged_at.slice(0, 10);
    symptomCounts.set(d, (symptomCounts.get(d) ?? 0) + 1);
  }

  // Appointment days
  const appointmentDays = new Set<string>();
  for (const a of appointments) {
    if (a.occurred_on) appointmentDays.add(a.occurred_on);
  }

  // Build 6-row x 7-col grid
  const firstOfMonth = startOfMonth(monthAnchor);
  const lastOfMonth = endOfMonth(monthAnchor);
  const gridStart = startOfWeek(firstOfMonth, { weekStartsOn: 0 });
  const today = parseISO(todayISO());

  const days: DayMeta[] = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i);
    const iso = fmtISO(d);
    days.push({
      date: d,
      iso,
      inMonth: isSameMonth(d, monthAnchor),
      today: isSameDay(d, today),
      period: periodDays.has(iso),
      periodEnd: periodEndDays.has(iso),
      lhSurge: lhSurgeDays.has(iso),
      tempRise: tempRiseDays.has(iso),
      fertile: fertileDays.has(iso),
      predOvu: predOvuDays.has(iso),
      confOvu: confOvuDays.has(iso),
      symptoms: symptomCounts.get(iso) ?? 0,
      appointment: appointmentDays.has(iso),
    });
  }

  const monthLabel = format(monthAnchor, "MMMM yyyy");
  const prevMonth = format(addMonths(monthAnchor, -1), "yyyy-MM");
  const nextMonth = format(addMonths(monthAnchor, 1), "yyyy-MM");

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <main className="flex flex-col gap-4 pb-6">
      <PageHeader title="Calendar" subtitle="Monthly view of your cycles" />

      <section className="px-5">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          {/* Month nav */}
          <div className="mb-4 flex items-center justify-between">
            <Link
              href={`/calendar?m=${prevMonth}`}
              aria-label="Previous month"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-sm text-foreground transition hover:bg-secondary"
            >
              <span aria-hidden>&lt;</span>
            </Link>
            <h2 className="font-display text-xl tracking-tight text-foreground">
              {monthLabel}
            </h2>
            <Link
              href={`/calendar?m=${nextMonth}`}
              aria-label="Next month"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-sm text-foreground transition hover:bg-secondary"
            >
              <span aria-hidden>&gt;</span>
            </Link>
          </div>

          {/* Weekday header */}
          <div className="mb-1 grid grid-cols-7 gap-1">
            {weekdayLabels.map((wd) => (
              <div
                key={wd}
                className="px-1 py-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const muted = !d.inMonth;
              const bgStyle: React.CSSProperties = d.fertile
                ? { backgroundColor: "var(--fertile-soft)" }
                : {};
              return (
                <Link
                  key={d.iso}
                  href={`/log?d=${d.iso}`}
                  className={[
                    "relative flex h-12 flex-col items-center justify-start gap-0.5 rounded-lg border px-1 pt-1 pb-0.5 text-center transition sm:h-14",
                    d.today
                      ? "border-foreground/40 ring-1 ring-foreground/20"
                      : "border-border/60",
                    muted ? "opacity-40" : "hover:bg-secondary/60",
                  ].join(" ")}
                  style={bgStyle}
                  aria-label={`${format(d.date, "MMMM d, yyyy")}${d.period ? ", period day" : ""}${d.periodEnd ? ", period ended" : ""}${d.lhSurge ? ", LH surge logged" : ""}${d.tempRise ? ", temperature rise logged" : ""}${d.fertile ? ", fertile window" : ""}${d.predOvu ? ", predicted ovulation" : ""}${d.confOvu ? ", confirmed ovulation" : ""}${d.appointment ? ", appointment" : ""}${d.symptoms ? `, ${d.symptoms} symptom${d.symptoms === 1 ? "" : "s"} logged` : ""}`}
                >
                  <span
                    className={[
                      "font-display text-sm leading-none",
                      muted ? "text-muted-foreground" : "text-foreground",
                    ].join(" ")}
                  >
                    {format(d.date, "d")}
                  </span>

                  {/* Derived ovulation glyph */}
                  <div className="flex items-center gap-0.5">
                    {d.confOvu ? (
                      <Star aria-hidden />
                    ) : d.predOvu ? (
                      <Bullseye aria-hidden />
                    ) : null}
                  </div>

                  {/* Bottom row: raw events + derived markers */}
                  <div className="absolute inset-x-1 bottom-1 flex items-center justify-center gap-0.5">
                    {d.period ? (
                      <span
                        aria-hidden
                        className="h-1 w-3 rounded-full"
                        style={{ backgroundColor: "var(--period)" }}
                      />
                    ) : null}
                    {d.periodEnd && !d.period ? (
                      <span
                        aria-hidden
                        className="size-1 rounded-full"
                        style={{ backgroundColor: "var(--period-soft)" }}
                      />
                    ) : null}
                    {d.lhSurge ? (
                      <span
                        aria-hidden
                        className="size-1 rounded-full"
                        style={{ backgroundColor: "var(--ovu-pred)" }}
                      />
                    ) : null}
                    {d.tempRise ? (
                      <span
                        aria-hidden
                        className="size-1 rounded-full"
                        style={{ backgroundColor: "var(--ovu-conf)" }}
                      />
                    ) : null}
                    {d.appointment ? (
                      <span
                        aria-hidden
                        className="size-1 rounded-full bg-foreground"
                      />
                    ) : null}
                    {d.symptoms > 0 ? (
                      <span
                        aria-hidden
                        className="size-1 rounded-full bg-muted-foreground"
                      />
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Legend */}
      <section className="px-5">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h3 className="mb-3 font-display text-sm text-foreground">Legend</h3>

          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Logged events
          </p>
          <ul className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground sm:grid-cols-3">
            <li className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-1 w-3 rounded-full"
                style={{ backgroundColor: "var(--period)" }}
              />
              <span>Period day</span>
            </li>
            <li className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-1.5 rounded-full"
                style={{ backgroundColor: "var(--period-soft)" }}
              />
              <span>Period ended</span>
            </li>
            <li className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-1.5 rounded-full"
                style={{ backgroundColor: "var(--ovu-pred)" }}
              />
              <span>LH+ surge</span>
            </li>
            <li className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-1.5 rounded-full"
                style={{ backgroundColor: "var(--ovu-conf)" }}
              />
              <span>Temp rise</span>
            </li>
            <li className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-1.5 rounded-full bg-muted-foreground"
              />
              <span>Symptom logged</span>
            </li>
            <li className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-1.5 rounded-full bg-foreground"
              />
              <span>Appointment</span>
            </li>
          </ul>

          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Predictions
          </p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground sm:grid-cols-3">
            <li className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block size-3 rounded-sm"
                style={{ backgroundColor: "var(--fertile-soft)" }}
              />
              <span>Fertile window</span>
            </li>
            <li className="flex items-center gap-2">
              <Bullseye aria-hidden />
              <span>Predicted ovulation</span>
            </li>
            <li className="flex items-center gap-2">
              <Star aria-hidden />
              <span>Confirmed ovulation</span>
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}

function Bullseye({ "aria-hidden": ariaHidden }: { "aria-hidden"?: boolean }) {
  return (
    <svg
      aria-hidden={ariaHidden}
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="5" cy="5" r="4" stroke="var(--ovu-pred)" strokeWidth="1.4" />
      <circle cx="5" cy="5" r="1.2" fill="var(--ovu-pred)" />
    </svg>
  );
}

function Star({ "aria-hidden": ariaHidden }: { "aria-hidden"?: boolean }) {
  return (
    <svg
      aria-hidden={ariaHidden}
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="var(--ovu-conf)"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M5 0.5l1.4 2.84 3.1.45-2.25 2.19.53 3.1L5 7.62 2.22 9.08l.53-3.1L.5 3.79l3.1-.45L5 .5z" />
    </svg>
  );
}
