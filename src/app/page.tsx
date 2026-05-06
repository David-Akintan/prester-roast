"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";

import { PersonaPicker } from "@/components/PersonaPicker";
import { DailyTopicBanner } from "@/components/DailyTopicBanner";
import { StreakBadge } from "@/components/StreakBadge";
import { OpenInMiniPayButton } from "@/components/OpenInMiniPayButton";
import { RoastButton, type RoastSuccess } from "@/components/RoastButton";

import { ROAST_COURT_ABI, ROAST_COURT_ADDRESS } from "@/lib/contract";
import { utcDayIndex, type DailyTopic } from "@/lib/topics";
import { type Persona } from "@/lib/prompts";
import { truncateAddress } from "@/lib/format";

const MIN_CHARS = 10;
const MAX_CHARS = 280;

export default function Home() {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  const [persona, setPersona] = useState<Persona>("brutal");
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"paid" | "free">("paid");
  const [topic, setTopic] = useState<DailyTopic | null>(null);
  const [topErr, setTopErr] = useState<string | null>(null);

  // Fetch today's topic from /api/roast (cached 60s)
  useEffect(() => {
    let cancelled = false;
    fetch("/api/roast")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`topic fetch ${r.status}`))))
      .then((j) => {
        if (!cancelled) setTopic(j as DailyTopic);
      })
      .catch((e) => !cancelled && setTopErr(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  // Read lastFreeRoast for the connected wallet to know if free is claimable today
  const { data: lastFree } = useReadContract({
    address: ROAST_COURT_ADDRESS,
    abi: ROAST_COURT_ABI,
    functionName: "lastFreeRoast",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const freeClaimedToday = useMemo(() => {
    if (lastFree === undefined) return false;
    const lastDay = Number(lastFree as bigint);
    return lastDay !== 0 && lastDay === utcDayIndex();
  }, [lastFree]);

  const inputForRoast = mode === "free" && topic ? `[${topic.topic}] ${input}`.trim() : input.trim();
  const inputValid = input.trim().length >= MIN_CHARS && input.trim().length <= MAX_CHARS;

  const handleSuccess = ({ verdictId }: RoastSuccess) => {
    router.push(`/verdict/${verdictId.toString()}`);
  };

  return (
    <main className="mx-auto max-w-md px-4 py-6 sm:py-10 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Roast Court</h1>
          <p className="font-mono text-[12px] text-bone/55 -mt-0.5">
            an AI judge · onchain verdicts · 10¢
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StreakBadge user={address} />
          <OpenInMiniPayButton />
        </div>
      </header>

      {topic && (
        <DailyTopicBanner topic={topic.topic} alreadyClaimed={freeClaimedToday} />
      )}
      {topErr && (
        <p className="text-xs font-mono text-red-300/80">topic unavailable: {topErr}</p>
      )}

      <section className="space-y-3">
        <label className="block text-[11px] uppercase tracking-[0.2em] font-mono text-bone/55">
          Choose a judge
        </label>
        <PersonaPicker value={persona} onChange={setPersona} />
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="roast-input"
            className="block text-[11px] uppercase tracking-[0.2em] font-mono text-bone/55"
          >
            {mode === "free" ? "Your take on the topic" : "What should we roast?"}
          </label>
          <span className="text-[11px] font-mono text-bone/40">
            {input.length}/{MAX_CHARS}
          </span>
        </div>
        <textarea
          id="roast-input"
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
          placeholder={
            mode === "free"
              ? "Reply to today's topic — keep it under 280 chars."
              : "Your startup, your tweet, your CV, your code, your hot take. Whatever's brave enough."
          }
          rows={4}
          className="w-full resize-none rounded-2xl border border-bone/15 bg-ink/40 px-4 py-3 font-mono text-sm leading-relaxed text-bone placeholder:text-bone/30 focus:outline-none focus:border-ember/70 focus:bg-ink/70 transition"
        />
      </section>

      {/* Mode toggle — only show free option if topic loaded and not claimed */}
      <div className="flex gap-2 rounded-full bg-ink/60 border border-bone/10 p-1 text-sm font-mono">
        <button
          type="button"
          onClick={() => setMode("paid")}
          className={[
            "flex-1 min-h-[36px] rounded-full px-3 transition",
            mode === "paid" ? "bg-bone text-ink" : "text-bone/65 hover:text-bone",
          ].join(" ")}
        >
          Paid · 10¢
        </button>
        <button
          type="button"
          onClick={() => setMode("free")}
          disabled={freeClaimedToday || !topic}
          className={[
            "flex-1 min-h-[36px] rounded-full px-3 transition",
            mode === "free" ? "bg-ember text-ink" : "text-bone/65 hover:text-bone",
            freeClaimedToday || !topic ? "opacity-40 cursor-not-allowed" : "",
          ].join(" ")}
        >
          Free daily {freeClaimedToday ? "✓" : ""}
        </button>
      </div>

      <RoastButton
        persona={persona}
        userInput={inputForRoast}
        isFree={mode === "free"}
        disabled={!inputValid || (mode === "free" && (freeClaimedToday || !topic))}
        onSuccess={handleSuccess}
      />

      {!isConnected && (
        <p className="text-center text-xs font-mono text-bone/50">
          Connect a wallet to play. Inside MiniPay this happens automatically.
        </p>
      )}
      {isConnected && address && (
        <p className="text-center text-xs font-mono text-bone/50">
          signed in as {truncateAddress(address)}
        </p>
      )}

      <footer className="pt-6 border-t border-bone/10 text-center text-[11px] font-mono text-bone/40 space-x-3">
        <Link href="/stats" className="hover:text-bone/70 transition">/stats</Link>
        <Link href="/leaderboard" className="hover:text-bone/70 transition">/leaderboard</Link>
        <Link href="/about" className="hover:text-bone/70 transition">/about</Link>
      </footer>
    </main>
  );
}
