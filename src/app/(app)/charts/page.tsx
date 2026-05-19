import { differenceInCalendarDays, format, parseISO, subDays } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { listEvents } from "@/lib/actions/events";
import { listSymptoms } from "@/lib/actions/symptoms";
import { deriveCycles, meanCycleLength, type EventInput, type EventType } from "@/lib/cycles/derive";
import {
  CycleLengthBar,
  type CycleLengthDatum,
} from "@/components/charts/cycle-length-bar";
import {
  OvulationSignalScatter,
  type SignalDatum,
} from "@/components/charts/ovulation-signal-scatter";
import {
  SymptomFrequencyBar,
  type SymptomFreqDatum,
} from "@/components/charts/symptom-frequency-bar";

export const dynamic = "force-dynamic";

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h3 className="font-display text-lg text-foreground">{title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-[180px] items-center justify-center rounded-xl bg-muted/30 px-4 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export default async function ChartsPage() {
  const [rawEvents, symptoms] = await Promise.all([listEvents(), listSymptoms()]);

  const events: EventInput[] = rawEvents
    .filter((e) => e.type?.value && e.occurred_on)
    .map((e) => ({
      id: e.id,
      type: e.type!.value as EventType,
      occurred_on: e.occurred_on!,
    }));

  const cycles = deriveCycles(events);
  const mean = meanCycleLength(cycles);

  // (a) Cycle length over time — last 12 completed cycles
  const completed = cycles.filter((c) => c.length_days !== null);
  const last12 = completed.slice(-12);
  const cycleLengthData: CycleLengthDatum[] = last12.map((c) => ({
    label: format(parseISO(c.start_date), "MMM"),
    length: c.length_days!,
  }));

  // (b) LH+ / temp rise relative to cycle day
  const lhData: SignalDatum[] = [];
  const tempData: SignalDatum[] = [];
  cycles.forEach((c, idx) => {
    const i = idx + 1;
    const start = parseISO(c.start_date);
    if (c.lh_surge_on) {
      lhData.push({
        cycleIndex: i,
        cycleDay: differenceInCalendarDays(parseISO(c.lh_surge_on), start) + 1,
      });
    }
    if (c.temp_rise_on) {
      tempData.push({
        cycleIndex: i,
        cycleDay: differenceInCalendarDays(parseISO(c.temp_rise_on), start) + 1,
      });
    }
  });

  // (c) Symptom frequency last 90 days
  const cutoff = subDays(new Date(), 90);
  const freq = new Map<string, number>();
  for (const s of symptoms) {
    if (!s.logged_at) continue;
    const at = parseISO(s.logged_at);
    if (at < cutoff) continue;
    freq.set(s.name, (freq.get(s.name) ?? 0) + 1);
  }
  const symptomData: SymptomFreqDatum[] = [...freq.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .reverse(); // reverse so largest is at top for horizontal bar

  return (
    <main className="flex flex-col gap-4 pb-4">
      <PageHeader title="Charts" subtitle="Cycle length and signal trends" />
      <div className="flex flex-col gap-4 px-5">
        <ChartCard
          title="Cycle length over time"
          subtitle="Last 12 completed cycles, in days"
        >
          {cycleLengthData.length >= 2 ? (
            <CycleLengthBar data={cycleLengthData} mean={mean} />
          ) : (
            <EmptyState message="Need at least 2 cycles of data" />
          )}
        </ChartCard>

        <ChartCard
          title="Ovulation signals by cycle day"
          subtitle="When LH+ and temperature rise land within each cycle"
        >
          {lhData.length + tempData.length > 0 ? (
            <OvulationSignalScatter lh={lhData} temp={tempData} />
          ) : (
            <EmptyState message="Log an LH+ or temperature rise to see this" />
          )}
        </ChartCard>

        <ChartCard
          title="Symptom frequency"
          subtitle="Top symptoms in the last 90 days"
        >
          {symptomData.length > 0 ? (
            <SymptomFrequencyBar data={symptomData} />
          ) : (
            <EmptyState message="No symptoms logged in the last 90 days" />
          )}
        </ChartCard>
      </div>
    </main>
  );
}
