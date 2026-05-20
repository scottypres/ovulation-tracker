"use server";

import { revalidatePath } from "next/cache";
import { put, del } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import {
  createRows,
  deleteRows,
  listRows,
  updateRows,
} from "@/lib/baserow/client";
import { prependNote, removeNote } from "@/lib/appointments/notes";
import {
  addAttachment,
  parseAttachments,
  removeAttachment as removeAttachmentMeta,
  type Attachment,
} from "@/lib/appointments/attachments";

type AppointmentRowShape = {
  id: number;
  occurred_on: string | null;
  clinic_name: string | null;
  appointment_type: { id: number; value: string; color: string } | null;
  notes: string | null;
  attachments: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

function sanitizeFileName(name: string): string {
  return name
    .replace(/[\/\\?%*:|"<>]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 120);
}

export async function createAppointment(formData: FormData): Promise<number> {
  const occurred_on = String(formData.get("occurred_on") ?? "");
  const clinic_name =
    String(formData.get("clinic_name") ?? "CNY Fertility") || "CNY Fertility";
  const appointment_type = String(
    formData.get("appointment_type") ?? "Initial consultation",
  );
  const initialNote = String(formData.get("notes") ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurred_on)) {
    throw new Error("Valid date required");
  }

  const notes = initialNote.length > 0 ? prependNote(null, initialNote) : null;

  const [created] = await createRows("appointments", [
    { occurred_on, clinic_name, appointment_type, notes },
  ]);

  revalidatePath("/appointments");
  return (created as { id: number }).id;
}

export async function updateAppointment(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  if (!id) throw new Error("id required");
  const occurred_on = String(formData.get("occurred_on") ?? "");
  const clinic_name = String(formData.get("clinic_name") ?? "");
  const appointment_type = String(formData.get("appointment_type") ?? "");

  const patch: Record<string, unknown> = { id };
  if (/^\d{4}-\d{2}-\d{2}$/.test(occurred_on)) patch.occurred_on = occurred_on;
  if (clinic_name) patch.clinic_name = clinic_name;
  if (appointment_type) patch.appointment_type = appointment_type;

  await updateRows("appointments", [patch as { id: number }]);
  revalidatePath("/appointments");
  revalidatePath(`/appointments/${id}`);
}

export async function deleteAppointment(id: number): Promise<void> {
  const current = await getAppointment(id);
  if (current) {
    const items = parseAttachments(current.attachments);
    await Promise.all(
      items.map((a) =>
        del(a.url).catch(() => {
          /* tolerate missing blobs */
        }),
      ),
    );
  }
  await deleteRows("appointments", [id]);
  revalidatePath("/appointments");
}

export async function listAppointments() {
  const rows = (await listRows("appointments", {
    all: true,
  })) as unknown as AppointmentRowShape[];
  rows.sort((a, b) => (b.occurred_on ?? "").localeCompare(a.occurred_on ?? ""));
  return rows;
}

export async function getAppointment(
  id: number,
): Promise<AppointmentRowShape | null> {
  const rows = (await listRows("appointments", {
    all: true,
  })) as unknown as AppointmentRowShape[];
  return rows.find((r) => r.id === id) ?? null;
}

export async function appendAppointmentNote(
  formData: FormData,
): Promise<void> {
  const id = Number(formData.get("id"));
  const body = String(formData.get("body") ?? "").trim();
  if (!id) throw new Error("id required");
  if (!body) throw new Error("Note body required");

  const current = await getAppointment(id);
  if (!current) throw new Error("Appointment not found");

  const nextNotes = prependNote(current.notes, body);
  await updateRows("appointments", [{ id, notes: nextNotes }]);
  revalidatePath(`/appointments/${id}`);
}

export async function deleteAppointmentNote(
  formData: FormData,
): Promise<void> {
  const id = Number(formData.get("id"));
  const index = Number(formData.get("index"));
  if (!id || Number.isNaN(index)) throw new Error("id and index required");

  const current = await getAppointment(id);
  if (!current) throw new Error("Appointment not found");

  const nextNotes = removeNote(current.notes, index);
  await updateRows("appointments", [{ id, notes: nextNotes || null }]);
  revalidatePath(`/appointments/${id}`);
}

export async function attachAppointmentFile(
  formData: FormData,
): Promise<void> {
  const id = Number(formData.get("id"));
  if (!id) throw new Error("id required");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("File required");
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(`File too large (max ${MAX_ATTACHMENT_BYTES / 1024 / 1024} MB)`);
  }

  const cleanName = sanitizeFileName(file.name || "upload");
  const pathname = `appointments/${id}/${randomUUID()}-${cleanName}`;

  const result = await put(pathname, file, {
    access: "public",
    contentType: file.type || undefined,
    addRandomSuffix: false,
  });

  const meta: Attachment = {
    url: result.url,
    pathname,
    name: file.name || cleanName,
    contentType: file.type || null,
    size: file.size,
    ts: new Date().toISOString(),
  };

  const current = await getAppointment(id);
  if (!current) throw new Error("Appointment not found");

  const next = addAttachment(current.attachments, meta);
  await updateRows("appointments", [{ id, attachments: next }]);
  revalidatePath(`/appointments/${id}`);
}

export async function deleteAppointmentAttachment(
  formData: FormData,
): Promise<void> {
  const id = Number(formData.get("id"));
  const pathname = String(formData.get("pathname") ?? "");
  if (!id || !pathname) throw new Error("id and pathname required");

  const current = await getAppointment(id);
  if (!current) throw new Error("Appointment not found");

  const { json, removed } = removeAttachmentMeta(current.attachments, pathname);
  if (removed) {
    await del(removed.url).catch(() => {
      /* tolerate missing blobs */
    });
  }
  await updateRows("appointments", [
    { id, attachments: json === "[]" ? null : json },
  ]);
  revalidatePath(`/appointments/${id}`);
}
