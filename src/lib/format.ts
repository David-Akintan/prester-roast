// Formatting helpers used across UI and OG images.

export function truncateAddress(addr: string, head = 6, tail = 4): string {
  if (!addr || addr.length < head + tail + 2) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

// Render a wei BigInt as a cUSD string with up to 2 decimals.
// Treats input as 18-decimal token. Plan calls for "≈ 10¢" style display.
export function formatCusd(wei: bigint): string {
  const whole = wei / 10n ** 18n;
  const fraction = wei % 10n ** 18n;
  // 4-digit precision, then trim
  const fracStr = (fraction / 10n ** 14n).toString().padStart(4, "0");
  const trimmed = fracStr.replace(/0+$/, "");
  return trimmed.length === 0 ? `${whole}` : `${whole}.${trimmed}`;
}

// Marketing-friendly cents-style: "≈ 10¢" for sub-dollar amounts.
export function formatPriceLabel(wei: bigint): string {
  const cents = Number((wei * 100n) / 10n ** 18n);
  if (cents < 100) return `≈ ${cents}¢`;
  return `${formatCusd(wei)} cUSD`;
}

export function formatRelativeTime(timestamp: number | bigint): string {
  const ts = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
  const seconds = Math.floor(Date.now() / 1000) - ts;
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(ts * 1000).toLocaleDateString();
}

export function formatVerdictId(id: bigint | number): string {
  return `#${id.toString().padStart(4, "0")}`;
}
