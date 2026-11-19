# JugginAI

AI chat for https://jugginai.net — vinext (Next.js App Router on Vite) + Nitro, deployed to Vercel.

- `/api/session` – Cloudflare Turnstile siteverify, issues signed session cookie
- `/api/chat` – streams Grok (xAI `grok-4.7`) responses; per-IP rate limit
- `/api/upload` – file uploads to Cloudflare R2 (bucket `jugginai`, S3 API)

Secrets live in Vercel env vars (see `.env.example`); locally they come from 1Password via `op-ai`.

```sh
pnpm install
pnpm build        # NITRO_PRESET=vercel vite build
pnpm deploy       # vercel deploy --prebuilt --prod
```
