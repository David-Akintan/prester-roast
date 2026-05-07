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
    <div className="inline-flex items-center gap-1.5 rounded-none border-2 border-[#262626] bg-[#161618] px-3 py-1 text-[11px] font-mono uppercase tracking-[0.15em] text-bone/85">
      <span aria-hidden>🔥</span>
      <span>{count} roast{count === 1 ? "" : "s"}</span>
    </div>
  );
}
