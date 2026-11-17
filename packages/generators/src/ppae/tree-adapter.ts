import type {
  GeneratedSprite,
  PpaeNatureGeneratorLike
} from "../types";

export interface PpaeTreeRequest<Profile> {
  readonly species: string;
  readonly stage: string;
  readonly profileId: string;
  readonly profile: Profile;
  readonly seed: number;
}

export interface PpaeTreeAdapterOptions {
  readonly sourceVersion: string;
  readonly generatorVersion: string;
}

export function generatePpaeTree<Profile>(
  generator: PpaeNatureGeneratorLike<Profile>,
  request: PpaeTreeRequest<Profile>,
  options: PpaeTreeAdapterOptions
): GeneratedSprite {
  const artifact = generator.generateTreeStage(
    request.species,
    request.stage,
    request.profile,
    request.seed
  );
  const { width, height, data } = artifact.buffer;
  const [pivotX, pivotY] = artifact.pivotTexel;

  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)
    || width < 1 || height < 1 || width * height > 16_777_216) {
    throw new RangeError(`Invalid PPAE sprite dimensions: ${width}x${height}`);
  }

  if (data.length !== width * height * 4) {
    throw new RangeError("PPAE sprite buffer must contain exactly width × height × 4 RGBA values");
  }

  if (!Number.isFinite(pivotX) || !Number.isFinite(pivotY)
    || pivotX < 0 || pivotY < 0 || pivotX >= width || pivotY >= height) {
    throw new RangeError("PPAE sprite pivot must be inside the generated buffer");
  }

  const rgba = new Uint8ClampedArray(data.length);
  for (let index = 0; index < data.length; index += 1) {
    const value = data[index];
    if (value === undefined || !Number.isFinite(value) || value < 0 || value > 255) {
      throw new RangeError(`Invalid RGBA channel at index ${index}`);
    }
    rgba[index] = value;
  }

  const id = [
    "ppae",
    request.species,
    request.stage,
    request.profileId,
    encodeURIComponent(String(request.seed))
  ].join(":");

  return {
    id,
    category: "sprite",
    source: "ppae",
    sourceVersion: options.sourceVersion,
    generator: "nature-tree",
    generatorVersion: options.generatorVersion,
    species: request.species,
    stage: request.stage,
    profileId: request.profileId,
    seed: request.seed,
    width,
    height,
    pivot: { x: pivotX, y: pivotY },
    rgba
  };
}
