import Link from "next/link";
import { createPublicClient, http, parseAbiItem } from "viem";
import { celo } from "viem/chains";

import { ROAST_COURT_ADDRESS } from "@/lib/contract";
import { StatsTiles } from "@/components/StatsTiles";
import { PERSONA_LABEL } from "@/lib/prompts";
import { explorerTxUrl } from "@/lib/celoscan";
import {
  truncateAddress,
  formatRelativeTime,
  formatVerdictId,
} from "@/lib/format";

const ROAST_ISSUED_EVENT = parseAbiItem(
  "event RoastIssued(uint256 indexed id, address indexed user, uint8 persona, bytes32 roastTextHash, bytes32 inputHash, uint256 amountPaid)",
);

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Stats",
  description: "Live roast volume, unique wallets, cUSD volume — Roast Court.",
};

export default async function StatsPage() {
  const client = createPublicClient({
    chain: celo,
    transport: http("https://forno.celo.org"),
  });

  const logs = await client.getLogs({
    address: ROAST_COURT_ADDRESS,
    event: ROAST_ISSUED_EVENT,
    fromBlock: 66191232n, // contract deployment block
  });

  let total = 0;
  let paid = 0;
  let volumeWei = 0n;
  const userSet24h = new Set<string>();
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;

  const feedPromises = logs.map(async (log) => {
    const args = log.args as {
      id?: bigint;
      user?: `0x${string}`;
      persona?: number;
      amountPaid?: bigint;
    };

    if (!args.id || !args.user) return null;

    const block = await client.getBlock({ blockHash: log.blockHash! });
    const ts = Number(block.timestamp) * 1000; // milliseconds

    const amount = args.amountPaid ?? 0n;

    total++;
    if (amount > 0n) {
      paid++;
      volumeWei += amount;
    }

    // 24h stats
    if (ts >= dayAgo) {
      userSet24h.add(args.user);
    }

    return {
      id: args.id.toString(),
      user: args.user,
      persona: args.persona ?? 0,
      txHash: log.transactionHash!,
      ts: Math.floor(ts / 1000), // unix seconds for formatRelativeTime
    };
  });

  const feedRaw = (await Promise.all(feedPromises)).filter(Boolean) as any[];

  // Sort newest first
  const feed = feedRaw.sort((a, b) => b.ts - a.ts).slice(0, 15);

  const stats = {
    total,
    paid,
    last24h: feedRaw.filter((entry) => entry.ts * 1000 >= dayAgo).length,
    uniqueWallets24h: userSet24h.size,
    volumeWei: volumeWei.toString(),
    feed,
  };

  return (
    <main className="mx-auto max-w-md px-4 py-6 sm:py-10 space-y-7 fade-in-up">
      <header className="flex items-baseline justify-between">
        <Link
          href="/"
          className="text-[11px] font-mono uppercase tracking-[0.2em] text-bone/55 hover:text-bone transition-colors"
        >
          ← Roast Court
        </Link>
        <div className="text-right">
          <h1 className="font-display text-2xl leading-none">Live stats</h1>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-bone/45 mt-1">
            on-chain • real-time
          </p>
        </div>
      </header>

      <StatsTiles
        total={stats.total}
        paid={stats.paid}
        volumeWei={stats.volumeWei}
      />

      <section className="space-y-3">
        <h2 className="font-display text-xl">Latest verdicts</h2>
        {stats.feed.length === 0 ? (
          <div className="rounded-none border-2 border-[#262626] bg-[#161618] p-8 text-center text-sm text-bone/55 font-mono">
            No verdicts yet.
          </div>
        ) : (
          <ul className="rounded-none border-2 border-[#262626] bg-[#161618] divide-y-2 divide-[#262626] overflow-hidden">
            {stats.feed.map((entry) => (
              <li
                key={`${entry.txHash}:${entry.id}`}
                className="px-4 py-3 flex items-center justify-between gap-3 text-sm font-mono hover:bg-ember/[0.06] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Link
                    href={`/verdict/${entry.id}`}
                    className="font-display text-base leading-none text-bone/85 hover:text-ember transition-colors"
                  >
                    {formatVerdictId(BigInt(entry.id))}
                  </Link>
                  <span className="text-bone/30">·</span>
                  <span className="text-bone/55 truncate">
                    {truncateAddress(entry.user)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-bone/45 shrink-0">
                  <span className="text-bone/65">
                    {PERSONA_LABEL[
                      entry.persona as keyof typeof PERSONA_LABEL
                    ] || "Unknown"}
                  </span>
                  <a
                    href={explorerTxUrl(entry.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-bone transition-colors inline-flex items-center gap-1"
                  >
                    {formatRelativeTime(entry.ts)} <span aria-hidden>↗</span>
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
