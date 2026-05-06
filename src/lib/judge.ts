import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { PERSONA_PROMPTS, type Persona } from "./prompts";

// Gemini judge — mirrors Prester's geminiJudge.ts pattern.
// Same SDK, same model, same JSON-mode discipline; only the schema
// and prompt differ (verdict → roast).

const VerdictSchema = z.object({
  roast: z.string().min(20).max(500),
  severity: z.number().int().min(1).max(10),
});

export type RoastVerdict = z.infer<typeof VerdictSchema>;

export async function generateRoast(args: {
  persona: Persona;
  userInput: string;
  dailyTopic?: string;
}): Promise<RoastVerdict> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 500,
      temperature: 0.95,
    },
  });

  const systemPrompt = PERSONA_PROMPTS[args.persona];
  const userBlock = args.dailyTopic
    ? `Daily topic: "${args.dailyTopic}"\n\nUser's submission:\n${args.userInput}`
    : `User's submission:\n${args.userInput}`;

  const prompt = `${systemPrompt}

Return ONLY a JSON object of shape:
{
  "roast": <string, ≤500 chars, the roast itself>,
  "severity": <integer 1–10, how hard you went>
}

${userBlock}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Gemini returned non-JSON: ${text.slice(0, 200)}`);
  }
  return VerdictSchema.parse(parsed);
}
