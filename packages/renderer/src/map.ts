import { worldToScreen, type ProjectionConfig } from "@pixelforge/core";
import type { TileMap, TileCoordinate } from "@pixelforge/core";

export interface MapRenderOptions {
  width: number;
  height: number;
  cameraX: number;
  cameraY: number;
  zoom: number;
  projection: ProjectionConfig;
  map: TileMap;
  selectedTile: TileCoordinate | null;
}

export function drawTileMap(context: CanvasRenderingContext2D, options: MapRenderOptions): void {
  const { width, height, cameraX, cameraY, zoom, projection, map, selectedTile } = options;
  context.save();
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#171b22";
  context.fillRect(0, 0, width, height);
  context.translate(width / 2 + cameraX, height / 2 + cameraY);
  context.scale(zoom, zoom);

  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const corners = [
        worldToScreen({ x, y, z: 0 }, projection),
        worldToScreen({ x: x + 1, y, z: 0 }, projection),
        worldToScreen({ x: x + 1, y: y + 1, z: 0 }, projection),
        worldToScreen({ x, y: y + 1, z: 0 }, projection)
      ];
      context.beginPath();
      context.moveTo(corners[0].x, corners[0].y);
      for (let index = 1; index < corners.length; index += 1) {
        context.lineTo(corners[index].x, corners[index].y);
      }
      context.closePath();
      const tileId = map.tiles[y * map.width + x];
      context.fillStyle = tileId ? "#526b43" : "rgba(130, 166, 89, 0.045)";
      context.fill();
      context.strokeStyle = "rgba(133, 157, 112, 0.32)";
      context.lineWidth = 1 / zoom;
      context.stroke();

      if (selectedTile?.x === x && selectedTile.y === y) {
        context.fillStyle = "rgba(168, 224, 99, 0.28)";
        context.fill();
        context.strokeStyle = "#a8e063";
        context.lineWidth = 2 / zoom;
        context.stroke();
      }
    }
  }

  context.restore();
}
