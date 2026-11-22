import type { PixelImage } from "./reference-tree";

export type OakAge = "young" | "mature" | "old" | "ancient" | "dying" | "dead";
export type OakSeason = "summer" | "autumn" | "winter" | "sparse";

export interface OakGenerationOptions {
  readonly seed: number;
  readonly age: OakAge;
  readonly season: OakSeason;
  readonly width?: number;
  readonly height?: number;
}

export interface OakGenerationResult {
  readonly image: PixelImage;
  readonly seed: number;
  readonly age: OakAge;
  readonly season: OakSeason;
  readonly pivot: readonly [number, number];
  readonly algorithmVersion: string;
}

interface Point { x: number; y: number }
interface BranchTip { point: Point; angle: number; depth: number; thickness: number }

const VERSION = "0.3.0";
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let n = state;
    n = Math.imul(n ^ (n >>> 15), n | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

function pixel(image: PixelImage, x: number, y: number, color: readonly number[], alpha = 255): void {
  const px = Math.round(x), py = Math.round(y);
  if (px < 0 || py < 0 || px >= image.width || py >= image.height) return;
  const i = (py * image.width + px) * 4;
  image.data[i] = color[0]; image.data[i + 1] = color[1]; image.data[i + 2] = color[2]; image.data[i + 3] = alpha;
}

function disk(image: PixelImage, cx: number, cy: number, radius: number, color: readonly number[]): void {
  const r = Math.max(0.7, radius), r2 = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r2) pixel(image, x, y, color);
    }
  }
}

function stroke(image: PixelImage, a: Point, b: Point, thickness: number, color: readonly number[]): void {
  const distance = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(1, Math.ceil(distance * 1.8));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = lerp(a.x, b.x, t), y = lerp(a.y, b.y, t);
    const radius = Math.max(0.65, thickness * (1 - t * 0.34) / 2);
    disk(image, x, y, radius, color);
  }
}

function curvedBranch(image: PixelImage, start: Point, end: Point, bend: number, thickness: number,
  palette: { dark: number[]; mid: number[]; light: number[] }, random: () => number): void {
  const dx = end.x - start.x, dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const normal = { x: -dy / length, y: dx / length };
  const control = { x: (start.x + end.x) / 2 + normal.x * bend, y: (start.y + end.y) / 2 + normal.y * bend };
  const steps = Math.max(4, Math.ceil(length * 1.5));
  let previous = start;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, u = 1 - t;
    const next = { x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
      y: u * u * start.y + 2 * u * t * control.y + t * t * end.y };
    const width = Math.max(1, thickness * (1 - t * 0.82));
    stroke(image, previous, next, width + 1.2, palette.dark);
    stroke(image, { x: previous.x - 0.45, y: previous.y }, { x: next.x - 0.45, y: next.y }, Math.max(1, width * 0.68), palette.mid);
    if (thickness > 3 && random() < 0.55) {
      const px = lerp(previous.x, next.x, 0.55), py = lerp(previous.y, next.y, 0.55);
      pixel(image, px - 1, py, palette.light);
    }
    previous = next;
  }
}

function foliagePalette(season: OakSeason): number[][] {
  if (season === "autumn") return [[83, 34, 17], [139, 53, 19], [190, 77, 20], [224, 112, 28], [247, 157, 48], [255, 194, 79]];
  return [[14, 29, 17], [27, 48, 22], [42, 68, 27], [59, 91, 31], [83, 112, 39], [119, 137, 49]];
}

