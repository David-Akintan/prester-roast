import { ImageResponse } from "next/og";
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";

import { ROAST_COURT_ABI, ROAST_COURT_ADDRESS } from "@/lib/contract";
import { PERSONAS, PERSONA_LABEL, type Persona } from "@/lib/prompts";
import { cidForVerdictId, cidForHash } from "@/lib/kv";
import { fetchVerdictFromIpfs } from "@/lib/ipfs";
import { formatVerdictId, truncateAddress } from "@/lib/format";

export const runtime = "nodejs";
export const alt = "Roast Court verdict";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://forno.celo.org";

export default async function OG({ params }: { params: { id: string } }) {
  const id = /^\d+$/.test(params.id) ? BigInt(params.id) : null;

  // Background defaults — used in degraded path
  let user: `0x${string}` = "0x0000000000000000000000000000000000000000";
  let persona: Persona = "brutal";
  let roast = "Verdict unavailable.";

  if (id !== null) {
    try {
      const client = createPublicClient({ chain: celo, transport: http(RPC_URL) });
      const result = (await client.readContract({
        address: ROAST_COURT_ADDRESS,
        abi: ROAST_COURT_ABI,
        functionName: "verdicts",
        args: [id],
      })) as readonly [`0x${string}`, bigint, `0x${string}`, `0x${string}`, number, bigint];

      const [u, , roastTextHash, , personaIdx] = result;
      user = u;
      persona = PERSONAS[personaIdx] ?? "brutal";

      const cid = (await cidForVerdictId(id.toString())) ?? (await cidForHash(roastTextHash));
      if (cid) {
        const payload = await fetchVerdictFromIpfs(cid);
        if (payload) roast = payload.roast;
      } else {
        roast = "Verdict anchored onchain. Open to view text.";
      }
    } catch {
      // fall through to defaults
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          backgroundColor: "#0a0a0a",
          backgroundImage:
            "radial-gradient(circle at 80% 20%, rgba(255,138,76,0.18), transparent 50%)",
          color: "#f5efe7",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(245,239,231,0.55)",
            fontFamily: "ui-monospace, monospace",
          }}
        >
          <span>Roast Court · {id !== null ? formatVerdictId(id) : "—"}</span>
          <span>{PERSONA_LABEL[persona]}</span>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 56,
            lineHeight: 1.15,
            maxWidth: "1000px",
          }}
        >
          {roast.length > 280 ? `${roast.slice(0, 277)}…` : roast}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            color: "rgba(245,239,231,0.55)",
            fontFamily: "ui-monospace, monospace",
          }}
        >
          <span>{truncateAddress(user)}</span>
          <span>celo · prester labs</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
