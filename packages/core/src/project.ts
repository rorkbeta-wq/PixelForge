import type { ProjectionConfig } from "./projection";

export const PROJECT_FORMAT_VERSION = 1 as const;

export interface ProjectSettings {
  projection: ProjectionConfig;
  chunkSize: number;
}

export interface PixelForgeProject {
  format: "pixelforge";
  formatVersion: typeof PROJECT_FORMAT_VERSION;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  settings: ProjectSettings;
}

export interface CreateProjectOptions {
  id: string;
  name: string;
  now?: string;
  settings?: Partial<ProjectSettings>;
}

export function createProject(options: CreateProjectOptions): PixelForgeProject {
  const name = options.name.trim();
  if (!options.id.trim()) {
    throw new RangeError("Project id cannot be empty.");
  }
  if (!name) {
    throw new RangeError("Project name cannot be empty.");
  }

  const timestamp = options.now ?? new Date().toISOString();
  const projection = options.settings?.projection ?? {
    mode: "ISOMETRIC" as const,
    tileWidth: 64,
    tileHeight: 32,
    heightUnit: 16,
    originX: 0,
    originY: 0
  };
  const chunkSize = options.settings?.chunkSize ?? 32;

  if (!Number.isInteger(chunkSize) || chunkSize < 1) {
    throw new RangeError("Chunk size must be a positive integer.");
  }

  return {
    format: "pixelforge",
    formatVersion: PROJECT_FORMAT_VERSION,
    id: options.id,
    name,
    createdAt: timestamp,
    updatedAt: timestamp,
    settings: {
      projection: { ...projection },
      chunkSize
    }
  };
}

export function isPixelForgeProject(value: unknown): value is PixelForgeProject {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const project = value as Record<string, unknown>;
  if (
    project.format !== "pixelforge" ||
    project.formatVersion !== PROJECT_FORMAT_VERSION ||
    typeof project.id !== "string" ||
    project.id.length === 0 ||
    typeof project.name !== "string" ||
    project.name.trim().length === 0 ||
    typeof project.createdAt !== "string" ||
    typeof project.updatedAt !== "string"
  ) {
    return false;
  }

  if (typeof project.settings !== "object" || project.settings === null) {
    return false;
  }

  const settings = project.settings as Record<string, unknown>;
  if (!Number.isInteger(settings.chunkSize) || (settings.chunkSize as number) < 1) {
    return false;
  }

  if (typeof settings.projection !== "object" || settings.projection === null) {
    return false;
  }

  const projection = settings.projection as Record<string, unknown>;
  const dimensions = [projection.tileWidth, projection.tileHeight, projection.heightUnit];
  const coordinates = [projection.originX, projection.originY];

  return (
    (projection.mode === "ISOMETRIC" || projection.mode === "TOP_DOWN") &&
    dimensions.every((item) => typeof item === "number" && Number.isFinite(item) && item > 0) &&
    coordinates.every((item) => typeof item === "number" && Number.isFinite(item))
  );
}
