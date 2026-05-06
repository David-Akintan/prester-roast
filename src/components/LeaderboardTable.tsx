import { explorerAddressUrl } from "@/lib/celoscan";
import { truncateAddress } from "@/lib/format";

export interface LeaderboardRow {
  wallet: string;
  count: number;
}

export function LeaderboardTable({
  rows,
  highlight,
}: {
  rows: LeaderboardRow[];
  highlight?: `0x${string}` | undefined;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-bone/10 bg-ink/40 p-6 text-center text-sm text-bone/55 font-mono">
        No roasts yet. First on the wall is forever.
      </div>
    );
  }

  return (
    <ol className="rounded-2xl border border-bone/10 bg-ink/40 divide-y divide-bone/5">
      {rows.map((row, i) => {
        const isMe = highlight && row.wallet.toLowerCase() === highlight.toLowerCase();
        return (
          <li
            key={row.wallet}
            className={[
              "flex items-center justify-between px-4 py-3 text-sm font-mono",
              isMe ? "bg-ember/10" : "",
            ].join(" ")}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-bone/45 w-6 text-right">{i + 1}</span>
              <a
                href={explorerAddressUrl(row.wallet)}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate hover:text-bone transition"
              >
                {truncateAddress(row.wallet)}
                {isMe && <span className="ml-2 text-ember">you</span>}
              </a>
            </div>
            <span className="text-bone/80">
              {row.count} roast{row.count === 1 ? "" : "s"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
