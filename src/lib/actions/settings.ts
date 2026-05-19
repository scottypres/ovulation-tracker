"use server";

import { revalidatePath } from "next/cache";
import { setConfig } from "@/lib/baserow/client";

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
