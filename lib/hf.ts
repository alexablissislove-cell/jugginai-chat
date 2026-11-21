// Hugging Face Inference Providers: OpenAI-compatible router (chat only).
export const HF_ROUTER = "https://router.huggingface.co/v1";
export const HF_PREFIX = "hf:";
const POLICIES = ["fastest", "cheapest"] as const;

export type HfProvider = { provider: string; context_length?: number; input?: number; output?: number };
export type HfModel = { id: string; owner: string; vision: boolean; context: number; providers: HfProvider[] };

// Shown first in the picker, each with :fastest and :cheapest, when the router serves them.
const FEATURED = [
  "deepseek-ai/DeepSeek-V4.1-Flash",
  "deepseek-ai/DeepSeek-V4-Pro",
  "deepseek-ai/DeepSeek-R1",
  "meta-llama/Llama-3.3-70B-Instruct",
  "meta-llama/Llama-4-Maverick-17B-128E-Instruct",
  "meta-llama/Llama-3.1-8B-Instruct",
];

let cache: { at: number; models: HfModel[] } | null = null;
const TTL = 10 * 60_000;

export function hfConfigured() {
  return Boolean(process.env.HF_TOKEN);
}

export async function hfModels(): Promise<HfModel[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.models;
  const r = await fetch(`${HF_ROUTER}/models`, {
    headers: { authorization: `Bearer ${process.env.HF_TOKEN}` },
  });
  if (!r.ok) {
    if (cache) return cache.models;
    throw new Error(`HF models ${r.status}`);
  }
  const j = (await r.json()) as { data?: any[] };
  const models: HfModel[] = [];
  for (const m of j.data || []) {
    const out: string[] = m.architecture?.output_modalities || [];
    if (!out.includes("text")) continue;
    const providers: HfProvider[] = (m.providers || [])
      .filter((p: any) => p.status === "live")
      .map((p: any) => ({
        provider: p.provider,
        context_length: p.context_length,
        input: p.pricing?.input,
        output: p.pricing?.output,
      }));
    if (!providers.length) continue;
    models.push({
      id: m.id,
      owner: m.owned_by || m.id.split("/")[0],
      vision: (m.architecture?.input_modalities || []).includes("image"),
      context: Math.max(...providers.map((p) => p.context_length || 0)),
      providers,
    });
  }
  models.sort((a, b) => a.id.localeCompare(b.id));
  cache = { at: Date.now(), models };
  return models;
}

export type PickerOption = { value: string; label: string; group: string };

function price(m: HfModel) {
  const ins = m.providers.map((p) => p.input).filter((n): n is number => typeof n === "number");
  return ins.length ? `from $${Math.min(...ins)}/M in` : "";
}

export async function pickerOptions(grokModel: string): Promise<PickerOption[]> {
  const opts: PickerOption[] = [{ value: "grok", label: `Grok (${grokModel})`, group: "xAI" }];
  if (!hfConfigured()) return opts;
  const models = await hfModels();
  const byId = new Map(models.map((m) => [m.id, m]));
  for (const id of FEATURED) {
    const m = byId.get(id);
    if (!m) continue;
    const name = id.split("/")[1];
    for (const p of POLICIES) opts.push({ value: `${HF_PREFIX}${id}:${p}`, label: `${name} · ${p}`, group: "Hugging Face · featured" });
  }
  for (const m of models) {
    const n = m.providers.length;
    opts.push({
      value: `${HF_PREFIX}${m.id}`,
      label: `${m.id} · ${n} provider${n === 1 ? "" : "s"}${price(m) ? ` · ${price(m)}` : ""}`,
      group: "Hugging Face · all router models",
    });
  }
  return opts;
}

// Validates a picker value against the live router catalog.
export async function resolveHf(value: string): Promise<{ model: string; info: HfModel } | null> {
  if (!value.startsWith(HF_PREFIX) || !hfConfigured()) return null;
  const raw = value.slice(HF_PREFIX.length);
  const models = await hfModels();
  const idx = raw.lastIndexOf(":");
  const base = idx > 0 ? raw.slice(0, idx) : raw;
  const suffix = idx > 0 ? raw.slice(idx + 1) : "";
  const info = models.find((m) => m.id === base);
  if (!info) return null;
  if (suffix && !(POLICIES as readonly string[]).includes(suffix) && !info.providers.some((p) => p.provider === suffix)) return null;
  return { model: suffix ? `${base}:${suffix}` : base, info };
}
