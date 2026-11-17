export interface GeneratedSprite {
  readonly id: string;
  readonly category: "sprite";
  readonly source: "ppae";
  readonly sourceVersion: string;
  readonly generator: "nature-tree";
  readonly generatorVersion: string;
  readonly species: string;
  readonly stage: string;
  readonly profileId: string;
  readonly seed: number;
  readonly width: number;
  readonly height: number;
  readonly pivot: {
    readonly x: number;
    readonly y: number;
  };
  readonly rgba: Uint8ClampedArray;
}

export interface PixelBufferLike {
  readonly width: number;
  readonly height: number;
  readonly data: ArrayLike<number>;
}

export interface PpaeTreeArtifactLike {
  readonly buffer: PixelBufferLike;
  readonly pivotTexel: readonly [number, number];
}

export interface PpaeNatureGeneratorLike<Profile> {
  generateTreeStage(
    speciesId: string,
    stage: string,
    profile: Profile,
    seed: number
  ): PpaeTreeArtifactLike;
}
