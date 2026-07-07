// Signature « Studio nuit » : onde vocale en barres ambre animées.
// Motif déterministe (sinusoïde) — rend pareil côté serveur et client.
export function VoiceWave({ bars = 26, height = 52 }: { bars?: number; height?: number }) {
  const scale = height / 52;
  return (
    <div
      aria-hidden
      className="flex items-center justify-center gap-[5px]"
      style={{ height }}
    >
      {Array.from({ length: bars }, (_, i) => {
        const s = Math.abs(Math.sin(i * 0.55 + 0.4));
        return (
          <div
            key={i}
            className="w-1 origin-center animate-wave rounded-[3px] bg-amber-400"
            style={{
              height: Math.round((10 + 38 * s) * scale),
              opacity: 0.55 + 0.45 * s,
              animationDelay: `${(i * 0.06).toFixed(2)}s`,
              animationDuration: "1.3s",
            }}
          />
        );
      })}
    </div>
  );
}
