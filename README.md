# JugginAI

AI chat for https://jugginai.net — vinext (Next.js App Router on Vite) + Nitro, deployed to Vercel.

- `/api/session` – password login, issues a signed session cookie (CHAT_PASSWORD)
- `/api/chat` – streams Grok (xAI `grok-4.7`) or Hugging Face Inference Providers responses (router `https://router.huggingface.co/v1`, `HF_TOKEN`); per-IP rate limit
- `/api/models` – model picker options: Grok plus live text models from the HF router's `/v1/models`, with `:fastest` / `:cheapest` variants for featured DeepSeek and Llama models
- `/api/upload` – file uploads to Cloudflare R2 (bucket `jugginai`, S3 API)

Secrets live in Vercel env vars (see `.env.example`); locally they come from 1Password via `op-ai`.

```sh
pnpm install
pnpm build        # NITRO_PRESET=vercel vite build
pnpm deploy       # vercel deploy --prebuilt --prod
```
