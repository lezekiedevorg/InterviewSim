import { describe, it, expect } from "vitest";
import { buildRecruiterPrompt, buildDebriefPrompt, buildCrossAnalysisPrompt, buildJuryPrompt, buildDrillPrompt, buildDrillReportPrompt } from "../lib/prompts";
import type { InterviewContext, ChatMessage, SessionSummary } from "../lib/types";

const ctx: InterviewContext = {
  poste: "Développeur back-end",
  entreprise: "Startup fintech",
  niveau: "Junior",
  langue: "français",
  cv: "5 ans en Node.js",
};

describe("buildRecruiterPrompt", () => {
  it("inclut le poste et le CV", () => {
    const p = buildRecruiterPrompt(ctx);
    expect(p).toContain("Développeur back-end");
    expect(p).toContain("5 ans en Node.js");
  });

  it("inclut les phases du déroulé", () => {
    const p = buildRecruiterPrompt(ctx);
    expect(p).toContain("mise en confiance");
    expect(p).toContain("questions pièges");
  });

  it("demande une seule question à la fois", () => {
    expect(buildRecruiterPrompt(ctx).toLowerCase()).toContain("une question");
  });

  it("gère les champs optionnels absents sans planter", () => {
    const minimal: InterviewContext = { poste: "Vendeur", cv: "CV vente" };
    const p = buildRecruiterPrompt(minimal);
    expect(p).toContain("Vendeur");
  });

  it("inclut la ligne CV quand un CV est fourni", () => {
    expect(buildRecruiterPrompt(ctx)).toContain("CV du candidat");
  });

  it("omet la ligne CV quand aucun CV n'est fourni", () => {
    const sansCv: InterviewContext = { poste: "Vendeur", cv: "" };
    expect(buildRecruiterPrompt(sansCv)).not.toContain("CV du candidat");
  });

  it("donne la consigne débutant (ne pas inventer de parcours)", () => {
    const sansCv: InterviewContext = { poste: "Vendeur", cv: "" };
    expect(buildRecruiterPrompt(sansCv)).toContain("n'invente PAS de parcours");
  });
});

describe("buildDebriefPrompt", () => {
  const transcript: ChatMessage[] = [
    { role: "recruiter", text: "Parlez-moi de vous." },
    { role: "candidate", text: "Je suis développeur." },
  ];

  it("inclut le transcript", () => {
    const p = buildDebriefPrompt(ctx, transcript);
    expect(p).toContain("Parlez-moi de vous.");
    expect(p).toContain("Je suis développeur.");
  });

  it("demande le JSON v2 avec critères et preuves, sans score global", () => {
    const p = buildDebriefPrompt(ctx, transcript);
    expect(p).toContain('"criteres"');
    expect(p).toContain('"preuve"');
    expect(p).toContain("pointsForts");
    expect(p).toContain("syntheseGenerale");
    expect(p).not.toContain("scoreConfiance");
  });

  it("contient l'ancrage marché réel et les 5 critères de la grille", () => {
    const p = buildDebriefPrompt(ctx, transcript);
    expect(p).toContain("ne serait PAS retenu");
    for (const id of ["structure", "concret", "adequation", "communication", "pression"]) {
      expect(p).toContain(`"${id}"`);
    }
  });
});

describe("buildCrossAnalysisPrompt", () => {
  const sessions: SessionSummary[] = [
    { poste: "Dev back-end", pointsATravailler: ["réponses trop vagues"], syntheseGenerale: "Correct mais imprécis." },
    { poste: "Dev front-end", pointsATravailler: ["manque d'exemples chiffrés"], syntheseGenerale: "Bon contact." },
  ];

  it("inclut le poste, les points à travailler et la synthèse de chaque entretien", () => {
    const p = buildCrossAnalysisPrompt(sessions);
    expect(p).toContain("Dev back-end");
    expect(p).toContain("réponses trop vagues");
    expect(p).toContain("manque d'exemples chiffrés");
    expect(p).toContain("Correct mais imprécis.");
  });

  it("demande un JSON avec les deux champs attendus", () => {
    const p = buildCrossAnalysisPrompt(sessions);
    expect(p).toContain("pointsRecurrents");
    expect(p).toContain("planAction");
  });
});

describe("buildJuryPrompt", () => {
  it("inclut les trois personas", () => {
    const p = buildJuryPrompt(ctx);
    expect(p).toContain("RH");
    expect(p).toContain("Manager opérationnel");
    expect(p).toContain("Expert métier");
  });

  it("impose un seul persona par tour, préfixé de son nom", () => {
    const p = buildJuryPrompt(ctx);
    expect(p).toContain("UN SEUL persona");
    expect(p.toLowerCase()).toContain("nom exact");
  });

  it("inclut le poste et gère un CV absent sans planter", () => {
    expect(buildJuryPrompt(ctx)).toContain("Développeur back-end");
    const sansCv: InterviewContext = { poste: "Vendeur", cv: "" };
    expect(buildJuryPrompt(sansCv)).toContain("Vendeur");
  });

  it("interdit la délibération et la mise en scène de la fin", () => {
    const p = buildJuryPrompt(ctx).toLowerCase();
    expect(p).toContain("délibérer");
    expect(p).toContain("réunion close");
    expect(p).toContain("privé");
  });

  it("cloisonne les rôles (le RH ne juge pas la technique)", () => {
    const p = buildJuryPrompt(ctx);
    expect(p).toContain("STRICTEMENT");
    expect(p.toLowerCase()).toContain("passe la main");
  });
});

