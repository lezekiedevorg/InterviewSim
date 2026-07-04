import { describe, it, expect } from "vitest";
import { buildRecruiterPrompt, buildDebriefPrompt, buildCrossAnalysisPrompt, buildJuryPrompt } from "../lib/prompts";
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

  it("demande un JSON avec les champs attendus", () => {
    const p = buildDebriefPrompt(ctx, transcript);
    expect(p).toContain("pointsForts");
    expect(p).toContain("scoreConfiance");
    expect(p).toContain("syntheseGenerale");
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
