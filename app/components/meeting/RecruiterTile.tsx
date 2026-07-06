// Onde vocale compacte du recruteur qui parle.
function SpeakingBars() {
  const heights = [14, 9, 15, 7, 12];
  return (
    <span className="flex h-4 items-center gap-[2.5px]" aria-hidden>
      {heights.map((h, i) => (
        <span
          key={i}
          className="w-[3px] origin-center animate-wave rounded-sm bg-amber-400"
          style={{ height: h, animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </span>
  );
}

export function RecruiterTile({
  speaking,
  name = "Recruteur",
  initials = "RH",
  compact = false,
}: {
  speaking: boolean;
  name?: string;
  initials?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative flex w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-[22px] border bg-[linear-gradient(160deg,#142326,#0d181b)] transition-colors duration-300 ${
        compact ? "min-h-[190px] p-4" : "aspect-video min-h-[280px]"
      } ${speaking ? "border-amber-400/80" : "border-cream/15"}`}
    >
      <span className={`relative grid place-items-center ${compact ? "h-16 w-16" : "h-24 w-24"}`}>
        {speaking && (
          <>
            <span className="absolute inset-0 animate-ring rounded-full border-2 border-amber-400/55" aria-hidden />
            <span className="absolute inset-0 animate-ring rounded-full border-2 border-amber-400/40 [animation-delay:.6s]" aria-hidden />
          </>
        )}
        <span
          className={`grid place-items-center rounded-full border-[1.5px] border-amber-400/55 bg-amber-400/15 font-heading font-extrabold text-amber-400 ${
            compact ? "h-16 w-16 text-xl" : "h-24 w-24 text-3xl"
          }`}
        >
          {initials}
        </span>
      </span>
      <div className="flex flex-col items-center gap-2">
        <span className={`font-semibold text-cream ${compact ? "text-sm" : "text-base"}`}>{name}</span>
        {speaking && (
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-amber-400">
            <SpeakingBars />
            {!compact && "En train de parler…"}
          </span>
        )}
      </div>
    </div>
  );
}
