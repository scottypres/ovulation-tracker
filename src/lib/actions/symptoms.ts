"use server";

import { revalidatePath } from "next/cache";
import { createRows, deleteRows, listRows } from "@/lib/baserow/client";

type SymptomRowShape = {
  id: number;
  name: string;
  category: { id: number; value: string; color: string } | null;
  severity: { id: number; value: string; color: string } | null;
  logged_at: string | null;
  notes: string | null;
  custom: boolean;
};

export async function logSymptom(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "physical") as "physical" | "mood" | "other";
  const severity = (String(formData.get("severity") ?? "") || null) as "low" | "medium" | "high" | null;
  const loggedAt = String(formData.get("logged_at") ?? "") || new Date().toISOString();
  const notes = String(formData.get("notes") ?? "") || null;
  const customFlag = formData.get("custom") === "1" || formData.get("custom") === "true";

  if (!name) throw new Error("Symptom name required");

  await createRows("symptoms", [
    {
      name,
      category,
      severity,
      logged_at: loggedAt,
      notes,
      custom: customFlag,
    },
  ]);

  revalidatePath("/symptoms");
  revalidatePath("/");
}

export async function deleteSymptom(id: number): Promise<void> {
  await deleteRows("symptoms", [id]);
  revalidatePath("/symptoms");
  revalidatePath("/");
}

export async function listSymptoms() {
  const rows = (await listRows("symptoms", { all: true })) as unknown as SymptomRowShape[];
  // Sort newest first
  rows.sort((a, b) => (b.logged_at ?? "").localeCompare(a.logged_at ?? ""));
  return rows;
}

export async function recentCustomSymptomNames(): Promise<string[]> {
  const rows = (await listRows("symptoms", { all: true })) as unknown as SymptomRowShape[];
  return [
    ...new Set(rows.filter((r) => r.custom).map((r) => r.name)),
  ].slice(0, 20);
}
