import { kv } from "@vercel/kv";
import type { Persona } from "./prompts";

// Vercel KV wrapper.
//
// Keys we store:
//   roast:rate:{wallet}                  → rolling-window counter (1h TTL)
//   roast:freeClaim:{wallet}:{utcDay}    → marker that wallet claimed today
//   indexer:lastBlock                    → bigint string, last indexed block
//   stats:roasts:total                   → counter (all-time, paid+free)
//   stats:roasts:paid                    → counter (all-time, paid only)
//   stats:roasts:24h                     → counter, expires every 86400
//   stats:wallets:24h                    → set of unique wallets, expires
//   stats:volume:total                   → wei-string (cumulative cUSD volume)
//   stats:leaderboard                    → sorted set (member=wallet, score=count)
//   verdicts:feed                        → list (newest first, capped at 1000)

const PREFIX = {
  rate: (wallet: string) => `roast:rate:${wallet.toLowerCase()}`,
  freeClaim: (wallet: string, utcDay: number) =>
    `roast:freeClaim:${wallet.toLowerCase()}:${utcDay}`,
} as const;

export const RATE_LIMIT_PER_HOUR = 30;
const RATE_TTL_SECONDS = 3600;

export async function checkAndIncrementRate(wallet: string): Promise<{
  ok: boolean;
  current: number;
  limit: number;
}> {
  const key = PREFIX.rate(wallet);
  const current = (await kv.incr(key)) as number;
  if (current === 1) {
    await kv.expire(key, RATE_TTL_SECONDS);
  }
  return {
    ok: current <= RATE_LIMIT_PER_HOUR,
    current,
    limit: RATE_LIMIT_PER_HOUR,
  };
}

export async function hasClaimedFreeToday(wallet: string, utcDay: number): Promise<boolean> {
  const v = await kv.get<number>(PREFIX.freeClaim(wallet, utcDay));
  return Boolean(v);
}

export async function markFreeClaimed(wallet: string, utcDay: number): Promise<void> {
  // 48-hour TTL — covers the day fully even with timezone slippage.
  await kv.set(PREFIX.freeClaim(wallet, utcDay), Date.now(), { ex: 172_800 });
}

// ── Stats / indexer state ────────────────────────────────────────────

export interface VerdictFeedEntry {
  id: string;
  user: `0x${string}`;
  persona: Persona;
  amountPaid: string;
  txHash: `0x${string}`;
  blockNumber: number;
  ts: number;
  roastTextHash?: `0x${string}`;
  cid?: string | null;
}

// Hash → cid bridge: /api/roast writes this when it pins to IPFS, the
// indexer cron reads it when an event lands so we can join onchain id ⇄ cid.
const HASH_CID_TTL_SECONDS = 30 * 86_400; // 30 days

export async function mapHashToCid(roastTextHash: string, cid: string): Promise<void> {
  await kv.set(`cid:byHash:${roastTextHash.toLowerCase()}`, cid, { ex: HASH_CID_TTL_SECONDS });
}

export async function cidForHash(roastTextHash: string): Promise<string | null> {
  return (await kv.get<string>(`cid:byHash:${roastTextHash.toLowerCase()}`)) ?? null;
}

// Verdict-id → cid lookup, used by /verdict/[id]/page.tsx
export async function cidForVerdictId(id: string): Promise<string | null> {
  return (await kv.get<string>(`cid:byId:${id}`)) ?? null;
}

export async function setCidForVerdictId(id: string, cid: string): Promise<void> {
  await kv.set(`cid:byId:${id}`, cid, { ex: HASH_CID_TTL_SECONDS });
}

export async function getLastIndexedBlock(): Promise<bigint | null> {
  const v = await kv.get<string>("indexer:lastBlock");
  return v ? BigInt(v) : null;
}

export async function setLastIndexedBlock(block: bigint): Promise<void> {
  await kv.set("indexer:lastBlock", block.toString());
}

export async function recordVerdict(entry: VerdictFeedEntry, isPaid: boolean): Promise<void> {
  const pipe = kv.multi();
  pipe.lpush("verdicts:feed", JSON.stringify(entry));
  pipe.ltrim("verdicts:feed", 0, 999);
  pipe.incr("stats:roasts:total");
  if (isPaid) {
    pipe.incr("stats:roasts:paid");
    pipe.incrby("stats:volume:total", BigInt(entry.amountPaid).toString() as unknown as number);
  }
  pipe.incr("stats:roasts:24h");
  pipe.expire("stats:roasts:24h", 86_400);
  pipe.sadd("stats:wallets:24h", entry.user);
  pipe.expire("stats:wallets:24h", 86_400);
  pipe.zincrby("stats:leaderboard", 1, entry.user);
  await pipe.exec();
}

export interface StatsSnapshot {
  total: number;
  paid: number;
  last24h: number;
  uniqueWallets24h: number;
  volumeWei: string;
  feed: VerdictFeedEntry[];
  leaderboard: Array<{ wallet: string; count: number }>;
}

export async function readStats(): Promise<StatsSnapshot> {
  const [total, paid, last24h, wallets24h, volumeWei, feedRaw, lbRaw] = await Promise.all([
    kv.get<number>("stats:roasts:total"),
    kv.get<number>("stats:roasts:paid"),
    kv.get<number>("stats:roasts:24h"),
    kv.scard("stats:wallets:24h"),
    kv.get<string>("stats:volume:total"),
    kv.lrange<string>("verdicts:feed", 0, 19),
    kv.zrange<string[]>("stats:leaderboard", 0, 9, { rev: true, withScores: true }),
  ]);

  const feed: VerdictFeedEntry[] = (feedRaw ?? []).flatMap((s) => {
    try {
      return [JSON.parse(s) as VerdictFeedEntry];
    } catch {
      return [];
    }
  });

  const leaderboard: Array<{ wallet: string; count: number }> = [];
  if (Array.isArray(lbRaw)) {
    for (let i = 0; i < lbRaw.length; i += 2) {
      leaderboard.push({
        wallet: String(lbRaw[i]),
        count: Number(lbRaw[i + 1] ?? 0),
      });
    }
  }

  return {
    total: total ?? 0,
    paid: paid ?? 0,
    last24h: last24h ?? 0,
    uniqueWallets24h: wallets24h ?? 0,
    volumeWei: volumeWei ?? "0",
    feed,
    leaderboard,
  };
}

// Re-exported so API routes can use the raw client for ad-hoc reads.
export { kv };
