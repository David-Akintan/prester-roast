// Groq provider — 1st in the fallback chain.
// Pattern source: c:\Users\akint\Documents\prester\backend\src\services\judges\groqJudge.ts
// Model: llama-3.3-70b-versatile (Prester's choice; fast, free-tier-generous,
// genuinely funny, native JSON mode).

import Groq from "groq-sdk";
import {
  JudgeAuthError,
  JudgeRateLimitError,
  JudgeServerError,
  type JudgeArgs,
  type JudgeProvider,
  type RoastVerdict,
} from "./types";
import { buildPrompt, parseJudgeResponse } from "./parse";

const MODEL = "llama-3.3-70b-versatile";

let cached: Groq | null = null;
function client(): Groq {
  if (cached) return cached;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY missing");
  cached = new Groq({ apiKey });
  return cached;
}

async function attempt(args: JudgeArgs): Promise<RoastVerdict> {
  const prompt = buildPrompt(args);
  let res;
  try {
    res = await client().chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.95,
      max_tokens: 500,
    });
  } catch (e) {
    // groq-sdk surfaces an APIError with a numeric status field
    const err = e as { status?: number; message?: string };
    if (err.status === 401 || err.status === 403) {
      throw new JudgeAuthError("groq", err.message ?? "unauthorized");
    }
    if (err.status === 429) {
      throw new JudgeRateLimitError("groq", err.message ?? "rate limited");
    }
    if (err.status && err.status >= 500) {
      throw new JudgeServerError("groq", err.status, err.message ?? "server error");
    }
    throw e instanceof Error ? e : new Error(String(e));
  }

  const text = res.choices[0]?.message?.content ?? "";
  return parseJudgeResponse(text, "groq");
}

export const groqJudge: JudgeProvider = {
  name: "groq",
  isConfigured: () => Boolean(process.env.GROQ_API_KEY),
  attempt,
};
