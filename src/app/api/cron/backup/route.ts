/**
 * Nightly Vercel cron — exports a full JSON snapshot of every Baserow table
 * and uploads it to Vercel Blob as `backups/YYYY-MM-DD.json`.
 *
 * Auth: requires `Authorization: Bearer ${CRON_SECRET}`. Vercel cron requests
 * automatically include this header when CRON_SECRET is configured.
 */
import { put } from "@vercel/blob";
import { listRows } from "@/lib/baserow/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TABLES = ["app_config", "events", "cycles", "symptoms", "appointments"] as const;

export async function GET(request: Request): Promise<Response> {
  const expected = process.env.CRON_SECRET;
  const got = request.headers.get("authorization");
  if (!expected || got !== `Bearer ${expected}`) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tables: Record<string, Array<Record<string, unknown>>> = {};
  for (const t of TABLES) {
    tables[t] = await listRows(t, { all: true });
  }

  const exported_at = new Date().toISOString();
  const payload = JSON.stringify({ exported_at, tables }, null, 2);
  const bytes = Buffer.byteLength(payload, "utf8");
  const ymd = exported_at.slice(0, 10);
  const pathname = `backups/${ymd}.json`;

  const result = await put(pathname, payload, {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  return new Response(
    JSON.stringify({ ok: true, pathname, bytes, url: result.url }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}
