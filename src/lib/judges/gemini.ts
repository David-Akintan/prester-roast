// Gemini provider — 2nd in the fallback chain. Extracted from the
// previous monolithic judge.ts. Pattern source:
// c:\Users\akint\Documents\prester\backend\src\services\judges\geminiJudge.ts

import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  JudgeAuthError,
  JudgeRateLimitError,
  JudgeServerError,
  type JudgeArgs,
  type JudgeProvider,
  type RoastVerdict,
} from "./types";
import { buildPrompt, parseJudgeResponse } from "./parse";

const MODEL = "gemini-2.5-flash";

let cached: GoogleGenerativeAI | null = null;
function client(): GoogleGenerativeAI {
  if (cached) return cached;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY missing");
  cached = new GoogleGenerativeAI(apiKey);
  return cached;
}

async function attempt(args: JudgeArgs): Promise<RoastVerdict> {
  const model = client().getGenerativeModel({
    model: MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 500,
      temperature: 0.95,
    },
  });

  const prompt = buildPrompt(args);

  let raw: string;
  try {
    const result = await model.generateContent(prompt);
    raw = result.response.text();
  } catch (e) {
    // The Google SDK throws plain Error with a `.status` HTTP code embedded
    // in the message for some failures; we string-sniff what we can.
    const err = e as { status?: number; message?: string };
    const msg = err.message ?? String(e);
    if (err.status === 401 || err.status === 403 || /api key|unauthorized|permission/i.test(msg)) {
      throw new JudgeAuthError("gemini", msg);
    }
    if (err.status === 429 || /quota|rate.?limit/i.test(msg)) {
      throw new JudgeRateLimitError("gemini", msg);
    }
    if (err.status && err.status >= 500) {
      throw new JudgeServerError("gemini", err.status, msg);
    }
    throw e instanceof Error ? e : new Error(String(e));
  }

  return parseJudgeResponse(raw, "gemini");
}

export const geminiJudge: JudgeProvider = {
  name: "gemini",
  isConfigured: () => Boolean(process.env.GEMINI_API_KEY),
  attempt,
};
