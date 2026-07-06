import type { ChatMessage, CritereId, CritereNote } from "./types";

// La grille de notation — source de vérité unique (prompt, calcul et affichage la consomment).
export const CRITERES: { id: CritereId; label: string; poids: number }[] = [
  { id: "structure", label: "Structure des réponses", poids: 20 },
  { id: "concret", label: "Concret & chiffres", poids: 25 },
  { id: "adequation", label: "Adéquation au poste", poids: 20 },
  { id: "communication", label: "Communication", poids: 15 },
  { id: "pression", label: "Réaction sous pression", poids: 20 },
];

// Anti-complaisance : une note sans citation-preuve ne peut pas dépasser ce plafond.
export const PLAFOND_SANS_PREUVE = 40;

// Sous ce nombre de réponses du candidat, l'entretien n'est pas notable.
export const MIN_REPONSES = 3;

// Borne la note dans [0, 100] et applique le plafond « pas de preuve ».
export function capNote(note: number, preuve: string): number {
  const bornee = Math.max(0, Math.min(100, Math.round(note)));
  return preuve.trim() === "" ? Math.min(bornee, PLAFOND_SANS_PREUVE) : bornee;
}

// Score global = moyenne pondérée des 5 critères. C'est NOTRE code qui calcule,
// jamais le modèle (il ne peut plus « offrir » un global incohérent avec son détail).
// Défenses : en cas d'IDs dupliqués la PREMIÈRE occurrence gagne ; chaque note est
// re-bornée dans [0, 100] même si l'appelant a oublié capNote.
export function computeScore(criteres: CritereNote[]): number {
  let total = 0;
  for (const c of CRITERES) {
    const trouve = criteres.find((x) => x.id === c.id);
    const note = trouve ? Math.max(0, Math.min(100, trouve.note)) : 0;
    total += note * c.poids;
  }
  return Math.round(total / 100);
}

// Moins de MIN_REPONSES réponses non vides du candidat → pas de note fiable possible.
export function estTropCourt(transcript: ChatMessage[]): boolean {
  const reponses = transcript.filter((m) => m.role === "candidate" && m.text.trim() !== "");
  return reponses.length < MIN_REPONSES;
}
