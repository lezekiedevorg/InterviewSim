import { describe, it, expect } from "vitest";
import { parseSpeaker, PERSONAS } from "../lib/jury";

describe("parseSpeaker", () => {
  it("repère le persona et retire le préfixe du corps", () => {
    expect(parseSpeaker("RH : Parlez-moi de vous.")).toEqual({
      speaker: "rh",
      body: "Parlez-moi de vous.",
    });
  });

  it("gère les noms composés", () => {
    expect(parseSpeaker("Manager opérationnel : Une mise en situation.")).toEqual({
      speaker: "manager",
      body: "Une mise en situation.",
    });
    expect(parseSpeaker("Expert métier : Décrivez votre stack.").speaker).toBe("expert");
  });

  it("tolère l'absence ou l'excès d'espaces autour du deux-points", () => {
    expect(parseSpeaker("RH:Sans espace").speaker).toBe("rh");
    expect(parseSpeaker("RH   :   Large").body).toBe("Large");
  });

  it("renvoie speaker null et le texte intact sans préfixe connu", () => {
    expect(parseSpeaker("Bonjour, je suis là.")).toEqual({
      speaker: null,
      body: "Bonjour, je suis là.",
    });
  });
});

describe("PERSONAS", () => {
  it("contient les 3 personas avec des paramètres de voix", () => {
    expect(PERSONAS.map((p) => p.id)).toEqual(["rh", "manager", "expert"]);
    for (const p of PERSONAS) {
      expect(typeof p.pitch).toBe("number");
      expect(typeof p.rate).toBe("number");
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.initials.length).toBeGreaterThan(0);
    }
  });
});
