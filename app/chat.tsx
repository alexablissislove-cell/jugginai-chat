"use client";
import { useEffect, useRef, useState } from "react";

const SITEKEY = "0x4AAAAAAGH2mADHi-NyE14z";
type Att = { key: string; name: string; type: string };
type Msg = { role: "user" | "assistant"; content: string; attachments?: Att[] };
const STORE = "jugginai.chat.v1";

declare global {
  interface Window { turnstile?: any; onTurnstileLoad?: () => void }
}

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [pending, setPending] = useState<Att[]>([]);
  const [err, setErr] = useState("");
  const tsRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { setMessages(JSON.parse(localStorage.getItem(STORE) || "[]")); } catch {}
    fetch("/api/session").then((r) => r.json()).then((j) => setVerified(!!j.ok)).catch(() => setVerified(false));
  }, []);
  useEffect(() => {
    if (!busy) localStorage.setItem(STORE, JSON.stringify(messages.slice(-60)));
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    if (verified !== false) return;
    const render = () => {
      if (!tsRef.current || !window.turnstile) return;
      tsRef.current.innerHTML = "";
      window.turnstile.render(tsRef.current, {
        sitekey: SITEKEY,
        theme: "dark",
        callback: async (token: string) => {
          const r = await fetch("/api/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
          if (r.ok) setVerified(true); else { setErr("Verification failed. Refresh and try again."); }
        },
      });
    };
    if (window.turnstile) return render();
    window.onTurnstileLoad = render;
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit";
    s.async = true;
    document.head.appendChild(s);
  }, [verified]);

  async function upload(files: FileList | null) {
    if (!files) return;
    setErr("");
    for (const f of Array.from(files).slice(0, 4)) {
      const fd = new FormData();
      fd.append("file", f);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error || "Upload failed"); continue; }
      setPending((p) => [...p, { key: j.key, name: j.name, type: j.type }]);
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy || !verified) return;
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
      if (r.status === 401) { setVerified(false); throw new Error("Please verify you're human, then resend."); }
      if (!r.ok || !r.body) throw new Error((await r.json().catch(() => ({}))).error || "Something went wrong");
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

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 text-lg font-bold text-black">J</div>
          <span className="text-lg font-semibold tracking-tight">Juggin<span className="text-cyan-400">AI</span></span>
        </div>
        {messages.length > 0 && (
          <button onClick={() => { setMessages([]); localStorage.removeItem(STORE); }} className="rounded-md px-3 py-1.5 text-sm text-zinc-400 hover:bg-white/5 hover:text-zinc-100">New chat</button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
          {messages.length === 0 && (
            <div className="mt-[12vh] text-center">
              <h1 className="bg-gradient-to-r from-violet-400 to-cyan-300 bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">What's on your mind?</h1>
              <p className="mt-3 text-zinc-400">Ask anything. Attach images or text files.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 leading-relaxed ${m.role === "user" ? "bg-violet-600/90 text-white" : "bg-white/[0.06] text-zinc-100"}`}>
                {m.attachments?.map((a) => (
                  <div key={a.key} className="mb-1 text-xs opacity-80">📎 {a.name}</div>
                ))}
                {m.content || (busy && i === messages.length - 1 ? <span className="inline-block animate-pulse">●●●</span> : "")}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </main>

      <footer className="border-t border-white/10 bg-[#0b0c10]/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 sm:px-6">
        <div className="mx-auto max-w-3xl">
          {verified === false && <div ref={tsRef} className="mb-3 flex justify-center" />}
          {err && <p className="mb-2 text-sm text-rose-400">{err}</p>}
          {pending.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {pending.map((a) => (
                <span key={a.key} className="rounded-full bg-white/10 px-3 py-1 text-xs">📎 {a.name}
                  <button className="ml-2 text-zinc-400 hover:text-white" onClick={() => setPending((p) => p.filter((x) => x.key !== a.key))}>×</button>
                </span>
              ))}
            </div>
          )}
          <form onSubmit={send} className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2 focus-within:border-violet-500/60">
            <button type="button" disabled={!verified} onClick={() => fileRef.current?.click()} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-40" aria-label="Attach">＋</button>
            <input ref={fileRef} type="file" multiple accept="image/*,.txt,.md,.csv,.json,.js,.ts,.py,.html,.css" className="hidden" onChange={(e) => upload(e.target.files)} />
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder={verified ? "Message JugginAI…" : "Verify above to start chatting"}
              className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-[16px] outline-none placeholder:text-zinc-500"
            />
            <button type="submit" disabled={busy || !input.trim() || !verified} className="h-10 shrink-0 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 font-medium text-white disabled:opacity-40">Send</button>
          </form>
          <p className="mt-2 text-center text-xs text-zinc-500">Powered by Grok · JugginAI</p>
        </div>
      </footer>
    </div>
  );
}
