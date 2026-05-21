export const APP_TIMEZONE = "America/New_York";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIMEZONE,
  month: "2-digit",
  day: "2-digit",
  year: "numeric",
});

const timeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIMEZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const isoDateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Returns the calendar date (YYYY-MM-DD) of an ISO timestamp in America/New_York. */
export function toAppDate(input: string | null | undefined): string | null {
  if (!input) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const dt = new Date(input);
  if (Number.isNaN(dt.getTime())) return null;
  return isoDateFmt.format(dt);
}

export function formatDateMDY(input: string | null | undefined): string {
  if (!input) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split("-");
    return `${m}/${d}/${y}`;
  }
  const dt = new Date(input);
  if (Number.isNaN(dt.getTime())) return input;
  return dateFmt.format(dt);
}

export function formatTimestampMDY(input: string | null | undefined): string {
  if (!input) return "—";
  const dt = new Date(input);
  if (Number.isNaN(dt.getTime())) return input;
  return `${dateFmt.format(dt)} · ${timeFmt.format(dt)}`;
}
