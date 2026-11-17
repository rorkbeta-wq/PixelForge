export type ProjectionMode = "ISOMETRIC" | "TOP_DOWN";

export interface WorldPoint {
  x: number;
  y: number;
  z: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface ProjectionConfig {
  mode: ProjectionMode;
  tileWidth: number;
  tileHeight: number;
  heightUnit: number;
  originX: number;
  originY: number;
}

export const DEFAULT_PROJECTION: Readonly<ProjectionConfig> = Object.freeze({
  mode: "ISOMETRIC",
  tileWidth: 64,
  tileHeight: 32,
  heightUnit: 16,
  originX: 0,
  originY: 0
});

function validateConfig(config: ProjectionConfig): void {
  const dimensions = [config.tileWidth, config.tileHeight, config.heightUnit];
  if (dimensions.some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new RangeError("Projection dimensions must be finite positive numbers.");
  }
  if (!Number.isFinite(config.originX) || !Number.isFinite(config.originY)) {
    throw new RangeError("Projection origin must contain finite coordinates.");
  }
}

export function worldToScreen(
  point: WorldPoint,
  config: ProjectionConfig = DEFAULT_PROJECTION
): ScreenPoint {
  validateConfig(config);
  if (![point.x, point.y, point.z].every(Number.isFinite)) {
    throw new RangeError("World coordinates must be finite numbers.");
  }

  if (config.mode === "TOP_DOWN") {
    return {
      x: config.originX + point.x * config.tileWidth,
      y: config.originY + point.y * config.tileHeight - point.z * config.heightUnit
    };
  }

  return {
    x: config.originX + (point.x - point.y) * config.tileWidth / 2,
    y: config.originY + (point.x + point.y) * config.tileHeight / 2 - point.z * config.heightUnit
  };
}

export function screenToWorld(
  point: ScreenPoint,
  config: ProjectionConfig = DEFAULT_PROJECTION,
  z = 0
): WorldPoint {
  validateConfig(config);
  if (![point.x, point.y, z].every(Number.isFinite)) {
    throw new RangeError("Screen coordinates and height must be finite numbers.");
  }

  const localX = point.x - config.originX;
  const localY = point.y - config.originY + z * config.heightUnit;

  if (config.mode === "TOP_DOWN") {
    return {
      x: localX / config.tileWidth,
      y: localY / config.tileHeight,
      z
    };
  }

  const normalizedX = localX / (config.tileWidth / 2);
  const normalizedY = localY / (config.tileHeight / 2);

  return {
    x: (normalizedX + normalizedY) / 2,
    y: (normalizedY - normalizedX) / 2,
    z
  };
}
