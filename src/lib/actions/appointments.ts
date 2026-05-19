"use server";

import { revalidatePath } from "next/cache";
import { createRows, deleteRows, listRows, updateRows } from "@/lib/baserow/client";

type AppointmentRowShape = {
  id: number;
  occurred_on: string | null;
  clinic_name: string | null;
  appointment_type: { id: number; value: string; color: string } | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export async function createAppointment(formData: FormData): Promise<void> {
  const occurred_on = String(formData.get("occurred_on") ?? "");
  const clinic_name = String(formData.get("clinic_name") ?? "CNY Fertility") || "CNY Fertility";
  const appointment_type = String(formData.get("appointment_type") ?? "Initial consultation");
  const notes = String(formData.get("notes") ?? "") || null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurred_on)) {
    throw new Error("Valid date required");
  }

  await createRows("appointments", [
    { occurred_on, clinic_name, appointment_type, notes },
  ]);

  revalidatePath("/appointments");
}

export async function updateAppointment(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  if (!id) throw new Error("id required");
  const notes = String(formData.get("notes") ?? "") || null;
  const occurred_on = String(formData.get("occurred_on") ?? "");
  const clinic_name = String(formData.get("clinic_name") ?? "");
  const appointment_type = String(formData.get("appointment_type") ?? "");

  const patch: Record<string, unknown> = { id };
  if (notes !== null) patch.notes = notes;
  if (/^\d{4}-\d{2}-\d{2}$/.test(occurred_on)) patch.occurred_on = occurred_on;
  if (clinic_name) patch.clinic_name = clinic_name;
  if (appointment_type) patch.appointment_type = appointment_type;

  await updateRows("appointments", [patch as { id: number }]);
  revalidatePath("/appointments");
}

export async function deleteAppointment(id: number): Promise<void> {
  await deleteRows("appointments", [id]);
  revalidatePath("/appointments");
}

export async function listAppointments() {
  const rows = (await listRows("appointments", { all: true })) as unknown as AppointmentRowShape[];
  rows.sort((a, b) => (b.occurred_on ?? "").localeCompare(a.occurred_on ?? ""));
  return rows;
}
