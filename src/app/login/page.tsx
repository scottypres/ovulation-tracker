import { redirect } from "next/navigation";

async function login(formData: FormData) {
  "use server";
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  const { verifyPassword } = await import("@/lib/auth/password");
  const { getSession } = await import("@/lib/auth/session");

  if (!(await verifyPassword(password))) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }
  const session = await getSession();
  session.authedAt = Date.now();
  await session.save();
  redirect(next || "/");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  return (
    <main className="min-h-dvh flex items-center justify-center bg-slate-50 p-6">
      <form
        action={login}
        className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4"
      >
        <h1 className="text-2xl font-medium text-slate-800">Ovulation Tracker</h1>
        <p className="text-sm text-slate-500">Enter the app password to continue.</p>
        <input type="hidden" name="next" value={next ?? "/"} />
        <input
          type="password"
          name="password"
          placeholder="Password"
          autoComplete="current-password"
          autoFocus
          required
          className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
        />
        {error && <p className="text-sm text-rose-600">Incorrect password.</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-slate-800 text-white py-2 hover:bg-slate-700"
        >
          Sign in
        </button>
      </form>
    </main>
  );
}
