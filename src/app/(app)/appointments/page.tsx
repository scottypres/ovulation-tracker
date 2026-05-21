import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { formatDateMDY } from "@/lib/format/dates";
import { listAppointments } from "@/lib/actions/appointments";
import { NewAppointmentButton } from "@/components/appointment-editor";
import { parseNotes } from "@/lib/appointments/notes";
import { parseAttachments } from "@/lib/appointments/attachments";
import { Paperclip, StickyNote } from "lucide-react";

export const dynamic = "force-dynamic";

function formatClock(hhmm: string): string {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return hhmm;
  let h = Number(m[1]);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m[2]} ${ampm}`;
}

export default async function AppointmentsPage() {
  const rows = await listAppointments();

  return (
    <main className="flex flex-col gap-6 pb-4">
      <PageHeader
        title="Appointments"
        subtitle="Clinic visits, notes, and files"
        right={<NewAppointmentButton />}
      />

      <section className="flex flex-col gap-2 px-5">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground shadow-sm">
            No appointments yet.
          </div>
        ) : (
          rows.map((ap) => {
            const noteCount = parseNotes(ap.notes).length;
            const fileCount = parseAttachments(ap.attachments).length;
            return (
              <Link
                key={ap.id}
                href={`/appointments/${ap.id}`}
                className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm transition-colors hover:bg-secondary/40 active:bg-secondary/60"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground">
                    {ap.appointment_type?.value ?? "Appointment"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateMDY(ap.occurred_on)}
                    {ap.appointment_time
                      ? ` · ${formatClock(ap.appointment_time)}`
                      : ""}
                    {ap.clinic_name ? ` · ${ap.clinic_name}` : ""}
                  </div>
                  {noteCount + fileCount > 0 ? (
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                      {noteCount > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <StickyNote className="size-3" />
                          {noteCount} {noteCount === 1 ? "note" : "notes"}
                        </span>
                      ) : null}
                      {fileCount > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Paperclip className="size-3" />
                          {fileCount} {fileCount === 1 ? "file" : "files"}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </Link>
            );
          })
        )}
      </section>
    </main>
  );
}