function foliageMass(image: PixelImage, center: Point, rx: number, ry: number, palette: number[][], random: () => number): void {
  const lobes = 5 + Math.floor(random() * 5);
  const shape = Array.from({ length: lobes }, (_, i) => ({
    angle: i / lobes * Math.PI * 2,
    radius: 0.72 + random() * 0.34
  }));
  const left = Math.floor(center.x - rx * 1.3), right = Math.ceil(center.x + rx * 1.3);
  const top = Math.floor(center.y - ry * 1.3), bottom = Math.ceil(center.y + ry * 1.3);
  for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
    const nx = (x - center.x) / Math.max(1, rx), ny = (y - center.y) / Math.max(1, ry);
    const angle = Math.atan2(ny, nx);
    const sector = ((Math.round((angle + Math.PI) / (Math.PI * 2) * lobes) % lobes) + lobes) % lobes;
    const boundary = shape[sector].radius;
    const d = Math.sqrt(nx * nx + ny * ny);
    const texture = (random() - 0.5) * 0.17;
    if (d > boundary + texture) continue;
    const light = clamp(0.62 - ny * 0.22 - nx * 0.09 + (random() - 0.5) * 0.18, 0, 0.99);
    const index = Math.min(palette.length - 1, Math.floor(light * palette.length));
    pixel(image, x, y, palette[index]);
    if (random() < 0.045 && d < 0.86) pixel(image, x + (random() < 0.5 ? -1 : 1), y - 1, palette[Math.min(palette.length - 1, index + 1)]);
  }
}

function growBranch(image: PixelImage, start: Point, angle: number, length: number, thickness: number,
  depth: number, maxDepth: number, branchBias: number, palette: { dark: number[]; mid: number[]; light: number[] },
  random: () => number, tips: BranchTip[]): void {
  const bend = (random() - 0.5) * length * 0.18;
  const end = { x: start.x + Math.cos(angle) * length, y: start.y + Math.sin(angle) * length };
  curvedBranch(image, start, end, bend, thickness, palette, random);
  if (depth >= maxDepth || length < 5 || thickness < 1.1) {
    tips.push({ point: end, angle, depth, thickness });
    return;
  }
  const childCount = depth === 0 ? 2 : random() < 0.68 ? 2 : 1;
  for (let i = 0; i < childCount; i++) {
    const side = childCount === 1 ? (random() < 0.5 ? -1 : 1) : (i === 0 ? -1 : 1);
    const spread = depth === 0 ? 0.36 + random() * 0.2 : 0.42 + random() * 0.27;
    const childAngle = angle + side * spread + (random() - 0.5) * 0.17 + branchBias;
    const childLength = length * (depth === 0 ? 0.66 + random() * 0.1 : 0.61 + random() * 0.16);
    growBranch(image, end, childAngle, childLength, thickness * (0.62 + random() * 0.08),
      depth + 1, maxDepth, branchBias * 0.55, palette, random, tips);
  }
}

