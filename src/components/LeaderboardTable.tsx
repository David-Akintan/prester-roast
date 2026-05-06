import { explorerAddressUrl } from "@/lib/celoscan";
import { truncateAddress } from "@/lib/format";

export interface LeaderboardRow {
  wallet: string;
  count: number;
}

const RANK_ACCENT = ["text-ember", "text-bone/85", "text-bone/70"];

export function LeaderboardTable({
  rows,
  highlight,
}: {
  rows: LeaderboardRow[];
  highlight?: `0x${string}` | undefined;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-bone/10 bg-ink-2/40 p-8 text-center text-sm text-bone/55 font-mono">
        No roasts yet. <span className="text-bone/85">First on the wall is forever.</span>
      </div>
    );
  }

  return (
    <ol className="rounded-2xl border border-bone/10 bg-ink-2/40 divide-y divide-bone/[0.06] overflow-hidden">
      {rows.map((row, i) => {
        const isMe = highlight && row.wallet.toLowerCase() === highlight.toLowerCase();
        return (
          <li
            key={row.wallet}
            className={[
              "flex items-center justify-between px-4 py-3 text-sm font-mono transition-colors",
              isMe ? "bg-ember/[0.08]" : "hover:bg-bone/[0.03]",
            ].join(" ")}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={[
                  "w-6 text-right font-display text-base tabular-nums leading-none",
                  RANK_ACCENT[i] ?? "text-bone/40",
                ].join(" ")}
              >
                {i + 1}
              </span>
              <a
                href={explorerAddressUrl(row.wallet)}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate hover:text-bone transition-colors"
              >
                {truncateAddress(row.wallet)}
                {isMe && (
                  <span className="ml-2 text-[10px] uppercase tracking-[0.2em] text-ember">
                    you
                  </span>
                )}
              </a>
            </div>
            <span className="text-bone/80 tabular-nums">
              {row.count.toLocaleString()}
              <span className="text-bone/40 ml-1">
                {row.count === 1 ? "roast" : "roasts"}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
