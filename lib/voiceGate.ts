// Porte de parole : distingue une vraie prise de parole d'un pic d'écho.
// feed(rms, now) renvoie true UNE fois, quand le volume est resté au-dessus
// de rmsThreshold pendant au moins sustainMs. Retombe sous le seuil → réarme.
// Aucun accès DOM ni timer : testable en passant `now` explicitement.
export function createVoiceGate(
  rmsThreshold: number,
  sustainMs: number
): { feed(rms: number, now: number): boolean; reset(): void } {
  let aboveSince: number | null = null;
  let fired = false;

  function reset(): void {
    aboveSince = null;
    fired = false;
  }

  function feed(rms: number, now: number): boolean {
    if (rms < rmsThreshold) {
      reset(); // silence → on réarme pour la prochaine prise de parole
      return false;
    }
    if (aboveSince === null) aboveSince = now;
    if (!fired && now - aboveSince >= sustainMs) {
      fired = true; // franchissement : un seul true par salve
      return true;
    }
    return false;
  }

  return { feed, reset };
}