export function generateOak(options: OakGenerationOptions): OakGenerationResult {
  if (!Number.isSafeInteger(options.seed) || options.seed < 0 || options.seed > 0xffffffff) {
    throw new RangeError("Seed must be an integer between 0 and 4294967295.");
  }
  const random = rng(options.seed);
  const width = clamp(Math.round(options.width ?? 256), 128, 512);
  const height = clamp(Math.round(options.height ?? width * 1.08), 160, 640);
  const image: PixelImage = { width, height, data: new Uint8ClampedArray(width * height * 4) };
  const dead = options.age === "dead";
  const dying = options.age === "dying";
  const young = options.age === "young";
  const ancient = options.age === "ancient";
  const old = options.age === "old" || ancient || dying || dead;
  const scale = width / 256;
  const base = { x: width * (0.49 + (random() - 0.5) * 0.035), y: height - 7 * scale };
  const trunkTop = height * (young ? 0.43 : old ? 0.36 : 0.39);
  const lean = (random() - 0.5) * width * (old ? 0.1 : 0.055);
  const trunkMid = { x: base.x + lean * 0.42, y: height * 0.65 };
  const crownCenter = { x: base.x + lean, y: height * (young ? 0.25 : 0.23) };
  const trunkWidth = width * (young ? 0.035 : ancient ? 0.105 : old ? 0.082 : 0.064);
  const bark = { dark: [28, 17, 13], mid: [79, 43, 27], light: [132, 79, 45] };
  const tips: BranchTip[] = [];

  curvedBranch(image, base, trunkMid, (random() - 0.5) * 8 * scale, trunkWidth, bark, random);
  curvedBranch(image, trunkMid, { x: base.x + lean, y: trunkTop }, (random() - 0.5) * 10 * scale, trunkWidth * 0.72, bark, random);
  if (old) {
    const split = { x: base.x + lean * 0.8, y: height * 0.49 };
    curvedBranch(image, split, { x: split.x - width * 0.055, y: height * 0.31 }, -4 * scale, trunkWidth * 0.4, bark, random);
    curvedBranch(image, split, { x: split.x + width * 0.07, y: height * 0.32 }, 5 * scale, trunkWidth * 0.38, bark, random);
  }

  const rootCount = ancient ? 9 : old ? 8 : 6;
  for (let i = 0; i < rootCount; i++) {
    const angle = Math.PI / 2 + lerp(-1.18, 1.18, i / (rootCount - 1)) + (random() - 0.5) * 0.2;
    const length = width * (ancient ? 0.14 : old ? 0.12 : 0.095) * (0.62 + random() * 0.72);
    const end = { x: base.x + Math.cos(angle) * length, y: base.y + Math.sin(angle) * length * 0.42 };
    curvedBranch(image, { x: base.x + (random() - 0.5) * trunkWidth * 0.35, y: base.y - 2 * scale }, end,
      (random() - 0.5) * 7 * scale, trunkWidth * (0.26 + random() * 0.13), bark, random);
    if (random() < 0.62) {
      const fork = { x: lerp(base.x, end.x, 0.65), y: lerp(base.y, end.y, 0.65) };
      const forkEnd = { x: fork.x + (end.x - base.x) * 0.36 + (random() - 0.5) * 8,
        y: fork.y + (end.y - base.y) * 0.5 };
      curvedBranch(image, fork, forkEnd, 2 * scale, trunkWidth * 0.12, bark, random);
    }
  }

  const mainCount = young ? 5 : ancient ? 9 : old ? 8 : 7;
  for (let i = 0; i < mainCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const level = 0.28 + (i / Math.max(1, mainCount - 1)) * 0.48;
    const start = { x: lerp(base.x, base.x + lean, level), y: height * (0.72 - level * 0.45) };
    const upward = -0.2 - random() * 0.42;
    const angle = side < 0 ? Math.PI + upward : upward;
    const reach = width * (young ? 0.17 : ancient ? 0.31 : old ? 0.29 : 0.25) * (0.72 + random() * 0.5);
    growBranch(image, start, angle, reach, trunkWidth * (0.48 - level * 0.18), 0,
      ancient ? 4 : 3, (random() - 0.5) * 0.08, bark, random, tips);
  }

  if (options.season === "winter" || options.season === "sparse" || dead) {
    if (options.season === "winter") {
      const snow = [177, 190, 188];
      for (let y = 0; y < height - 10 * scale; y++) for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (image.data[i + 3] && random() < 0.12 && (y % 3 !== 0)) {
          image.data[i] = snow[0]; image.data[i + 1] = snow[1]; image.data[i + 2] = snow[2];
        }
      }
    }
  } else {
    const palette = foliagePalette(options.season);
    const density = dying ? 0.22 : young ? 0.68 : ancient ? 0.78 : 1;
    const leafTips = tips.filter((tip) => tip.depth >= 2);
    for (const tip of leafTips) {
      if (random() > density) continue;
      const size = width * (young ? 0.035 : old ? 0.046 : 0.05) * (0.65 + random() * 0.8);
      const offset = { x: tip.point.x + Math.cos(tip.angle) * size * 0.35,
        y: tip.point.y + Math.sin(tip.angle) * size * 0.35 };
      foliageMass(image, offset, size * (1.05 + random() * 0.35), size * (0.72 + random() * 0.28), palette, random);
    }
    const crownPuffs = young ? 5 : old ? 10 : 8;
    for (let i = 0; i < crownPuffs; i++) {
      const angle = (i / crownPuffs) * Math.PI * 2 + random() * 0.3;
      const radiusX = width * (young ? 0.16 : 0.245) * (0.78 + random() * 0.28);
      const radiusY = height * (young ? 0.12 : 0.15) * (0.78 + random() * 0.25);
      const center = { x: crownCenter.x + Math.cos(angle) * radiusX, y: crownCenter.y + Math.sin(angle) * radiusY };
      if (random() < density) foliageMass(image, center, width * 0.052 * (0.75 + random() * 0.55),
        height * 0.042 * (0.75 + random() * 0.55), palette, random);
    }
  }

  const pivot: [number, number] = [Math.round(base.x), Math.round(base.y)];
  return { image, seed: options.seed, age: options.age, season: options.season, pivot, algorithmVersion: VERSION };
}
