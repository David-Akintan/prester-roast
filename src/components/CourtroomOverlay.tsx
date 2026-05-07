"use client";

import { useEffect, useState } from "react";

export type OverlayPhase = "judging" | "approving" | "roasting" | "done";

const PHASE_LINES: Record<OverlayPhase, string[]> = {
  judging: ["> SWEARING IN THE AI...", "> READING THE EVIDENCE..."],
  approving: ["> AUTHORIZING COURT FEES (cUSD)..."],
  roasting: ["> JURY DELIBERATING ON-CHAIN...", "> SEALING THE VERDICT..."],
  done: ["> COURT ADJOURNED. OPENING DOCKET..."],
};

const STAGGER_MS = 200;

export function CourtroomOverlay({ phase }: { phase: OverlayPhase | null }) {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    if (!phase) {
      setHistory([]);
      return;
    }
    const lines = PHASE_LINES[phase];
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    setHistory((h) => {
      const merged = [...h];
      if (reduced) {
        for (const l of lines) if (!merged.includes(l)) merged.push(l);
        return merged;
      }
      // Append lines progressively for the new phase only
      return merged;
    });

    if (reduced) return;

    let cancelled = false;
    (async () => {
      for (let i = 0; i < lines.length; i++) {
        if (cancelled) return;
        const line = lines[i];
        setHistory((h) => (h.includes(line) ? h : [...h, line]));
        await new Promise((r) => setTimeout(r, STAGGER_MS));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase]);

  if (!phase) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{
        background: "rgba(10, 10, 10, 0.85)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div className="w-full max-w-md border border-[var(--color-surface-2)] bg-[var(--color-surface-1)] p-5">
        <div className="mb-3 flex items-center justify-between border-b border-[var(--color-surface-2)] pb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-secondary)]">
          <span>COURTROOM</span>
          <span className="text-[var(--color-judge,var(--color-accent-brutal))]">
            ● IN SESSION
          </span>
        </div>
        <ul className="space-y-1 font-mono text-[12px] leading-relaxed text-[var(--color-text-primary)]">
          {history.map((line, idx) => {
            const last = idx === history.length - 1;
            return (
              <li key={`${line}-${idx}`} className="log-line-in">
                <span>{line}</span>
                {last && (
                  <span
                    aria-hidden
                    className="caret-blink ml-1 text-[var(--color-judge,var(--color-accent-brutal))]"
                  >
                    ▎
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
