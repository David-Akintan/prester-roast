"use client";

export function DailyTopicBanner({
  topic,
  alreadyClaimed,
}: {
  topic: string;
  alreadyClaimed?: boolean;
}) {
  return (
    <div
      className={[
        "relative rounded-2xl border px-4 py-3.5 overflow-hidden",
        "transition-colors",
        alreadyClaimed
          ? "border-bone/10 bg-ink-2/40"
          : "border-ember/30 bg-ember/[0.07]",
      ].join(" ")}
    >
      {/* subtle decorative scribble in the corner */}
      <div
        aria-hidden
        className={[
          "absolute -right-6 -top-6 size-24 rounded-full blur-2xl",
          alreadyClaimed ? "bg-bone/[0.03]" : "bg-ember/15",
        ].join(" ")}
      />

      <div className="relative flex items-baseline justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.22em] font-mono">
          <span className={alreadyClaimed ? "text-bone/45" : "text-ember/90"}>
            Today's free roast
          </span>
        </div>
        <div className="text-[10px] uppercase tracking-[0.22em] font-mono">
          {alreadyClaimed ? (
            <span className="text-bone/45">✓ claimed</span>
          ) : (
            <span className="text-bone/55">one per wallet</span>
          )}
        </div>
      </div>

      <p className="relative font-display italic text-xl leading-snug mt-1.5 text-bone">
        {topic}
      </p>
    </div>
  );
}
