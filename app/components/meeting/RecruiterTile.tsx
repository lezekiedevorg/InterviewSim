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
    <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-soft">
      {speaking && (
        <span className="absolute inset-0 animate-pulse rounded-2xl ring-4 ring-brand-500/50" aria-hidden />
      )}
      <div className="flex flex-col items-center gap-3">
        <span
          className={`grid h-20 w-20 place-items-center rounded-full bg-brand-600 text-2xl font-bold transition-transform ${
            speaking ? "scale-110" : "scale-100"
          }`}
        >
          {initials}
        </span>
        <span className="text-sm font-medium text-slate-200">
          {name} {speaking && <span className="text-brand-300">· parle…</span>}
        </span>
      </div>
    </div>
  );
}
