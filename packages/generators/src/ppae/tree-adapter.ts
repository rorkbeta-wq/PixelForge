export const PPAE_SOURCE = {
  packageName: "@pixelproject/ppae",
  version: "0.2.0-alpha.1",
  repository: "https://github.com/Mairon31/ppae-engine",
  license: "Apache-2.0"
} as const;

export type TreeSpecies =
  | "oak"
  | "pine"
  | "birch"
  | "palm"
  | "tropical"
  | "mangrove"
  | "willow"
  | "fruit_tree"
  | "bamboo"
  | "dead_tree"
  | "fantasy_lumin"
  | "corrupted_thorn";

export type TreeLifecycleStage =
  | "seed"
  | "sprout"
  | "sapling"
  | "young"
  | "immature"
  | "mature"
  | "ancient"
  | "damaged"
  | "dead"
  | "burned"
  | "stump"
  | "fallen_log";

export type CanopyEnvironment = "normal" | "spring" | "summer" | "autumn" | "winter";

export interface PpaeStyleProfile {
  readonly id: string;
  readonly moduleSize: number;
  readonly [key: string]: unknown;
}

export interface PpaePixelBuffer {
  readonly width: number;
  readonly height: number;
  readonly data: ArrayLike<number>;
}

export interface PpaeTreeArtifact {
  readonly buffer: PpaePixelBuffer;
  readonly pivotTexel: readonly [number, number];
  readonly stage: string;
  readonly anchors?: Readonly<Record<string, unknown>>;
}

export interface PpaeNatureGenerator {
  generateTreeStage(
    species: TreeSpecies,
    stage: TreeLifecycleStage,
    profile: PpaeStyleProfile,
    seed: number,
    options?: {
      readonly envState?: CanopyEnvironment;
      readonly windShiftTexels?: number;
    }
  ): PpaeTreeArtifact;
}

export interface PpaeTreeGenerationRequest {
  readonly species: TreeSpecies;
  readonly stage: TreeLifecycleStage;
  readonly profile: PpaeStyleProfile;
  readonly seed: number;
  readonly environment?: CanopyEnvironment;
  readonly windShiftTexels?: number;
}

export interface GeneratedTreeAsset {
  readonly id: string;
  readonly category: "sprite";
  readonly tags: readonly string[];
  readonly image: {
    readonly width: number;
    readonly height: number;
    readonly rgba: Uint8ClampedArray;
  };
  readonly pivot: {
    readonly x: number;
    readonly y: number;
  };
  readonly generator: {
    readonly id: "ppae.tree";
    readonly version: string;
    readonly seed: number;
    readonly settings: {
      readonly species: TreeSpecies;
      readonly stage: TreeLifecycleStage;
      readonly profileId: string;
      readonly environment: CanopyEnvironment;
      readonly windShiftTexels: number;
    };
  };
  readonly provenance: typeof PPAE_SOURCE;
}

export class PpaeTreeGeneratorAdapter {
  constructor(private readonly generator: PpaeNatureGenerator) {}

  generate(request: PpaeTreeGenerationRequest): GeneratedTreeAsset {
    if (!Number.isSafeInteger(request.seed)) {
      throw new RangeError("PPAE tree seed must be a safe integer.");
    }
    if (!Number.isInteger(request.windShiftTexels ?? 0)) {
      throw new RangeError("Wind shift must be an integer number of texels.");
    }

    const environment = request.environment ?? "normal";
    const windShiftTexels = request.windShiftTexels ?? 0;
    const artifact = this.generator.generateTreeStage(
      request.species,
      request.stage,
      request.profile,
      request.seed,
      { envState: environment, windShiftTexels }
    );

    const { width, height, data } = artifact.buffer;
    if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) {
      throw new RangeError("PPAE returned invalid sprite dimensions.");
    }
    if (data.length !== width * height * 4) {
      throw new RangeError("PPAE returned an RGBA buffer with an invalid length.");
    }

    const [pivotX, pivotY] = artifact.pivotTexel;
    if (!Number.isFinite(pivotX) || !Number.isFinite(pivotY) ||
        pivotX < 0 || pivotY < 0 || pivotX > width || pivotY > height) {
      throw new RangeError("PPAE returned a pivot outside the sprite bounds.");
    }

    return {
      id: `ppae.tree.${request.species}.${request.stage}.${request.profile.id}.${request.seed}`,
      category: "sprite",
      tags: ["tree", request.species, request.stage],
      image: {
        width,
        height,
        rgba: Uint8ClampedArray.from(data)
      },
      pivot: { x: pivotX, y: pivotY },
      generator: {
        id: "ppae.tree",
        version: PPAE_SOURCE.version,
        seed: request.seed,
        settings: {
          species: request.species,
          stage: request.stage,
          profileId: request.profile.id,
          environment,
          windShiftTexels
        }
      },
      provenance: PPAE_SOURCE
    };
  }
}
