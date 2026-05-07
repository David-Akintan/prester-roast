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
        "lift relative rounded-none border-2 px-4 py-3.5 overflow-hidden",
        "before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1",
        alreadyClaimed
          ? "border-[#262626] bg-[#161618] before:bg-[#404040]"
          : "border-ember bg-gradient-to-r from-[#161618] via-[#1a0e0a] to-[#161618] before:bg-ember glow-ember",
      ].join(" ")}
    >
      {/* subtle decorative scribble in the corner */}
      <div
        aria-hidden
        className={[
          "absolute -right-6 -top-6 size-24 rounded-full blur-3xl",
          alreadyClaimed ? "bg-bone/[0.03]" : "bg-ember/20",
        ].join(" ")}
      />

      <div className="relative flex items-baseline justify-between gap-3 pl-2">
        <div className="text-[10px] uppercase tracking-[0.25em] font-mono">
          <span className={alreadyClaimed ? "text-bone/55" : "text-ember"}>
            ▲ Today's free roast
          </span>
        </div>
        <div className="text-[10px] uppercase tracking-[0.25em] font-mono">
          {alreadyClaimed ? (
            <span className="text-bone/45">✓ claimed</span>
          ) : (
            <span className="text-bone/55">one per wallet</span>
          )}
        </div>
      </div>

      <p className="relative font-display italic text-xl leading-snug mt-1.5 text-bone pl-2">
        {topic}
      </p>
    </div>
  );
}
