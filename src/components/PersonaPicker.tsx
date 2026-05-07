"use client";

import {
  PERSONAS,
  PERSONA_LABEL,
  PERSONA_TAGLINE,
  type Persona,
} from "@/lib/prompts";
import {
  PERSONA_ACCENT,
  PERSONA_BURN,
  PERSONA_GLYPH,
} from "@/lib/persona-theme";

const MAX_BURN = 5;

function burnGlyphs(level: number) {
  return "▮".repeat(level) + "▯".repeat(MAX_BURN - level);
}

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
        const accent = PERSONA_ACCENT[p];
        const activeStyle: React.CSSProperties = active
          ? {
              borderColor: accent,
              boxShadow: `0 0 0 1px ${accent}, 0 0 24px -4px ${accent}`,
            }
          : {};
        return (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => onChange(p)}
            aria-pressed={active}
            style={activeStyle}
            className={[
              "group relative min-h-[100px] rounded-none border px-3 py-3 text-left transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]",
              active
                ? "bg-[var(--color-surface-1)] text-[var(--color-text-primary)]"
                : "border-[var(--color-surface-2)] bg-[var(--color-surface-1)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
              !active ? "[filter:grayscale(0.85)_opacity(0.7)] hover:[filter:none]" : "",
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
                active
                  ? "text-[var(--color-text-primary)]/80"
                  : "text-[var(--color-text-secondary)]",
              ].join(" ")}
            >
              {PERSONA_TAGLINE[p]}
            </div>
            <div className="mt-2.5 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
              <span>BURN </span>
              <span style={{ color: active ? accent : undefined }}>
                {burnGlyphs(PERSONA_BURN[p])}
              </span>
            </div>
          </button>
        );
      })}
    </fieldset>
  );
}
