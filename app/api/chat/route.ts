import { clientIp, getSession, json, MODEL, r2, r2Url, rateLimit } from "@/lib/server";

export const dynamic = "force-dynamic";

type Msg = { role: "user" | "assistant"; content: string };
type Att = { key: string; name: string; type: string };

const SYSTEM =
  "You are JugginAI, a sharp, friendly assistant on jugginai.net. Be concise and direct. Use Markdown when it helps.";

async function attachmentParts(sid: string, atts: Att[]) {
  const parts: any[] = [];
  for (const a of atts.slice(0, 4)) {
    if (!a?.key?.startsWith(`uploads/${sid}/`)) continue;
    const r = await r2().fetch(r2Url(a.key));
    if (!r.ok) continue;
    const buf = Buffer.from(await r.arrayBuffer());
    if ((a.type || "").startsWith("image/")) {
      parts.push({ type: "image_url", image_url: { url: `data:${a.type};base64,${buf.toString("base64")}` } });
    } else {
      parts.push({ type: "text", text: `Attached file "${a.name}":\n${buf.toString("utf8").slice(0, 40000)}` });
    }
  }
  return parts;
}

export async function POST(req: Request) {
  const sid = getSession(req);
  if (!sid) return json({ error: "Verify first" }, 401);
  if (!rateLimit(`c:${clientIp(req)}`, 20, 60_000)) return json({ error: "Rate limit hit. Try again in a minute." }, 429);

  const body = (await req.json().catch(() => null)) as { messages?: Msg[]; attachments?: Att[] } | null;
  const history = (body?.messages || [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-30)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 20000) })) as any[];
  if (!history.length || history[history.length - 1].role !== "user") return json({ error: "Bad request" }, 400);

  if (body?.attachments?.length) {
    const last = history[history.length - 1];
    const extra = await attachmentParts(sid, body.attachments);
    if (extra.length) history[history.length - 1] = { role: "user", content: [{ type: "text", text: last.content }, ...extra] };
  }

  const upstream = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.XAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, stream: true, messages: [{ role: "system", content: SYSTEM }, ...history] }),
    signal: req.signal,
  });
  if (!upstream.ok || !upstream.body) return json({ error: `Model error (${upstream.status})` }, 502);

  const enc = new TextEncoder();
  const dec = new TextDecoder();
  let buf = "";
  const stream = upstream.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, ctl) {
        buf += dec.decode(chunk, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const d = t.slice(5).trim();
          if (d === "[DONE]") continue;
          try {
            const delta = JSON.parse(d).choices?.[0]?.delta?.content;
            if (delta) ctl.enqueue(enc.encode(delta));
          } catch {}
        }
      },
    }),
  );
  return new Response(stream, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-model": MODEL },
  });
}
