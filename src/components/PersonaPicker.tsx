"use client";

import {
  PERSONAS,
  PERSONA_LABEL,
  PERSONA_TAGLINE,
  type Persona,
} from "@/lib/prompts";

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
              "min-h-[60px] rounded-2xl border px-3 py-2 text-left transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/70",
              active
                ? "border-ember bg-ember/15 text-bone"
                : "border-bone/15 bg-ink/40 text-bone/80 hover:border-bone/40",
              disabled ? "opacity-50 cursor-not-allowed" : "",
            ].join(" ")}
          >
            <div className="font-display text-base leading-tight">{PERSONA_LABEL[p]}</div>
            <div className="text-[11px] leading-snug text-bone/55 mt-0.5">
              {PERSONA_TAGLINE[p]}
            </div>
          </button>
        );
      })}
    </fieldset>
  );
}
