import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { saveSettings } from "@/lib/actions/settings";
import { getConfig } from "@/lib/baserow/client";

export const dynamic = "force-dynamic";

export default async function MorePage() {
  const [userName, timezone, hasPushover] = await Promise.all([
    getConfig("user_name"),
    getConfig("timezone"),
    getConfig("pushover_user_key").then((v) => Boolean(v && v.trim())),
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

      {/* Doctor report */}
      <section className="px-5">
        <h2 className="mb-2 font-display text-base text-foreground">Doctor report</h2>
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Export a PDF summary of your cycle history and notes for your clinician.
          </p>
          <Button className="h-10 rounded-xl" render={<a href="/api/report" />}>
            Export PDF
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Phase 4 — generation lands in a future deploy.
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
