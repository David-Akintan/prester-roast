import type { Persona } from "./prompts";

export const PERSONA_ACCENT: Record<Persona, string> = {
  brutal: "#FF453A",
  wholesome: "#32D74B",
  corporate: "#5E5CE6",
};

export const PERSONA_ACCENT_DEEP: Record<Persona, string> = {
  brutal: "#B5261E",
  wholesome: "#1F8F30",
  corporate: "#3F3DB5",
};

export const PERSONA_BURN: Record<Persona, number> = {
  brutal: 5,
  wholesome: 1,
  corporate: 3,
};

export const PERSONA_GLYPH: Record<Persona, string> = {
  brutal: "🔥",
  wholesome: "🌱",
  corporate: "📊",
};
