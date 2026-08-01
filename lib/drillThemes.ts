export type DrillThemeId =
  | "pitch" | "motivation" | "comportemental" | "situation" | "pieges" | "technique" | "nego";

export type DrillTheme = {
  id: DrillThemeId;
  label: string;
  description: string;
  bloc: string; // injecté dans le prompt du drill : décrit les questions à poser
};

export const DRILL_THEMES: DrillTheme[] = [
  {
    id: "pitch",
    label: "Pitch perso",
    description: "Te présenter en une à deux minutes, claire et percutante.",
    bloc: "Concentre-toi UNIQUEMENT sur la présentation personnelle : « parlez-moi de vous », le pitch en 1-2 minutes, le fil conducteur du parcours, ce qui le rend pertinent pour le poste. Pousse le candidat à structurer et à aller à l'essentiel.",
  },
  {
    id: "motivation",
    label: "Motivation & adéquation",
    description: "Pourquoi ce poste, cette entreprise, et pourquoi toi.",
    bloc: "Concentre-toi UNIQUEMENT sur la motivation et l'adéquation : pourquoi ce poste, pourquoi cette entreprise, ce qui l'attire, sa projection, en quoi son profil colle à l'offre. Challenge les réponses passe-partout.",
  },
  {
    id: "comportemental",
    label: "Comportementales (STAR)",
    description: "« Une fois où… » : conflits, échecs, réussites, méthode STAR.",
    bloc: "Concentre-toi UNIQUEMENT sur les questions comportementales (méthode STAR) : « racontez une fois où… » (un conflit, un échec, une réussite, une prise d'initiative). Exige Situation, Tâche, Action, Résultat, avec des faits concrets et chiffrés.",
  },
  {
    id: "situation",
    label: "Mises en situation",
    description: "Cas pratiques, priorisation, décisions à chaud.",
    bloc: "Concentre-toi UNIQUEMENT sur les mises en situation : cas pratiques liés au poste, priorisation, arbitrages, « que feriez-vous si… ». Pousse le candidat à raisonner à voix haute et à justifier ses choix.",
  },
  {
    id: "pieges",
    label: "Questions pièges",
    description: "Défauts, écarts de CV, questions déstabilisantes.",
    bloc: "Concentre-toi UNIQUEMENT sur les questions pièges et déstabilisantes : défauts, échecs, trous ou écarts dans le CV, prétentions, « pourquoi vous et pas un autre ». Confronte fermement les réponses évasives.",
  },
  {
    id: "technique",
    label: "Technique métier",
    description: "Profondeur du savoir-faire propre au poste.",
    bloc: "Concentre-toi UNIQUEMENT sur la technique métier propre au poste : creuse la profondeur du savoir-faire, les outils, les méthodes, les arbitrages techniques. Adapte la difficulté au niveau indiqué.",
  },
  {
    id: "nego",
    label: "Négociation salariale",
    description: "Prétentions, justification, contre-offre.",
    bloc: "Concentre-toi UNIQUEMENT sur la négociation salariale : prétentions, justification de la valeur, réaction à une contre-offre basse, marges de négociation (avantages, télétravail). Mets le candidat sous une légère pression de négociation.",
  },
];

export function drillTheme(id?: string): DrillTheme | undefined {
  return DRILL_THEMES.find((t) => t.id === id);
}

export function drillThemeBloc(id?: string): string {
  return drillTheme(id)?.bloc ?? "";
}
