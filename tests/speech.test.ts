import { describe, it, expect } from "vitest";
import { nextSpeakableChunk, mergeTranscript, rankFrenchVoices } from "../lib/speech";

describe("nextSpeakableChunk", () => {
  it("extrait la première phrase complète et avance l'offset", () => {
    const r = nextSpeakableChunk("Bonjour. Ca va?", 0);
    expect(r.chunk).toBe("Bonjour.");
    expect(r.spokenLen).toBe(8);
  });

  it("reprend à l'offset sans relire la phrase précédente", () => {
    const r = nextSpeakableChunk("Bonjour. Ca va?", 8);
    expect(r.chunk).toBe("Ca va?");
    expect(r.spokenLen).toBe(15);
  });

  it("ne renvoie rien tant que la phrase est incomplète", () => {
    const r = nextSpeakableChunk("Bonjour sans fin", 0);
    expect(r.chunk).toBe("");
    expect(r.spokenLen).toBe(0);
  });

  it("coupe aussi sur un retour à la ligne", () => {
    const r = nextSpeakableChunk("Ligne un\nLigne deux.", 0);
    expect(r.chunk).toBe("Ligne un");
    expect(r.spokenLen).toBe(9);
  });

  it("gère les points de suspension et exclamations", () => {
    expect(nextSpeakableChunk("Super !", 0).chunk).toBe("Super !");
    expect(nextSpeakableChunk("Attends…", 0).chunk).toBe("Attends…");
  });
});

describe("mergeTranscript", () => {
  it("renvoie le transcript seul quand le champ est vide", () => {
    expect(mergeTranscript("", "bonjour")).toBe("bonjour");
  });

  it("joint le texte tapé et le texte reconnu par une seule espace", () => {
    expect(mergeTranscript("Bonjour,", "je suis dev")).toBe("Bonjour, je suis dev");
  });

  it("n'ajoute pas de double espace si le champ finit déjà par une espace", () => {
    expect(mergeTranscript("Bonjour, ", "je suis dev")).toBe("Bonjour, je suis dev");
  });

  it("garde le champ intact quand le transcript est vide", () => {
    expect(mergeTranscript("déjà tapé", "")).toBe("déjà tapé");
    expect(mergeTranscript("déjà tapé", "   ")).toBe("déjà tapé");
  });
});

// Fausses voix pour les tests (seuls name/lang sont utilisés par rankFrenchVoices).
const voice = (name: string, lang: string) => ({ name, lang }) as SpeechSynthesisVoice;

describe("rankFrenchVoices", () => {
  it("écarte les voix non françaises", () => {
    const r = rankFrenchVoices([voice("Google français", "fr-FR"), voice("Alex", "en-US")]);
    expect(r.map((v) => v.name)).toEqual(["Google français"]);
  });

  it("place une voix naturelle devant une voix robotique", () => {
    const r = rankFrenchVoices([
      voice("Microsoft Hortense", "fr-FR"),
      voice("Microsoft Denise (Natural)", "fr-FR"),
    ]);
    expect(r[0].name).toBe("Microsoft Denise (Natural)");
  });

  it("conserve l'ordre d'origine à score égal", () => {
    const r = rankFrenchVoices([voice("Voix A", "fr-FR"), voice("Voix B", "fr-FR")]);
    expect(r.map((v) => v.name)).toEqual(["Voix A", "Voix B"]);
  });

  it("renvoie une liste vide sans voix française", () => {
    expect(rankFrenchVoices([voice("Alex", "en-US")])).toEqual([]);
  });
});
