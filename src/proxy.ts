import { NextResponse, type NextRequest } from "next/server";
import { getIronSession } from "iron-session";

type AppSession = { authedAt?: number };

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/_next", "/favicon.ico", "/api/cron"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`) || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Inline session check (middleware can't import server-only modules that touch cookies()).
  const res = NextResponse.next();
  const session = await getIronSession<AppSession>(req, res, {
    password: process.env.SESSION_SECRET ?? "dev-secret-please-replace-32+chars-minimum-or-iron-session-throws",
    cookieName: "ot.sid",
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    },
  });

  if (!session.authedAt) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
