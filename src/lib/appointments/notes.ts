export type AppointmentNote = {
  ts: string | null;
  body: string;
};

const HEADER_RE = /^=== (\S+) ===\s*$/;

export function parseNotes(raw: string | null | undefined): AppointmentNote[] {
  if (!raw) return [];
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const notes: AppointmentNote[] = [];
  let current: AppointmentNote | null = null;
  let pending: string[] = [];

  const flushPending = () => {
    if (pending.length === 0) return;
    const body = pending.join("\n").trim();
    if (body.length === 0) return;
    notes.push({ ts: null, body });
    pending = [];
  };

  for (const line of lines) {
    const m = line.match(HEADER_RE);
    if (m) {
      if (current) {
        notes.push({ ts: current.ts, body: pending.join("\n").trim() });
        pending = [];
      } else {
        flushPending();
      }
      current = { ts: m[1], body: "" };
      continue;
    }
    pending.push(line);
  }

  if (current) {
    notes.push({ ts: current.ts, body: pending.join("\n").trim() });
  } else {
    flushPending();
  }

  return notes.filter((n) => n.body.length > 0);
}

function serialize(notes: AppointmentNote[]): string {
  return notes
    .map((n) =>
      n.ts ? `=== ${n.ts} ===\n\n${n.body}` : n.body,
    )
    .join("\n\n");
}

export function prependNote(
  raw: string | null | undefined,
  body: string,
  ts: Date = new Date(),
): string {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Note body required");
  const existing = parseNotes(raw);
  const next: AppointmentNote[] = [
    { ts: ts.toISOString(), body: trimmed },
    ...existing,
  ];
  return serialize(next);
}

export function removeNote(
  raw: string | null | undefined,
  index: number,
): string {
  const existing = parseNotes(raw);
  if (index < 0 || index >= existing.length) return raw ?? "";
  existing.splice(index, 1);
  return serialize(existing);
}

import { formatTimestampMDY } from "@/lib/format/dates";

export function formatNoteTimestamp(iso: string | null): string {
  if (!iso) return "Earlier";
  return formatTimestampMDY(iso);
}
