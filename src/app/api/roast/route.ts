import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createPublicClient,
  getAddress,
  http,
  isAddress,
  verifyMessage,
} from "viem";

import { moderate } from "@/lib/moderation";
import { generateRoast } from "@/lib/judge";
import { AllJudgesExhaustedError } from "@/lib/judges/types";
import { signVerdict, hashUtf8 } from "@/lib/signer";
import { pinVerdict } from "@/lib/ipfs";
import { isPersona, type Persona } from "@/lib/prompts";
import {
  checkAndIncrementIpRate,
  checkAndIncrementRate,
  mapHashToCid,
} from "@/lib/kv";
import { dailyTopic } from "@/lib/topics";
import { CHAIN_ID, ROAST_COURT_ADDRESS } from "@/lib/contract";
import { buildRoastRequestMessage } from "@/lib/roast-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 12_000;
const MAX_DAY_SKEW = 1;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://forno.celo.org";

const RoastBodySchema = z.object({
  wallet: z.string().refine(isAddress, "invalid wallet"),
  persona: z.string().refine(isPersona, "invalid persona"),
  userInput: z.string().min(1).max(2000),
  isFree: z.boolean().optional().default(false),
  utcDay: z.number().int().nonnegative(),
  requestSig: z
    .string()
    .regex(/^0x[0-9a-fA-F]{130}$/, "invalid request signature"),
});

// GET: returns today's daily-topic so the client can render
// DailyTopicBanner. Static-ish — cached for 60s.
export async function GET() {
  return NextResponse.json(dailyTopic(), {
    headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
  });
}

function requestIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

async function hasClaimedFreeOnchain(
  wallet: `0x${string}`,
  utcDay: number,
): Promise<boolean> {
  try {
    const client = createPublicClient({
      transport: http(RPC_URL),
    });
    const lastFree = await client.readContract({
      address: ROAST_COURT_ADDRESS,
      abi: [
        {
          type: "function",
          name: "lastFreeRoast",
          stateMutability: "view",
          inputs: [{ name: "user", type: "address" }],
          outputs: [{ type: "uint64" }],
        },
      ],
      functionName: "lastFreeRoast",
      args: [wallet],
    });
    return Number(lastFree) === utcDay;
  } catch (err) {
    console.warn("free roast onchain precheck failed:", err);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return NextResponse.json(
        { error: "content-type must be application/json" },
        { status: 415 },
      );
    }

    const contentLength = Number(req.headers.get("content-length") ?? "0");
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "request body too large" },
        { status: 413 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "invalid json" }, { status: 400 });
    }

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
    const today = dailyTopic();

    if (Math.abs(parsed.data.utcDay - today.utcDay) > MAX_DAY_SKEW) {
      return NextResponse.json(
        { error: "request signature is stale" },
        { status: 400 },
      );
    }

    const authMessage = buildRoastRequestMessage({
      wallet,
      persona,
      userInput,
      isFree,
      utcDay: parsed.data.utcDay,
    });
    const authorized = await verifyMessage({
      address: wallet,
      message: authMessage,
      signature: parsed.data.requestSig as `0x${string}`,
    });
    if (!authorized) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }

    // 1. Moderation (PII / self-harm / threats / length)
    const mod = moderate(userInput);
    if (!mod.ok) {
      return NextResponse.json(
        { error: mod.reason, category: mod.category },
        { status: 400 },
      );
    }

    // 2. Rate-limit by verified wallet and request IP (rolling 1h windows)
    const ipRate = await checkAndIncrementIpRate(requestIp(req));
    if (!ipRate.ok) {
      return NextResponse.json(
        { error: `Slow down - ${ipRate.limit}/hour cap. Try again later.` },
        { status: 429 },
      );
    }

    const rate = await checkAndIncrementRate(wallet);
    if (!rate.ok) {
      return NextResponse.json(
        { error: `Slow down - ${rate.limit}/hour cap. Try again later.` },
        { status: 429 },
      );
    }

    // 3. If free roast: preflight the contract state. Do not mutate KV here:
    //    unsigned KV claims let attackers burn another wallet's free slot.
    if (isFree && (await hasClaimedFreeOnchain(wallet, today.utcDay))) {
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
      console.error("/api/roast - all judges failed:", err.attempts);
      return NextResponse.json(
        {
          error:
            "All judge providers failed. Check the `attempts` array for per-provider details.",
          ...(process.env.NODE_ENV !== "production"
            ? { attempts: err.attempts }
            : {}),
        },
        { status: 503 },
      );
    }
    const msg = err instanceof Error ? err.message : "internal error";
    console.error("/api/roast error:", err);
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "internal error" : msg },
      { status: 500 },
    );
  }
}
