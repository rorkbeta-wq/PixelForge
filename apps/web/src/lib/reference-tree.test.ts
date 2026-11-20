import { describe, expect, it } from "vitest";
import type { PixelImage } from "./reference-tree";
import { analyzeReference, createReferenceVariation, cropTransparentBounds, extractConnectedComponents, removeCornerBackground } from "./reference-tree";

function image(width: number, height: number, fill: readonly [number, number, number, number]): PixelImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) data.set(fill, i * 4);
  return { width, height, data };
}

describe("reference tree image processing", () => {
  it("removes only corner-connected background pixels", () => {
    const source = image(5, 5, [0, 0, 0, 255]);
    source.data.set([120, 80, 30, 255], (2 * 5 + 2) * 4);
    const result = removeCornerBackground(source, 0);
    expect(result.data[3]).toBe(0);
    expect(result.data[(2 * 5 + 2) * 4 + 3]).toBe(255);
  });

  it("crops transparent margins without changing visible pixels", () => {
    const source = image(6, 6, [0, 0, 0, 0]);
    source.data.set([80, 50, 20, 255], (2 * 6 + 1) * 4);
    source.data.set([80, 50, 20, 255], (4 * 6 + 3) * 4);
    const result = cropTransparentBounds(source);
    expect([result.width, result.height]).toEqual([3, 3]);
    expect(result.data[3]).toBe(255);
  });

  it("separates disconnected sprites from a transparent sheet", () => {\n    const source = image(12, 8, [0, 0, 0, 0]);\n    for (let y = 1; y < 4; y++) for (let x = 1; x < 4; x++) source.data.set([90, 60, 20, 255], (y * 12 + x) * 4);\n    for (let y = 4; y < 7; y++) for (let x = 8; x < 11; x++) source.data.set([90, 60, 20, 255], (y * 12 + x) * 4);\n    const result = extractConnectedComponents(source, 4);\n    expect(result).toHaveLength(2);\n    expect(result.map((item) => [item.width, item.height])).toEqual([[3, 3], [3, 3]]);\n  });\n\n  it("extracts bounds, anchor, and a compact palette", () => {
    const source = image(4, 4, [0, 0, 0, 0]);
    source.data.set([80, 120, 30, 255], (1 * 4 + 1) * 4);
    source.data.set([90, 130, 35, 255], (2 * 4 + 2) * 4);
    const result = analyzeReference(source);
    expect(result.alphaBounds).toEqual({ x: 1, y: 1, width: 2, height: 2 });
    expect(result.baseAnchor.y).toBe(2);
    expect(result.dominantColors.length).toBeGreaterThan(0);
  });

  it("creates deterministic nearest-neighbour variations and keeps transparency", () => {
    const source = image(8, 8, [0, 0, 0, 0]);
    for (let y = 1; y < 8; y++) for (let x = 2; x < 6; x++) {
      source.data.set([50, 100, 20, 255], (y * 8 + x) * 4);
    }
    const options = { seed: 42, widthScale: 1.1, lean: 0.02, season: "autumn" as const };
    expect(createReferenceVariation(source, options)).toEqual(createReferenceVariation(source, options));
    expect(createReferenceVariation(source, options).data.some((value) => value === 0)).toBe(true);
  });
});
