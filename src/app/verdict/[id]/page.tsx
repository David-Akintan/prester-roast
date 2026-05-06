import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";

import { VerdictCard } from "@/components/VerdictCard";
import { ROAST_COURT_ABI, ROAST_COURT_ADDRESS } from "@/lib/contract";
import { PERSONAS, type Persona } from "@/lib/prompts";
import { fetchVerdictFromIpfs } from "@/lib/ipfs";
import { kv } from "@vercel/kv";
import { cidForVerdictId, type VerdictFeedEntry } from "@/lib/kv";
import { formatVerdictId } from "@/lib/format";

export const dynamic = "force-dynamic";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://forno.celo.org";

interface OnchainVerdict {
  user: `0x${string}`;
  amountPaid: bigint;
  roastTextHash: `0x${string}`;
  inputHash: `0x${string}`;
  persona: Persona;
  timestamp: number;
  isFree: boolean;
}

async function readOnchainVerdict(id: bigint): Promise<OnchainVerdict | null> {
  const client = createPublicClient({ chain: celo, transport: http(RPC_URL) });
  try {
    const result = (await client.readContract({
      address: ROAST_COURT_ADDRESS,
      abi: ROAST_COURT_ABI,
      functionName: "verdicts",
      args: [id],
    })) as readonly [`0x${string}`, bigint, `0x${string}`, `0x${string}`, number, bigint];

    const [user, amountPaid, roastTextHash, inputHash, personaIdx, timestamp] = result;
    if (user === "0x0000000000000000000000000000000000000000") return null;

    return {
      user,
      amountPaid,
      roastTextHash,
      inputHash,
      persona: PERSONAS[personaIdx] ?? "brutal",
      timestamp: Number(timestamp),
      isFree: amountPaid === 0n,
    };
  } catch {
    return null;
  }
}

// Find the indexer-cached entry (so we can show tx hash + cid quickly)
async function readCachedEntry(id: bigint): Promise<VerdictFeedEntry | null> {
  try {
    const feed = await kv.lrange<string>("verdicts:feed", 0, 999);
    if (!feed) return null;
    const target = id.toString();
    for (const raw of feed) {
      try {
        const entry = JSON.parse(raw) as VerdictFeedEntry;
        if (entry.id === target) return entry;
      } catch {
        // skip
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const id = safeBigInt(params.id);
  if (id === null) return { title: "Verdict not found" };

  return {
    title: `Verdict ${formatVerdictId(id)}`,
    description: "An AI judge has spoken. Anchored on Celo.",
    openGraph: {
      title: `Verdict ${formatVerdictId(id)} · Roast Court`,
      images: [{ url: `/verdict/${id.toString()}/opengraph-image` }],
    },
  };
}

export default async function VerdictPage({ params }: { params: { id: string } }) {
  const id = safeBigInt(params.id);
  if (id === null) notFound();

  const onchain = await readOnchainVerdict(id);
  if (!onchain) notFound();

  // The roast TEXT lives on IPFS — try to load. If unavailable we render a
  // degraded card with just hashes (the verdict still proves a roast was issued).
  const cached = await readCachedEntry(id);
  let roastText = "";
  let severity: number | undefined = undefined;

  // Two ways to resolve the cid:
  //   1. cached.cid — populated by the cron indexer once it sees the event
  //   2. cidForVerdictId(id) — direct KV lookup written by the same cron
  //   3. (race-condition fallback) cidForHash on roastTextHash from chain
  let ipfsCid: string | null = cached?.cid ?? (await cidForVerdictId(id.toString()));

  if (!ipfsCid) {
    // Race: tx confirmed but cron hasn't indexed yet. Look up via hash.
    const { cidForHash } = await import("@/lib/kv");
    ipfsCid = await cidForHash(onchain.roastTextHash);
  }

  if (ipfsCid) {
    const payload = await fetchVerdictFromIpfs(ipfsCid);
    if (payload) {
      roastText = payload.roast;
      severity = payload.severity;
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-6 sm:py-10 space-y-7">
      <header>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-[0.2em] text-bone/55 hover:text-bone transition-colors"
        >
          ← Roast Court
        </Link>
      </header>

      <VerdictCard
        id={id}
        user={onchain.user}
        persona={onchain.persona}
        roast={roastText || "Roast text lives on IPFS — open the link below to view it."}
        severity={severity}
        txHash={cached?.txHash}
        timestamp={onchain.timestamp}
        isFree={onchain.isFree}
        ipfsCid={ipfsCid}
      />

      <section className="space-y-3">
        <h2 className="font-display text-lg leading-none">Share the verdict</h2>
        <ShareRow id={id.toString()} />
      </section>

      <Link
        href="/"
        className="block w-full text-center min-h-[56px] py-4 rounded-2xl bg-ember text-ink font-display text-lg hover:bg-ember/90 transition-colors shadow-[0_8px_24px_-12px_rgba(255,138,76,0.5)]"
      >
        Get your own roast
      </Link>
    </main>
  );
}

function ShareRow({ id }: { id: string }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://prester-roast.vercel.app";
  const shareUrl = `${appUrl}/verdict/${id}`;
  const text = encodeURIComponent("I just got roasted onchain by an AI judge. Verdict:");
  const farcaster = `https://warpcast.com/~/compose?text=${text}&embeds[]=${encodeURIComponent(shareUrl)}`;
  const twitter = `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="grid grid-cols-2 gap-2">
      <a
        href={farcaster}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 min-h-[48px] px-3 rounded-2xl bg-bone/[0.06] border border-bone/10 hover:bg-bone/10 hover:border-bone/25 text-bone/85 hover:text-bone font-mono text-sm transition-colors"
      >
        Cast on Farcaster
      </a>
      <a
        href={twitter}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 min-h-[48px] px-3 rounded-2xl bg-bone/[0.06] border border-bone/10 hover:bg-bone/10 hover:border-bone/25 text-bone/85 hover:text-bone font-mono text-sm transition-colors"
      >
        Post on X
      </a>
    </div>
  );
}

function safeBigInt(s: string): bigint | null {
  if (!/^\d+$/.test(s)) return null;
  try {
    return BigInt(s);
  } catch {
    return null;
  }
}
