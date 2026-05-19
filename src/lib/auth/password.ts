import bcrypt from "bcryptjs";
import { getConfig } from "@/lib/baserow/client";

export async function verifyPassword(candidate: string): Promise<boolean> {
  const hash = await getConfig("password_hash");
  if (!hash) return false;
  return bcrypt.compare(candidate, hash);
}
