// Micro-réactions jouées à l'instant où le recruteur commence à « réfléchir » (streaming),
// pour masquer le blanc avant sa vraie réponse. Volontairement NON lexicales et courtes :
// le prompt fait déjà démarrer le texte par une réaction (« Ok, d'accord ») — un « Mmh »
// bref se superpose naturellement (« mmh… ok alors ») sans faire doublon. Pool + tirage
// aléatoire pour éviter le tic (cf. l'ancien « Venons-en au fait »).
export const FILLERS = ["Mmh.", "Hmm.", "Mmh mmh.", "Hm, d'accord."];

export function pickFiller(rand: () => number = Math.random): string {
  return FILLERS[Math.floor(rand() * FILLERS.length)];
}

// Faut-il jouer un filler ? Uniquement au front montant de `streaming` (une fois par tour),
// en solo (jury = plusieurs voix, on ne sait pas qui parlera → plus tard), audible, moteur prêt,
// et seulement en RÉPONSE à une prise de parole du candidat (pas sur la question d'ouverture).
export function shouldFill(o: {
  streaming: boolean;
  prevStreaming: boolean;
  jury: boolean;
  muted: boolean;
  ready: boolean;
  hasCandidateTurn: boolean;
}): boolean {
  return (
    o.streaming &&
    !o.prevStreaming &&
    !o.jury &&
    !o.muted &&
    o.ready &&
    o.hasCandidateTurn
  );
}
