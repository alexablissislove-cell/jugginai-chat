"use client";
import { useRef, useState } from "react";
import { Mark, Wordmark } from "./brand";

export default function Login() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [show, setShow] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

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
      setShakeKey((k) => k + 1);
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="relative min-h-[var(--app-h,100dvh)] overflow-hidden">
      <div className="backdrop" />
      <div className="grid-lines" />
      <div className="relative z-10 flex min-h-[var(--app-h,100dvh)] flex-col pl-[max(env(safe-area-inset-left),20px)] pr-[max(env(safe-area-inset-right),20px)] pt-[max(env(safe-area-inset-top),20px)] pb-[max(env(safe-area-inset-bottom),20px)]">
        <main className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px] animate-rise">
            <div className="mb-8 flex flex-col items-center text-center">
              <div className="relative">
                <div className="absolute inset-0 -z-10 scale-150 rounded-full bg-ember/25 blur-2xl" />
                <Mark size={64} />
              </div>
              <Wordmark className="mt-5 text-[26px]" />
              <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.24em] text-ash">Private workspace</p>
            </div>

            <div key={shakeKey} className={`glass hairline rounded-[22px] p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] sm:p-7 ${shakeKey ? "animate-shake" : ""}`}>
              <h1 className="font-display text-[30px] leading-tight tracking-[-0.01em] text-bone">Welcome back.</h1>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ash">Enter your password to open the studio.</p>

              <form onSubmit={submit} className="mt-6">
                <label htmlFor="pw" className="mb-2 block text-[12px] font-medium tracking-wide text-ash">Password</label>
                <div className={`group flex items-center rounded-[14px] border bg-ink/70 transition-colors focus-within:border-ember/70 focus-within:shadow-[0_0_0_4px_rgba(255,106,43,0.14)] ${err ? "border-rose-400/60" : "border-white/10 hover:border-white/20"}`}>
                  <svg className="ml-3.5 h-[18px] w-[18px] shrink-0 text-smoke transition-colors group-focus-within:text-ember-hi" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="4" y="10.5" width="16" height="10" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /><circle cx="12" cy="15.5" r="1.2" fill="currentColor" />
                  </svg>
                  <input
                    ref={inputRef}
                    id="pw"
                    type={show ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    autoFocus
                    spellCheck={false}
                    autoCapitalize="none"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (err) setErr(""); }}
                    aria-invalid={!!err}
                    aria-describedby={err ? "pw-err" : undefined}
                    placeholder="••••••••••"
                    className="h-[52px] min-w-0 flex-1 bg-transparent px-3 text-[16px] tracking-wide text-bone outline-none placeholder:tracking-[0.2em] placeholder:text-white/25 focus-visible:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? "Hide password" : "Show password"}
                    aria-pressed={show}
                    className="press mr-1.5 grid h-10 w-10 shrink-0 place-items-center rounded-[10px] text-smoke hover:bg-white/5 hover:text-bone"
                  >
                    {show ? (
                      <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18" /><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c5.5 0 9 5.5 9 7 0 .6-.6 1.8-1.7 3.1M6.5 6.6C4.2 8 3 10.9 3 12c0 1.5 3.5 7 9 7 1.7 0 3.2-.5 4.5-1.2" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
                    ) : (
                      <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                    )}
                  </button>
                </div>
                <p id="pw-err" role="alert" className={`mt-2 min-h-[20px] text-[13px] text-rose-300 transition-opacity ${err ? "opacity-100" : "opacity-0"}`}>{err || " "}</p>

                <button
                  type="submit"
                  disabled={busy || !password}
                  className="ember-btn mt-2 flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] text-[15px] font-semibold tracking-[-0.005em]"
                >
                  {busy ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-coal/30 border-t-coal" aria-hidden="true" />
                      Unlocking…
                    </>
                  ) : (
                    <>
                      Enter
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </>
                  )}
                </button>
              </form>
            </div>

            <p className="mt-6 flex items-center justify-center gap-2 text-[12px] text-smoke">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.8)]" aria-hidden="true" />
              Private session · Powered by Grok
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
