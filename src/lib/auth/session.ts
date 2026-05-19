import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type AppSession = {
  authedAt?: number; // unix ms
};

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? "dev-secret-please-replace-32+chars-minimum-or-iron-session-throws",
  cookieName: "ot.sid",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  },
};

export async function getSession() {
  return getIronSession<AppSession>(await cookies(), sessionOptions);
}

export async function isAuthed(): Promise<boolean> {
  const s = await getSession();
  return !!s.authedAt;
}
