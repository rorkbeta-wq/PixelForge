export interface Camera2D {
  x: number;
  y: number;
  zoom: number;
}

export const DEFAULT_CAMERA: Readonly<Camera2D> = Object.freeze({
  x: 0,
  y: 0,
  zoom: 1
});

export const MIN_CAMERA_ZOOM = 0.2;
export const MAX_CAMERA_ZOOM = 4;

export function panCamera(camera: Camera2D, deltaX: number, deltaY: number): Camera2D {
  if (![camera.x, camera.y, camera.zoom, deltaX, deltaY].every(Number.isFinite)) {
    throw new RangeError("Camera values must be finite numbers.");
  }

  return {
    ...camera,
    x: camera.x + deltaX,
    y: camera.y + deltaY
  };
}

export function zoomCameraAt(
  camera: Camera2D,
  nextZoom: number,
  anchorX: number,
  anchorY: number
): Camera2D {
  if (![camera.x, camera.y, camera.zoom, nextZoom, anchorX, anchorY].every(Number.isFinite)) {
    throw new RangeError("Camera values must be finite numbers.");
  }

  const zoom = Math.min(MAX_CAMERA_ZOOM, Math.max(MIN_CAMERA_ZOOM, nextZoom));
  const ratio = zoom / camera.zoom;

  return {
    zoom,
    x: anchorX - (anchorX - camera.x) * ratio,
    y: anchorY - (anchorY - camera.y) * ratio
  };
}
