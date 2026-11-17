import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROJECTION,
  screenToWorld,
  worldToScreen,
  type ProjectionConfig,
  type WorldPoint
} from "./projection";

describe("isometric projection", () => {
  it("projects the origin to the configured screen origin", () => {
    expect(worldToScreen({ x: 0, y: 0, z: 0 })).toEqual({ x: 0, y: 0 });
  });

  it("round-trips fractional world coordinates", () => {
    const point: WorldPoint = { x: 12.25, y: -3.5, z: 2 };
    const screen = worldToScreen(point);
    const restored = screenToWorld(screen, DEFAULT_PROJECTION, point.z);

    expect(restored.x).toBeCloseTo(point.x);
    expect(restored.y).toBeCloseTo(point.y);
    expect(restored.z).toBe(point.z);
  });

  it("supports custom origins and tile dimensions", () => {
    const config: ProjectionConfig = {
      mode: "ISOMETRIC",
      tileWidth: 96,
      tileHeight: 48,
      heightUnit: 20,
      originX: 300,
      originY: 120
    };
    const point = { x: 4, y: 7, z: 1.5 };
    const restored = screenToWorld(worldToScreen(point, config), config, point.z);

    expect(restored.x).toBeCloseTo(point.x);
    expect(restored.y).toBeCloseTo(point.y);
  });

  it("rejects invalid projection dimensions", () => {
    const config = { ...DEFAULT_PROJECTION, tileWidth: 0 };
    expect(() => worldToScreen({ x: 0, y: 0, z: 0 }, config)).toThrow(RangeError);
  });
});

describe("top-down projection", () => {
  const config: ProjectionConfig = {
    ...DEFAULT_PROJECTION,
    mode: "TOP_DOWN"
  };

  it("round-trips world coordinates", () => {
    const point = { x: 5.5, y: 8.25, z: 3 };
    const restored = screenToWorld(worldToScreen(point, config), config, point.z);

    expect(restored.x).toBeCloseTo(point.x);
    expect(restored.y).toBeCloseTo(point.y);
    expect(restored.z).toBe(point.z);
  });
});
