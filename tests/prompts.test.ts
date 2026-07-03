import { describe, it, expect } from "vitest";
import { buildRecruiterPrompt, buildDebriefPrompt } from "../lib/prompts";
import type { InterviewContext, ChatMessage } from "../lib/types";

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
