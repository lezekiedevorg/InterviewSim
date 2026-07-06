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
      className={`relative flex w-full overflow-hidden border bg-[linear-gradient(160deg,#142326,#0d181b)] transition-colors duration-300 ${
        compact
          ? // mobile : ligne horizontale (avatar · nom · onde) ; tablette+ : colonne
            "flex-row items-center gap-3 rounded-2xl p-3 sm:min-h-[190px] sm:flex-col sm:justify-center sm:gap-3 sm:rounded-[22px] sm:p-4"
          : "aspect-video min-h-[280px] flex-col items-center justify-center gap-3 rounded-[22px]"
      } ${speaking ? "border-amber-400/80" : "border-cream/15"}`}
    >
      <span className={`relative grid shrink-0 place-items-center ${compact ? "h-[52px] w-[52px] sm:h-16 sm:w-16" : "h-24 w-24"}`}>
        {speaking && (
          <>
            <span className="absolute inset-0 animate-ring rounded-full border-2 border-amber-400/55" aria-hidden />
            <span className="absolute inset-0 animate-ring rounded-full border-2 border-amber-400/40 [animation-delay:.6s]" aria-hidden />
          </>
        )}
        <span
          className={`grid h-full w-full place-items-center rounded-full border-[1.5px] border-amber-400/55 bg-amber-400/15 font-heading font-extrabold text-amber-400 ${
            compact ? "text-base sm:text-xl" : "text-3xl"
          }`}
        >
          {initials}
        </span>
      </span>
      <div className={`flex min-w-0 gap-2 ${compact ? "flex-1 flex-row items-center justify-between sm:flex-none sm:flex-col sm:items-center sm:justify-center" : "flex-col items-center"}`}>
        <span className={`truncate font-semibold text-cream ${compact ? "text-sm" : "text-base"}`}>{name}</span>
        {speaking && (
          <span className="flex shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-amber-400">
            <SpeakingBars />
            {!compact && <span className="hidden sm:inline">En train de parler…</span>}
          </span>
        )}
      </div>
    </div>
  );
}
