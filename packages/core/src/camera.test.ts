import { describe, expect, it } from "vitest";
import { DEFAULT_CAMERA, panCamera, zoomCameraAt } from "./camera";

describe("camera transforms", () => {
  it("pans by screen-space deltas", () => {
    expect(panCamera(DEFAULT_CAMERA, 12, -8)).toEqual({
      x: 12,
      y: -8,
      zoom: 1
    });
  });

  it("keeps the point under the cursor fixed while zooming", () => {
    const camera = { x: 40, y: -20, zoom: 1 };
    const anchor = { x: 130, y: 75 };
    const next = zoomCameraAt(camera, 2, anchor.x, anchor.y);

    expect((anchor.x - next.x) / next.zoom).toBeCloseTo((anchor.x - camera.x) / camera.zoom);
    expect((anchor.y - next.y) / next.zoom).toBeCloseTo((anchor.y - camera.y) / camera.zoom);
  });

  it("clamps zoom to supported limits", () => {
    expect(zoomCameraAt(DEFAULT_CAMERA, 20, 0, 0).zoom).toBe(4);
    expect(zoomCameraAt(DEFAULT_CAMERA, 0.01, 0, 0).zoom).toBe(0.2);
  });

  it("rejects non-finite values", () => {
    expect(() => panCamera(DEFAULT_CAMERA, Number.NaN, 0)).toThrow(RangeError);
  });
});
