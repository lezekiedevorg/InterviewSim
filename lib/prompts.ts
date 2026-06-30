import type { InterviewContext, ChatMessage } from "./types";

function contextLines(ctx: InterviewContext): string {
  const parts = [`Poste visé : ${ctx.poste}`];
  if (ctx.entreprise) parts.push(`Entreprise / type : ${ctx.entreprise}`);
  if (ctx.domaine) parts.push(`Domaine : ${ctx.domaine}`);
  if (ctx.niveau) parts.push(`Niveau : ${ctx.niveau}`);
  parts.push(`Langue de l'entretien : ${ctx.langue ?? "français"}`);
  parts.push(`CV du candidat :\n${ctx.cv}`);
  if (ctx.offre) parts.push(`Offre d'emploi :\n${ctx.offre}`);
  return parts.join("\n");
}

export function buildRecruiterPrompt(ctx: InterviewContext): string {
  return `Tu es un recruteur expérimenté qui fait passer un entretien d'embauche.

${contextLines(ctx)}

Règles :
- Mène l'entretien en suivant ce déroulé en phases : mise en confiance → questions techniques → mises en situation → questions pièges. Compte environ 2 à 3 questions par phase, puis conclus naturellement l'entretien.
- Pose une question à la fois, puis attends la réponse du candidat.
- Rebondis sur les réponses du candidat et sur son CV : creuse, demande des précisions, mets en situation.
- Reste dans le personnage du recruteur. Ne donne pas de feedback pendant l'entretien (il sera donné à la fin).
- Réponds dans la langue de l'entretien indiquée ci-dessus.`;
}

export function buildDebriefPrompt(
  ctx: InterviewContext,
  transcript: ChatMessage[]
): string {
  const conversation = transcript
    .map((m) => `${m.role === "recruiter" ? "Recruteur" : "Candidat"}: ${m.text}`)
    .join("\n");

  return `Tu es un coach en recrutement. Analyse l'entretien ci-dessous (pour le poste de ${ctx.poste}) et produis un débrief exploitable pour le candidat.

Entretien :
${conversation}

Réponds UNIQUEMENT par un objet JSON valide, sans texte autour, avec exactement ces champs :
{
  "pointsForts": [liste de chaînes],
  "pointsATravailler": [liste de chaînes],
  "reformulations": [liste de chaînes : des réponses du candidat reformulées en mieux],
  "scoreConfiance": un entier de 0 à 100,
  "syntheseGenerale": une chaîne (2-3 phrases)
}`;
}
