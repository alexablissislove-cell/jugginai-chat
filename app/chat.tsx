"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Mark, Wordmark } from "./brand";
import { CopyButton, Markdown } from "./markdown";

type Att = { key: string; name: string; type: string };
type Msg = { role: "user" | "assistant"; content: string; attachments?: Att[] };
const STORE = "jugginai.chat.v1";

const SUGGESTIONS = [
  { title: "Draft a launch plan", sub: "for a weekend side project", prompt: "Draft a tight launch plan for a weekend side project: goals, a checklist, and what to cut." },
  { title: "Explain it simply", sub: "how vector databases work", prompt: "Explain how vector databases work like I'm a sharp engineer new to ML. Keep it short." },
  { title: "Write some code", sub: "a typed fetch with retries", prompt: "Write a TypeScript fetch wrapper with timeout, retries, and exponential backoff." },
  { title: "Sharpen my writing", sub: "punchier, same meaning", prompt: "Rewrite this to be punchier without changing the meaning:\n\n" },
];

function useVisualViewport() {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const vv = window.visualViewport;
      const h = vv?.height ?? window.innerHeight;
      root.style.setProperty("--app-h", `${h}px`);
      root.style.setProperty("--app-top", `${vv?.offsetTop ?? 0}px`);
    };
    apply();
    window.visualViewport?.addEventListener("resize", apply);
    window.visualViewport?.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);
    return () => {
      window.visualViewport?.removeEventListener("resize", apply);
      window.visualViewport?.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
    };
  }, []);
}

const Icon = {
  plus: <path d="M12 5v14M5 12h14" />,
  clip: <path d="M20.5 11.5l-8.1 8.1a5 5 0 0 1-7.1-7.1l8.5-8.5a3.4 3.4 0 0 1 4.8 4.8l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8" />,
  up: <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />,
  compose: <><path d="M12 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5V12" /><path d="M17.6 3.6a2 2 0 0 1 2.8 2.8L12 14.8 8.5 15.5l.7-3.5 8.4-8.4Z" /></>,
  out: <><path d="M15 4h2.5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5H15" /><path d="M10 16.5 5.5 12 10 7.5M5.5 12H15" /></>,
  x: <path d="M7 7l10 10M17 7 7 17" />,
  img: <><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><circle cx="9" cy="10" r="1.6" /><path d="m20.5 16-4.5-4.5L7 19.5" /></>,
  doc: <><path d="M14 3.5H7.5A2.5 2.5 0 0 0 5 6v12a2.5 2.5 0 0 0 2.5 2.5h9A2.5 2.5 0 0 0 19 18V8.5L14 3.5Z" /><path d="M14 3.5V8.5h5M9 13h6M9 16.5h4" /></>,
  arrow: <path d="M7 17 17 7M9 7h8v8" />,
};
function I({ d, className = "h-[18px] w-[18px]", sw = 1.9 }: { d: React.ReactNode; className?: string; sw?: number }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
}

function AttChip({ a, onRemove, tone = "dark" }: { a: Att; onRemove?: () => void; tone?: "dark" | "warm" }) {
  const isImg = a.type?.startsWith("image/");
  return (
    <span className={`inline-flex max-w-[240px] items-center gap-2 rounded-[10px] border py-1.5 pl-1.5 text-[12.5px] ${onRemove ? "pr-1" : "pr-3"} ${tone === "warm" ? "border-ember/25 bg-ember/10 text-[#ffe2cc]" : "border-white/10 bg-white/[0.04] text-bone"}`}>
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-[7px] ${isImg ? "bg-sky-400/15 text-sky-200" : "bg-ember/15 text-ember-hi"}`}>
        <I d={isImg ? Icon.img : Icon.doc} className="h-3.5 w-3.5" sw={2} />
      </span>
      <span className="truncate">{a.name}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove ${a.name}`} className="press grid h-6 w-6 shrink-0 place-items-center rounded-md text-smoke hover:bg-white/10 hover:text-bone">
          <I d={Icon.x} className="h-3.5 w-3.5" sw={2.2} />
        </button>
      )}
    </span>
  );
}

