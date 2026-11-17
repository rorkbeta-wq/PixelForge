import { describe, expect, it } from "vitest";
import { generatePpaeTree } from "./tree-adapter";

interface TestProfile {
  readonly id: string;
}

function createGenerator(data = new Uint8Array(16).fill(255)) {
  return {
    generateTreeStage: (species: string, stage: string, profile: TestProfile, seed: number | string) => ({
      buffer: { width: 2, height: 2, data },
      pivotTexel: [1, 1] as const,
      input: { species, stage, profile, seed }
    })
  };
}

const request = {
  species: "oak",
  stage: "mature",
  profileId: "detailed-32x32",
  profile: { id: "detailed-32x32" },
  seed: 12345
};

const versions = {
  sourceVersion: "0.2.0-alpha.1",
  generatorVersion: "0.1.0"
};

describe("PPAE tree adapter", () => {
  it("normalizes a PPAE pixel buffer and preserves generation metadata", () => {
    const sprite = generatePpaeTree(createGenerator(), request, versions);

    expect(sprite).toMatchObject({
      id: "ppae:oak:mature:detailed-32x32:12345",
      category: "sprite",
      source: "ppae",
      species: "oak",
      stage: "mature",
      profileId: "detailed-32x32",
      seed: 12345,
      width: 2,
      height: 2,
      pivot: { x: 1, y: 1 }
    });
    expect(sprite.rgba).toBeInstanceOf(Uint8ClampedArray);
    expect(sprite.rgba).toHaveLength(16);
  });

  it("copies pixel data so the normalized asset does not share mutable storage", () => {
    const source = new Uint8Array(16).fill(64);
    const sprite = generatePpaeTree(createGenerator(source), request, versions);

    source[0] = 255;
    expect(sprite.rgba[0]).toBe(64);
  });

  it("rejects malformed pixel buffers", () => {
    const malformed = {
      generateTreeStage: () => ({
        buffer: { width: 2, height: 2, data: new Uint8Array(12) },
        pivotTexel: [0, 0] as const
      })
    };

    expect(() => generatePpaeTree(malformed, request, versions)).toThrow(RangeError);
  });

  it("rejects pivots outside the generated sprite", () => {
    const malformed = {
      generateTreeStage: () => ({
        buffer: { width: 2, height: 2, data: new Uint8Array(16) },
        pivotTexel: [2, 1] as const
      })
    };

    expect(() => generatePpaeTree(malformed, request, versions)).toThrow(RangeError);
  });
});
