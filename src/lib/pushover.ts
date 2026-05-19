/**
 * Pushover notification helper.
 *
 * Sends a single message via the Pushover API. The app token comes from
 * the environment (`PUSHOVER_TOKEN`); each call provides the recipient
 * user key (stored per-user in Baserow `app_config`, not in env).
 *
 * API: https://pushover.net/api
 *   POST https://api.pushover.net/1/messages.json
 *   form fields: token, user, title (≤250), message (≤1024),
 *                url, url_title, priority
 */

const PUSHOVER_URL = "https://api.pushover.net/1/messages.json";
const TITLE_MAX = 250;
const MESSAGE_MAX = 1024;

export type SendPushoverOpts = {
  user: string;
  title: string;
  message: string;
  url?: string;
  urlTitle?: string;
  priority?: number;
};

export type SendPushoverResult = {
  ok: boolean;
  status: number;
  error?: string;
};

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max);
}

export async function sendPushover(opts: SendPushoverOpts): Promise<SendPushoverResult> {
  const token = process.env.PUSHOVER_TOKEN;
  if (!token) {
    throw new Error("PUSHOVER_TOKEN is not set");
  }
  if (!opts.user) {
    throw new Error("sendPushover: missing recipient `user` key");
  }

  const body = new URLSearchParams();
  body.set("token", token);
  body.set("user", opts.user);
  body.set("title", truncate(opts.title, TITLE_MAX));
  body.set("message", truncate(opts.message, MESSAGE_MAX));
  if (opts.url) body.set("url", opts.url);
  if (opts.urlTitle) body.set("url_title", opts.urlTitle);
  if (typeof opts.priority === "number") body.set("priority", String(opts.priority));

  let res: Response;
  try {
    res = await fetch(PUSHOVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      cache: "no-store",
    });
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : String(e) };
  }

  if (res.ok) {
    return { ok: true, status: res.status };
  }
  let errText = "";
  try {
    errText = await res.text();
  } catch {
    errText = res.statusText;
  }
  return { ok: false, status: res.status, error: errText };
}
