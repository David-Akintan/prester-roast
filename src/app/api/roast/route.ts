import { NextResponse } from "next/server";
import { z } from "zod";
import { isAddress, getAddress } from "viem";

import { moderate } from "@/lib/moderation";
import { generateRoast } from "@/lib/judge";
import { AllJudgesExhaustedError } from "@/lib/judges/types";
import { signVerdict, hashUtf8 } from "@/lib/signer";
import { pinVerdict } from "@/lib/ipfs";
import { isPersona, type Persona } from "@/lib/prompts";
import {
  checkAndIncrementRate,
  hasClaimedFreeToday,
  markFreeClaimed,
  mapHashToCid,
} from "@/lib/kv";
import { dailyTopic } from "@/lib/topics";
import { CHAIN_ID, ROAST_COURT_ADDRESS } from "@/lib/contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RoastBodySchema = z.object({
  wallet: z.string().refine(isAddress, "invalid wallet"),
  persona: z.string().refine(isPersona, "invalid persona"),
  userInput: z.string().min(1).max(2000),
  isFree: z.boolean().optional().default(false),
});

// GET: returns today's daily-topic so the client can render
// DailyTopicBanner. Static-ish — cached for 60s.
export async function GET() {
  return NextResponse.json(dailyTopic(), {
    headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = RoastBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const wallet = getAddress(parsed.data.wallet);
    const persona = parsed.data.persona as Persona;
    const userInput = parsed.data.userInput.trim();
    const isFree = parsed.data.isFree;

    // 1. Moderation (PII / self-harm / threats / length)
    const mod = moderate(userInput);
    if (!mod.ok) {
      return NextResponse.json(
        { error: mod.reason, category: mod.category },
        { status: 400 },
      );
    }

    // 2. Rate-limit by wallet (rolling 1h window)
    const rate = await checkAndIncrementRate(wallet);
    if (!rate.ok) {
      return NextResponse.json(
        { error: `Slow down — ${rate.limit}/hour cap. Try again later.` },
        { status: 429 },
      );
    }

    // 3. If free roast: server-side dedupe (the contract does this too,
    //    but doing it pre-Gemini saves a wasted API call)
    const today = dailyTopic();
    if (isFree && (await hasClaimedFreeToday(wallet, today.utcDay))) {
      return NextResponse.json(
        { error: "You already claimed today's free roast." },
        { status: 409 },
      );
    }

    // 4. Generate the roast
    const verdict = await generateRoast({
      persona,
      userInput,
      dailyTopic: isFree ? today.topic : undefined,
    });

    // 5. Hash text + input (matches what the contract verifies)
    const roastTextHash = hashUtf8(verdict.roast);
    const inputHash = hashUtf8(userInput);

    // 6. Sign — judge attests the bundle for this wallet
    const judgeSig = await signVerdict({
      user: wallet,
      persona,
      roastTextHash,
      inputHash,
      isFree,
    });

    // 7. Pin full payload to IPFS for the public verdict page
    let ipfsCid: string | null = null;
    try {
      ipfsCid = await pinVerdict({
        roast: verdict.roast,
        severity: verdict.severity,
        persona,
        userInput,
        user: wallet,
        isFree,
        timestamp: Math.floor(Date.now() / 1000),
        contract: ROAST_COURT_ADDRESS,
        chainId: CHAIN_ID,
      });
      // Bridge: indexer joins onchain id → cid via this hash mapping.
      await mapHashToCid(roastTextHash, ipfsCid);
    } catch (err) {
      // IPFS is best-effort — onchain verdict still works, page falls back
      // to roast-text reconstructed from the response itself.
      console.warn("Pinata pin failed:", err);
    }

    // 8. Mark free claimed (only after sign succeeds — avoid burning a slot
    //    on a failed pipeline)
    if (isFree) {
      await markFreeClaimed(wallet, today.utcDay);
    }

    return NextResponse.json({
      roast: verdict.roast,
      severity: verdict.severity,
      persona,
      isFree,
      roastTextHash,
      inputHash,
      judgeSig,
      ipfsCid,
      dailyTopic: isFree ? today.topic : null,
    });
  } catch (err) {
    // Surface per-provider failure breakdown so the client can debug from
    // DevTools without diving into Vercel function logs every time.
    if (err instanceof AllJudgesExhaustedError) {
      console.error("/api/roast — all judges failed:", err.attempts);
      return NextResponse.json(
        {
          error:
            "All judge providers failed. Check the `attempts` array for per-provider details.",
          attempts: err.attempts,
        },
        { status: 503 },
      );
    }
    const msg = err instanceof Error ? err.message : "internal error";
    console.error("/api/roast error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
