// Langfuse US tracing over OpenTelemetry (OTLP/HTTP JSON). Only LANGFUSE_BASE_URL is honored.
import { randomBytes } from "node:crypto";

export const SERVICE = "jugginai-chat";
const DEFAULT_BASE = "https://us.cloud.langfuse.com";

type Usage = { input?: number; output?: number; total?: number };

function sanitize(value: unknown): unknown {
  try {
    const text = JSON.stringify(value, (_k, v) => {
      if (typeof v === "string" && v.startsWith("data:") && v.length > 200) return `${v.slice(0, 40)}…[${v.length} bytes omitted]`;
      if (typeof v === "string" && v.length > 4000) return `${v.slice(0, 4000)}…[truncated]`;
      return v;
    });
    if (text === undefined) return null;
    return text.length > 8000 ? { truncated: true, preview: text.slice(0, 8000) } : JSON.parse(text);
  } catch {
    return null;
  }
}

function attr(key: string, value: unknown) {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) return { key, value: { arrayValue: { values: value.map((v) => ({ stringValue: String(v) })) } } };
  if (typeof value === "boolean") return { key, value: { boolValue: value } };
  if (typeof value === "number" && Number.isInteger(value)) return { key, value: { intValue: String(value) } };
  if (typeof value === "object") return { key, value: { stringValue: JSON.stringify(value) } };
  return { key, value: { stringValue: String(value) } };
}

const nanos = (ms: number) => `${BigInt(Math.round(ms)) * BigInt(1000000)}`;

export function langfuseConfigured() {
  return Boolean(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);
}

export async function traceGeneration(opts: {
  name: string;
  provider: string;
  model: string;
  input: unknown;
  output: unknown;
  startTime: number;
  endTime: number;
  completionStartTime?: number | null;
  usage?: Usage | null;
  status: number;
  sessionId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  if (!langfuseConfigured()) return;
  const base = (process.env.LANGFUSE_BASE_URL || DEFAULT_BASE).replace(/\/+$/, "");
  const isError = opts.status >= 400;
  const tags = [`service:${SERVICE}`, `provider:${opts.provider}`, SERVICE, opts.provider];
  const meta: Record<string, unknown> = {
    service: SERVICE,
    provider: opts.provider,
    status: opts.status,
    latency_ms: opts.endTime - opts.startTime,
    ...(opts.metadata || {}),
  };
  const usage: Usage = {};
  if (Number.isFinite(opts.usage?.input)) usage.input = opts.usage!.input;
  if (Number.isFinite(opts.usage?.output)) usage.output = opts.usage!.output;
  if (Number.isFinite(opts.usage?.total)) usage.total = opts.usage!.total;
  const attributes = [
    attr("langfuse.trace.name", opts.name),
    attr("langfuse.trace.tags", tags),
    attr("langfuse.trace.metadata.service", SERVICE),
    attr("langfuse.trace.metadata.provider", opts.provider),
    attr("langfuse.session.id", opts.sessionId || undefined),
    attr("langfuse.environment", process.env.VERCEL_ENV || "production"),
    ...Object.entries(meta)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => attr(`langfuse.observation.metadata.${k}`, typeof v === "object" ? JSON.stringify(v) : String(v))),
    attr("langfuse.observation.type", "generation"),
    attr("langfuse.observation.model.name", opts.model),
    attr("gen_ai.request.model", opts.model),
    attr("gen_ai.system", opts.provider),
    attr("langfuse.observation.input", sanitize(opts.input)),
    attr("langfuse.observation.output", sanitize(opts.output)),
    attr("langfuse.observation.level", isError ? "ERROR" : "DEFAULT"),
    Object.keys(usage).length ? attr("langfuse.observation.usage_details", usage) : null,
    opts.completionStartTime ? attr("langfuse.observation.completion_start_time", new Date(opts.completionStartTime).toISOString()) : null,
  ].filter(Boolean);
  const payload = {
    resourceSpans: [
      {
        resource: { attributes: [attr("service.name", SERVICE)] },
        scopeSpans: [
          {
            scope: { name: SERVICE, version: "1.0.0" },
            spans: [
              {
                traceId: randomBytes(16).toString("hex"),
                spanId: randomBytes(8).toString("hex"),
                name: opts.name,
                kind: 2,
                startTimeUnixNano: nanos(opts.startTime),
                endTimeUnixNano: nanos(opts.endTime),
                attributes,
                status: { code: isError ? 2 : 1, message: isError ? `HTTP ${opts.status}` : "" },
              },
            ],
          },
        ],
      },
    ],
  };
  const auth = Buffer.from(`${process.env.LANGFUSE_PUBLIC_KEY}:${process.env.LANGFUSE_SECRET_KEY}`).toString("base64");
  try {
    const res = await fetch(`${base}/api/public/otel/v1/traces`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-langfuse-ingestion-version": "4", authorization: `Basic ${auth}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) console.error("langfuse otel status", res.status);
  } catch {
    console.error("langfuse otel export failed");
  }
}
