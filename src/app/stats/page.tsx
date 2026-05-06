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
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10 space-y-6">
      <header className="flex items-center justify-between">
        <Link
          href="/"
          className="text-[11px] font-mono uppercase tracking-[0.2em] text-bone/55 hover:text-bone transition"
        >
          ← Roast Court
        </Link>
        <h1 className="font-display text-2xl">Live stats</h1>
      </header>

      <StatsTiles
        total={stats.total}
        paid={stats.paid}
        last24h={stats.last24h}
        uniqueWallets24h={stats.uniqueWallets24h}
        volumeWei={stats.volumeWei}
      />

      <section className="space-y-3">
        <h2 className="font-display text-lg">Latest verdicts</h2>
        {stats.feed.length === 0 ? (
          <div className="rounded-2xl border border-bone/10 bg-ink/40 p-6 text-center text-sm text-bone/55 font-mono">
            No verdicts indexed yet. Check back in a minute.
          </div>
        ) : (
          <ul className="rounded-2xl border border-bone/10 bg-ink/40 divide-y divide-bone/5">
            {stats.feed.map((entry) => (
              <li
                key={`${entry.txHash}:${entry.id}`}
                className="px-4 py-3 flex items-center justify-between gap-3 text-sm font-mono"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Link
                    href={`/verdict/${entry.id}`}
                    className="text-bone/80 hover:text-bone transition"
                  >
                    {formatVerdictId(BigInt(entry.id))}
                  </Link>
                  <span className="text-bone/45">·</span>
                  <span className="text-bone/55 truncate">
                    {truncateAddress(entry.user)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-bone/45 shrink-0">
                  <span>{PERSONA_LABEL[entry.persona]}</span>
                  <a
                    href={explorerTxUrl(entry.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-bone/80"
                  >
                    {formatRelativeTime(entry.ts)} ↗
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-[11px] font-mono text-bone/40">
        Data refreshes every 60s via Vercel Cron.
      </p>
    </main>
  );
}
