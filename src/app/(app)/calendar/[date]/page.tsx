import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listEvents, logEvent, deleteEvent } from "@/lib/actions/events";
import {
  listSymptoms,
  deleteSymptom,
  recentCustomSymptomNames,
} from "@/lib/actions/symptoms";
import { listAppointments } from "@/lib/actions/appointments";
import { getCustomSymptomChips } from "@/lib/actions/settings";
import { PREDEFINED_SYMPTOMS } from "@/lib/actions/constants";
import {
  SymptomMultiSelect,
  type ChipItem,
} from "@/components/symptom-logger";
import { formatDateMDY, formatTimestampMDY } from "@/lib/format/dates";

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

const SYMPTOM_CATEGORY_LABELS: Record<string, string> = {
  physical: "Physical",
  mood: "Mood",
  other: "Other",
};

async function deleteEventAction(formData: FormData) {
  "use server";
  const id = Number(formData.get("id"));
  if (id) await deleteEvent(id);
}

async function deleteSymptomAction(formData: FormData) {
  "use server";
  const id = Number(formData.get("id"));
  if (id) await deleteSymptom(id);
}

function pretty(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function CalendarDayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const [events, symptoms, appointments, customNames, savedCustomChips] =
    await Promise.all([
      listEvents(),
      listSymptoms(),
      listAppointments(),
      recentCustomSymptomNames(),
      getCustomSymptomChips(),
    ]);

  const dayEvents = events.filter((e) => e.occurred_on === date);
  const daySymptoms = symptoms.filter((s) => s.logged_at?.slice(0, 10) === date);
  const dayAppointments = appointments.filter((a) => a.occurred_on === date);

  // Build chip set for the multi-select (no "Recent" — that's for the global /log)
  const groupedChips: Record<string, ChipItem[]> = {
    physical: [],
    mood: [],
    other: [],
  };
  for (const s of PREDEFINED_SYMPTOMS) {
    groupedChips[s.category].push({ name: s.name, category: s.category });
  }
  for (const c of savedCustomChips) {
    if (!groupedChips[c.category].some((g) => g.name === c.name)) {
      groupedChips[c.category].push({
        name: c.name,
        category: c.category,
        custom: true,
      });
    }
  }
  for (const name of customNames) {
    if (!groupedChips.other.some((g) => g.name === name)) {
      groupedChips.other.push({ name, category: "other", custom: true });
    }
  }

  return (
    <main className="flex flex-col gap-6 pb-4">
      <header className="flex items-baseline justify-between gap-3 px-5 pt-6">
        <Link
          href="/calendar"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Calendar
        </Link>
        <span className="text-xs font-medium text-muted-foreground">
          {formatDateMDY(date)}
        </span>
      </header>

      <section className="px-5">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h1 className="font-display text-xl text-foreground">{pretty(date)}</h1>
          <p className="text-xs text-muted-foreground">
            {dayEvents.length + daySymptoms.length + dayAppointments.length === 0
              ? "Nothing logged on this day yet."
              : `${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}, ${daySymptoms.length} symptom${daySymptoms.length === 1 ? "" : "s"}${dayAppointments.length > 0 ? `, ${dayAppointments.length} appointment${dayAppointments.length === 1 ? "" : "s"}` : ""}.`}
          </p>
        </div>
      </section>

      {/* Logged events */}
      <section className="flex flex-col gap-3 px-5">
        <h2 className="font-display text-base text-foreground">Events</h2>
        {dayEvents.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-4 text-center text-sm text-muted-foreground">
            None logged yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {dayEvents.map((e) => {
              const type = e.type?.value ?? "";
              return (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden
                      className="inline-block size-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          EVENT_DOTS[type] ?? "var(--muted-foreground)",
                      }}
                    />
                    <div className="min-w-0">
                      <div className="text-sm text-foreground">
                        {EVENT_LABELS[type] ?? type ?? "Event"}
                      </div>
                      {e.notes ? (
                        <div className="text-xs text-muted-foreground">
                          {e.notes}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <form action={deleteEventAction}>
                    <input type="hidden" name="id" value={e.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      Delete
                    </Button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}

        <form
          action={logEvent}
          className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
        >
          <input type="hidden" name="occurred_on" value={date} />
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="day-event-type"
              className="text-xs font-medium text-foreground"
            >
              Add event
            </label>
            <select
              id="day-event-type"
              name="type"
              defaultValue="period_start"
              required
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <option value="period_start">Period started</option>
              <option value="period_end">Period ended</option>
              <option value="lh_surge">LH surge</option>
              <option value="temp_rise">Temp rise</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="day-event-notes"
              className="text-xs font-medium text-foreground"
            >
              Notes (optional)
            </label>
            <textarea
              id="day-event-notes"
              name="notes"
              rows={2}
              className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
          <Button type="submit" className="h-10 self-start rounded-xl px-4">
            Add event
          </Button>
        </form>
      </section>

      {/* Logged symptoms */}
      <section className="flex flex-col gap-3 px-5">
        <h2 className="font-display text-base text-foreground">Symptoms</h2>
        {daySymptoms.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-4 text-center text-sm text-muted-foreground">
            None logged yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {daySymptoms.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="text-sm text-foreground">{s.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatTimestampMDY(s.logged_at)}
                    {s.severity?.value ? ` · ${s.severity.value}` : ""}
                    {s.notes ? ` · ${s.notes}` : ""}
                  </div>
                </div>
                <form action={deleteSymptomAction}>
                  <input type="hidden" name="id" value={s.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    Delete
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <p className="-mb-1 text-[11px] text-muted-foreground">
          Tap as many chips as apply, then submit them together.
        </p>
        <SymptomMultiSelect
          recent={[]}
          groups={(["physical", "mood", "other"] as const).map((cat) => ({
            label: SYMPTOM_CATEGORY_LABELS[cat],
            items: groupedChips[cat],
          }))}
          dateOverride={date}
        />
      </section>

      {/* Appointments on this day */}
      {dayAppointments.length > 0 ? (
        <section className="flex flex-col gap-3 px-5">
          <h2 className="font-display text-base text-foreground">Appointments</h2>
          <ul className="flex flex-col gap-2">
            {dayAppointments.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/appointments/${a.id}`}
                  className="block rounded-2xl border border-border bg-card px-4 py-3 shadow-sm transition-colors hover:bg-secondary/40"
                >
                  <div className="text-sm font-medium text-foreground">
                    {a.appointment_type?.value ?? "Appointment"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {a.clinic_name ?? ""}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

    </main>
  );
}
