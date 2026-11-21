import { getSession, json, MODEL } from "@/lib/server";
import { pickerOptions } from "@/lib/hf";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!getSession(req)) return json({ error: "Sign in first" }, 401);
  try {
    return json({ default: "grok", options: await pickerOptions(MODEL) });
  } catch (e: any) {
    return json({ default: "grok", options: [{ value: "grok", label: `Grok (${MODEL})`, group: "xAI" }], warning: e?.message || "HF unavailable" });
  }
}
