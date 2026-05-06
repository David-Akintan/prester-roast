"use client";

import { useReadContract } from "wagmi";
import { ROAST_COURT_ABI, ROAST_COURT_ADDRESS } from "@/lib/contract";

export function StreakBadge({ user }: { user: `0x${string}` | undefined }) {
  const { data } = useReadContract({
    address: ROAST_COURT_ADDRESS,
    abi: ROAST_COURT_ABI,
    functionName: "roastCount",
    args: user ? [user] : undefined,
    query: { enabled: Boolean(user) },
  });

  const count = data ? Number(data) : 0;
  if (!user) return null;

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-bone/5 border border-bone/10 px-3 py-1 text-[11px] font-mono text-bone/80">
      <span aria-hidden>🔥</span>
      <span>{count} roast{count === 1 ? "" : "s"}</span>
    </div>
  );
}
