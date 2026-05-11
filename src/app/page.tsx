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
    <main
      className="mx-auto max-w-md px-4 py-6 sm:py-10 space-y-6 fade-in-up"
      style={{
        ["--color-judge" as string]: PERSONA_ACCENT[persona],
        ["--color-judge-deep" as string]: PERSONA_ACCENT_DEEP[persona],
      }}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span aria-hidden className="text-[var(--color-text-primary)] text-xl leading-none">⚖</span>
            <h1
              className={[
                "font-display text-3xl tracking-tight leading-none text-[var(--color-text-primary)]",
                persona === "brutal" ? "glitch" : "",
              ].join(" ")}
            >
              Roast Court
            </h1>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-text-secondary)] mt-2">
            AI judge · onchain · 10¢
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
          <StreakBadge user={address} />
          <ConnectWallet />
          <OpenInMiniPayButton />
        </div>
      </header>

      {topic ? (
        <Docket topic={topic.topic} alreadyClaimed={freeClaimedToday} />
      ) : topErr ? (
        <p className="text-xs font-mono text-red-300 px-3 py-2 rounded-none border border-red-500/60 bg-red-500/10">
          Daily topic unavailable: {topErr}
        </p>
      ) : (
        <div
          aria-hidden
          className="h-[68px] rounded-none border border-[var(--color-surface-2)] bg-[var(--color-surface-1)] animate-pulse"
        />
      )}

      <section className="space-y-3">
        <label className="block text-[11px] uppercase tracking-[0.2em] font-mono text-[var(--color-text-secondary)]">
          The Bench
        </label>
        <PersonaPicker value={persona} onChange={setPersona} />
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="roast-input"
            className="block text-[11px] uppercase tracking-[0.2em] font-mono text-[var(--color-text-secondary)]"
          >
            Evidence
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
              ? "Reply to today's topic — keep it under 280 chars."
              : "Submit your evidence. Tweet, code, CV, hot take — whatever you want judged."
          }
          rows={4}
          className="evidence-inset w-full resize-none rounded-none border border-[var(--color-surface-2)] bg-[var(--color-surface-1)] px-4 py-3 font-mono text-sm leading-relaxed text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/60 focus:outline-none focus:border-[var(--color-judge)] focus:ring-2 focus:ring-[var(--color-judge)]/40 transition-all"
        />
      </section>

      <div className="flex gap-0 rounded-none bg-[var(--color-surface-1)] border border-[var(--color-surface-2)] text-sm font-mono">
        <button
          type="button"
          onClick={() => setMode("paid")}
          className={[
            "flex-1 min-h-[40px] rounded-none px-3 uppercase tracking-[0.15em] transition-all border-r border-[var(--color-surface-2)]",
            mode === "paid"
              ? "bg-[var(--color-judge)] text-[var(--color-bg)]"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
          ].join(" ")}
        >
          Paid Docket
        </button>
        <button
          type="button"
          onClick={() => setMode("free")}
          disabled={freeClaimedToday || !topic}
          className={[
            "flex-1 min-h-[40px] rounded-none px-3 uppercase tracking-[0.15em] transition-all",
            mode === "free"
              ? "bg-[var(--color-judge)] text-[var(--color-bg)]"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            freeClaimedToday || !topic ? "opacity-40 cursor-not-allowed" : "",
          ].join(" ")}
        >
          Pro Bono 1×/day {freeClaimedToday ? "✓" : ""}
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
        <p className="text-center text-xs font-mono text-[var(--color-text-secondary)]">
          signed in as {truncateAddress(address)}
        </p>
      )}

      {/* Daily Roast Pot Teaser — links to the new /pot page */}
      <div className="rounded-none border border-[var(--color-surface-2)] bg-[var(--color-surface-1)] p-5 flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-yellow-400">
              DAILY ROAST POT
            </span>
          </div>
          <p className="text-[13px] text-[var(--color-text-secondary)] mt-1 leading-tight">
            Community prize pool • 10¢ roasts fund it • Win daily
          </p>
        </div>
        
        <Link
          href="/pot"
          className="shrink-0 px-6 py-3 bg-yellow-400 hover:bg-white text-black font-bold text-sm rounded-none flex items-center gap-2 transition-all active:scale-95"
        >
          VIEW &amp; FUND
          <span className="text-lg leading-none">→</span>
        </Link>
      </div>

      <footer className="pt-6 border-t border-[var(--color-surface-2)] text-center text-[11px] font-mono text-[var(--color-text-secondary)] space-x-3 uppercase tracking-[0.15em]">
        <Link href="/stats" className="hover:text-[var(--color-text-primary)] transition">
          /stats
        </Link>
        <Link href="/leaderboard" className="hover:text-[var(--color-text-primary)] transition">
          /leaderboard
        </Link>
        <Link href="/about" className="hover:text-[var(--color-text-primary)] transition">
          /about
        </Link>
      </footer>
    </main>
  );
}
