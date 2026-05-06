// Compatibility shim — keeps the old `@/lib/judge` import path working.
// The implementation moved to `./judges/` to support the multi-provider
// fallback chain (Groq → Gemini → Anthropic).

export { generateRoast, AllJudgesExhaustedError } from "./judges";
export type { RoastVerdict, JudgeName, RoastResult } from "./judges";
