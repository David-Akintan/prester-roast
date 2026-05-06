import { formatCusd } from "@/lib/format";

export interface StatsTilesProps {
  total: number;
  paid: number;
  last24h: number;
  uniqueWallets24h: number;
  volumeWei: string;
}

const Tile = ({ label, value, suffix }: { label: string; value: string; suffix?: string }) => (
  <div className="rounded-2xl border border-bone/10 bg-ink/40 p-4">
    <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-bone/50">{label}</div>
    <div className="font-display text-3xl leading-none mt-2">
      {value}
      {suffix && <span className="text-base text-bone/55 font-mono ml-1">{suffix}</span>}
    </div>
  </div>
);

export function StatsTiles(props: StatsTilesProps) {
  const volume = formatCusd(BigInt(props.volumeWei || "0"));
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Tile label="Roasts (all-time)" value={props.total.toLocaleString()} />
      <Tile label="Paid roasts" value={props.paid.toLocaleString()} />
      <Tile label="Last 24h" value={props.last24h.toLocaleString()} />
      <Tile label="Unique wallets · 24h" value={props.uniqueWallets24h.toLocaleString()} />
      <div className="col-span-2 sm:col-span-4">
        <Tile label="cUSD volume" value={volume} suffix="cUSD" />
      </div>
    </div>
  );
}
