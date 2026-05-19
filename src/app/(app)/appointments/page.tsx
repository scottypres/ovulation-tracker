import { PageHeader } from "@/components/page-header";
import { listAppointments } from "@/lib/actions/appointments";
import {
  NewAppointmentButton,
  AppointmentRow,
  type AppointmentRecord,
} from "@/components/appointment-editor";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage() {
  const rows = await listAppointments();
  const items = rows as unknown as AppointmentRecord[];

  return (
    <main className="flex flex-col gap-6 pb-4">
      <PageHeader
        title="Appointments"
        subtitle="Clinic visits and notes"
        right={<NewAppointmentButton />}
      />

      <section className="flex flex-col gap-2 px-5">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground shadow-sm">
            No appointments yet.
          </div>
        ) : (
          items.map((ap) => <AppointmentRow key={ap.id} ap={ap} />)
        )}
      </section>
    </main>
  );
}
