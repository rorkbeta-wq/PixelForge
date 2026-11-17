import { describe, expect, it } from "vitest";
import { DEFAULT_PROJECTION } from "./projection";
import { createTileMap, getTile, hitTestTile, setTile } from "./map";
import { worldToScreen } from "./projection";

describe("tile map", () => {
  it("creates a bounded empty map", () => {
    const map = createTileMap(20, 12, 32);
    expect(map.tiles).toHaveLength(240);
    expect(map.width).toBe(20);
    expect(map.height).toBe(12);
    expect(getTile(map, { x: 0, y: 0 })).toBeNull();
  });

  it("rejects invalid dimensions", () => {
    expect(() => createTileMap(0, 10)).toThrow(RangeError);
    expect(() => createTileMap(10, 1.5)).toThrow(RangeError);
  });

  it("updates tiles immutably", () => {
    const map = createTileMap(4, 4);
    const updated = setTile(map, { x: 2, y: 1 }, "grass");
    expect(getTile(updated, { x: 2, y: 1 })).toBe("grass");
    expect(getTile(map, { x: 2, y: 1 })).toBeNull();
  });

  it("hit-tests tile centers in isometric projection", () => {
    const map = createTileMap(20, 20);
    const center = worldToScreen({ x: 3.5, y: 6.5, z: 0 }, DEFAULT_PROJECTION);
    expect(hitTestTile(map, center)).toEqual({ x: 3, y: 6 });
  });

  it("returns no tile outside map bounds", () => {
    const map = createTileMap(5, 5);
    const outside = worldToScreen({ x: 8.5, y: 2.5, z: 0 }, DEFAULT_PROJECTION);
    expect(hitTestTile(map, outside)).toBeNull();
  });
});
