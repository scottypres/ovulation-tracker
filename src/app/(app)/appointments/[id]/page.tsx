import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  getAppointment,
  deleteAppointment,
  appendAppointmentNote,
  deleteAppointmentNote,
  attachAppointmentFile,
  deleteAppointmentAttachment,
} from "@/lib/actions/appointments";
import { parseNotes, formatNoteTimestamp } from "@/lib/appointments/notes";
import {
  parseAttachments,
  formatBytes,
} from "@/lib/appointments/attachments";
import { Button } from "@/components/ui/button";
import { EditAppointmentMetadataButton } from "@/components/appointment-editor";
import { DeleteAppointmentButton } from "@/components/delete-appointment-button";

export const dynamic = "force-dynamic";

function formatAppointmentDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

async function deleteThisAppointment(formData: FormData) {
  "use server";
  const id = Number(formData.get("id"));
  if (!id) return;
  await deleteAppointment(id);
  const { redirect } = await import("next/navigation");
  redirect("/appointments");
}

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!id) notFound();

  const ap = await getAppointment(id);
  if (!ap) notFound();

  const notes = parseNotes(ap.notes);
  const attachments = parseAttachments(ap.attachments);

  return (
    <main className="flex flex-col gap-6 pb-4">
      <header className="flex items-baseline justify-between gap-3 px-5 pt-6">
        <Link
          href="/appointments"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          All appointments
        </Link>
        <EditAppointmentMetadataButton ap={ap} />
      </header>

      <section className="px-5">
        <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {ap.appointment_type?.value ?? "Appointment"}
          </p>
          <h1 className="font-display text-xl text-foreground">
            {formatAppointmentDate(ap.occurred_on)}
          </h1>
          {ap.clinic_name ? (
            <p className="text-sm text-muted-foreground">{ap.clinic_name}</p>
          ) : null}
        </div>
      </section>

      <section className="flex flex-col gap-3 px-5">
        <h2 className="font-display text-base text-foreground">Notes</h2>

        <form
          action={appendAppointmentNote}
          className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
        >
          <input type="hidden" name="id" value={ap.id} />
          <textarea
            name="body"
            rows={3}
            required
            placeholder="Add a note (e.g. Dr. mentioned AMH levels…)"
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <Button type="submit" className="h-10 self-start rounded-xl px-4">
            Add note
          </Button>
        </form>

        {notes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            No notes yet. Jot one down above.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {notes.map((n, i) => (
              <li
                key={`${n.ts ?? "legacy"}-${i}`}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    {formatNoteTimestamp(n.ts)}
                  </span>
                  <form action={deleteAppointmentNote}>
                    <input type="hidden" name="id" value={ap.id} />
                    <input type="hidden" name="index" value={i} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                    >
                      Delete
                    </Button>
                  </form>
                </div>
                <p className="whitespace-pre-wrap text-sm text-foreground">
                  {n.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 px-5">
        <h2 className="font-display text-base text-foreground">Attachments</h2>

        <form
          action={attachAppointmentFile}
          className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
        >
          <input type="hidden" name="id" value={ap.id} />
          <label
            htmlFor="ap-file"
            className="text-xs font-medium text-foreground"
          >
            Attach a file
          </label>
          <input
            id="ap-file"
            type="file"
            name="file"
            required
            accept="image/*,application/pdf,.doc,.docx,.txt"
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-xl file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-secondary/80"
          />
          <p className="text-[11px] text-muted-foreground">
            Photos of paperwork, PDFs of lab results, etc. Max 15 MB.
          </p>
          <Button type="submit" className="h-10 self-start rounded-xl px-4">
            Upload
          </Button>
        </form>

        {attachments.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            No files attached yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {attachments.map((a) => (
              <li
                key={a.pathname}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"
              >
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1"
                >
                  <div className="truncate text-sm font-medium text-foreground hover:underline">
                    {a.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatBytes(a.size)} ·{" "}
                    {new Date(a.ts).toLocaleDateString()}
                  </div>
                </a>
                <form action={deleteAppointmentAttachment}>
                  <input type="hidden" name="id" value={ap.id} />
                  <input type="hidden" name="pathname" value={a.pathname} />
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
      </section>

      <section className="px-5 pt-2">
        <form action={deleteThisAppointment}>
          <input type="hidden" name="id" value={ap.id} />
          <DeleteAppointmentButton />
        </form>
      </section>
    </main>
  );
}
