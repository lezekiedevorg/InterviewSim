export function RecruiterTile({
  speaking,
  name = "Recruteur",
  initials = "RH",
}: {
  speaking: boolean;
  name?: string;
  initials?: string;
}) {
  return (
    <div
      className={`relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-brand-900 text-white transition-shadow duration-300 ${
        speaking ? "shadow-glow ring-2 ring-brand-400/60" : "shadow-soft"
      }`}
    >
      {/* halo décoratif dans la tuile */}
      <span
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-500/15 blur-2xl"
        aria-hidden
      />
      <div className="flex flex-col items-center gap-3">
        <span className="relative grid place-items-center">
          {/* ondes concentriques quand la voix est active */}
          {speaking && (
            <>
              <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-400/40" aria-hidden />
              <span
                className="absolute inset-0 animate-pulse-ring rounded-full bg-accent-400/30 [animation-delay:.5s]"
                aria-hidden
              />
            </>
          )}
          <span
            className={`grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-2xl font-bold transition-transform duration-300 ${
              speaking ? "scale-110" : "scale-100"
            }`}
          >
            {initials}
          </span>
        </span>
        <span className="flex items-center gap-1.5 text-sm font-medium text-slate-200">
          {name}
          {speaking && (
            <span className="flex items-end gap-0.5 text-brand-300" aria-label="parle">
              <span className="h-2 w-0.5 animate-pulse rounded-full bg-current" />
              <span className="h-3 w-0.5 animate-pulse rounded-full bg-current [animation-delay:.15s]" />
              <span className="h-1.5 w-0.5 animate-pulse rounded-full bg-current [animation-delay:.3s]" />
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
