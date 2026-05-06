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
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10 space-y-6">
      <header className="flex items-center justify-between">
        <Link
          href="/"
          className="text-[11px] font-mono uppercase tracking-[0.2em] text-bone/55 hover:text-bone transition"
        >
          ← Roast Court
        </Link>
        <h1 className="font-display text-2xl">Leaderboard</h1>
      </header>

      <p className="text-sm font-mono text-bone/55">
        Top 10 most-roasted wallets — paid and free count equally. Tap any
        address to view onchain history.
      </p>

      <LeaderboardTable rows={leaderboard} />
    </main>
  );
}
