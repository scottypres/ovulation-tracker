import { PageHeader } from "@/components/page-header";
import {
  listSymptoms,
  recentCustomSymptomNames,
  deleteSymptom,
} from "@/lib/actions/symptoms";
import { PREDEFINED_SYMPTOMS } from "@/lib/actions/constants";
import { Button } from "@/components/ui/button";
import { SymptomChips, CustomSymptomInput, type ChipItem } from "@/components/symptom-logger";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  physical: "Physical",
  mood: "Mood",
  other: "Other",
};

async function deleteSymptomAction(formData: FormData) {
  "use server";
  const id = Number(formData.get("id"));
  if (id) await deleteSymptom(id);
}

function withinLast30Days(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return d.getTime() >= cutoff;
}

export default async function SymptomsPage() {
  const [symptoms, customNames] = await Promise.all([
    listSymptoms(),
    recentCustomSymptomNames(),
  ]);

  // Recent chips: pick most recent unique names from last 30 days, max 8
  const recent: ChipItem[] = [];
  const seen = new Set<string>();
  for (const s of symptoms) {
    if (!withinLast30Days(s.logged_at)) continue;
    if (seen.has(s.name)) continue;
    seen.add(s.name);
    const cat = (s.category?.value ?? "other") as ChipItem["category"];
    recent.push({ name: s.name, category: cat, custom: s.custom });
    if (recent.length >= 8) break;
  }

  // Predefined grouped
  const grouped: Record<string, ChipItem[]> = { physical: [], mood: [], other: [] };
  for (const s of PREDEFINED_SYMPTOMS) {
    grouped[s.category].push({ name: s.name, category: s.category });
  }
  // Add saved custom names into "Other"
  for (const name of customNames) {
    if (!grouped.other.some((g) => g.name === name)) {
      grouped.other.push({ name, category: "other", custom: true });
    }
  }

  // Chronological log: newest first, last 30 days
  const recentLog = symptoms.filter((s) => withinLast30Days(s.logged_at));

  return (
    <main className="flex flex-col gap-6 pb-4">
      <PageHeader title="Symptoms" subtitle="Tap a chip to log one quickly" />

      {/* Recent chips */}
      {recent.length > 0 ? (
        <section className="flex flex-col gap-2 px-5">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Recent
          </h2>
          <SymptomChips items={recent} />
        </section>
      ) : null}

      {/* Categories */}
      <section className="flex flex-col gap-5 px-5">
        {(["physical", "mood", "other"] as const).map((cat) =>
          grouped[cat].length === 0 ? null : (
            <div key={cat} className="flex flex-col gap-2">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {CATEGORY_LABELS[cat]}
              </h2>
              <SymptomChips items={grouped[cat]} variant="muted" />
            </div>
          ),
        )}
      </section>

      {/* Custom input */}
      <section className="flex flex-col gap-2 px-5">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Custom
        </h2>
        <CustomSymptomInput />
      </section>

      {/* Recent log */}
      <section className="flex flex-col gap-3 px-5">
        <h2 className="font-display text-base text-foreground">Recent log</h2>
        {recentLog.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground shadow-sm">
            Nothing logged in the last 30 days.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {recentLog.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="text-sm text-foreground">{s.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.logged_at ? new Date(s.logged_at).toLocaleString() : "—"}
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
      </section>
    </main>
  );
}
