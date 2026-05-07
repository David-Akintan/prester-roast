"use client";

import {
  PERSONAS,
  PERSONA_LABEL,
  PERSONA_TAGLINE,
  type Persona,
} from "@/lib/prompts";

const PERSONA_GLYPH: Record<Persona, string> = {
  brutal: "🔥",
  wholesome: "🌱",
  corporate: "📊",
};

export function PersonaPicker({
  value,
  onChange,
  disabled,
}: {
  value: Persona;
  onChange: (p: Persona) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="grid grid-cols-3 gap-2.5" aria-label="Pick a judge persona">
      {PERSONAS.map((p) => {
        const active = p === value;
        return (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => onChange(p)}
            aria-pressed={active}
            className={[
              "lift group relative min-h-[88px] rounded-none border-2 px-3 py-3 text-left backdrop-blur-[5px]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0b]",
              active
                ? "border-ember bg-[#161618]/60 text-bone glow-ember"
                : "border-[#262626] bg-[#161618]/50 text-bone/75 hover:border-[#404040] hover:bg-[#161618]/70 hover:text-bone",
              disabled ? "opacity-50 cursor-not-allowed" : "",
            ].join(" ")}
          >
            <div className="flex items-baseline gap-1.5">
              <span aria-hidden className="text-sm leading-none">
                {PERSONA_GLYPH[p]}
              </span>
              <span className="font-display text-base leading-none">
                {PERSONA_LABEL[p]}
              </span>
            </div>
            <div
              className={[
                "text-[10px] leading-snug mt-1.5 font-mono",
                active ? "text-bone/70" : "text-bone/45",
              ].join(" ")}
            >
              {PERSONA_TAGLINE[p]}
            </div>
          </button>
        );
      })}
    </fieldset>
  );
}
