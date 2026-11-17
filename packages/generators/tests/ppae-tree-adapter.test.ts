import { describe, expect, it, vi } from "vitest";
import {
  PPAE_SOURCE,
  PpaeTreeGeneratorAdapter,
  type PpaeNatureGenerator,
  type PpaeTreeArtifact
} from "../src/ppae/tree-adapter";

const profile = { id: "detailed-32x32", moduleSize: 32 };

function createArtifact(): PpaeTreeArtifact {
  return {
    buffer: {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray([
        1, 2, 3, 255,
        4, 5, 6, 255,
        7, 8, 9, 255,
        10, 11, 12, 255
      ])
    },
    pivotTexel: [1, 2],
    stage: "mature"
  };
}

describe("PpaeTreeGeneratorAdapter", () => {
  it("maps a request to PPAE and returns a normalized asset", () => {
    const generateTreeStage = vi.fn(() => createArtifact());
    const adapter = new PpaeTreeGeneratorAdapter({ generateTreeStage } as unknown as PpaeNatureGenerator);

    const asset = adapter.generate({
      species: "oak",
      stage: "mature",
      profile,
      seed: 12345,
      environment: "normal"
    });

    expect(generateTreeStage).toHaveBeenCalledWith("oak", "mature", profile, 12345, {
      envState: "normal",
      windShiftTexels: 0
    });
    expect(asset.id).toBe("ppae.tree.oak.mature.detailed-32x32.12345");
    expect(asset.image.rgba).toBeInstanceOf(Uint8ClampedArray);
    expect(asset.image.rgba).not.toBe(createArtifact().buffer.data);
    expect(asset.pivot).toEqual({ x: 1, y: 2 });
    expect(asset.provenance).toEqual(PPAE_SOURCE);
  });

  it("rejects non-integer seeds", () => {
    const adapter = new PpaeTreeGeneratorAdapter({
      generateTreeStage: () => createArtifact()
    });
    expect(() => adapter.generate({
      species: "oak",
      stage: "mature",
      profile,
      seed: 1.5
    })).toThrow("safe integer");
  });

  it("rejects malformed RGBA buffers", () => {
    const adapter = new PpaeTreeGeneratorAdapter({
      generateTreeStage: () => ({
        ...createArtifact(),
        buffer: { width: 2, height: 2, data: new Uint8Array(3) }
      })
    });
    expect(() => adapter.generate({
      species: "oak",
      stage: "mature",
      profile,
      seed: 1
    })).toThrow("invalid length");
  });

  it("rejects pivots outside the sprite", () => {
    const adapter = new PpaeTreeGeneratorAdapter({
      generateTreeStage: () => ({
        ...createArtifact(),
        pivotTexel: [3, 1]
      })
    });
    expect(() => adapter.generate({
      species: "oak",
      stage: "mature",
      profile,
      seed: 1
    })).toThrow("pivot outside");
  });
});
