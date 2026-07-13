import type { DifficulteId } from "./types";

// Les 3 niveaux de difficulté — source de vérité unique (UI, prompts et progression la consomment).
// Le bloc est injecté tel quel dans les prompts recruteur/jury ; réaliste = bloc vide
// = comportement actuel inchangé. La difficulté ne touche JAMAIS la notation.
export const DIFFICULTES: {
  id: DifficulteId;
  label: string;
  description: string;
  bloc: string;
}[] = [
  {
    id: "detendu",
    label: "Détendu",
    description: "Recruteur bienveillant qui te met en confiance — idéal pour un premier essai.",
    bloc: `- Ton chaleureux et rassurant : mets le candidat en confiance, encourage-le (« prenez votre temps »).
- Si le candidat sèche ou répond à côté, reformule ta question plus simplement au lieu d'insister.
- Une seule relance douce par réponse vague, puis passe à la suite.
- AUCUNE question piège : remplace la phase « questions pièges » par des questions de projection simples (« comment vous voyez-vous dans ce poste ? »).
- Ne confronte pas les incohérences pendant l'entretien : garde-les pour le débrief.`,
  },
  {
    id: "realiste",
    label: "Réaliste",
    description: "Un vrai entretien professionnel : relances, écarts CV/offre confrontés.",
    bloc: "",
  },
  {
    id: "sans-pitie",
    label: "Sans pitié",
    description: "Recruteur pressé qui coupe et challenge tout — comme un vrai mauvais jour.",
    bloc: `- Tu es un recruteur pressé et exigeant, qui a vu trop de candidats aujourd'hui.
- Si une réponse s'étire ou tourne en rond, recadre fermement pour ramener le candidat à l'essentiel — mais VARIE tes formulations et ne répète jamais la même phrase d'un tour à l'autre.
- Challenge les affirmations chiffrées ou invérifiables en demandant comment c'est mesuré ou qui peut le confirmer, sans en faire une formule systématique.
- Confronte IMMÉDIATEMENT toute incohérence ou contradiction avec le CV, l'offre ou une réponse précédente.
- Pose des questions pièges dès le milieu de l'entretien, pas seulement à la fin.
- Aucun compliment, aucun encouragement pendant l'entretien ; enchaîne sec après chaque réponse, sans transition aimable.`,
  },
];

// Bloc de consignes du niveau demandé. Id absent ou inconnu → réaliste (vide) :
// les anciens appels et les valeurs corrompues retombent sur le comportement actuel.
export function difficulteBloc(id?: string): string {
  return DIFFICULTES.find((d) => d.id === id)?.bloc ?? "";
}

// Libellé à afficher dans la progression — null pour réaliste (le défaut n'est pas un événement)
// et pour toute valeur inconnue (le champ vient d'un jsonb non typé).
export function difficulteLabel(id: unknown): string | null {
  if (typeof id !== "string" || id === "realiste") return null;
  return DIFFICULTES.find((d) => d.id === id)?.label ?? null;
}
