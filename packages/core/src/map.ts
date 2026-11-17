import { DEFAULT_PROJECTION, screenToWorld, type ProjectionConfig, type ScreenPoint } from "./projection";

export interface TileMap {
  width: number;
  height: number;
  chunkSize: number;
  tiles: Array<string | null>;
}

export interface TileCoordinate {
  x: number;
  y: number;
}

export function createTileMap(width = 20, height = 20, chunkSize = 32): TileMap {
  if (!Number.isInteger(width) || width < 1 || width > 4096) {
    throw new RangeError("Map width must be an integer between 1 and 4096.");
  }
  if (!Number.isInteger(height) || height < 1 || height > 4096) {
    throw new RangeError("Map height must be an integer between 1 and 4096.");
  }
  if (!Number.isInteger(chunkSize) || chunkSize < 1) {
    throw new RangeError("Chunk size must be a positive integer.");
  }

  return { width, height, chunkSize, tiles: Array.from({ length: width * height }, () => null) };
}

export function isTileCoordinateInBounds(map: TileMap, coordinate: TileCoordinate): boolean {
  return Number.isInteger(coordinate.x) && Number.isInteger(coordinate.y) &&
    coordinate.x >= 0 && coordinate.y >= 0 &&
    coordinate.x < map.width && coordinate.y < map.height;
}

export function getTile(map: TileMap, coordinate: TileCoordinate): string | null {
  if (!isTileCoordinateInBounds(map, coordinate)) return null;
  return map.tiles[coordinate.y * map.width + coordinate.x] ?? null;
}

export function setTile(map: TileMap, coordinate: TileCoordinate, tileId: string | null): TileMap {
  if (!isTileCoordinateInBounds(map, coordinate)) {
    throw new RangeError("Tile coordinate is outside the map bounds.");
  }
  const tiles = map.tiles.slice();
  tiles[coordinate.y * map.width + coordinate.x] = tileId;
  return { ...map, tiles };
}

export function screenToTile(
  point: ScreenPoint,
  projection: ProjectionConfig = DEFAULT_PROJECTION
): TileCoordinate | null {
  const world = screenToWorld(point, projection);
  const coordinate = { x: Math.floor(world.x), y: Math.floor(world.y) };
  return coordinate;
}

export function hitTestTile(
  map: TileMap,
  point: ScreenPoint,
  projection: ProjectionConfig = DEFAULT_PROJECTION
): TileCoordinate | null {
  const coordinate = screenToTile(point, projection);
  return isTileCoordinateInBounds(map, coordinate) ? coordinate : null;
}
