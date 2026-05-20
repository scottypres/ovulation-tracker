import { PageHeader } from "@/components/page-header";
import { listEvents, logEvent, deleteEvent } from "@/lib/actions/events";
import {
  listSymptoms,
  recentCustomSymptomNames,
  deleteSymptom,
} from "@/lib/actions/symptoms";
import { PREDEFINED_SYMPTOMS } from "@/lib/actions/constants";
import { Button } from "@/components/ui/button";
import {
  SymptomChips,
  CustomSymptomInput,
  type ChipItem,
} from "@/components/symptom-logger";

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

function monthLabel(iso: string): string {
  const [y, m] = iso.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  });
}

function withinLast30Days(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return d.getTime() >= cutoff;
}

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

type RecentItem =
  | {
      kind: "event";
      id: number;
      ts: string;
      label: string;
      dot: string;
      detail: string;
    }
  | {
      kind: "symptom";
      id: number;
      ts: string;
      label: string;
      detail: string;
    };

export default async function LogPage() {
  const [events, symptoms, customNames] = await Promise.all([
    listEvents(),
    listSymptoms(),
    recentCustomSymptomNames(),
  ]);

  // Recent symptom chips: pick most recent unique names from last 30 days, max 8
  const recentChips: ChipItem[] = [];
  const seen = new Set<string>();
  for (const s of symptoms) {
    if (!withinLast30Days(s.logged_at)) continue;
    if (seen.has(s.name)) continue;
    seen.add(s.name);
    const cat = (s.category?.value ?? "other") as ChipItem["category"];
    recentChips.push({ name: s.name, category: cat, custom: s.custom });
    if (recentChips.length >= 8) break;
  }

  // Predefined grouped
  const groupedChips: Record<string, ChipItem[]> = {
    physical: [],
    mood: [],
    other: [],
  };
  for (const s of PREDEFINED_SYMPTOMS) {
    groupedChips[s.category].push({ name: s.name, category: s.category });
  }
  for (const name of customNames) {
    if (!groupedChips.other.some((g) => g.name === name)) {
      groupedChips.other.push({ name, category: "other", custom: true });
    }
  }

  // Combined recent log (last 30 days), newest first
  const recentItems: RecentItem[] = [];
  for (const e of events) {
    if (!e.occurred_on) continue;
    if (!withinLast30Days(e.occurred_on)) continue;
    const type = e.type?.value ?? "";
    recentItems.push({
      kind: "event",
      id: e.id,
      ts: e.occurred_on,
      label: EVENT_LABELS[type] ?? type ?? "Event",
      dot: EVENT_DOTS[type] ?? "var(--muted-foreground)",
      detail: e.notes ?? "",
    });
  }
  for (const s of symptoms) {
    if (!withinLast30Days(s.logged_at)) continue;
    const sev = s.severity?.value ?? "";
    const detail = [sev, s.notes].filter(Boolean).join(" · ");
    recentItems.push({
      kind: "symptom",
      id: s.id,
      ts: s.logged_at!,
      label: s.name,
      detail,
    });
  }
  recentItems.sort((a, b) => b.ts.localeCompare(a.ts));

  // Older events grouped by month (anything older than 30 days)
  const olderEvents = [...events]
    .filter((e) => e.occurred_on && !withinLast30Days(e.occurred_on))
    .sort((a, b) => (b.occurred_on ?? "").localeCompare(a.occurred_on ?? ""));
  const olderGroups = new Map<string, typeof olderEvents>();
  for (const e of olderEvents) {
    const k = e.occurred_on!.slice(0, 7);
    const arr = olderGroups.get(k) ?? [];
    arr.push(e);
    olderGroups.set(k, arr);
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="flex flex-col gap-6 pb-4">
      <PageHeader title="Log" subtitle="Record events and symptoms" />

      {/* Event form */}
      <section className="flex flex-col gap-2 px-5">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Log event
        </h2>
        <form
          action={logEvent}
          className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="occurred_on" className="text-xs font-medium text-foreground">
              Date
            </label>
            <input
              type="date"
              id="occurred_on"
              name="occurred_on"
              defaultValue={today}
              required
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="type" className="text-xs font-medium text-foreground">
              Event
            </label>
            <select
              id="type"
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
            <label htmlFor="notes" className="text-xs font-medium text-foreground">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>

          <Button type="submit" className="h-10 rounded-xl">
            Log event
          </Button>
        </form>
      </section>

      {/* Symptom logging */}
      <section className="flex flex-col gap-4 px-5">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Log symptom
        </h2>

        {recentChips.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Recent
            </h3>
            <SymptomChips items={recentChips} />
          </div>
        ) : null}

        {(["physical", "mood", "other"] as const).map((cat) =>
          groupedChips[cat].length === 0 ? null : (
            <div key={cat} className="flex flex-col gap-2">
              <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {SYMPTOM_CATEGORY_LABELS[cat]}
              </h3>
              <SymptomChips items={groupedChips[cat]} variant="muted" />
            </div>
          ),
        )}

        <div className="flex flex-col gap-2">
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Custom
          </h3>
          <CustomSymptomInput />
        </div>
      </section>

      {/* Recent activity (events + symptoms, last 30 days) */}
      <section className="flex flex-col gap-3 px-5">
        <h2 className="font-display text-base text-foreground">Recent activity</h2>
        {recentItems.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground shadow-sm">
            Nothing logged in the last 30 days.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {recentItems.map((it) => (
              <li
                key={`${it.kind}-${it.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {it.kind === "event" ? (
                    <span
                      aria-hidden
                      className="inline-block size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: it.dot }}
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="inline-block size-2.5 shrink-0 rounded-full bg-muted-foreground"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm text-foreground">{it.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {it.kind === "symptom"
                        ? new Date(it.ts).toLocaleString()
                        : it.ts}
                      {it.detail ? ` · ${it.detail}` : ""}
                    </div>
                  </div>
                </div>
                <form
                  action={
                    it.kind === "event"
                      ? deleteEventAction
                      : deleteSymptomAction
                  }
                >
                  <input type="hidden" name="id" value={it.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    Delete
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Older events archive (grouped by month) */}
      {olderGroups.size > 0 ? (
        <section className="flex flex-col gap-6 px-5">
          <h2 className="font-display text-base text-foreground">
            Earlier events
          </h2>
          {Array.from(olderGroups.entries()).map(([month, items]) => (
            <div key={month} className="flex flex-col gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {monthLabel(month + "-01")}
              </h3>
              <ul className="flex flex-col gap-2">
                {items.map((e) => (
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
                            EVENT_DOTS[e.type?.value ?? ""] ??
                            "var(--muted-foreground)",
                        }}
                      />
                      <div className="min-w-0">
                        <div className="text-sm text-foreground">
                          {EVENT_LABELS[e.type?.value ?? ""] ??
                            e.type?.value ??
                            "Event"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {e.occurred_on}
                          {e.notes ? ` · ${e.notes}` : ""}
                        </div>
                      </div>
                    </div>
                    <form action={deleteEventAction}>
                      <input type="hidden" name="id" value={e.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Delete
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}
    </main>
  );
}
