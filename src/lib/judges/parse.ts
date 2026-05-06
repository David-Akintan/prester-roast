// Shared JSON parser for judge responses. Patterns mirror Prester's
// backend/src/services/judges/parse.ts:
//   - strip markdown code fences (Anthropic loves wrapping in ```json)
//   - one-shot truncation repair (max_tokens cuts can lose the closing brace)
//   - validate against shared VerdictSchema
//
// Throws JudgeParseError on hard failure so the orchestrator can advance to
// the next provider.

import { VerdictSchema, JudgeParseError, type JudgeName, type RoastVerdict } from "./types";

const FENCE_RE = /^\s*```(?:json)?\s*\n?|\n?\s*```\s*$/gi;

function stripFences(s: string): string {
  return s.replace(FENCE_RE, "").trim();
}

// Attempt to repair a JSON string that was truncated mid-write.
// Heuristic: balance braces/brackets/quotes by appending closers.
function tryRepair(s: string): string {
  let result = s;
  // Balance quotes first — odd count means we're inside a string
  const quoteCount = (result.match(/"/g) ?? []).length;
  if (quoteCount % 2 === 1) result += '"';
  // Balance brackets
  const open = (result.match(/\{/g) ?? []).length;
  const close = (result.match(/\}/g) ?? []).length;
  if (open > close) result += "}".repeat(open - close);
  return result;
}

export function parseJudgeResponse(raw: string, provider: JudgeName): RoastVerdict {
  const cleaned = stripFences(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    try {
      parsed = JSON.parse(tryRepair(cleaned));
    } catch {
      throw new JudgeParseError(provider, raw);
    }
  }

  const validated = VerdictSchema.safeParse(parsed);
  if (!validated.success) throw new JudgeParseError(provider, raw);
  return validated.data;
}

// Build the persona-aware prompt sent to every provider. Kept here (not
// duplicated per file) so prompt drift between providers is impossible.
import { PERSONA_PROMPTS, type Persona } from "@/lib/prompts";

export function buildPrompt(args: { persona: Persona; userInput: string; dailyTopic?: string }): string {
  const userBlock = args.dailyTopic
    ? `Daily topic: "${args.dailyTopic}"\n\nUser's submission:\n${args.userInput}`
    : `User's submission:\n${args.userInput}`;

  return `${PERSONA_PROMPTS[args.persona]}

Return ONLY a JSON object of shape:
{
  "roast": <string, 20–500 chars, the roast itself>,
  "severity": <integer 1–10, how hard you went>
}

${userBlock}`;
}
