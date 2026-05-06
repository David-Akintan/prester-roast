// Anthropic provider — 3rd (final) fallback. Pattern source:
// c:\Users\akint\Documents\prester\backend\src\services\judges\claudeJudge.ts
// Deviation: Prester uses claude-sonnet-4-20250514. We use Haiku 4.5 — roast
// generation is creative-not-analytical, doesn't need Sonnet's reasoning
// depth, and this leg only fires when Groq AND Gemini are both down.

import Anthropic from "@anthropic-ai/sdk";
import {
  JudgeAuthError,
  JudgeRateLimitError,
  JudgeServerError,
  JudgeParseError,
  type JudgeArgs,
  type JudgeProvider,
  type RoastVerdict,
} from "./types";
import { buildPrompt, parseJudgeResponse } from "./parse";

const MODEL = "claude-haiku-4-5-20251001";

let cached: Anthropic | null = null;
function client(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing");
  cached = new Anthropic({ apiKey });
  return cached;
}

async function attempt(args: JudgeArgs): Promise<RoastVerdict> {
  const prompt = buildPrompt(args);

  let res;
  try {
    res = await client().messages.create({
      model: MODEL,
      max_tokens: 500,
      temperature: 0.95,
      messages: [{ role: "user", content: prompt }],
      // Prefill nudges Claude to start emitting JSON immediately (no
      // preamble like "Sure, here's your roast:").
      // The prefilled "{" is part of the assistant turn — we add it back
      // before parsing.
    });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    if (err.status === 401 || err.status === 403) {
      throw new JudgeAuthError("anthropic", err.message ?? "unauthorized");
    }
    if (err.status === 429) {
      throw new JudgeRateLimitError("anthropic", err.message ?? "rate limited");
    }
    if (err.status && err.status >= 500) {
      throw new JudgeServerError("anthropic", err.status, err.message ?? "server error");
    }
    throw e instanceof Error ? e : new Error(String(e));
  }

  // Anthropic returns content as an array of blocks; first text block wins.
  const textBlock = res.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new JudgeParseError("anthropic", JSON.stringify(res.content).slice(0, 200));
  }
  return parseJudgeResponse(textBlock.text, "anthropic");
}

export const anthropicJudge: JudgeProvider = {
  name: "anthropic",
  isConfigured: () => Boolean(process.env.ANTHROPIC_API_KEY),
  attempt,
};
