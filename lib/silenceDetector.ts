// Détecteur de fin de tour : déclenche onFire après un silence (aucun bump pendant delayMs),
// à condition que le dernier texte reçu soit non vide. Aucun accès DOM (testable avec faux timers).
export function createSilenceDetector(
  delayMs: number,
  onFire: (text: string) => void
): { bump(text: string): void; cancel(): void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastText = "";

  function cancel(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function bump(text: string): void {
    lastText = text;
    cancel();
    timer = setTimeout(() => {
      timer = null;
      if (lastText.trim() !== "") onFire(lastText);
    }, delayMs);
  }

  return { bump, cancel };
}
