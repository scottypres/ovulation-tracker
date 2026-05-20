import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  saveSettings,
  getCustomSymptomChips,
  addCustomSymptomChip,
  removeCustomSymptomChip,
} from "@/lib/actions/settings";
import { getConfig } from "@/lib/baserow/client";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  physical: "Physical",
  mood: "Mood",
  other: "Other",
};

export default async function MorePage() {
  const [userName, timezone, hasPushover, customChips] = await Promise.all([
    getConfig("user_name"),
    getConfig("timezone"),
    getConfig("pushover_user_key").then((v) => Boolean(v && v.trim())),
    getCustomSymptomChips(),
  ]);

  return (
    <main className="flex flex-col gap-6 pb-4">
      <PageHeader title="More" subtitle="Settings, reports, account" />

      {/* Settings */}
      <section className="px-5">
        <h2 className="mb-2 font-display text-base text-foreground">Settings</h2>
        <form
          action={saveSettings}
          className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="user_name" className="text-xs font-medium text-foreground">
              Display name
            </label>
            <input
              id="user_name"
              name="user_name"
              type="text"
              defaultValue={userName ?? ""}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="timezone" className="text-xs font-medium text-foreground">
              Timezone
            </label>
            <input
              id="timezone"
              name="timezone"
              type="text"
              placeholder="America/New_York"
              defaultValue={timezone ?? ""}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <p className="text-[11px] text-muted-foreground">
              IANA timezone name. Used to align nudges to your day.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="pushover_user_key" className="text-xs font-medium text-foreground">
              Pushover user key
              {hasPushover ? (
                <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                  (set — enter a new value to replace)
                </span>
              ) : null}
            </label>
            <input
              id="pushover_user_key"
              name="pushover_user_key"
              type="password"
              autoComplete="off"
              placeholder={hasPushover ? "••••••••••••" : "u••••••••••••"}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <p className="text-[11px] text-muted-foreground">
              Get your user key from{" "}
              <a
                href="https://pushover.net/"
                className="underline underline-offset-2"
                target="_blank"
                rel="noreferrer"
              >
                pushover.net
              </a>{" "}
              after installing the Pushover app on your phone. Your nudges will
              be silent until this is set.
            </p>
          </div>

          <Button type="submit" className="h-10 rounded-xl">
            Save settings
          </Button>
        </form>
      </section>

      {/* Custom symptom chips */}
      <section className="px-5">
        <h2 className="mb-2 font-display text-base text-foreground">
          Custom symptom buttons
        </h2>
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Add buttons that always show up under Log → symptoms, so you don&apos;t
            have to type them every time.
          </p>

          {customChips.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-background px-3 py-3 text-center text-xs text-muted-foreground">
              No custom buttons yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {customChips.map((c) => (
                <li
                  key={c.name}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {CATEGORY_LABELS[c.category]}
                    </span>
                    <span className="truncate text-sm text-foreground">
                      {c.name}
                    </span>
                  </div>
                  <form action={removeCustomSymptomChip}>
                    <input type="hidden" name="name" value={c.name} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <form
            action={addCustomSymptomChip}
            className="flex flex-col gap-3 border-t border-border pt-4"
          >
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="custom-chip-name"
                className="text-xs font-medium text-foreground"
              >
                Button label
              </label>
              <input
                id="custom-chip-name"
                name="name"
                type="text"
                required
                maxLength={40}
                placeholder="e.g. Implantation cramps"
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="custom-chip-category"
                className="text-xs font-medium text-foreground"
              >
                Group
              </label>
              <select
                id="custom-chip-category"
                name="category"
                defaultValue="other"
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <option value="physical">Physical</option>
                <option value="mood">Mood</option>
                <option value="other">Other</option>
              </select>
            </div>
            <Button type="submit" className="h-10 self-start rounded-xl px-4">
              Add button
            </Button>
          </form>
        </div>
      </section>

      {/* Insights */}
      <section className="px-5">
        <h2 className="mb-2 font-display text-base text-foreground">Insights</h2>
        <Link
          href="/charts"
          className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-secondary/40 active:bg-secondary/60"
        >
          <div className="flex items-center gap-3">
            <BarChart3 className="size-5 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium text-foreground">Charts</div>
              <div className="text-xs text-muted-foreground">
                Cycle lengths and patterns over time.
              </div>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">→</span>
        </Link>
      </section>

      {/* Doctor report */}
      <section className="px-5">
        <h2 className="mb-2 font-display text-base text-foreground">Doctor report</h2>
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Export a PDF summary of your cycle history and notes for your clinician.
          </p>
          <Button
            variant="outline"
            className="h-10 rounded-xl"
            render={
              <a href="/api/report" target="_blank" rel="noopener noreferrer" />
            }
          >
            Export PDF
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Opens in a new tab. Includes a per-cycle timeline plus symptom and
            appointment appendices.
          </p>
        </div>
      </section>

      {/* Sign out */}
      <section className="px-5">
        <form action="/logout" method="post">
          <Button type="submit" variant="ghost" className="h-10 rounded-xl">
            Sign out
          </Button>
        </form>
      </section>
    </main>
  );
}
