"use client";
import { useState } from "react";

export default function Login() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Could not sign in");
      window.location.reload();
    } catch (x: any) {
      setErr(x.message || "Could not sign in");
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[var(--app-h,100dvh)] flex-col px-[max(env(safe-area-inset-left),16px)] pr-[max(env(safe-area-inset-right),16px)] pt-[max(env(safe-area-inset-top),16px)] pb-[max(env(safe-area-inset-bottom),16px)]">
      <header className="flex items-center gap-2 px-1 py-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 text-lg font-bold text-black">J</div>
        <span className="text-lg font-semibold tracking-tight">Juggin<span className="text-cyan-400">AI</span></span>
      </header>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-400">This chat is private. Enter the site password to continue.</p>
        <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
          <label className="text-sm text-zinc-400">
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-[16px] text-zinc-100 outline-none focus:border-violet-500/60"
            />
          </label>
          {err && <p className="text-sm text-rose-400">{err}</p>}
          <button
            type="submit"
            disabled={busy || !password}
            className="h-12 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 font-medium text-white disabled:opacity-40"
          >
            {busy ? "Signing in…" : "Enter"}
          </button>
        </form>
      </main>
    </div>
  );
}
