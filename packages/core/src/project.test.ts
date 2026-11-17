import { describe, expect, it } from "vitest";
import { createProject, isPixelForgeProject } from "./project";

describe("project format", () => {
  it("creates a deterministic empty project when a timestamp is provided", () => {
    const project = createProject({
      id: "project-001",
      name: "  First world  ",
      now: "2026-01-01T00:00:00.000Z"
    });

    expect(project.name).toBe("First world");
    expect(project.format).toBe("pixelforge");
    expect(project.formatVersion).toBe(1);
    expect(project.createdAt).toBe(project.updatedAt);
    expect(project.settings.chunkSize).toBe(32);
    expect(isPixelForgeProject(project)).toBe(true);
  });

  it("rejects empty project identifiers and names", () => {
    expect(() => createProject({ id: " ", name: "World" })).toThrow(RangeError);
    expect(() => createProject({ id: "world-1", name: " " })).toThrow(RangeError);
  });

  it("rejects invalid chunk sizes", () => {
    expect(() => createProject({
      id: "world-1",
      name: "World",
      settings: { chunkSize: 0 }
    })).toThrow(RangeError);
  });

  it("rejects unsupported project versions", () => {
    const project = createProject({ id: "world-1", name: "World" });
    expect(isPixelForgeProject({ ...project, formatVersion: 2 })).toBe(false);
  });

  it("rejects invalid projection settings", () => {
    const project = createProject({ id: "world-1", name: "World" });
    const invalid = {
      ...project,
      settings: {
        ...project.settings,
        projection: { ...project.settings.projection, tileWidth: -1 }
      }
    };

    expect(isPixelForgeProject(invalid)).toBe(false);
  });
});
