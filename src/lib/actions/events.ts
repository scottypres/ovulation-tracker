"use server";

import { revalidatePath } from "next/cache";
import { createRows, deleteRows, listRows, updateRows } from "@/lib/baserow/client";
import type { EventType } from "@/lib/cycles/derive";

type EventRowShape = {
  id: number;
  type: { id: number; value: string; color: string } | null;
  occurred_on: string | null;
  notes: string | null;
};

const VALID: EventType[] = ["period_start", "period_end", "lh_surge", "temp_rise"];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Log an event. If an event with the same (type, occurred_on) already exists, update it.
 */
export async function logEvent(formData: FormData): Promise<void> {
  const type = String(formData.get("type") ?? "");
  const occurred_on = String(formData.get("occurred_on") ?? today());
  const notes = String(formData.get("notes") ?? "") || null;

  if (!VALID.includes(type as EventType)) {
    throw new Error(`Invalid event type: ${type}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurred_on)) {
    throw new Error(`Invalid date: ${occurred_on}`);
  }

  // Upsert by (type, occurred_on)
  const existing = (await listRows("events", { all: true })) as unknown as EventRowShape[];
  const match = existing.find(
    (e) => e.type?.value === type && e.occurred_on === occurred_on,
  );

  if (match) {
    await updateRows("events", [{ id: match.id, notes }]);
  } else {
    await createRows("events", [{ type, occurred_on, notes }]);
  }

  revalidatePath("/", "layout");
}

export async function deleteEvent(id: number): Promise<void> {
  await deleteRows("events", [id]);
  revalidatePath("/", "layout");
}

export async function listEvents() {
  return (await listRows("events", { all: true })) as unknown as EventRowShape[];
}
