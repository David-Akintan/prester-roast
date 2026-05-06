/**
 * Detect whether the app is running inside MiniPay.
 * MiniPay sets window.ethereum.isMiniPay = true.
 * Must be called client-side only.
 */
export function isMiniPay(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).ethereum?.isMiniPay;
}

/**
 * Returns the feeCurrency address to use for transactions.
 * MiniPay requires legacy transactions with feeCurrency set to USDm or cUSD.
 * Outside MiniPay we return undefined (standard EIP-1559).
 */
export function getFeeCurrency(): `0x${string}` | undefined {
  if (!isMiniPay()) return undefined;
  // USDm — preferred feeCurrency in MiniPay
  return "0x4F604735c1cF31399C6E711D5962b2B3E0225AD3";
}

/**
 * Compute keccak256 hash of a UTF-8 string using the Web Crypto API.
 * Returns a 0x-prefixed hex string compatible with bytes32.
 */
export async function hashContent(text: string): Promise<`0x${string}`> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `0x${hashHex}` as `0x${string}`;
}
