import { describe, it, expect } from "vitest";
import { sortByDateDesc, withDeltas, sparklinePoints, type SavedSession } from "../lib/progression";

function s(id: string, date: string, score: number): SavedSession {
  return {
    id,
    created_at: date,
    poste: "Dev",
    context: {},
    debrief: {
      pointsForts: [],
      pointsATravailler: [],
      reformulations: [],
      scoreConfiance: score,
      syntheseGenerale: "",
    },
    score_confiance: score,
  };
}

describe("sortByDateDesc", () => {
  it("trie les plus récentes d'abord sans muter l'entrée", () => {
    const input = [s("a", "2026-01-01T00:00:00Z", 50), s("b", "2026-03-01T00:00:00Z", 60)];
    const out = sortByDateDesc(input);
    expect(out.map((x) => x.id)).toEqual(["b", "a"]);
    expect(input.map((x) => x.id)).toEqual(["a", "b"]); // pas muté
  });
});

describe("withDeltas", () => {
  it("delta vs la session chronologiquement précédente; null pour la plus ancienne", () => {
    // ordre décroissant (récent -> ancien)
    const desc = [
      s("c", "2026-03-01T00:00:00Z", 72),
      s("b", "2026-02-01T00:00:00Z", 64),
      s("a", "2026-01-01T00:00:00Z", 50),
    ];
    const out = withDeltas(desc);
    expect(out.find((x) => x.id === "c")!.delta).toBe(8); // 72 - 64
    expect(out.find((x) => x.id === "b")!.delta).toBe(14); // 64 - 50
    expect(out.find((x) => x.id === "a")!.delta).toBeNull(); // plus ancienne
  });
});

describe("sparklinePoints", () => {
  it("mappe les scores en points SVG (0 en bas, 100 en haut)", () => {
    const pts = sparklinePoints([0, 100], 100, 40);
    // 2 points, x de 0 à 100 ; score 0 -> y=40 (bas), score 100 -> y=0 (haut)
    expect(pts).toBe("0,40 100,0");
  });
  it("gère un seul score", () => {
    expect(sparklinePoints([50], 100, 40)).toBe("0,20");
  });
  it("gère une liste vide", () => {
    expect(sparklinePoints([], 100, 40)).toBe("");
  });
});
