import Link from "next/link";
import { readStats } from "@/lib/kv";
import { StatsTiles } from "@/components/StatsTiles";
import { PERSONA_LABEL } from "@/lib/prompts";
import { explorerTxUrl } from "@/lib/celoscan";
import { truncateAddress, formatRelativeTime, formatVerdictId } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Stats",
  description: "Live roast volume, unique wallets, cUSD volume — Roast Court.",
};

export default async function StatsPage() {
  const stats = await readStats();

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10 space-y-7 fade-in-up">
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
            indexed every 60s
          </p>
        </div>
      </header>

      <StatsTiles
        total={stats.total}
        paid={stats.paid}
        last24h={stats.last24h}
        uniqueWallets24h={stats.uniqueWallets24h}
        volumeWei={stats.volumeWei}
      />

      <section className="space-y-3">
        <h2 className="font-display text-xl">Latest verdicts</h2>
        {stats.feed.length === 0 ? (
          <div className="rounded-none border-2 border-[#262626] bg-[#161618] p-8 text-center text-sm text-bone/55 font-mono">
            No verdicts indexed yet. <span className="text-bone/85">Check back in a minute.</span>
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
                  <span className="text-bone/65">{PERSONA_LABEL[entry.persona]}</span>
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
