import { describe, expect, it } from "vitest";
import { generateOak } from "./oak-tree-generator";

describe("rule-based oak growth", () => {
  it("is deterministic for a fixed seed and parameter set", () => {
    const options = { seed: 12345, age: "old" as const, season: "summer" as const, width: 256, height: 288 };
    expect(generateOak(options)).toEqual(generateOak(options));
  });

  it("keeps the canvas transparent outside the generated tree", () => {
    const result = generateOak({ seed: 8, age: "mature", season: "summer", width: 256, height: 288 });
    expect(result.image.data.some((value, index) => index % 4 === 3 && value === 0)).toBe(true);
    expect(result.image.data.some((value, index) => index % 4 === 3 && value === 255)).toBe(true);
  });

  it("preserves tree geometry across seasonal states", () => {
    const base = { seed: 99, age: "old" as const, width: 256, height: 288 };
    const summer = generateOak({ ...base, season: "summer" });
    const winter = generateOak({ ...base, season: "winter" });
    expect(summer.pivot).toEqual(winter.pivot);
    expect(summer.image.width).toBe(winter.image.width);
    expect(summer.image.height).toBe(winter.image.height);
    expect(winter.image.data.some((value, index) => index % 4 === 3 && value === 255)).toBe(true);
  });

  it("changes structure when the seed changes", () => {
    const common = { age: "ancient" as const, season: "sparse" as const, width: 256, height: 288 };
    expect(generateOak({ ...common, seed: 1 }).image.data).not.toEqual(generateOak({ ...common, seed: 2 }).image.data);
  });

  it("rejects invalid seeds", () => {
    expect(() => generateOak({ seed: -1, age: "old", season: "summer" })).toThrow();
  });
});
