import type {
  BotanicalFamilyId,
  TreeBranchSegment,
  TreeFoliageMassNode,
  TreeLifecycleStage,
  TreeSkeletonNode,
  TreeStructuralSkeleton
} from "../vendor/ppae/core/contracts";

export interface SpeciesGrowthResult {
  readonly skeleton: TreeStructuralSkeleton;
  readonly strategy: "broadleaf-scaffold" | "conifer-whorls" | "slender-open-crown" | "upstream";
}

class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0 || 0x9e3779b9;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
}

function makeSegment(
  segmentId: string,
  fromNodeId: string,
  toNodeId: string,
  start: readonly [number, number],
  end: readonly [number, number],
  startRadiusPx: number,
  endRadiusPx: number,
  order: 0 | 1 | 2
): TreeBranchSegment {
  return {
    segmentId, fromNodeId, toNodeId,
    startX: start[0], startY: start[1],
    controlX: Math.round((start[0] + end[0]) / 2),
    controlY: Math.round((start[1] + end[1]) / 2) - 1,
    endX: end[0], endY: end[1],
    startRadiusPx, endRadiusPx, order,
    isExposedDeadwood: false
  };
}

/**
 * Replaces the shared generic branch placement for the first three supported
 * species. Existing trunk/root geometry and rasterizer contracts are retained.
 * The seed varies individuals only inside each species' growth grammar.
 */
