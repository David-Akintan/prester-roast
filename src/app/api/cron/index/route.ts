import { NextResponse } from "next/server";
import { createPublicClient, http, parseAbiItem } from "viem";
import { celo } from "viem/chains";

import { ROAST_COURT_ABI, ROAST_COURT_ADDRESS, CHAIN_ID } from "@/lib/contract";
import {
  getLastIndexedBlock,
  setLastIndexedBlock,
  recordVerdict,
  cidForHash,
  setCidForVerdictId,
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

      const entry: VerdictFeedEntry = {
        id: args.id.toString(),
        user: args.user,
        persona: personaName,
        amountPaid: (args.amountPaid ?? 0n).toString(),
        txHash: log.transactionHash,
        blockNumber: Number(log.blockNumber),
        ts: Number(block.timestamp),
        roastTextHash: args.roastTextHash,
        cid,
      };
      const isPaid = (args.amountPaid ?? 0n) > 0n;
      await recordVerdict(entry, isPaid);
      if (cid) await setCidForVerdictId(args.id.toString(), cid);
      recorded += 1;
    }

    await setLastIndexedBlock(toBlock);

    // Touch ABI ref to keep the import live (we may switch to it later)
    void ROAST_COURT_ABI;

    return NextResponse.json({
      scanned: Number(toBlock - fromBlock + 1n),
      fromBlock: fromBlock.toString(),
      toBlock: toBlock.toString(),
      recorded,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("indexer error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
