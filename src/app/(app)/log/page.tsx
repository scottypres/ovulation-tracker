import { PageHeader } from "@/components/page-header";
import { listEvents, logEvent, deleteEvent } from "@/lib/actions/events";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  period_start: "Period started",
  period_end: "Period ended",
  lh_surge: "LH surge",
  temp_rise: "Temp rise",
};

const TYPE_DOTS: Record<string, string> = {
  period_start: "var(--period)",
  period_end: "var(--period-soft)",
  lh_surge: "var(--ovu-pred)",
  temp_rise: "var(--ovu-conf)",
};

function monthLabel(iso: string): string {
  const [y, m] = iso.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

async function deleteEventAction(formData: FormData) {
  "use server";
  const id = Number(formData.get("id"));
  if (id) await deleteEvent(id);
}

export default async function LogPage() {
  const events = await listEvents();

  // Sort newest first
  const sorted = [...events]
    .filter((e) => e.occurred_on)
    .sort((a, b) => (b.occurred_on ?? "").localeCompare(a.occurred_on ?? ""));

  // Group by YYYY-MM
  const groups = new Map<string, typeof sorted>();
  for (const e of sorted) {
    const k = e.occurred_on!.slice(0, 7);
    const arr = groups.get(k) ?? [];
    arr.push(e);
    groups.set(k, arr);
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="flex flex-col gap-6 pb-4">
      <PageHeader title="Log" subtitle="Record events that anchor your cycle" />

      {/* New event form */}
      <section className="px-5">
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

      {/* Grouped list */}
      <section className="flex flex-col gap-6 px-5">
        {groups.size === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground shadow-sm">
            No events logged yet.
          </div>
        ) : (
          Array.from(groups.entries()).map(([month, items]) => (
            <div key={month} className="flex flex-col gap-2">
              <h2 className="font-display text-base text-foreground">
                {monthLabel(month + "-01")}
              </h2>
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
                        style={{ backgroundColor: TYPE_DOTS[e.type?.value ?? ""] ?? "var(--muted-foreground)" }}
                      />
                      <div className="min-w-0">
                        <div className="text-sm text-foreground">
                          {TYPE_LABELS[e.type?.value ?? ""] ?? e.type?.value ?? "Event"}
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
          ))
        )}
      </section>
    </main>
  );
}
