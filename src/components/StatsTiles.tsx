import { formatCusd } from "@/lib/format";

export interface StatsTilesProps {
  total: number;
  paid: number;
  volumeWei: string;
}

const Tile = ({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: string;
  suffix?: string;
  accent?: boolean;
}) => (
  <div
    className={[
      "lift rounded-none border-2 p-4",
      accent
        ? "border-ember bg-gradient-to-br from-[#1a0e0a] to-[#161618] glow-ember"
        : "border-[#262626] bg-[#161618] hover:border-[#404040]",
    ].join(" ")}
  >
    <div className="text-[10px] uppercase tracking-[0.22em] font-mono text-bone/50">
      {label}
    </div>
    <div className="font-display text-3xl sm:text-[34px] leading-none mt-2 tabular-nums">
      {value}
      {suffix && (
        <span className="text-base text-bone/55 font-mono ml-1.5 tracking-tight">
          {suffix}
        </span>
      )}
    </div>
  </div>
);

export function StatsTiles(props: StatsTilesProps) {
  const volume = formatCusd(BigInt(props.volumeWei || "0"));
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <Tile
        label="Roasts (all-time)"
        value={props.total.toLocaleString()}
        accent
      />
      <Tile label="Paid roasts" value={props.paid.toLocaleString()} />
      <div className="col-span-2">
        <Tile label="cUSD volume" value={volume} suffix="cUSD" accent />
      </div>
    </div>
  );
}
