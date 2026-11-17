export const ASSET_MANIFEST_VERSION = 1 as const;

export type AssetCategory =
  | "terrain-tile"
  | "terrain-transition"
  | "sprite"
  | "autotile-set"
  | "animation";

export interface AssetSource {
  generatorId: string;
  generatorVersion: string;
  seed: number | null;
  upstreamRepository: string | null;
  license: string | null;
}

export interface AssetManifestEntry {
  id: string;
  name: string;
  category: AssetCategory;
  mimeType: "image/png";
  width: number;
  height: number;
  createdAt: string;
  source: AssetSource;
  tags: string[];
}

export interface AssetManifest {
  format: "pixelforge-assets";
  manifestVersion: typeof ASSET_MANIFEST_VERSION;
  assets: AssetManifestEntry[];
}

const ASSET_CATEGORIES: readonly AssetCategory[] = [
  "terrain-tile",
  "terrain-transition",
  "sprite",
  "autotile-set",
  "animation"
];

export function createAssetManifest(
  assets: AssetManifestEntry[] = []
): AssetManifest {
  return {
    format: "pixelforge-assets",
    manifestVersion: ASSET_MANIFEST_VERSION,
    assets: assets.map((asset) => ({ ...asset, source: { ...asset.source }, tags: [...asset.tags] }))
  };
}

export function isAssetManifest(value: unknown): value is AssetManifest {
  if (typeof value !== "object" || value === null) return false;
  const manifest = value as Record<string, unknown>;
  if (
    manifest.format !== "pixelforge-assets" ||
    manifest.manifestVersion !== ASSET_MANIFEST_VERSION ||
    !Array.isArray(manifest.assets)
  ) return false;

  const ids = new Set<string>();
  return manifest.assets.every((item: unknown) => {
    if (typeof item !== "object" || item === null) return false;
    const asset = item as Record<string, unknown>;
    if (
      typeof asset.id !== "string" || asset.id.length === 0 || ids.has(asset.id) ||
      typeof asset.name !== "string" || asset.name.trim().length === 0 ||
      !ASSET_CATEGORIES.includes(asset.category as AssetCategory) ||
      asset.mimeType !== "image/png" ||
      !Number.isInteger(asset.width) || (asset.width as number) < 1 ||
      !Number.isInteger(asset.height) || (asset.height as number) < 1 ||
      typeof asset.createdAt !== "string" ||
      !Array.isArray(asset.tags) || !asset.tags.every((tag) => typeof tag === "string") ||
      typeof asset.source !== "object" || asset.source === null
    ) return false;

    const source = asset.source as Record<string, unknown>;
    if (
      typeof source.generatorId !== "string" ||
      typeof source.generatorVersion !== "string" ||
      !(typeof source.seed === "number" || source.seed === null) ||
      !(typeof source.upstreamRepository === "string" || source.upstreamRepository === null) ||
      !(typeof source.license === "string" || source.license === null)
    ) return false;

    ids.add(asset.id);
    return true;
  });
}
