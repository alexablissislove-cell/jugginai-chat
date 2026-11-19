import { clientIp, getSession, json, newSessionCookie, rateLimit, verifyTurnstile } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return json({ ok: !!getSession(req) });
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`s:${ip}`, 10, 60_000)) return json({ error: "Too many attempts" }, 429);
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  if (!token || !(await verifyTurnstile(token, ip))) return json({ error: "Verification failed" }, 403);
  const { cookie } = newSessionCookie();
  return json({ ok: true }, 200, { "set-cookie": cookie });
}
