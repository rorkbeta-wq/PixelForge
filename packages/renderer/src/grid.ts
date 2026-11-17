import {
  worldToScreen,
  type ProjectionConfig,
  type WorldPoint
} from "@pixelforge/core";

export interface GridRenderOptions {
  width: number;
  height: number;
  cameraX: number;
  cameraY: number;
  zoom: number;
  projection: ProjectionConfig;
  extent?: number;
}

export function drawIsometricGrid(
  context: CanvasRenderingContext2D,
  options: GridRenderOptions
): void {
  const {
    width,
    height,
    cameraX,
    cameraY,
    zoom,
    projection,
    extent = 40
  } = options;

  context.save();
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#171b22";
  context.fillRect(0, 0, width, height);
  context.translate(width / 2 + cameraX, height / 2 + cameraY);
  context.scale(zoom, zoom);

  context.lineWidth = 1 / zoom;
  context.strokeStyle = "rgba(133, 157, 112, 0.24)";
  context.beginPath();

  for (let index = -extent; index <= extent; index += 1) {
    traceWorldLine(context, { x: index, y: -extent, z: 0 }, { x: index, y: extent, z: 0 }, projection);
    traceWorldLine(context, { x: -extent, y: index, z: 0 }, { x: extent, y: index, z: 0 }, projection);
  }

  context.stroke();

  const origin = worldToScreen({ x: 0, y: 0, z: 0 }, projection);
  context.fillStyle = "#a8e063";
  context.beginPath();
  context.arc(origin.x, origin.y, 3 / zoom, 0, Math.PI * 2);
  context.fill();

  context.restore();
}

function traceWorldLine(
  context: CanvasRenderingContext2D,
  start: WorldPoint,
  end: WorldPoint,
  projection: ProjectionConfig
): void {
  const from = worldToScreen(start, projection);
  const to = worldToScreen(end, projection);
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
}
