"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getConfig, setConfig } from "@/lib/baserow/client";

const CustomChipSchema = z.object({
  name: z.string().min(1).max(40),
  category: z.enum(["physical", "mood", "other"]),
});
export type CustomChip = z.infer<typeof CustomChipSchema>;
const CustomChipsSchema = z.array(CustomChipSchema);
const CUSTOM_CHIPS_KEY = "custom_symptom_chips";

export async function getCustomSymptomChips(): Promise<CustomChip[]> {
  const raw = await getConfig(CUSTOM_CHIPS_KEY);
  if (!raw) return [];
  try {
    return CustomChipsSchema.parse(JSON.parse(raw));
  } catch {
    return [];
  }
}

async function setCustomSymptomChips(chips: CustomChip[]): Promise<void> {
  await setConfig(CUSTOM_CHIPS_KEY, JSON.stringify(chips));
}

export async function addCustomSymptomChip(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "other") as CustomChip["category"];
  if (!name) throw new Error("Name required");
  const chip = CustomChipSchema.parse({ name, category });

  const existing = await getCustomSymptomChips();
  if (existing.some((c) => c.name.toLowerCase() === chip.name.toLowerCase())) {
    throw new Error("That chip already exists");
  }
  await setCustomSymptomChips([...existing, chip]);
  revalidatePath("/more");
  revalidatePath("/log");
}

export async function removeCustomSymptomChip(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const existing = await getCustomSymptomChips();
  const next = existing.filter(
    (c) => c.name.toLowerCase() !== name.toLowerCase(),
  );
  await setCustomSymptomChips(next);
  revalidatePath("/more");
  revalidatePath("/log");
}

export async function saveSettings(formData: FormData): Promise<void> {
  const pushoverUserKey = String(formData.get("pushover_user_key") ?? "").trim();
  const userName = String(formData.get("user_name") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();

  if (pushoverUserKey !== "") {
    await setConfig("pushover_user_key", pushoverUserKey);
  }
  if (userName) await setConfig("user_name", userName);
  if (timezone) await setConfig("timezone", timezone);

  revalidatePath("/settings");
  revalidatePath("/");
}

export async function clearPushoverKey(): Promise<void> {
  await setConfig("pushover_user_key", "");
  revalidatePath("/settings");
}
