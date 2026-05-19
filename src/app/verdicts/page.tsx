import Link from "next/link";
import { isAddress } from "viem";

import { readVerdictFeed } from "@/lib/kv";

export const dynamic = "force-dynamic";

export default async function UserVerdictsPage({
  searchParams,
}: {
  searchParams: { user?: string };
}) {
  const rawUser = searchParams.user;
  const userAddress = rawUser && isAddress(rawUser) ? rawUser.toLowerCase() : null;

  if (!userAddress) {
    return (
      <main className="mx-auto max-w-md px-4 py-10 text-center">
        <p className="text-sm font-mono text-text-secondary">
          Provide a valid wallet address.
        </p>
        <Link
          href="/leaderboard"
          className="mt-6 inline-flex min-h-[44px] items-center rounded-none border-2 border-[#262626] bg-[#161618] px-4 text-xs font-mono uppercase tracking-[0.15em] text-bone/85 hover:border-ember/60"
        >
          Back to leaderboard
        </Link>
      </main>
    );
  }

  const feed = await readVerdictFeed(1000);
  const userRoasts = feed
    .filter((entry) => entry.user.toLowerCase() === userAddress)
    .sort((a, b) => b.ts - a.ts);

  return (
    <main className="mx-auto max-w-md px-4 py-6 sm:py-10 space-y-6 fade-in-up">
      <header className="flex items-baseline justify-between">
        <Link
          href="/leaderboard"
          className="text-[11px] font-mono uppercase tracking-[0.2em] text-bone/55 hover:text-bone transition-colors flex items-center gap-1"
        >
          &larr; Leaderboard
        </Link>
        <div className="text-right">
          <h1 className="font-display text-2xl leading-none">
            Indexed history
          </h1>
          <p className="font-mono text-xs text-text-secondary mt-1">
            {userAddress.slice(0, 8)}...{userAddress.slice(-6)}
          </p>
        </div>
      </header>

      {userRoasts.length === 0 ? (
        <div className="rounded-3xl border border-surface-2 bg-surface-1 p-8 text-center">
          <p className="text-sm font-mono text-text-secondary">
            This wallet is not in the latest indexed feed yet.
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
              <div className="flex justify-between items-center gap-4">
                <span className="font-mono text-xs text-text-secondary">
                  VERDICT #{roast.id}
                </span>
                <span className="text-xs font-mono uppercase text-text-secondary">
                  {new Date(roast.ts * 1000).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
