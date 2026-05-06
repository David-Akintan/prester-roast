// Orchestrator — sequential fallback chain across configured providers.
// Order: Groq → Gemini → Anthropic (cheapest-first).
//
// Deviation from Prester (which runs all 3 in parallel via Promise.allSettled
// for multi-judge consensus): we want resilience, not voting. One successful
// verdict ends the chain. This is cheaper at steady-state — we don't pay
// three providers per roast — and faster when the primary is healthy.

import {
  AllJudgesExhaustedError,
  JudgeAuthError,
  JudgeTimeoutError,
  type JudgeArgs,
  type JudgeName,
  type JudgeProvider,
  type RoastVerdict,
} from "./types";
import { groqJudge } from "./groq";
import { geminiJudge } from "./gemini";
import { anthropicJudge } from "./anthropic";

const PROVIDER_ORDER: JudgeProvider[] = [groqJudge, geminiJudge, anthropicJudge];
const PER_PROVIDER_TIMEOUT_MS = 10_000;

function withTimeout<T>(p: Promise<T>, ms: number, name: JudgeName): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new JudgeTimeoutError(name, ms)), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

export interface RoastResult extends RoastVerdict {
  provider: JudgeName;
  attempts: Array<{ provider: JudgeName; ok: boolean; ms: number; error?: string }>;
}

export async function generateRoast(args: JudgeArgs): Promise<RoastResult> {
  const chain = PROVIDER_ORDER.filter((p) => p.isConfigured());
  if (chain.length === 0) {
    throw new Error("No judge providers configured — set GROQ_API_KEY, GEMINI_API_KEY, or ANTHROPIC_API_KEY");
  }

  const attempts: RoastResult["attempts"] = [];

  for (const provider of chain) {
    const start = Date.now();
    try {
      const verdict = await withTimeout(provider.attempt(args), PER_PROVIDER_TIMEOUT_MS, provider.name);
      const ms = Date.now() - start;
      attempts.push({ provider: provider.name, ok: true, ms });
      console.info(
        JSON.stringify({ judge: provider.name, ok: true, ms, severity: verdict.severity }),
      );
      return { ...verdict, provider: provider.name, attempts };
    } catch (e) {
      const ms = Date.now() - start;
      const err = e instanceof Error ? e : new Error(String(e));
      attempts.push({ provider: provider.name, ok: false, ms, error: `${err.name}: ${err.message}` });
      console.warn(
        JSON.stringify({ judge: provider.name, ok: false, ms, errClass: err.name, msg: err.message }),
      );

      // Auth errors are config bugs (wrong key, revoked) — keep going down
      // the chain but don't bail entirely; another provider may work.
      // For ANY other error class we also continue. We are permissive here:
      // the user-facing UX is "maybe try again later"; better to attempt all
      // providers than to die on a transient hiccup.
      if (err instanceof JudgeAuthError) continue;
      continue;
    }
  }

  // Chain exhausted
  throw new AllJudgesExhaustedError(
    attempts.map((a) => ({ provider: a.provider, error: a.error ?? "unknown" })),
  );
}

// Re-export types for convenience at call sites
export type { RoastVerdict, JudgeName } from "./types";
export { AllJudgesExhaustedError } from "./types";
