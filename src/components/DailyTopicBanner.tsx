"use client";

export function DailyTopicBanner({
  topic,
  alreadyClaimed,
}: {
  topic: string;
  alreadyClaimed?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-ember/90 font-mono">
          Today's free roast
        </div>
        {alreadyClaimed ? (
          <div className="text-[10px] uppercase tracking-[0.2em] text-bone/50 font-mono">
            Claimed
          </div>
        ) : (
          <div className="text-[10px] uppercase tracking-[0.2em] text-bone/70 font-mono">
            One per wallet
          </div>
        )}
      </div>
      <div className="font-display text-lg leading-snug mt-1">{topic}</div>
    </div>
  );
}
