import { describe, expect, it } from "vitest";
import type { TreeStructuralSkeleton } from "../vendor/ppae/core/contracts";
import { applySpeciesGrowthGrammar } from "./species-growth";

function skeletonFixture(): TreeStructuralSkeleton {
  return {
    pivotX: 48,
    pivotY: 112,
    nodes: [
      { nodeId: "trunk_base", x: 48, y: 112, radiusPx: 7, depthOrder: 0 },
      { nodeId: "crown_hub", x: 48, y: 42, radiusPx: 5, depthOrder: 0 },
      { nodeId: "old_branch", x: 22, y: 30, radiusPx: 2, depthOrder: 1 }
    ],
    segments: [
      {
        segmentId: "trunk", fromNodeId: "trunk_base", toNodeId: "crown_hub",
        startX: 48, startY: 112, controlX: 48, controlY: 77, endX: 48, endY: 42,
        startRadiusPx: 7, endRadiusPx: 5, order: 0, isExposedDeadwood: false
      },
      {
        segmentId: "old_branch_seg", fromNodeId: "crown_hub", toNodeId: "old_branch",
        startX: 48, startY: 42, controlX: 35, controlY: 35, endX: 22, endY: 30,
        startRadiusPx: 3, endRadiusPx: 1, order: 1, isExposedDeadwood: false
      }
    ],
    roots: [],
    foliageMasses: []
  };
}

describe("species growth grammars", () => {
  it("builds a tiered, leader-centered pine crown", () => {
    const result = applySpeciesGrowthGrammar("pine", "mature", skeletonFixture(), 96, 120, 8, 12345);
    const leaders = result.skeleton.nodes.filter((node) => node.nodeId.startsWith("pine_leader_"));
    const branches = result.skeleton.segments.filter((segment) => segment.segmentId.startsWith("species_seg_"));
    expect(result.strategy).toBe("conifer-whorls");
    expect(leaders.length).toBeGreaterThanOrEqual(4);
    expect(branches.length).toBeGreaterThan(12);
    expect(result.skeleton.foliageMasses.length).toBe(branches.length);
    expect(result.skeleton.segments.some((segment) => segment.segmentId === "old_branch_seg")).toBe(false);
  });

  it("builds a broad scaffold crown for oak", () => {
    const result = applySpeciesGrowthGrammar("oak", "mature", skeletonFixture(), 120, 120, 8, 12345);
    const primary = result.skeleton.segments.filter((segment) =>
      segment.segmentId.startsWith("species_seg_") && segment.order === 1
    );
    const left = primary.some((segment) => segment.endX < 48);
    const right = primary.some((segment) => segment.endX > 48);
    expect(result.strategy).toBe("broadleaf-scaffold");
    expect(primary.length).toBeGreaterThanOrEqual(6);
    expect(left && right).toBe(true);
  });

  it("keeps birch branches fine and foliage relatively open", () => {
    const result = applySpeciesGrowthGrammar("birch", "mature", skeletonFixture(), 96, 120, 8, 12345);
    const masses = result.skeleton.foliageMasses;
    expect(result.strategy).toBe("slender-open-crown");
    expect(masses.length).toBeGreaterThanOrEqual(10);
    expect(masses.every((mass) => mass.density <= 0.58)).toBe(true);
    expect(masses.every((mass) => mass.radiusX <= 8 && mass.radiusY <= 8)).toBe(true);
  });

  it("is deterministic for a fixed species, stage, and seed", () => {
    const first = applySpeciesGrowthGrammar("oak", "mature", skeletonFixture(), 120, 120, 8, 777);
    const second = applySpeciesGrowthGrammar("oak", "mature", skeletonFixture(), 120, 120, 8, 777);
    expect(first.skeleton).toEqual(second.skeleton);
  });

  it("preserves the upstream grammar for species outside the first milestone", () => {
    const source = skeletonFixture();
    const result = applySpeciesGrowthGrammar("willow", "mature", source, 96, 120, 8, 12345);
    expect(result.strategy).toBe("upstream");
    expect(result.skeleton).toBe(source);
  });
});