function Typing() {
  return (
    <span className="inline-flex h-6 items-center gap-1.5" role="status" aria-label="JugginAI is typing">
      {[0, 150, 300].map((d) => (
        <span key={d} className="h-2 w-2 animate-juggle rounded-full bg-gradient-to-b from-ember-hi to-ember-lo" style={{ animationDelay: `${d}ms` }} />
      ))}
    </span>
  );
}

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Att[]>([]);
  const [uploading, setUploading] = useState(0);
  const [err, setErr] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  useVisualViewport();

  useEffect(() => {
    try { setMessages(JSON.parse(localStorage.getItem(STORE) || "[]")); } catch {}
  }, []);
  useEffect(() => {
    if (!busy) localStorage.setItem(STORE, JSON.stringify(messages.slice(-60)));
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  useLayoutEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [input]);

  async function signOut() {
    await fetch("/api/session", { method: "DELETE" }).catch(() => {});
    window.location.reload();
  }

  async function upload(files: FileList | null) {
    if (!files) return;
    setErr("");
    for (const f of Array.from(files).slice(0, 4)) {
      setUploading((n) => n + 1);
      try {
        const fd = new FormData();
        fd.append("file", f);
        const r = await fetch("/api/upload", { method: "POST", body: fd });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) { setErr(j.error || "Upload failed"); continue; }
        setPending((p) => [...p, { key: j.key, name: j.name, type: j.type }]);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setErr("");
    const user: Msg = { role: "user", content: text, attachments: pending.length ? pending : undefined };
    const next = [...messages, user];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setPending([]);
    setBusy(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })), attachments: user.attachments }),
      });
      const payload = (r.headers.get("content-type") || "").includes("application/json")
        ? await r.json().catch(() => ({}))
        : null;
      if (r.status === 401 || payload?.error === "Sign in first") {
        await signOut();
        throw new Error("Please sign in again, then resend.");
      }
      if (!r.ok || !r.body) throw new Error(payload?.error || "Something went wrong");
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMessages([...next, { role: "assistant", content: acc }]);
      }
    } catch (x: any) {
      setErr(x.message || "Error");
      setMessages(next);
    } finally {
      setBusy(false);
    }
  }

  function pick(prompt: string) {
    setInput(prompt);
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(prompt.length, prompt.length);
    });
  }

  const empty = messages.length === 0;
  const canSend = !busy && !!input.trim() && uploading === 0;

  return (
    <div className="fixed inset-x-0 flex flex-col overflow-hidden" style={{ top: "var(--app-top, 0px)", height: "var(--app-h, 100dvh)" }}>
      <div className="backdrop" />

      <header className="glass relative z-20 border-b border-white/[0.06] pl-[max(env(safe-area-inset-left),14px)] pr-[max(env(safe-area-inset-right),10px)] pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            <Mark size={30} />
            <Wordmark className="text-[19px]" />
            <span className="ml-1 hidden items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium text-ash min-[400px]:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" aria-hidden="true" />
              Grok
            </span>
          </div>
          <nav className="flex items-center gap-0.5" aria-label="Chat actions">
            {!empty && (
              <button
                onClick={() => { setMessages([]); localStorage.removeItem(STORE); }}
                className="press flex h-10 items-center gap-1.5 rounded-[11px] px-2.5 text-[13px] font-medium text-ash hover:bg-white/[0.06] hover:text-bone"
              >
                <I d={Icon.compose} />
                <span className="hidden sm:inline">New chat</span>
                <span className="sr-only sm:hidden">New chat</span>
              </button>
            )}
            <button onClick={signOut} className="press flex h-10 items-center gap-1.5 rounded-[11px] px-2.5 text-[13px] font-medium text-ash hover:bg-white/[0.06] hover:text-bone">
              <I d={Icon.out} />
              <span className="hidden sm:inline">Sign out</span>
              <span className="sr-only sm:hidden">Sign out</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="scroll-thin relative z-10 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto flex min-h-full max-w-3xl flex-col pl-[max(env(safe-area-inset-left),16px)] pr-[max(env(safe-area-inset-right),16px)] sm:px-6">
          {empty ? (
            <section className="flex flex-1 flex-col justify-center py-10">
              <div className="animate-rise">
                <div className="relative mb-6 inline-block">
                  <div className="absolute inset-0 -z-10 scale-[1.8] rounded-full bg-ember/20 blur-2xl" />
                  <Mark size={52} />
                </div>
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-ember-hi">Your private studio</p>
                <h1 className="mt-3 font-display text-[44px] leading-[1.02] tracking-[-0.015em] text-bone sm:text-[60px]">
                  What are we <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-ember-hi via-ember to-[#ff4d6d]">juggling</span> today?
                </h1>
                <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ash">Ask anything, drop in images or text files, and keep the thread going. Conversations stay on this device.</p>
              </div>
              <div className="mt-8 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => pick(s.prompt)}
                    style={{ animationDelay: `${120 + i * 70}ms` }}
                    className="press group hairline flex animate-rise items-center justify-between gap-3 rounded-[16px] bg-white/[0.025] px-4 py-3.5 text-left hover:bg-white/[0.05]"
                  >
                    <span className="min-w-0">
                      <span className="block text-[14px] font-medium text-bone">{s.title}</span>
                      <span className="mt-0.5 block truncate text-[13px] text-smoke">{s.sub}</span>
                    </span>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/[0.08] text-smoke transition-colors group-hover:border-ember/50 group-hover:text-ember-hi">
                      <I d={Icon.arrow} className="h-3.5 w-3.5" sw={2.2} />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <div className="flex flex-col gap-7 pb-6 pt-6 sm:pt-8" aria-live="polite">
              {messages.map((m, i) => {
                const last = i === messages.length - 1;
                if (m.role === "user") {
                  return (
                    <div key={i} className="flex animate-msg-in flex-col items-end gap-2">
                      {m.attachments && m.attachments.length > 0 && (
                        <div className="flex max-w-[88%] flex-wrap justify-end gap-1.5">
                          {m.attachments.map((a) => <AttChip key={a.key} a={a} tone="warm" />)}
                        </div>
                      )}
                      <div className="max-w-[88%] whitespace-pre-wrap break-words rounded-[20px] rounded-br-[6px] border border-ember/20 bg-gradient-to-b from-[#2a1910] to-[#1d120c] px-4 py-2.5 text-[15.5px] leading-relaxed text-[#fbeee4] shadow-[0_10px_30px_-18px_rgba(255,106,43,0.6)] sm:max-w-[75%]">
                        {m.content}
                      </div>
                    </div>
                  );
                }
                const streaming = busy && last;
                return (
                  <div key={i} className="group flex animate-msg-in gap-3 sm:gap-4">
                    <div className="mt-0.5 shrink-0"><Mark size={28} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex h-7 items-center gap-2 text-[12.5px] font-medium text-ash">
                        <span>JugginAI</span>
                        {streaming && m.content && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ember" aria-hidden="true" />}
                      </div>
                      {m.content ? <Markdown text={m.content} /> : streaming ? <Typing /> : null}
                      {m.content && !streaming && (
                        <div className="-ml-2 mt-2 flex opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                          <CopyButton text={m.content} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </main>

      <footer className="relative z-20 pl-[max(env(safe-area-inset-left),12px)] pr-[max(env(safe-area-inset-right),12px)] pb-[max(env(safe-area-inset-bottom),12px)] pt-2">
        <div className="pointer-events-none absolute inset-x-0 -top-10 h-10 bg-gradient-to-t from-ink to-transparent" />
        <div className="relative mx-auto max-w-3xl">
          {err && (
            <div role="alert" className="mb-2 flex animate-msg-in items-start gap-2 rounded-[12px] border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[13px] text-rose-200">
              <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" aria-hidden="true" />
              <span className="flex-1">{err}</span>
              <button type="button" onClick={() => setErr("")} aria-label="Dismiss" className="press -my-1 grid h-6 w-6 place-items-center rounded-md text-rose-200/70 hover:text-rose-100"><I d={Icon.x} className="h-3.5 w-3.5" sw={2.2} /></button>
            </div>
          )}
          <form
            onSubmit={send}
            className="glass hairline rounded-[22px] p-1.5 shadow-[0_20px_60px_-25px_rgba(0,0,0,0.9)] transition-shadow focus-within:shadow-[inset_0_0_0_1px_rgba(255,106,43,0.45),0_0_0_4px_rgba(255,106,43,0.10),0_20px_60px_-25px_rgba(0,0,0,0.9)]"
          >
            {(pending.length > 0 || uploading > 0) && (
              <div className="flex flex-wrap gap-1.5 px-1.5 pb-1 pt-1.5">
                {pending.map((a) => (
                  <AttChip key={a.key} a={a} onRemove={() => setPending((p) => p.filter((x) => x.key !== a.key))} />
                ))}
                {uploading > 0 && (
                  <span className="inline-flex items-center gap-2 rounded-[10px] border border-dashed border-white/15 px-3 py-1.5 text-[12.5px] text-ash">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/15 border-t-ember-hi" aria-hidden="true" />
                    Uploading{uploading > 1 ? ` ${uploading}` : ""}…
                  </span>
                )}
              </div>
            )}
            <div className="flex items-end gap-1">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Attach files"
                title="Attach images or text files"
                className="press grid h-11 w-11 shrink-0 place-items-center rounded-[16px] text-ash hover:bg-white/[0.06] hover:text-bone"
              >
                <I d={Icon.clip} className="h-5 w-5" />
              </button>
              <input ref={fileRef} type="file" multiple accept="image/*,.txt,.md,.csv,.json,.js,.ts,.py,.html,.css" className="hidden" onChange={(e) => upload(e.target.files)} />
              <label htmlFor="composer" className="sr-only">Message JugginAI</label>
              <textarea
                id="composer"
                ref={taRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
                rows={1}
                placeholder="Message JugginAI…"
                className="scroll-thin max-h-[200px] min-h-11 flex-1 resize-none bg-transparent px-1.5 py-[11px] text-[16px] leading-[22px] text-bone outline-none placeholder:text-smoke focus-visible:outline-none"
              />
              <button
                type="submit"
                disabled={!canSend}
                aria-label={busy ? "Sending" : "Send message"}
                className="ember-btn grid h-11 w-11 shrink-0 place-items-center rounded-[16px]"
              >
                {busy ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/25 border-t-current" aria-hidden="true" />
                ) : (
                  <I d={Icon.up} className="h-5 w-5" sw={2.3} />
                )}
              </button>
            </div>
          </form>
          <p className="mt-2 hidden text-center text-[11.5px] text-smoke sm:block">
            <kbd className="font-sans text-ash">Enter</kbd> to send · <kbd className="font-sans text-ash">Shift + Enter</kbd> for a new line · Powered by Grok
          </p>
        </div>
      </footer>
    </div>
  );
}
