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
    <article className="relative rounded-none border-2 border-[#262626] bg-[#161618] p-5 sm:p-7 space-y-5 fade-in-up overflow-hidden">
      {/* corner accent — strong left bar in ember */}
      <div
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-ember via-ember/60 to-ember/20"
      />

      <header className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.25em] font-mono text-bone/55">
        <span className="font-mono">Verdict {formatVerdictId(id)}</span>
        <span className="flex items-center gap-2">
          <span className="text-bone/80">{PERSONA_LABEL[persona]}</span>
          {isFree && (
            <span className="rounded-none border-2 border-ember/60 bg-ember/15 text-ember px-2 py-0.5 text-[9px] tracking-[0.18em]">
              free
            </span>
          )}
        </span>
      </header>

      <p className="font-display text-2xl sm:text-[26px] leading-snug text-bone">
        <span aria-hidden className="text-ember/80 mr-1">"</span>
        {roast}
        <span aria-hidden className="text-ember/80 ml-1">"</span>
      </p>

      {typeof severity === "number" && (
        <SeverityMeter severity={severity} />
      )}

      <footer className="flex flex-wrap items-center justify-between gap-y-2 gap-x-4 text-[12px] font-mono text-bone/55 pt-3 border-t-2 border-[#262626]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <a
            href={explorerAddressUrl(user)}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-bone transition-colors"
          >
            {truncateAddress(user)}
          </a>
          {timestamp && <span className="text-bone/40">· {formatRelativeTime(timestamp)}</span>}
        </div>
        <div className="flex items-center gap-3">
          {txHash && (
            <a
              href={explorerTxUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-bone transition-colors inline-flex items-center gap-1"
            >
              tx <span aria-hidden>↗</span>
            </a>
          )}
          {ipfsCid && (
            <a
              href={`https://gateway.pinata.cloud/ipfs/${ipfsCid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-bone transition-colors inline-flex items-center gap-1"
            >
              ipfs <span aria-hidden>↗</span>
            </a>
          )}
        </div>
      </footer>
    </article>
  );
}

function SeverityMeter({ severity }: { severity: number }) {
  const clamped = Math.max(1, Math.min(10, severity));
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[10px] uppercase tracking-[0.22em] font-mono text-bone/45 shrink-0">
        Severity
      </span>
      <div className="flex gap-0.5 grow">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className={[
              "h-1.5 flex-1 rounded-none",
              i < clamped ? "bg-ember" : "bg-[#262626]",
            ].join(" ")}
          />
        ))}
      </div>
      <span className="text-[11px] font-mono text-bone/70 tabular-nums shrink-0">
        {clamped}/10
      </span>
    </div>
  );
}
