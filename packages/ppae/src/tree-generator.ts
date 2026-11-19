import { DEFAULT_STYLE_PROFILES } from "../vendor/ppae/core/coordinates";
import type {
  ArtStyleProfile,
  TreeLifecycleStage,
  TreeSpeciesId
} from "../vendor/ppae/core/contracts";
import { PixelBuffer } from "../vendor/ppae/rasterizer/pixel-buffer";
import { BOTANICAL_SPECIES_DEFINITIONS, TreeMorphologyResolver } from "../vendor/ppae/vegetation/tree-morphology";
import { TreeSkeletonRasterizer } from "../vendor/ppae/vegetation/tree-skeleton-rasterizer";
import { TreeCanopyFoliageRasterizer, type CanopyEnvironmentalState } from "../vendor/ppae/vegetation/tree-foliage-rasterizer";
import { applySpeciesGrowthGrammar, measureSpeciesSilhouette } from "./species-growth";

export const PPAE_VERSION = "0.2.0-alpha.1";
export const PPAE_UPSTREAM_COMMIT = "ed98da220d9ac30e35b23da555d60f5a0ec84a51";

export const TREE_SPECIES = [
  "oak", "pine", "birch", "palm", "tropical", "mangrove",
  "willow", "fruit_tree", "bamboo", "dead_tree", "fantasy_lumin", "corrupted_thorn"
] as const satisfies readonly TreeSpeciesId[];

export const TREE_STAGES: readonly TreeLifecycleStage[] = [
  "seed", "sprout", "sapling", "young", "immature", "mature",
  "ancient", "damaged", "dead", "burned", "stump", "fallen_log"
];

export type PPAEStyleProfile =
  | "micro-4x4"
  | "micro-6x6"
  | "classic-8x8"
  | "standard-16x16"
  | "detailed-32x32"
  | "hybrid-24";

export interface GenerateTreeOptions {
  species: TreeSpeciesId;
  stage: TreeLifecycleStage;
  profile: PPAEStyleProfile;
  seed: number;
  environment?: CanopyEnvironmentalState;
  windShiftTexels?: number;
}

export interface GeneratedTree {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
  pivot: readonly [number, number];
  species: TreeSpeciesId;
  stage: TreeLifecycleStage;
  profile: PPAEStyleProfile;
  seed: number;
  generatorId: "ppae";
  generatorVersion: string;
  upstreamRepository: string;
  license: "Apache-2.0";
}

export class PPAETreeGenerator {
  private readonly morphology = new TreeMorphologyResolver();
  private readonly skeleton = new TreeSkeletonRasterizer();
  private readonly foliage = new TreeCanopyFoliageRasterizer();

  generate(options: GenerateTreeOptions): GeneratedTree {
    if (!Number.isSafeInteger(options.seed) || options.seed < 0 || options.seed > 0xffffffff) {
      throw new RangeError("Seed must be an unsigned 32-bit integer.");
    }

    const profile: ArtStyleProfile = DEFAULT_STYLE_PROFILES[options.profile];
    const species = BOTANICAL_SPECIES_DEFINITIONS[options.species];
    const morphology = this.morphology.resolveTreeMorphology(
      options.species,
      options.stage,
      profile,
      options.seed,
      undefined,
      options.windShiftTexels ?? 0
    );
    const speciesGrowth = applySpeciesGrowthGrammar(
      options.species,
      options.stage,
      morphology.skeleton,
      morphology.canvasWidthTexels,
      morphology.canvasHeightTexels,
      profile.moduleSize,
      morphology.seed
    );
    const resolvedMorphology = {
      ...morphology,
      skeleton: speciesGrowth.skeleton,
      metrics: measureSpeciesSilhouette(speciesGrowth.skeleton)
    };
    const skeleton = this.skeleton.renderSkeleton(
      resolvedMorphology,
      profile,
      species,
      options.windShiftTexels ?? 0
    );
    const canopy = this.foliage.renderCanopyAndCompose(
      resolvedMorphology,
      skeleton,
      profile,
      species,
      options.environment ?? "normal",
      options.windShiftTexels ?? 0
    );
    const buffer: PixelBuffer = canopy.compositeTreeBuffer;

    return {
      width: buffer.width,
      height: buffer.height,
      pixels: new Uint8ClampedArray(buffer.data),
      pivot: canopy.pivotTexel,
      species: options.species,
      stage: options.stage,
      profile: options.profile,
      seed: options.seed,
      generatorId: "ppae",
      generatorVersion: PPAE_VERSION,
      upstreamRepository: "https://github.com/Mairon31/ppae-engine",
      license: "Apache-2.0"
    };
  }
}
