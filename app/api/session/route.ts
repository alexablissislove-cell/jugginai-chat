import { clientIp, clearSessionCookie, getSession, json, newSessionCookie, passwordOk, rateLimit } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return json({ ok: !!getSession(req) });
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`s:${ip}`, 10, 60_000)) return json({ error: "Too many attempts" }, 429);
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!passwordOk(password)) return json({ error: "Wrong password" }, 401);
  const { cookie } = newSessionCookie();
  return json({ ok: true }, 200, { "set-cookie": cookie });
}

export async function DELETE() {
  return json({ ok: true }, 200, { "set-cookie": clearSessionCookie() });
}
