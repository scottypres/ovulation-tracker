/**
 * Baserow REST client — references fields by Baserow field ID (`field_<id>`).
 * Display-name renames in the Baserow UI must NOT break the app. (REQ-B2)
 */
import { z } from "zod";
import { BASEROW_BASE_URL, SCHEMA, type TableName } from "./schema";

const TOKEN = process.env.BASEROW_API_TOKEN;

if (!TOKEN && process.env.NODE_ENV !== "test") {
  // Permit absence at import time so build-time analysis doesn't crash;
  // runtime calls below will throw with a clear message.
}

function authHeader(): HeadersInit {
  const t = process.env.BASEROW_API_TOKEN;
  if (!t) throw new Error("BASEROW_API_TOKEN is not set");
  return { Authorization: `Token ${t}`, "Content-Type": "application/json" };
}

async function bw<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASEROW_BASE_URL}${path}`, {
    ...init,
    headers: { ...authHeader(), ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!r.ok) {
    throw new Error(`Baserow ${r.status} ${r.statusText} on ${path}: ${await r.text()}`);
  }
  if (r.status === 204) return undefined as T;
  return (await r.json()) as T;
}

/** Build a `?user_field_names=true` query param map; useful when callers use name-keyed payloads. */
function toFieldIdRow<T extends TableName>(table: T, row: Record<string, unknown>): Record<string, unknown> {
  const fields = SCHEMA[table].fields;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const meta = (fields as Record<string, { api_name: string }>)[k];
    if (!meta) throw new Error(`Unknown field ${k} on table ${String(table)}`);
    out[meta.api_name] = v;
  }
  return out;
}

function fromFieldIdRow<T extends TableName>(table: T, raw: Record<string, unknown>): Record<string, unknown> {
  const fields = SCHEMA[table].fields;
  const reverse = new Map<string, string>();
  for (const [name, meta] of Object.entries(fields as Record<string, { api_name: string }>)) {
    reverse.set(meta.api_name, name);
  }
  const out: Record<string, unknown> = { id: raw.id, order: raw.order };
  for (const [k, v] of Object.entries(raw)) {
    if (k === "id" || k === "order") continue;
    const name = reverse.get(k);
    if (name) out[name] = v;
  }
  return out;
}

/** Paginated row listing. Returns ALL rows by default — fine for our tiny scale. */
export async function listRows<T extends TableName>(
  table: T,
  opts: { search?: string; size?: number; page?: number; all?: boolean } = {},
): Promise<Array<Record<string, unknown>>> {
  const tableId = SCHEMA[table].table_id;
  const size = Math.min(opts.size ?? 200, 200);
  const out: Array<Record<string, unknown>> = [];
  let page = opts.page ?? 1;
  for (;;) {
    const q = new URLSearchParams({ size: String(size), page: String(page) });
    if (opts.search) q.set("search", opts.search);
    const data = await bw<{ results: Array<Record<string, unknown>>; next: string | null }>(
      `/api/database/rows/table/${tableId}/?${q}`,
    );
    out.push(...data.results.map((r) => fromFieldIdRow(table, r)));
    if (!data.next || opts.all === false) break;
    page += 1;
  }
  return out;
}

export async function createRows<T extends TableName>(
  table: T,
  rows: Array<Record<string, unknown>>,
): Promise<Array<Record<string, unknown>>> {
  const tableId = SCHEMA[table].table_id;
  const items = rows.map((r) => toFieldIdRow(table, r));
  const data = await bw<{ items: Array<Record<string, unknown>> }>(
    `/api/database/rows/table/${tableId}/batch/`,
    { method: "POST", body: JSON.stringify({ items }) },
  );
  return data.items.map((r) => fromFieldIdRow(table, r));
}

export async function updateRows<T extends TableName>(
  table: T,
  rows: Array<{ id: number } & Record<string, unknown>>,
): Promise<Array<Record<string, unknown>>> {
  const tableId = SCHEMA[table].table_id;
  const items = rows.map(({ id, ...rest }) => ({ id, ...toFieldIdRow(table, rest) }));
  const data = await bw<{ items: Array<Record<string, unknown>> }>(
    `/api/database/rows/table/${tableId}/batch/`,
    { method: "PATCH", body: JSON.stringify({ items }) },
  );
  return data.items.map((r) => fromFieldIdRow(table, r));
}

export async function deleteRows<T extends TableName>(table: T, ids: number[]): Promise<void> {
  const tableId = SCHEMA[table].table_id;
  await bw(`/api/database/rows/table/${tableId}/batch-delete/`, {
    method: "POST",
    body: JSON.stringify({ items: ids }),
  });
}

// ─── Typed row schemas (Zod) ─────────────────────────────────────────────────

const selectOption = z.object({ id: z.number(), value: z.string(), color: z.string() }).nullable();

export const AppConfigRow = z.object({
  id: z.number(),
  order: z.string().optional(),
  key: z.string(),
  value: z.string().nullable(),
});
export type AppConfig = z.infer<typeof AppConfigRow>;

export const EventRow = z.object({
  id: z.number(),
  order: z.string().optional(),
  type: selectOption,
  occurred_on: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string().nullable(),
});
export type EventRow = z.infer<typeof EventRow>;

export const CycleRow = z.object({
  id: z.number(),
  order: z.string().optional(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  length_days: z.union([z.number(), z.string()]).nullable(),
  lh_surge_on: z.string().nullable(),
  temp_rise_on: z.string().nullable(),
  notes: z.string().nullable(),
});
export type CycleRow = z.infer<typeof CycleRow>;

export const SymptomRow = z.object({
  id: z.number(),
  order: z.string().optional(),
  name: z.string(),
  category: selectOption,
  severity: selectOption,
  logged_at: z.string().nullable(),
  notes: z.string().nullable(),
  custom: z.boolean(),
});
export type SymptomRow = z.infer<typeof SymptomRow>;

export const AppointmentRow = z.object({
  id: z.number(),
  order: z.string().optional(),
  occurred_on: z.string().nullable(),
  appointment_time: z.string().nullable(),
  clinic_name: z.string().nullable(),
  location: z.string().nullable(),
  appointment_type: selectOption,
  notes: z.string().nullable(),
  attachments: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});
export type AppointmentRow = z.infer<typeof AppointmentRow>;

// ─── Convenience: app_config k/v ─────────────────────────────────────────────

let configCache: { ts: number; map: Map<string, AppConfig> } | null = null;
const CONFIG_TTL_MS = 30_000;

export async function loadConfig(): Promise<Map<string, AppConfig>> {
  if (configCache && Date.now() - configCache.ts < CONFIG_TTL_MS) return configCache.map;
  const rows = (await listRows("app_config", { all: true })).map((r) => AppConfigRow.parse(r));
  const map = new Map(rows.map((r) => [r.key, r]));
  configCache = { ts: Date.now(), map };
  return map;
}

export async function getConfig(key: string): Promise<string | null> {
  const map = await loadConfig();
  return map.get(key)?.value ?? null;
}

export async function setConfig(key: string, value: string): Promise<void> {
  const map = await loadConfig();
  if (map.has(key)) {
    await updateRows("app_config", [{ id: map.get(key)!.id, value }]);
  } else {
    await createRows("app_config", [{ key, value }]);
  }
  configCache = null;
}
