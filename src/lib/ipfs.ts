// Pin verdict payloads to IPFS via Pinata. Stored: roast text, persona,
// user input, severity, timestamp. The contract anchors only the keccak
// hashes; the full text lives on IPFS so verdict pages can render it
// even if our backend goes away.

import type { Persona } from "./prompts";

export interface PinnedVerdict {
  roast: string;
  severity: number;
  persona: Persona;
  userInput: string;
  user: `0x${string}`;
  isFree: boolean;
  timestamp: number;
  contract: `0x${string}`;
  chainId: number;
}

const PINATA_PIN_JSON = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

export async function pinVerdict(payload: PinnedVerdict): Promise<string> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("PINATA_JWT not configured");

  const res = await fetch(PINATA_PIN_JSON, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      pinataMetadata: {
        name: `roast-${payload.user.slice(0, 8)}-${payload.timestamp}`,
        keyvalues: {
          persona: payload.persona,
          isFree: String(payload.isFree),
        },
      },
      pinataContent: payload,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Pinata pin failed: ${res.status} ${detail.slice(0, 200)}`);
  }
  const json = (await res.json()) as { IpfsHash?: string };
  if (!json.IpfsHash) throw new Error("Pinata response missing IpfsHash");
  return json.IpfsHash;
}

export function ipfsGatewayUrl(cid: string): string {
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}

export async function fetchVerdictFromIpfs(cid: string): Promise<PinnedVerdict | null> {
  const res = await fetch(ipfsGatewayUrl(cid), { cache: "force-cache" });
  if (!res.ok) return null;
  return (await res.json()) as PinnedVerdict;
}
