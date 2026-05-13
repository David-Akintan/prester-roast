import Link from "next/link";
import { createPublicClient, http, parseAbiItem } from "viem";
import { celo } from "viem/chains";

import { ROAST_COURT_ADDRESS } from "@/lib/contract";

const ROAST_ISSUED_EVENT = parseAbiItem(
  "event RoastIssued(uint256 indexed id, address indexed user, uint8 persona, bytes32 roastTextHash, bytes32 inputHash, uint256 amountPaid)",
);

export const dynamic = "force-dynamic";

export default async function UserVerdictsPage({
  searchParams,
}: {
  searchParams: { user?: string };
}) {
  const userAddress = searchParams.user?.toLowerCase() as
    | `0x${string}`
    | undefined;

  if (!userAddress) {
    return (
      <main className="mx-auto max-w-md px-4 py-10 text-center">
        <p className="text-sm font-mono text-text-secondary">
          No wallet address provided.
        </p>
      </main>
    );
  }

  const client = createPublicClient({
    chain: celo,
    transport: http("https://forno.celo.org"),
  });

  const logs = await client.getLogs({
    address: ROAST_COURT_ADDRESS,
    event: ROAST_ISSUED_EVENT,
    fromBlock: 66191232n,
  });

  const userLogs = logs.filter(
    (log) => (log.args?.user as string)?.toLowerCase() === userAddress,
  );

  // Fetch block timestamps in parallel (very fast since number of roasts is small)
  const userRoasts = await Promise.all(
    userLogs.map(async (log) => {
      const block = await client.getBlock({ blockHash: log.blockHash! });
      return {
        id: (log.args?.id as bigint).toString(),
        ts: Number(block.timestamp),
        persona: log.args?.persona,
      };
    }),
  );

  // Sort newest first
  userRoasts.sort((a, b) => b.ts - a.ts);

  return (
    <main className="mx-auto max-w-md px-4 py-6 sm:py-10 space-y-6 fade-in-up">
      <header className="flex items-baseline justify-between">
        <Link
          href="/leaderboard"
          className="text-[11px] font-mono uppercase tracking-[0.2em] text-bone/55 hover:text-bone transition-colors flex items-center gap-1"
        >
          ← LEADERBOARD
        </Link>
        <div className="text-right">
          <h1 className="font-display text-2xl leading-none">
            Onchain History
          </h1>
          <p className="font-mono text-xs text-text-secondary mt-1">
            {userAddress.slice(0, 8)}...{userAddress.slice(-6)}
          </p>
        </div>
      </header>

      {userRoasts.length === 0 ? (
        <div className="rounded-3xl border border-surface-2 bg-surface-1 p-8 text-center">
          <p className="text-sm font-mono text-text-secondary">
            This wallet has no roasts yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {userRoasts.map((roast) => (
            <Link
              key={roast.id}
              href={`/verdict/${roast.id}`}
              className="block rounded-3xl border border-surface-2 bg-surface-1 p-5 hover:border-yellow-400/50 transition-all"
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-mono text-xs text-text-secondary">
                    VERDICT #{roast.id}
                  </span>
                </div>
                <div className="text-xs font-mono uppercase text-text-secondary">
                  {new Date(roast.ts * 1000).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
