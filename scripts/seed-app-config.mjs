#!/usr/bin/env node
/**
 * Idempotent seed of the Baserow app_config table.
 * Reads APP_PASSWORD + BASEROW_API_TOKEN from the env. Run via:
 *   APP_PASSWORD=cornelius BASEROW_API_TOKEN=$(op read ...) node scripts/seed-app-config.mjs
 *
 * Re-runs are safe — existing rows are matched by `key` and updated.
 */
import bcrypt from "bcryptjs";
import schema from "../src/lib/baserow/schema.json" with { type: "json" };

const TOKEN = process.env.BASEROW_API_TOKEN;
const PASSWORD = process.env.APP_PASSWORD;
if (!TOKEN || !PASSWORD) {
  console.error("BASEROW_API_TOKEN and APP_PASSWORD required");
  process.exit(1);
}

const BASE = schema.base_url;
const TABLE = schema.tables.app_config.table_id;

async function bw(path, init = {}) {
  const r = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Token ${TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}: ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

const hash = await bcrypt.hash(PASSWORD, 12);
const desired = [
  { key: "password_hash", value: hash },
  { key: "timezone", value: "America/New_York" },
  { key: "user_name", value: "Ashley Monastra" },
  { key: "pushover_user_key", value: "" },
];

const existing = await bw(`/api/database/rows/table/${TABLE}/?user_field_names=true&size=200`);
const byKey = new Map(existing.results.map((r) => [r.key, r]));

const creates = [];
const updates = [];
for (const d of desired) {
  if (byKey.has(d.key)) {
    updates.push({ id: byKey.get(d.key).id, value: d.value });
  } else {
    creates.push(d);
  }
}

if (creates.length) {
  await bw(`/api/database/rows/table/${TABLE}/batch/?user_field_names=true`, {
    method: "POST",
    body: JSON.stringify({ items: creates }),
  });
  console.log(`[created] ${creates.map((c) => c.key).join(", ")}`);
}

if (updates.length) {
  await bw(`/api/database/rows/table/${TABLE}/batch/?user_field_names=true`, {
    method: "PATCH",
    body: JSON.stringify({ items: updates }),
  });
  console.log(`[updated] ${updates.length} rows`);
}

console.log("seed complete");
