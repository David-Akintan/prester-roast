"use client";

import { useEffect, useState } from "react";
import { utcDayIndex } from "@/lib/topics";

const TYPE_INTERVAL_MS = 28;

export function Docket({
  topic,
  alreadyClaimed,
}: {
  topic: string;
  alreadyClaimed?: boolean;
}) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      setTyped(topic);
      return;
    }

    setTyped("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(topic.slice(0, i));
      if (i >= topic.length) window.clearInterval(id);
    }, TYPE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [topic]);

  const caseNo = `RC-${utcDayIndex()}`;
  const status = alreadyClaimed ? "FREE ROAST CLAIMED" : "FREE ROAST AVAILABLE";

  return (
    <div className="border border-[var(--color-surface-2)] bg-[var(--color-surface-1)]">
      <div className="flex items-center justify-between border-b border-[var(--color-surface-2)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-secondary)]">
        <span>CASE NO. {caseNo}</span>
        <span>{status}</span>
      </div>
      <div className="px-3 py-3 font-mono text-[11px] uppercase tracking-[0.2em]">
        <span className="text-[var(--color-text-secondary)]">TOPIC:</span>{" "}
        <span className="text-[var(--color-text-primary)] normal-case tracking-normal">
          {typed}
        </span>
        <span
          aria-hidden
          className="caret-blink ml-0.5 text-[var(--color-judge,var(--color-accent-brutal))]"
        >
          ▎
        </span>
      </div>
    </div>
  );
}
