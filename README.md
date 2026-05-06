# prester-roast — app

Next.js 14 App Router. The MiniPay-aware frontend for [prester-roast](../README.md). See [../prester-roast-plan.md](../prester-roast-plan.md) for the full architecture.

## Stack

- Next.js 14 (App Router) + TypeScript strict
- Tailwind CSS v4
- Wagmi v2 + Viem (`injected()` inside MiniPay; WalletConnect for desktop fallback)
- `@google/generative-ai` (Gemini 2.5 Flash, JSON mode)
- Vercel KV (event index, rate-limit, leaderboard sorted-set)
- Pinata IPFS (full verdict JSON)
- `next/og` for verdict OG images

## Routes

| Path | What |
|---|---|
| `/` | Persona picker + roast input → submits to `/api/roast`, then writes onchain |
| `/verdict/[id]` | Public, shareable verdict page; OG image at `/verdict/[id]/opengraph-image` |
| `/stats` | Public stats dashboard (24h/7d/all-time tx, DAU, cUSD volume, gas, live feed) |
| `/leaderboard` | Top-roasted wallets, top community-favorite verdicts |
| `/about` | Value prop + retention strategy in plain English |
| `/api/roast` | POST: validates → moderates → calls Gemini → uploads to IPFS → signs verdict |
| `/api/stats` | KV → JSON for dashboard |
| `/api/cron/index` | Vercel cron (1 min): pulls new `RoastIssued` events into KV |

## Local development

```bash
# Install (run from repo root if using workspaces, or here for app-only)
npm install

# Dev
npm run dev

# Test in MiniPay (real device, requires deploy URL)
npx ngrok http 3000
# → load the ngrok URL in MiniPay → Settings → Developer Mode → Load Test Page
```

## Env vars

See [.env.example](.env.example). Public `NEXT_PUBLIC_*` vars are exposed to the browser; everything else is server-only.

The judge signing key (`JUDGE_SIGNER_PRIVATE_KEY`) is the only sensitive secret — and it can only authorize signed verdicts, not move funds.

## MiniPay compatibility

| Requirement | Status |
|---|---|
| `window.ethereum.isMiniPay` auto-connect | Phase 4 |
| `feeCurrency: cUSD` legacy tx | Phase 4 |
| 360×720 mobile layout, 44px+ touch targets | Phase 4 |
| No WalletConnect inside MiniPay | Phase 4 |
| Stablecoin-only (cUSD) | ✅ contract |
