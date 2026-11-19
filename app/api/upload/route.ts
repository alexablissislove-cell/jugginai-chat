import { randomUUID } from "node:crypto";
import { clientIp, getSession, json, r2, r2Url, rateLimit } from "@/lib/server";

export const dynamic = "force-dynamic";
const MAX = 5 * 1024 * 1024;

export async function POST(req: Request) {
  const sid = getSession(req);
  if (!sid) return json({ error: "Verify first" }, 401);
  if (!rateLimit(`u:${clientIp(req)}`, 20, 60_000)) return json({ error: "Slow down" }, 429);
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "No file" }, 400);
  if (file.size > MAX) return json({ error: "Max 5 MB" }, 413);
  const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-80) || "file";
  const key = `uploads/${sid}/${randomUUID()}-${safe}`;
  const r = await r2().fetch(r2Url(key), {
    method: "PUT",
    body: await file.arrayBuffer(),
    headers: { "content-type": file.type || "application/octet-stream" },
  });
  if (!r.ok) return json({ error: "Upload failed" }, 502);
  return json({ key, name: file.name, type: file.type, size: file.size });
}
