// Celoscan / Etherscan v2 helpers — used by /stats for gas-spent backfill
// and by VerdictCard for "view tx" links.
//
// As of the Etherscan v2 migration (May 2025+), all chains share one base
// endpoint and one API key. Celo (42220) and Celo Sepolia (11142220) are
// supported natively.

const ETHERSCAN_V2_API = "https://api.etherscan.io/v2/api";

const EXPLORER_BASE: Record<number, string> = {
  42220: "https://celoscan.io",
  11142220: "https://celo-sepolia.blockscout.com",
};

export function explorerTxUrl(txHash: string, chainId = 42220): string {
  const base = EXPLORER_BASE[chainId] ?? EXPLORER_BASE[42220];
  return `${base}/tx/${txHash}`;
}

export function explorerAddressUrl(address: string, chainId = 42220): string {
  const base = EXPLORER_BASE[chainId] ?? EXPLORER_BASE[42220];
  return `${base}/address/${address}`;
}

// Fetch the gas spent (in wei) by a single tx.
// Used by the indexer cron to roll up volume metrics.
export async function getGasUsedForTx(
  txHash: string,
  chainId = 42220,
): Promise<bigint | null> {
  const apiKey = process.env.ETHERSCAN_API_KEY ?? process.env.CELOSCAN_API_KEY;
  if (!apiKey) return null;

  const url = new URL(ETHERSCAN_V2_API);
  url.searchParams.set("chainid", String(chainId));
  url.searchParams.set("module", "proxy");
  url.searchParams.set("action", "eth_getTransactionReceipt");
  url.searchParams.set("txhash", txHash);
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as { result?: { gasUsed?: string; effectiveGasPrice?: string } };
  if (!json.result?.gasUsed || !json.result.effectiveGasPrice) return null;
  return BigInt(json.result.gasUsed) * BigInt(json.result.effectiveGasPrice);
}
