import { NextResponse } from "next/server";
import { createPublicClient, http, parseAbiItem, type PublicClient, type Transport } from "viem";
import { celo } from "viem/chains";

import { ROAST_COURT_ABI, ROAST_COURT_ADDRESS, CHAIN_ID } from "@/lib/contract";
import {
  getLastIndexedBlock,
  setLastIndexedBlock,
  recordVerdict,
  cidForHash,
  setCidForVerdictId,
  markPaidRoaster,
  getEligibilityBackfilledThroughBlock,
  setEligibilityBackfilledThroughBlock,
  type VerdictFeedEntry,
} from "@/lib/kv";
import { PERSONAS, type Persona } from "@/lib/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Indexer cron — pulls new RoastIssued events into KV every 60s.
// Triggered by Vercel Cron via `vercel.json`. Protected by CRON_SECRET
// (Vercel sends it in the Authorization header on production crons).

const ROAST_ISSUED_EVENT = parseAbiItem(
  "event RoastIssued(uint256 indexed id, address indexed user, uint8 persona, bytes32 roastTextHash, bytes32 inputHash, uint256 amountPaid)",
);

// Limit how far we scan in a single tick — Forno typically caps around
// 5000-10000 blocks per getLogs call. We stay well below.
const MAX_BLOCKS_PER_TICK = 2000n;

// Roast-of-the-Day voter eligibility window: 7 days. Celo blocks every ~5s
// → ~120,960 blocks. Round up to be safe; the backfill stops as soon as it
// crosses the threshold.
const ELIGIBILITY_WINDOW_BLOCKS = 130_000n;

function authorize(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev mode — allow
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (CHAIN_ID !== celo.id) {
    return NextResponse.json(
      { error: `cron only configured for celo mainnet (got ${CHAIN_ID})` },
      { status: 500 },
    );
  }

  const client = createPublicClient({
    chain: celo,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL ?? "https://forno.celo.org"),
  });

  try {
    const head = await client.getBlockNumber();
    const last = await getLastIndexedBlock();
    // Default starting block — set via env for first deploy. Otherwise
    // start MAX_BLOCKS_PER_TICK behind tip to seed without huge scans.
    const seedBlock = process.env.INDEXER_FROM_BLOCK
      ? BigInt(process.env.INDEXER_FROM_BLOCK)
      : head - MAX_BLOCKS_PER_TICK;

    const fromBlock = last !== null ? last + 1n : seedBlock;
    if (fromBlock > head) {
      return NextResponse.json({ scanned: 0, head: head.toString(), message: "up to date" });
    }
    const toBlock = head - fromBlock > MAX_BLOCKS_PER_TICK ? fromBlock + MAX_BLOCKS_PER_TICK : head;

    const logs = await client.getLogs({
      address: ROAST_COURT_ADDRESS,
      event: ROAST_ISSUED_EVENT,
      fromBlock,
      toBlock,
    });

    let recorded = 0;
    for (const log of logs) {
      const args = log.args as {
        id?: bigint;
        user?: `0x${string}`;
        persona?: number;
        roastTextHash?: `0x${string}`;
        amountPaid?: bigint;
      };
      if (args.id === undefined || !args.user || args.persona === undefined) continue;

      const personaName: Persona = PERSONAS[args.persona] ?? "brutal";
      const block = await client.getBlock({ blockHash: log.blockHash });

      // Join onchain id ⇄ ipfs cid via the (roastTextHash → cid) bridge
      // written by /api/roast at pin time.
      const cid = args.roastTextHash ? await cidForHash(args.roastTextHash) : null;

      const amountPaid = args.amountPaid ?? 0n;
      const entry: VerdictFeedEntry = {
        id: args.id.toString(),
        user: args.user,
        persona: personaName,
        amountPaid: amountPaid.toString(),
        txHash: log.transactionHash,
        blockNumber: Number(log.blockNumber),
        ts: Number(block.timestamp),
        roastTextHash: args.roastTextHash,
        cid,
      };
      const isPaid = amountPaid > 0n;
      await recordVerdict(entry, isPaid);
      if (cid) await setCidForVerdictId(args.id.toString(), cid);
      // Roast of the Day eligibility — every paid event refreshes the wallet's
      // 7-day voter flag and increments that day's contribution counter.
      if (isPaid) await markPaidRoaster(args.user, amountPaid, Number(block.timestamp));
      recorded += 1;
    }

    await setLastIndexedBlock(toBlock);

    // ── Backward backfill — seeds the 7-day eligibility set with paid events
    //    from before the cron started running. Walks backward one chunk per
    //    tick until it crosses `head - ELIGIBILITY_WINDOW_BLOCKS`, then stops.
    const backfill = await runEligibilityBackfill(client, head);

    // Touch ABI ref to keep the import live (we may switch to it later)
    void ROAST_COURT_ABI;

    return NextResponse.json({
      scanned: Number(toBlock - fromBlock + 1n),
      fromBlock: fromBlock.toString(),
      toBlock: toBlock.toString(),
      recorded,
      backfill,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("indexer error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

interface BackfillReport {
  status: "complete" | "advanced" | "skipped";
  fromBlock?: string;
  toBlock?: string;
  marked?: number;
}

/**
 * Walks the RoastIssued event history backward, one chunk per cron tick,
 * marking paid roasters into the 7-day eligibility set. Idempotent: marking
 * the same wallet twice just refreshes its TTL.
 *
 * Stops when the cursor crosses `head - ELIGIBILITY_WINDOW_BLOCKS` — at that
 * point the eligibility set already covers the full voting window, and any
 * older history is irrelevant because the per-wallet flag has a 7-day TTL.
 */
type CeloPublicClient = PublicClient<Transport, typeof celo>;

async function runEligibilityBackfill(
  client: CeloPublicClient,
  head: bigint,
): Promise<BackfillReport> {
  const cutoff = head > ELIGIBILITY_WINDOW_BLOCKS ? head - ELIGIBILITY_WINDOW_BLOCKS : 0n;
  let cursor = await getEligibilityBackfilledThroughBlock();

  // First-run init: anchor cursor at `head` so the first chunk covers the
  // freshest blocks. Forward indexer also handles those, but doing it here
  // means the eligibility set is populated even if the forward indexer is
  // far behind on first deploy.
  if (cursor === null) cursor = head;

  if (cursor <= cutoff) {
    return { status: "complete" };
  }

  const toBlock = cursor;
  const fromBlock = toBlock > MAX_BLOCKS_PER_TICK ? toBlock - MAX_BLOCKS_PER_TICK : 0n;

  if (fromBlock >= toBlock) {
    await setEligibilityBackfilledThroughBlock(0n);
    return { status: "complete" };
  }

  const logs = await client.getLogs({
    address: ROAST_COURT_ADDRESS,
    event: ROAST_ISSUED_EVENT,
    fromBlock,
    toBlock,
  });

  let marked = 0;
  for (const log of logs) {
    const args = log.args as { user?: `0x${string}`; amountPaid?: bigint };
    if (!args.user) continue;
    const amountPaid = args.amountPaid ?? 0n;
    if (amountPaid === 0n) continue;
    const block = await client.getBlock({ blockHash: log.blockHash });
    await markPaidRoaster(args.user, amountPaid, Number(block.timestamp));
    marked += 1;
  }

  await setEligibilityBackfilledThroughBlock(fromBlock);

  return {
    status: "advanced",
    fromBlock: fromBlock.toString(),
    toBlock: toBlock.toString(),
    marked,
  };
}
