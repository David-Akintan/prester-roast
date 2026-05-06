import { keccak256, toBytes } from "viem";
import { CUSD_ADDRESS } from "./contract";

// MiniPay sets window.ethereum.isMiniPay = true. Use this to gate UI
// (no Connect button inside MiniPay) and to set legacy-tx fields.
export function isMiniPay(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as { ethereum?: { isMiniPay?: boolean } }).ethereum?.isMiniPay);
}

// Inside MiniPay we MUST send legacy txs with feeCurrency set to a stable
// (cUSD per plan §Wallet, line 502-509). Outside MiniPay → undefined =
// standard EIP-1559 path.
export function getFeeCurrency(): `0x${string}` | undefined {
  if (!isMiniPay()) return undefined;
  return CUSD_ADDRESS;
}

// keccak256 over UTF-8 bytes — the contract's signed-message hash and the
// content/inputHash arguments must match what the server signs. Server uses
// ethers' `keccak256(toUtf8Bytes(s))`; viem's `keccak256(toBytes(s))` is the
// byte-identical equivalent.
export function hashUtf8(text: string): `0x${string}` {
  return keccak256(toBytes(text));
}

// Render a deeplink to open this URL inside MiniPay on devices that have it.
// Used by the "Open in MiniPay" fallback button when not in MiniPay.
export function openInMiniPayUrl(targetUrl?: string): string {
  const url = targetUrl ?? (typeof window !== "undefined" ? window.location.href : "");
  return `https://minipay.opera.com/?url=${encodeURIComponent(url)}`;
}
