import Link from "next/link";
import { readStats } from "@/lib/kv";
import { LeaderboardTable } from "@/components/LeaderboardTable";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Leaderboard",
  description: "Most-roasted wallets on Roast Court.",
};

export default async function LeaderboardPage() {
  const { leaderboard } = await readStats();

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
          <h1 className="font-display text-2xl leading-none">Leaderboard</h1>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-bone/45 mt-1">
            most-roasted wallets
          </p>
        </div>
      </header>

      <p className="text-sm font-mono text-bone/55 leading-relaxed">
        Paid and free count equally. Tap any address for onchain history.
      </p>

      <LeaderboardTable rows={leaderboard} />
    </main>
  );
}