export function applySpeciesGrowthGrammar(
  familyId: BotanicalFamilyId,
  stage: TreeLifecycleStage,
  source: TreeStructuralSkeleton,
  width: number,
  height: number,
  moduleSize: number,
  seed: number
): SpeciesGrowthResult {
  if (familyId !== "oak" && familyId !== "pine" && familyId !== "birch") {
    return { skeleton: source, strategy: "upstream" };
  }

  const rng = new SeededRandom((seed ^ (familyId === "oak" ? 0x0a41 : familyId === "pine" ? 0x91ae : 0xb17c)) >>> 0);
  const pivotX = source.pivotX;
  const pivotY = source.pivotY;
  const hub = source.nodes.find((node) => node.nodeId === "crown_hub");
  if (!hub || stage === "seed" || stage === "sprout" || stage === "stump" || stage === "fallen_log") {
    return { skeleton: source, strategy: familyId === "oak" ? "broadleaf-scaffold" : familyId === "pine" ? "conifer-whorls" : "slender-open-crown" };
  }

  const retainedNodes = source.nodes.filter((node) => node.nodeId === "trunk_base" ||
    node.nodeId === "crown_hub" || node.nodeId === "fork_junction" ||
    node.nodeId === "crown_hub_twin" || node.nodeId.startsWith("culm_"));
  const retainedSegments = source.segments.filter((segment) => segment.order === 0);
  const nodes: TreeSkeletonNode[] = [...retainedNodes];
  const segments: TreeBranchSegment[] = [...retainedSegments];
  const foliageMasses: TreeFoliageMassNode[] = [];
  const rootId = hub.nodeId;
  const rootPoint: readonly [number, number] = [hub.x, hub.y];
  const growthScale = stage === "sapling" ? 0.58 : stage === "young" ? 0.76 :
    stage === "immature" ? 0.9 : stage === "ancient" ? 1.08 : 1;
  const topLimit = Math.max(2, Math.floor(height * 0.08));
  const maxReach = Math.max(moduleSize * 1.4, width * 0.3 * growthScale);
  let branchIndex = 0;

  const addBranch = (
    parentId: string,
    start: readonly [number, number],
    end: readonly [number, number],
    order: 1 | 2,
    radius: number,
    foliage: { rx: number; ry: number; density: number; layer: "back" | "mid" | "front" } | null
  ): string => {
    const id = `species_branch_${branchIndex++}`;
    const endRadius = Math.max(1, Math.round(radius * (order === 1 ? 0.42 : 0.3)));
    nodes.push({ nodeId: id, x: end[0], y: end[1], radiusPx: endRadius, depthOrder: order });
    segments.push(makeSegment(`species_seg_${branchIndex}`, parentId, id, start, end, radius, endRadius, order));
    if (foliage && stage !== "dead" && stage !== "burned") {
      foliageMasses.push({
        massId: `species_foliage_${branchIndex}`, attachedNodeId: id,
        centerX: end[0], centerY: end[1],
        radiusX: Math.max(2, Math.round(foliage.rx)),
        radiusY: Math.max(2, Math.round(foliage.ry)),
        lobeCount: familyId === "pine" ? 4 : rng.int(3, 5),
        angleTiltRad: rng.range(-0.18, 0.18),
        density: foliage.density, layerDepth: foliage.layer
      });
    }
    return id;
  };

  if (familyId === "pine") {
    // Conifer grammar: repeated whorls along one upright leader. Branch reach
    // decreases toward the apex, producing a stable triangular silhouette.
    const tierCount = stage === "sapling" ? 2 : stage === "young" ? 3 : stage === "immature" ? 4 : 5;
    const crownHeight = Math.max(moduleSize * 2, hub.y - topLimit);
    for (let tier = 0; tier < tierCount; tier++) {
      const progress = (tier + 1) / (tierCount + 1);
      const y = Math.round(hub.y - crownHeight * progress);
      const reach = maxReach * (1 - progress * 0.78) * rng.range(0.88, 1.08);
      const branchCount = tier % 2 === 0 ? 4 : 3;
      for (let arm = 0; arm < branchCount; arm++) {
        const side = arm % 2 === 0 ? -1 : 1;
        const verticalOffset = rng.range(-moduleSize * 0.35, moduleSize * 0.75);
        const end: readonly [number, number] = [
          Math.max(2, Math.min(width - 3, Math.round(pivotX + side * reach * (arm < 2 ? 1 : 0.72)))),
          Math.max(topLimit, Math.min(pivotY - 3, Math.round(y + verticalOffset)))
        ];
        const parent: readonly [number, number] = [pivotX, y];
        const id = `pine_leader_${tier}`;
        if (!nodes.some((node) => node.nodeId === id)) {
          nodes.push({ nodeId: id, x: pivotX, y, radiusPx: Math.max(1, Math.round(moduleSize * 0.16)), depthOrder: 1 });
          segments.push(makeSegment(`pine_leader_seg_${tier}`, tier === 0 ? rootId : `pine_leader_${tier - 1}`, id,
            tier === 0 ? rootPoint : [pivotX, Math.round(hub.y - crownHeight * tier / (tierCount + 1))],
            parent, Math.max(1, Math.round(moduleSize * 0.24)), 1, 1));
        }
        addBranch(id, parent, end, 1, Math.max(1, Math.round(moduleSize * 0.24)),
          { rx: Math.max(3, reach * 0.48), ry: Math.max(2, moduleSize * 0.42), density: 0.94, layer: arm % 3 === 0 ? "back" : "front" });
      }
    }
  } else if (familyId === "oak") {
    // Broadleaf grammar: scaffold limbs radiate from the upper trunk, then
    // subdivide into shorter twigs. The crown is wider than its vertical depth.
    const scaffoldCount = stage === "sapling" ? 3 : stage === "young" ? 4 : 6;
    for (let i = 0; i < scaffoldCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const level = Math.floor(i / 2);
      const y = Math.round(hub.y + level * moduleSize * 0.48);
      const reach = maxReach * rng.range(0.68, 1);
      const end: readonly [number, number] = [
        Math.max(2, Math.min(width - 3, Math.round(hub.x + side * reach))),
        Math.max(topLimit, Math.min(pivotY - 4, Math.round(y - rng.range(moduleSize * 0.6, moduleSize * 1.8))))
      ];
      const id = addBranch(rootId, rootPoint, end, 1, Math.max(2, Math.round(moduleSize * 0.42)),
        { rx: Math.max(3, moduleSize * rng.range(1.15, 1.65)), ry: Math.max(3, moduleSize * rng.range(0.8, 1.2)), density: 0.96, layer: i % 3 === 0 ? "back" : i % 3 === 1 ? "mid" : "front" });
      if (stage !== "sapling") {
        const twigCount = rng.int(2, 3);
        for (let twig = 0; twig < twigCount; twig++) {
          const direction = twig % 2 === 0 ? side : -side;
          const twigEnd: readonly [number, number] = [
            Math.max(2, Math.min(width - 3, Math.round(end[0] + direction * rng.range(moduleSize, moduleSize * 2.1)))),
            Math.max(topLimit, Math.min(pivotY - 4, Math.round(end[1] - rng.range(moduleSize * 0.45, moduleSize * 1.25))))
          ];
          addBranch(id, end, twigEnd, 2, Math.max(1, Math.round(moduleSize * 0.2)),
            { rx: moduleSize * rng.range(0.65, 0.95), ry: moduleSize * rng.range(0.55, 0.85), density: 0.9, layer: twig % 2 ? "front" : "mid" });
        }
      }
    }
  } else {
    // Birch grammar: narrow upright trunk, fine upward/outward branches and
    // separated small foliage tufts to retain a light, open crown.
    const branchCount = stage === "sapling" ? 3 : stage === "young" ? 5 : 7;
    for (let i = 0; i < branchCount; i++) {
      const t = (i + 1) / (branchCount + 1);
      const y = Math.round(hub.y - (hub.y - topLimit) * t);
      const side = i % 2 === 0 ? -1 : 1;
      const reach = maxReach * rng.range(0.28, 0.48) * (0.7 + t * 0.3);
      const end: readonly [number, number] = [
        Math.max(2, Math.min(width - 3, Math.round(pivotX + side * reach))),
        Math.max(topLimit, Math.min(pivotY - 4, Math.round(y - rng.range(moduleSize * 0.45, moduleSize * 1.15))))
      ];
      const id = addBranch(rootId, rootPoint, end, 1, Math.max(1, Math.round(moduleSize * 0.22)),
        { rx: moduleSize * rng.range(0.48, 0.72), ry: moduleSize * rng.range(0.42, 0.65), density: 0.58, layer: i % 2 ? "front" : "back" });
      if (stage !== "sapling") {
        const twigEnd: readonly [number, number] = [
          Math.max(2, Math.min(width - 3, Math.round(end[0] + side * rng.range(moduleSize * 0.6, moduleSize * 1.1)))),
          Math.max(topLimit, end[1] - rng.int(1, Math.max(2, moduleSize)))
        ];
        addBranch(id, end, twigEnd, 2, 1,
          { rx: moduleSize * 0.42, ry: moduleSize * 0.38, density: 0.48, layer: "mid" });
      }
    }
  }

  return {
    skeleton: { ...source, nodes, segments, foliageMasses },
    strategy: familyId === "oak" ? "broadleaf-scaffold" : familyId === "pine" ? "conifer-whorls" : "slender-open-crown"
  };
}
