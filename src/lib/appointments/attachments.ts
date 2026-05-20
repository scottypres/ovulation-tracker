import { z } from "zod";

export const AttachmentSchema = z.object({
  url: z.string().url(),
  pathname: z.string(),
  name: z.string(),
  contentType: z.string().nullable(),
  size: z.number().int().nonnegative(),
  ts: z.string(),
});
export type Attachment = z.infer<typeof AttachmentSchema>;

const AttachmentsSchema = z.array(AttachmentSchema);

export function parseAttachments(
  raw: string | null | undefined,
): Attachment[] {
  if (!raw) return [];
  try {
    return AttachmentsSchema.parse(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function serializeAttachments(items: Attachment[]): string {
  return JSON.stringify(items);
}

export function addAttachment(
  raw: string | null | undefined,
  next: Attachment,
): string {
  const items = parseAttachments(raw);
  items.unshift(next);
  return serializeAttachments(items);
}

export function removeAttachment(
  raw: string | null | undefined,
  pathname: string,
): { json: string; removed: Attachment | null } {
  const items = parseAttachments(raw);
  const idx = items.findIndex((a) => a.pathname === pathname);
  if (idx < 0) return { json: serializeAttachments(items), removed: null };
  const [removed] = items.splice(idx, 1);
  return { json: serializeAttachments(items), removed };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
