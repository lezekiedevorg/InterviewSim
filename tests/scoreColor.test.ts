import { describe, it, expect } from "vitest";
import { scoreColor } from "../lib/scoreColor";

describe("scoreColor", () => {
  it("rouge sous 40", () => {
    expect(scoreColor(0)).toBe("rouge");
    expect(scoreColor(39)).toBe("rouge");
  });
  it("ambre de 40 à 69", () => {
    expect(scoreColor(40)).toBe("ambre");
    expect(scoreColor(69)).toBe("ambre");
  });
  it("vert à partir de 70", () => {
    expect(scoreColor(70)).toBe("vert");
    expect(scoreColor(100)).toBe("vert");
  });
});
