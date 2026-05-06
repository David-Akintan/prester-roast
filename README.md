# Roast Court 🔨

**Pay 0.05 cUSD · Get roasted by an AI judge · Verdict stored onchain · Share the sentence on Farcaster**

<!-- Live: [prester-roast.vercel.app](https://prester-roast.vercel.app) · Contract: [Celoscan](https://celoscan.io/address/0xTODO) · [Demo video](https://youtu.be/TODO) -->

Built for [Celo Proof of Ship May 2026](https://talent.app/~/earn/celo-proof-of-ship) · by [Prester Labs](https://presterr.vercel.app)

---

## What it does

Roast Court is a MiniPay mini-app where users pay **0.05 cUSD** to submit any piece of text — a tweet, a hot take, a code snippet, a life decision — and receive a savage AI-generated verdict stored permanently on Celo mainnet.

Each verdict is:

- **Onchain** — `verdictId`, content hash, and roast hash written to `RoastCourt.sol`
- **Shareable** — one-tap Farcaster share with the full sentence
- **Daily-replayable** — every new submission is a new tx, naturally incentivizing return visits

This is a productized slice of Prester's AI judge primitive. The full [Prester protocol](https://presterr.vercel.app) uses a multi-judge committee for freelance dispute resolution; Roast Court extracts the single-judge verdict loop and packages it for MiniPay's 14M wallets.

---

## Architecture

```
User (MiniPay)
  │  feeCurrency: USDm, legacy tx
  ▼
RoastCourt.sol (Celo Mainnet)
  ├── approve(cUSD, 0.05) ← user signs
  └── requestRoast(contentHash) ← emits RoastRequested(verdictId)
        │
        ▼
Next.js API /api/roast
  └── POST → Prester judge backend
        └── fulfillRoast(verdictId, roastHash, cid) ← backend signs
```

**Key design choices for PoS scoring:**

- Every user action = 1 ERC-20 approve + 1 contract call = 2 tx per roast
- Users can submit daily → compounds tx count
- No multi-party coordination required (unlike Prester's escrow)

---

## Project structure

```
prester-roast/
├── contracts/
│   ├── RoastCourt.sol          # Core contract
│   ├── hardhat.config.js
│   └── scripts/deploy.js
└── app/
    └── src/
        ├── app/
        │   ├── page.tsx         # Main UI
        │   ├── layout.tsx       # Wagmi provider + auto-connect
        │   ├── globals.css
        │   └── api/roast/
        │       └── route.ts     # Calls Prester judge backend
        └── lib/
```

---

## About Prester Labs

Prester is a decentralized freelance marketplace where disputes are resolved by a committee of AI judges using commit-reveal voting. Roast Court is a standalone primitive that stress-tests the single-judge verdict loop at consumer scale on MiniPay. Learnings feed back into Prester's multi-judge architecture.

- Flagship: [presterr.vercel.app](https://presterr.vercel.app)
