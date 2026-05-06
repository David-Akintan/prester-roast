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
    <fieldset className="grid grid-cols-3 gap-2" aria-label="Pick a judge persona">
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
              "group relative min-h-[76px] rounded-2xl border px-3 py-3 text-left",
              "transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
              active
                ? "border-ember/90 bg-ember/15 text-bone shadow-[inset_0_0_0_1px_rgba(255,138,76,0.4)]"
                : "border-bone/10 bg-ink-2/40 text-bone/75 hover:border-bone/30 hover:bg-ink-2/60 hover:text-bone",
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
