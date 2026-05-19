/**
 * Baserow schema — single source of truth for table & field IDs.
 *
 * REQ-B2: references the API by field ID (`field_<id>`), NOT by display name.
 * Renaming a field in the Baserow UI must NOT break the app.
 *
 * Regenerate by running /tmp/ov-tracker-session/provision_schema.py against
 * the database and copying the output into src/lib/baserow/schema.json.
 */
import raw from "./schema.json";

export const BASEROW_BASE_URL = raw.base_url;
export const BASEROW_DATABASE_ID = raw.database_id;

type FieldMeta = { id: number; type: string; primary: boolean; api_name: string };
type TableMeta = { table_id: number; fields: Record<string, FieldMeta> };

const tables = raw.tables as unknown as Record<string, TableMeta>;

export const SCHEMA = {
  app_config: tables.app_config,
  events: tables.events,
  cycles: tables.cycles,
  symptoms: tables.symptoms,
  appointments: tables.appointments,
} as const;

export type TableName = keyof typeof SCHEMA;

/** Get the Baserow field key (`field_<id>`) for a given table + field name. */
export function fieldKey<T extends TableName>(
  table: T,
  field: keyof (typeof SCHEMA)[T]["fields"] & string,
): string {
  const meta = SCHEMA[table].fields[field as string];
  if (!meta) {
    throw new Error(`Unknown field ${String(field)} on table ${String(table)}`);
  }
  return meta.api_name;
}

/** Get the numeric table ID for a given table name. */
export function tableId(table: TableName): number {
  return SCHEMA[table].table_id;
}
