import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { AwsClient } from "aws4fetch";

export const MODEL = process.env.XAI_MODEL || "grok-4.7";
export const SITEKEY = "0x4AAAAAAGH2mADHi-NyE14z";
const COOKIE = "jg_s";
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET not configured");
  return s;
}

function sign(v: string) {
  return createHmac("sha256", secret()).update(v).digest("base64url");
}

export function newSessionCookie() {
  const sid = randomUUID();
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL;
  const v = `${sid}.${exp}`;
  const cookie = `${COOKIE}=${v}.${sign(v)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`;
  return { sid, cookie };
}

export function getSession(req: Request): string | null {
  const raw = req.headers.get("cookie") || "";
  const m = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return null;
  const [sid, exp, sig] = m[1].split(".");
  if (!sid || !exp || !sig) return null;
  const expect = Buffer.from(sign(`${sid}.${exp}`));
  const got = Buffer.from(sig);
  if (expect.length !== got.length || !timingSafeEqual(expect, got)) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return sid;
}

export function clientIp(req: Request) {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}

// Basic fixed-window per-IP rate limiting (per server instance).
const buckets = new Map<string, { n: number; reset: number }>();
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size > 5000) for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k);
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  b.n++;
  return b.n <= limit;
}

export async function verifyTurnstile(token: string, ip: string) {
  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET || "",
    response: token,
    remoteip: ip,
    idempotency_key: randomUUID(),
  });
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  const j = (await r.json()) as { success: boolean; hostname?: string };
  return j.success === true;
}

export const BUCKET = process.env.R2_BUCKET || "jugginai";
let _r2: AwsClient | null = null;
export function r2() {
  if (!_r2)
    _r2 = new AwsClient({
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      service: "s3",
      region: "auto",
    });
  return _r2;
}
export function r2Url(key: string) {
  const ep = (process.env.R2_ENDPOINT || "").replace(/\/+$/, "");
  return `${ep}/${BUCKET}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });
}
