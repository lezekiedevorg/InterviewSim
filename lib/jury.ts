export type PersonaId = "rh" | "manager" | "expert";

export type Persona = {
  id: PersonaId;
  name: string; // nom exact, sert de préfixe et de libellé
  initials: string; // avatar de la tuile
  pitch: number; // paramètre speechSynthesis
  rate: number; // paramètre speechSynthesis
};

// Ordre = ordre d'affichage des tuiles.
export const PERSONAS: Persona[] = [
  { id: "rh", name: "RH", initials: "RH", pitch: 1.1, rate: 1.0 },
  { id: "manager", name: "Manager opérationnel", initials: "MO", pitch: 0.85, rate: 0.95 },
  { id: "expert", name: "Expert métier", initials: "EM", pitch: 1.05, rate: 1.05 },
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Repère quel persona parle d'après le préfixe "Nom : …" en tête du texte,
// et renvoie le corps sans ce préfixe. Aucun préfixe connu → speaker null.
export function parseSpeaker(text: string): { speaker: PersonaId | null; body: string } {
  for (const p of PERSONAS) {
    const re = new RegExp(`^\\s*${escapeRegExp(p.name)}\\s*:\\s*`, "i");
    const m = text.match(re);
    if (m) return { speaker: p.id, body: text.slice(m[0].length) };
  }
  return { speaker: null, body: text };
}
