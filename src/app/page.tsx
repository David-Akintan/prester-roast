"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";

import { PersonaPicker } from "@/components/PersonaPicker";
import { Docket } from "@/components/Docket";
import { StreakBadge } from "@/components/StreakBadge";
import { OpenInMiniPayButton } from "@/components/OpenInMiniPayButton";
import { ConnectWallet } from "@/components/ConnectWallet";
import { RoastButton, type RoastSuccess } from "@/components/RoastButton";

import { ROAST_COURT_ABI, ROAST_COURT_ADDRESS } from "@/lib/contract";
import { utcDayIndex, type DailyTopic } from "@/lib/topics";
import { type Persona } from "@/lib/prompts";
import { PERSONA_ACCENT, PERSONA_ACCENT_DEEP } from "@/lib/persona-theme";
import { truncateAddress } from "@/lib/format";

const MIN_CHARS = 10;
const MAX_CHARS = 280;
const RED_AT = 250;

export default function Home() {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  const [persona, setPersona] = useState<Persona>("brutal");
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"paid" | "free">("paid");
  const [topic, setTopic] = useState<DailyTopic | null>(null);
  const [topErr, setTopErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/roast")
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`topic fetch ${r.status}`)),
      )
      .then((j) => {
        if (!cancelled) setTopic(j as DailyTopic);
      })
      .catch((e) => !cancelled && setTopErr(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

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

  const inputForRoast =
    mode === "free" && topic
      ? `[${topic.topic}] ${input}`.trim()
      : input.trim();
  const inputValid =
    input.trim().length >= MIN_CHARS && input.trim().length <= MAX_CHARS;

  const handleSuccess = ({ verdictId }: RoastSuccess) => {
    router.push(`/verdict/${verdictId.toString()}`);
  };

  const charOver = input.length > RED_AT;

  return (
    <>
      <main className="mx-auto max-w-md px-4 pb-24 pt-6 space-y-8 min-h-screen bg-bg">
        <header className="flex items-center justify-between">
          {/* Left side - Logo + Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-yellow-400 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
              ⚖️
            </div>
            <h1 className="font-display text-2xl tracking-tighter text-text-primary">
              Roast Court
            </h1>
          </div>

          {/* Right side - Pills */}
          <div className="flex items-center gap-2">
            {/* Roast Count */}
            <div className="flex items-center gap-1.5 bg-surface-1 border border-surface-2 rounded-3xl px-4 py-1 text-sm font-mono">
              <span className="text-orange-400">🔥</span>
              <span className="font-semibold text-text-primary">17</span>
              {/* <span className="text-text-secondary text-xs">ROASTS</span> */}
            </div>

            {/* Wallet Address */}
            {isConnected && address && (
              <div className="flex items-center gap-1.5 bg-surface-1 border border-surface-2 rounded-3xl px-4 py-1 text-sm font-mono">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span className="text-text-primary">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              </div>
            )}

            {/* Connect / Streak */}
            <StreakBadge user={address} />
            <ConnectWallet />
            {/* <OpenInMiniPayButton /> */}
          </div>
        </header>

        {topic ? (
          <Docket topic={topic.topic} alreadyClaimed={freeClaimedToday} />
        ) : topErr ? (
          <p className="text-xs font-mono text-red-300 px-3 py-2 rounded-3xl border border-red-500/60 bg-red-500/10">
            Daily topic unavailable: {topErr}
          </p>
        ) : (
          <div className="h-[68px] rounded-3xl border border-surface-2 bg-surface-1 animate-pulse" />
        )}

        <section className="space-y-3">
          <label className="block text-[11px] uppercase tracking-widest font-mono text-text-secondary px-1">
            THE BENCH
          </label>
          <PersonaPicker value={persona} onChange={setPersona} />
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <label
              htmlFor="roast-input"
              className="block text-[11px] uppercase tracking-widest font-mono text-text-secondary"
            >
              EVIDENCE
            </label>
            <span
              className="text-[11px] font-mono"
              style={{
                color: charOver
                  ? "var(--color-accent-brutal)"
                  : "var(--color-text-secondary)",
              }}
            >
              {input.length}/{MAX_CHARS}
            </span>
          </div>
          <textarea
            id="roast-input"
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
            placeholder={
              mode === "free"
                ? "Have a roast by an AI agent as an appetizer to get your day started. First roast is on the house but make sure to keep it under 280 chars."
                : "Got the nerve to withstand a roast from an AI agent? Give your best shot."
            }
            rows={4}
            className="evidence-inset w-full resize-none rounded-3xl border border-surface-2 bg-surface-1 px-5 py-4 font-mono text-sm leading-relaxed text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-[var(--color-judge)]"
          />
        </section>

        <div className="flex gap-0 rounded-3xl bg-surface-1 border border-surface-2 text-sm font-mono overflow-hidden">
          <button
            type="button"
            onClick={() => setMode("paid")}
            className={[
              "flex-1 py-3 uppercase tracking-widest transition-all",
              mode === "paid"
                ? "bg-[var(--color-judge)] text-bg"
                : "text-text-secondary hover:text-text-primary",
            ].join(" ")}
          >
            PAID DOCKET
          </button>
          <button
            type="button"
            onClick={() => setMode("free")}
            disabled={freeClaimedToday || !topic}
            className={[
              "flex-1 py-3 uppercase tracking-widest transition-all",
              mode === "free"
                ? "bg-[var(--color-judge)] text-bg"
                : "text-text-secondary hover:text-text-primary",
              freeClaimedToday || !topic ? "opacity-40 cursor-not-allowed" : "",
            ].join(" ")}
          >
            Free Roast {freeClaimedToday ? "✓" : ""}
          </button>
        </div>

        <RoastButton
          persona={persona}
          userInput={inputForRoast}
          isFree={mode === "free"}
          disabled={
            !inputValid || (mode === "free" && (freeClaimedToday || !topic))
          }
          onSuccess={handleSuccess}
        />

        {isConnected && address && (
          <p className="text-center text-xs font-mono text-text-secondary">
            signed in as {truncateAddress(address)}
          </p>
        )}

        {/* Daily Roast Pot Teaser - card style */}
        <div className="rounded-3xl border border-surface-2 bg-surface-1 p-5 flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔥</span>
              <span className="font-mono text-xs uppercase tracking-widest text-yellow-400">
                DAILY ROAST POT
              </span>
            </div>
            <p className="text-[13px] text-text-secondary mt-1 leading-tight">
              Community prize pool • 10¢ roasts fund it • Win daily
            </p>
          </div>
          <Link
            href="/pot"
            className="shrink-0 px-6 py-3 bg-yellow-400 hover:bg-white text-black font-bold text-sm rounded-2xl flex items-center gap-2 transition-all active:scale-95"
          >
            VIEW &amp; FUND
            <span className="text-lg leading-none">→</span>
          </Link>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-surface-1 border-t border-surface-2 px-4 py-2 z-50 safe-area-bottom">
        <div className="flex items-center justify-around text-xs font-mono">
          <Link
            href="/"
            className="flex flex-col items-center gap-1 text-yellow-400"
          >
            <span className="text-2xl">🏠</span>
            <span className="text-[10px]">HOME</span>
          </Link>
          <Link
            href="/pot"
            className="flex flex-col items-center gap-1 text-text-secondary hover:text-text-primary transition"
          >
            <span className="text-2xl">🔥</span>
            <span className="text-[10px]">POT</span>
          </Link>
          <Link
            href="/stats"
            className="flex flex-col items-center gap-1 text-text-secondary hover:text-text-primary transition"
          >
            <span className="text-2xl">📊</span>
            <span className="text-[10px]">STATS</span>
          </Link>
          <Link
            href="/leaderboard"
            className="flex flex-col items-center gap-1 text-text-secondary hover:text-text-primary transition"
          >
            <span className="text-2xl">🏆</span>
            <span className="text-[10px]">LEADERBOARD</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
