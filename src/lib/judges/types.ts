import { z } from "zod";
import type { Persona } from "@/lib/prompts";

// Shared verdict schema — every provider must produce output that parses to this.
// Identical to the old single-Gemini schema so call-sites and IPFS payloads
// remain unchanged.
export const VerdictSchema = z.object({
  roast: z.string().min(20).max(500),
  severity: z.number().int().min(1).max(10),
});

export type RoastVerdict = z.infer<typeof VerdictSchema>;

export interface JudgeArgs {
  persona: Persona;
  userInput: string;
  dailyTopic?: string;
}

export type JudgeName = "groq" | "gemini" | "anthropic";

export interface JudgeProvider {
  name: JudgeName;
  isConfigured(): boolean;
  attempt(args: JudgeArgs): Promise<RoastVerdict>;
}

// Errors the orchestrator distinguishes when deciding whether to advance.
// Anything else: log + advance (be permissive — better to try the next
// provider than to bubble up an unknown failure).

export class JudgeAuthError extends Error {
  constructor(provider: JudgeName, msg: string) {
    super(`${provider}: auth — ${msg}`);
    this.name = "JudgeAuthError";
  }
}

export class JudgeRateLimitError extends Error {
  constructor(provider: JudgeName, msg: string) {
    super(`${provider}: rate-limited — ${msg}`);
    this.name = "JudgeRateLimitError";
  }
}

export class JudgeTimeoutError extends Error {
  constructor(provider: JudgeName, ms: number) {
    super(`${provider}: timed out after ${ms}ms`);
    this.name = "JudgeTimeoutError";
  }
}

export class JudgeServerError extends Error {
  constructor(provider: JudgeName, status: number, msg: string) {
    super(`${provider}: ${status} — ${msg}`);
    this.name = "JudgeServerError";
  }
}

export class JudgeParseError extends Error {
  constructor(provider: JudgeName, raw: string) {
    super(`${provider}: response failed schema (raw: ${raw.slice(0, 120)})`);
    this.name = "JudgeParseError";
  }
}

export class AllJudgesExhaustedError extends Error {
  constructor(public attempts: Array<{ provider: JudgeName; error: string }>) {
    super(`All ${attempts.length} judge providers failed`);
    this.name = "AllJudgesExhaustedError";
  }
}
