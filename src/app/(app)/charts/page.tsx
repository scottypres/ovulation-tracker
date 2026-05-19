import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default function ChartsPage() {
  return (
    <main className="flex flex-col gap-4">
      <PageHeader title="Charts" subtitle="Cycle length and signal trends" />
      <div className="px-5">
        <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center shadow-sm">
          <p className="font-display text-lg text-foreground">Coming soon</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Charts and a doctor-ready PDF land in Phase 4.
          </p>
        </div>
      </div>
    </main>
  );
}
