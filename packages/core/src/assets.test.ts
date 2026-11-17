import { describe, expect, it } from "vitest";
import { createAssetManifest, isAssetManifest, type AssetManifestEntry } from "./assets";

const entry: AssetManifestEntry = {
  id: "oak-001",
  name: "Oak",
  category: "sprite",
  mimeType: "image/png",
  width: 128,
  height: 160,
  createdAt: "2026-11-17T12:00:00.000Z",
  source: {
    generatorId: "ppae",
    generatorVersion: "0.2.0-alpha.1",
    seed: 12345,
    upstreamRepository: "https://github.com/Mairon31/ppae-engine",
    license: "Apache-2.0"
  },
  tags: ["tree", "oak", "forest"]
};

describe("asset manifest", () => {
  it("creates a versioned manifest with copied entry data", () => {
    const manifest = createAssetManifest([entry]);
    expect(manifest.format).toBe("pixelforge-assets");
    expect(manifest.manifestVersion).toBe(1);
    expect(isAssetManifest(manifest)).toBe(true);
    expect(manifest.assets[0]).not.toBe(entry);
  });

  it("accepts an empty manifest", () => {
    expect(isAssetManifest(createAssetManifest())).toBe(true);
  });

  it("rejects unsupported versions and duplicate ids", () => {
    expect(isAssetManifest({ ...createAssetManifest([entry]), manifestVersion: 2 })).toBe(false);
    expect(isAssetManifest(createAssetManifest([entry, entry]))).toBe(false);
  });

  it("rejects invalid dimensions and categories", () => {
    expect(isAssetManifest(createAssetManifest([{ ...entry, width: 0 }]))).toBe(false);
    expect(isAssetManifest(createAssetManifest([{ ...entry, category: "unknown" as AssetManifestEntry["category"] }]))).toBe(false);
  });
});
