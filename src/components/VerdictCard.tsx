import { PERSONA_LABEL, type Persona } from "@/lib/prompts";
import { explorerTxUrl, explorerAddressUrl } from "@/lib/celoscan";
import { formatVerdictId, truncateAddress, formatRelativeTime } from "@/lib/format";

export interface VerdictCardProps {
  id: bigint;
  user: `0x${string}`;
  persona: Persona;
  roast: string;
  severity?: number;
  txHash?: `0x${string}`;
  timestamp?: number;
  isFree?: boolean;
  ipfsCid?: string | null;
}

export function VerdictCard(props: VerdictCardProps) {
  const { id, user, persona, roast, severity, txHash, timestamp, isFree, ipfsCid } = props;

  return (
    <article className="rounded-3xl border border-bone/15 bg-ink/60 p-5 sm:p-7 space-y-4">
      <header className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.2em] font-mono text-bone/55">
        <span>Verdict {formatVerdictId(id)}</span>
        <span>{PERSONA_LABEL[persona]}{isFree ? " · Daily free" : ""}</span>
      </header>

      <p className="font-display text-2xl leading-snug">{roast}</p>

      <footer className="flex flex-wrap items-center justify-between gap-2 text-[12px] font-mono text-bone/55 pt-2 border-t border-bone/10">
        <div className="flex items-center gap-3">
          <a
            href={explorerAddressUrl(user)}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-bone/80 transition"
          >
            {truncateAddress(user)}
          </a>
          {timestamp && <span>· {formatRelativeTime(timestamp)}</span>}
          {typeof severity === "number" && (
            <span title="Judge-assigned severity">· severity {severity}/10</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {txHash && (
            <a
              href={explorerTxUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-bone/80 transition"
            >
              tx ↗
            </a>
          )}
          {ipfsCid && (
            <a
              href={`https://gateway.pinata.cloud/ipfs/${ipfsCid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-bone/80 transition"
            >
              ipfs ↗
            </a>
          )}
        </div>
      </footer>
    </article>
  );
}