describe("difficulté injectée dans les prompts", () => {
  const transcript: ChatMessage[] = [
    { role: "recruiter", text: "Parlez-moi de vous." },
    { role: "candidate", text: "Je suis développeur." },
  ];

  it("sans-pitie : le prompt recruteur contient le bloc", () => {
    const p = buildRecruiterPrompt({ ...ctx, difficulte: "sans-pitie" });
    expect(p).toContain("ramener le candidat à l'essentiel");
    expect(p).toContain("Attitude imposée");
  });

  it("detendu : le prompt jury contient le bloc", () => {
    const p = buildJuryPrompt({ ...ctx, difficulte: "detendu" });
    expect(p).toContain("prenez votre temps");
  });

  it("non-régression : sans difficulté ou en réaliste, les prompts sont inchangés", () => {
    expect(buildRecruiterPrompt(ctx)).toBe(buildRecruiterPrompt({ ...ctx, difficulte: "realiste" }));
    expect(buildRecruiterPrompt(ctx)).not.toContain("Attitude imposée");
    expect(buildJuryPrompt(ctx)).toBe(buildJuryPrompt({ ...ctx, difficulte: "realiste" }));
    expect(buildJuryPrompt(ctx)).not.toContain("Attitude imposée");
  });

  it("le prompt débrief ignore totalement la difficulté", () => {
    const p = buildDebriefPrompt({ ...ctx, difficulte: "sans-pitie" }, transcript);
    expect(p).not.toContain("ramener le candidat à l'essentiel");
    expect(p).not.toContain("Attitude imposée");
  });
});

describe("règle d'or — une seule question par réplique", () => {
  const transcript: ChatMessage[] = [
    { role: "recruiter", text: "Parlez-moi de vous." },
    { role: "candidate", text: "Je suis développeur." },
  ];

  it("recruteur : la règle d'or est présente, AVANT le contexte", () => {
    const p = buildRecruiterPrompt(ctx);
    expect(p).toContain("RÈGLE D'OR");
    expect(p).toContain("UNE SEULE question");
    expect(p.indexOf("RÈGLE D'OR")).toBeLessThan(p.indexOf("Poste visé"));
  });

  it("jury : la règle d'or est présente aussi", () => {
    const p = buildJuryPrompt(ctx);
    expect(p).toContain("RÈGLE D'OR");
    expect(p).toContain("UNE SEULE question");
  });

  it("la règle d'or précède le bloc d'attitude de la difficulté (elle le domine)", () => {
    const p = buildRecruiterPrompt({ ...ctx, difficulte: "sans-pitie" });
    expect(p.indexOf("RÈGLE D'OR")).toBeLessThan(p.indexOf("Attitude imposée"));
  });

  it("le prompt débrief ne contient PAS la règle d'or", () => {
    expect(buildDebriefPrompt(ctx, transcript)).not.toContain("RÈGLE D'OR");
  });
});

describe("buildDrillPrompt", () => {
  const ctx = { poste: "Développeur back-end", cv: "5 ans Node.js" };
  it("injecte le bloc du thème et le poste", () => {
    const p = buildDrillPrompt(ctx, "pieges", 4);
    expect(p).toContain("questions pièges");
    expect(p).toContain("Développeur back-end");
  });
  it("cadre le nombre de questions et le rôle d'entraînement", () => {
    const p = buildDrillPrompt(ctx, "pitch", 4);
    expect(p).toContain("4 questions");
    expect(p.toLowerCase()).toContain("entraînement");
  });
  it("garde le naturel oral (réagir avant de questionner)", () => {
    expect(buildDrillPrompt(ctx, "pitch", 4)).toContain("Naturel à l'oral");
  });
  it("thème inconnu → pas de crash, prompt générique sûr", () => {
    const p = buildDrillPrompt(ctx, "xxx", 4);
    expect(p).toContain("Développeur back-end");
  });
});

describe("buildDrillReportPrompt", () => {
  it("demande le JSON attendu et cible le thème", () => {
    const p = buildDrillReportPrompt("pieges", [
      { role: "recruiter", text: "Votre plus gros défaut ?" },
      { role: "candidate", text: "Je suis perfectionniste." },
    ]);
    expect(p).toContain("score");
    expect(p).toContain("meilleureReponse");
    expect(p).toContain("Je suis perfectionniste.");
  });
});
