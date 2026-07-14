import { describe, it, expect } from "vitest";
import { parseDrillReport } from "../lib/parseDrillReport";

const ok = JSON.stringify({
  score: 72,
  pointsForts: ["clair", "structuré"],
  aTravailler: ["plus de chiffres", "trop long"],
  meilleureReponse: { question: "Parlez-moi de vous", avant: "euh je sais pas", apres: "Version améliorée." },
});

describe("parseDrillReport", () => {
  it("parse un JSON valide", () => {
    const r = parseDrillReport(ok)!;
    expect(r.score).toBe(72);
    expect(r.pointsForts).toHaveLength(2);
    expect(r.meilleureReponse?.apres).toContain("améliorée");
  });
  it("borne le score entre 0 et 100", () => {
    expect(parseDrillReport(JSON.stringify({ ...JSON.parse(ok), score: 140 }))!.score).toBe(100);
    expect(parseDrillReport(JSON.stringify({ ...JSON.parse(ok), score: -5 }))!.score).toBe(0);
  });
  it("accepte meilleureReponse null", () => {
    const r = parseDrillReport(JSON.stringify({ ...JSON.parse(ok), meilleureReponse: null }))!;
    expect(r.meilleureReponse).toBeNull();
  });
  it("retire un bloc markdown ```json", () => {
    expect(parseDrillReport("```json\n" + ok + "\n```")!.score).toBe(72);
  });
  it("JSON invalide → null", () => {
    expect(parseDrillReport("pas du json")).toBeNull();
    expect(parseDrillReport(JSON.stringify({ score: 50 }))).toBeNull(); // champs manquants
  });
});
