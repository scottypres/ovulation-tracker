import { getConfig } from "@/lib/baserow/client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const userName = (await getConfig("user_name")) ?? "you";

  return (
    <main className="min-h-dvh bg-slate-50 p-6">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
        <h1 className="text-2xl font-medium text-slate-800">Hi {userName} 🌱</h1>
        <p className="text-sm text-slate-600">
          Your ovulation tracker is set up. The full experience lands in the next deploy.
        </p>
        <p className="text-xs text-slate-400">Phase 1 — Foundation</p>
        <form action="/logout" method="post">
          <button
            type="submit"
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
