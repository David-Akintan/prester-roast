import Link from "next/link";
import { createPublicClient, http, parseAbiItem } from "viem";
import { celo } from "viem/chains";

import { ROAST_COURT_ADDRESS } from "@/lib/contract";

const ROAST_ISSUED_EVENT = parseAbiItem(
  "event RoastIssued(uint256 indexed id, address indexed user, uint8 persona, bytes32 roastTextHash, bytes32 inputHash, uint256 amountPaid)",
);

export const dynamic = "force-dynamic";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const itemsPerPage = 10;

  const client = createPublicClient({
    chain: celo,
    transport: http("https://forno.celo.org"),
  });

  const logs = await client.getLogs({
    address: ROAST_COURT_ADDRESS,
    event: ROAST_ISSUED_EVENT,
    fromBlock: 66191232n,
  });

  const countMap = new Map<string, number>();

  for (const log of logs) {
    const user = log.args?.user as `0x${string}` | undefined;
    if (!user) continue;
    countMap.set(user, (countMap.get(user) || 0) + 1);
  }

  const leaderboard = Array.from(countMap.entries())
    .map(([address, count]) => ({ address, count }))
    .sort((a, b) => b.count - a.count);

  const totalPages = Math.ceil(leaderboard.length / itemsPerPage);
  const paginated = leaderboard.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage,
  );

  return (
    <main className="mx-auto max-w-md px-4 py-6 sm:py-10 space-y-7 fade-in-up">
      <header className="flex items-baseline justify-between">
        <Link
          href="/"
          className="text-[11px] font-mono uppercase tracking-[0.2em] text-bone/55 hover:text-bone transition-colors flex items-center gap-1"
        >
          ← ROAST COURT
        </Link>
        <div className="text-right">
          <h1 className="font-display text-2xl leading-none">Leaderboard</h1>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-bone/45 mt-1">
            MOST-ROASTED WALLETS
          </p>
        </div>
      </header>

      <p className="text-sm font-mono text-bone/55 leading-relaxed">
        Paid and free count equally. Tap any address for onchain history.
      </p>

      {paginated.length === 0 ? (
        <div className="rounded-3xl border border-surface-2 bg-surface-1 p-8 text-center">
          <p className="text-sm font-mono text-text-secondary">
            No roasts yet. First on the wall is forever.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map(({ address, count }, idx) => (
            <Link
              key={address}
              href={`/verdicts?user=${address}`}
              className="block rounded-3xl border border-surface-2 bg-surface-1 p-5 hover:border-yellow-400/50 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-7 h-7 flex items-center justify-center bg-surface-2 rounded-2xl text-xs font-bold text-text-secondary">
                  {(page - 1) * itemsPerPage + idx + 1}
                </div>
                <div className="font-mono text-sm text-text-primary">
                  {address.slice(0, 8)}...{address.slice(-6)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold text-text-primary">
                  {count}
                </div>
                <div className="text-xs font-mono tracking-widest text-text-secondary">
                  ROASTS
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-6 pt-4">
          <Link
            href={page > 1 ? `?page=${page - 1}` : "#"}
            className={`px-6 py-3 text-sm font-mono transition-colors ${
              page > 1
                ? "text-text-primary hover:text-yellow-400"
                : "text-text-secondary opacity-40 pointer-events-none"
            }`}
          >
            ← PREV
          </Link>

          <span className="font-mono text-sm text-text-secondary">
            PAGE <span className="text-text-primary">{page}</span> OF{" "}
            {totalPages}
          </span>

          <Link
            href={page < totalPages ? `?page=${page + 1}` : "#"}
            className={`px-6 py-3 text-sm font-mono transition-colors ${
              page < totalPages
                ? "text-text-primary hover:text-yellow-400"
                : "text-text-secondary opacity-40 pointer-events-none"
            }`}
          >
            NEXT →
          </Link>
        </div>
      )}
    </main>
  );
}
