import { describe, expect, it } from "vitest";
import { PPAETreeGenerator } from "./tree-generator";

describe("PPAE tree generator adapter", () => {
  const generator = new PPAETreeGenerator();

  it("generates a non-empty oak sprite with a stable seed", () => {
    const options = { species: "oak" as const, stage: "mature" as const, profile: "detailed-32x32" as const, seed: 12345 };
    const first = generator.generate(options);
    const second = generator.generate(options);

    expect(first.width).toBeGreaterThan(0);
    expect(first.height).toBeGreaterThan(0);
    expect(first.pixels).toEqual(second.pixels);
    expect(first.pixels.some((channel) => channel > 0)).toBe(true);
    expect(first.pivot).toHaveLength(2);
  });

  it("changes generated output when the seed changes", () => {
    const options = { species: "oak" as const, stage: "mature" as const, profile: "detailed-32x32" as const };
    const first = generator.generate({ ...options, seed: 12345 });
    const second = generator.generate({ ...options, seed: 54321 });

    expect(first.pixels).not.toEqual(second.pixels);
  });

  it.each(["oak", "pine", "birch"] as const)(
    "generates a non-empty species-specific %s sprite",
    (species) => {
      const result = generator.generate({
        species, stage: "mature", profile: "detailed-32x32", seed: 24680
      });
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.pixels.some((channel) => channel > 0)).toBe(true);
    }
  );

  it("rejects seeds outside the unsigned 32-bit range", () => {
    expect(() => generator.generate({
      species: "oak", stage: "mature", profile: "detailed-32x32", seed: -1
    })).toThrow(RangeError);
  });
});
