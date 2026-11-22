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
interface Palette { dark: number[]; mid: number[]; light: number[] }
interface Tip { point: Point; angle: number; depth: number; thickness: number }

export const OAK_TREE_ALGORITHM_VERSION = "0.5.0";
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function randomSource(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function put(image: PixelImage, x: number, y: number, color: readonly number[]): void {
  const px = Math.round(x), py = Math.round(y);
  if (px < 0 || py < 0 || px >= image.width || py >= image.height) return;
  const i = (py * image.width + px) * 4;
  image.data[i] = color[0]; image.data[i + 1] = color[1]; image.data[i + 2] = color[2]; image.data[i + 3] = 255;
}

function dab(image: PixelImage, x: number, y: number, radius: number, color: readonly number[]): void {
  const r = Math.max(0.65, radius), r2 = r * r;
  for (let py = Math.floor(y - r); py <= Math.ceil(y + r); py++) {
    for (let px = Math.floor(x - r); px <= Math.ceil(x + r); px++) {
      const dx = px - x, dy = py - y;
      if (dx * dx + dy * dy <= r2) put(image, px, py, color);
    }
  }
}

function line(image: PixelImage, a: Point, b: Point, width: number, color: readonly number[]): void {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(1, Math.ceil(length * 1.8));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    dab(image, mix(a.x, b.x, t), mix(a.y, b.y, t), Math.max(0.55, width * 0.5), color);
  }
}

function branch(image: PixelImage, start: Point, end: Point, bend: number, thickness: number,
  palette: Palette, random: () => number): void {
  const dx = end.x - start.x, dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const normal = { x: -dy / length, y: dx / length };
  const control = { x: (start.x + end.x) / 2 + normal.x * bend, y: (start.y + end.y) / 2 + normal.y * bend };
  const steps = Math.max(5, Math.ceil(length * 1.7));
  let previous = start;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, u = 1 - t;
    const next = { x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
      y: u * u * start.y + 2 * u * t * control.y + t * t * end.y };
    const taper = Math.pow(1 - t, 0.78);
    const w = Math.max(0.7, thickness * (0.13 + taper * 0.87));
    line(image, previous, next, w + 1.5, palette.dark);
    line(image, { x: previous.x - 0.65, y: previous.y }, { x: next.x - 0.65, y: next.y }, Math.max(0.7, w * 0.62), palette.mid);
    if (thickness > 4 && random() < 0.72) {
      const px = mix(previous.x, next.x, 0.5) - w * 0.13;
      const py = mix(previous.y, next.y, 0.5) - w * 0.16;
      put(image, px, py, palette.light);
    }
    previous = next;
  }
}

function grow(image: PixelImage, start: Point, angle: number, length: number, thickness: number,
  depth: number, maxDepth: number, bias: number, palette: Palette, random: () => number, tips: Tip[]): void {
  const bend = (random() - 0.5) * length * 0.24;
  const end = { x: start.x + Math.cos(angle) * length, y: start.y + Math.sin(angle) * length };
  branch(image, start, end, bend, thickness, palette, random);
  if (depth >= maxDepth || length < 5 || thickness < 0.85) {
    tips.push({ point: end, angle, depth, thickness });
    return;
  }
  const count = depth === 0 ? 2 : random() < 0.76 ? 2 : 1;
  for (let i = 0; i < count; i++) {
    const side = count === 1 ? (random() < 0.5 ? -1 : 1) : i === 0 ? -1 : 1;
    const spread = depth === 0 ? 0.32 + random() * 0.18 : 0.38 + random() * 0.24;
    const childAngle = angle + side * spread + bias + (random() - 0.5) * 0.14;
    const childLength = length * (depth === 0 ? 0.69 + random() * 0.08 : 0.62 + random() * 0.13);
    grow(image, end, childAngle, childLength, thickness * (0.59 + random() * 0.08),
      depth + 1, maxDepth, bias * 0.58, palette, random, tips);
  }
}

function foliageColors(season: OakSeason): number[][] {
  if (season === "autumn") return [
    [55, 25, 16], [94, 36, 16], [137, 48, 17], [178, 64, 19],
    [207, 84, 24], [229, 116, 31], [244, 151, 43], [255, 185, 66]
  ];
  return [
    [10, 22, 13], [17, 34, 17], [25, 46, 19], [34, 59, 22],
    [45, 73, 26], [59, 88, 30], [77, 105, 37], [105, 125, 45]
  ];
}

function makeLeafMass(image: PixelImage, center: Point, rx: number, ry: number,
  colors: number[][], random: () => number): void {
  const lobes = 7 + Math.floor(random() * 5);
  const radii = Array.from({ length: lobes }, () => 0.82 + random() * 0.3);
  const left = Math.max(0, Math.floor(center.x - rx * 1.3));
  const right = Math.min(image.width - 1, Math.ceil(center.x + rx * 1.3));
  const top = Math.max(0, Math.floor(center.y - ry * 1.3));
  const bottom = Math.min(image.height - 1, Math.ceil(center.y + ry * 1.3));
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      const nx = (x - center.x) / Math.max(1, rx), ny = (y - center.y) / Math.max(1, ry);
      const angle = (Math.atan2(ny, nx) + Math.PI * 2) % (Math.PI * 2);
      const sector = Math.floor(angle / (Math.PI * 2) * lobes) % lobes;
      const radial = Math.hypot(nx, ny);
      const edgeNoise = (random() - 0.5) * 0.13;
      if (radial > radii[sector] + edgeNoise) continue;
      const illumination = clamp(0.52 - ny * 0.24 - nx * 0.08 + (random() - 0.5) * 0.17, 0.02, 0.98);
      const shade = Math.min(colors.length - 1, Math.floor(illumination * colors.length));
      put(image, x, y, colors[shade]);
    }
  }
  // Small clustered highlights give the crown a pixel-art leaf texture rather than a smooth blob.
  const specks = Math.round(rx * ry * 0.045);
  for (let i = 0; i < specks; i++) {
    const x = center.x + (random() * 2 - 1) * rx * 0.82;
    const y = center.y + (random() * 2 - 1) * ry * 0.82;
    if (random() < 0.52) {
      const shade = 5 + Math.floor(random() * 3);
      dab(image, x, y, random() < 0.7 ? 0.8 : 1.25, colors[Math.min(colors.length - 1, shade)]);
    }
  }
}

function addSnow(image: PixelImage, random: () => number): void {
  const snow = [164, 177, 174], highlight = [205, 211, 202];
  for (let y = 0; y < image.height - 8; y++) {
    for (let x = 0; x < image.width; x++) {
      const i = (y * image.width + x) * 4;
      if (image.data[i + 3] === 0 || random() > 0.11) continue;
      const above = y > 0 ? ((y - 1) * image.width + x) * 4 : -1;
      if (above < 0 || image.data[above + 3] === 0) {
        const color = random() < 0.2 ? highlight : snow;
        image.data[i] = color[0]; image.data[i + 1] = color[1]; image.data[i + 2] = color[2];
      }
    }
  }
}

export function generateOak(options: OakGenerationOptions): OakGenerationResult {
  if (!Number.isSafeInteger(options.seed) || options.seed < 0 || options.seed > 0xffffffff) {
    throw new RangeError("Seed must be an integer between 0 and 4294967295.");
  }
  const random = randomSource(options.seed);
  const width = clamp(Math.round(options.width ?? 320), 192, 512);
  const height = clamp(Math.round(options.height ?? 352), 224, 640);
  const image: PixelImage = { width, height, data: new Uint8ClampedArray(width * height * 4) };
  const young = options.age === "young";
  const ancient = options.age === "ancient";
  const old = options.age === "old" || ancient || options.age === "dying" || options.age === "dead";
  const dying = options.age === "dying";
  const dead = options.age === "dead";
  const scale = width / 320;
  const base = { x: width * (0.5 + (random() - 0.5) * 0.035), y: height * 0.91 };
  const lean = (random() - 0.5) * width * (old ? 0.085 : 0.045);
  const mid = { x: base.x + lean * 0.42, y: height * 0.65 };
  const trunkTop = height * (young ? 0.43 : 0.37);
  const crownCenter = { x: base.x + lean, y: height * (young ? 0.29 : 0.27) };
  const trunkWidth = width * (young ? 0.033 : ancient ? 0.09 : mature ? 0.055 : old ? 0.075 : 0.064);
  const bark: Palette = { dark: [24, 14, 11], mid: [75, 39, 25], light: [133, 78, 44] };
  const tips: Tip[] = [];

  branch(image, base, mid, (random() - 0.5) * 9 * scale, trunkWidth, bark, random);
  branch(image, mid, { x: base.x + lean, y: trunkTop }, (random() - 0.5) * 12 * scale, trunkWidth * 0.76, bark, random);
  // Deep longitudinal bark grooves and warm ridges.
  for (let k = 0; k < Math.round(trunkWidth * 0.55); k++) {
    const xOffset = (random() - 0.5) * trunkWidth * 0.72;
    const start = { x: base.x + xOffset, y: height * 0.86 };
    const end = { x: base.x + lean + xOffset * 0.48 + (random() - 0.5) * 3 * scale, y: trunkTop + random() * 9 * scale };
    line(image, start, end, random() < 0.25 ? 1.5 : 0.8, random() < 0.68 ? bark.dark : bark.light);
  }

  if (old) {
    const splitY = height * (0.51 + random() * 0.045);
    const split = { x: base.x + lean * 0.78, y: splitY };
    const forkSpread = width * (ancient ? 0.095 : 0.065);
    branch(image, split, { x: split.x - forkSpread, y: trunkTop + height * 0.035 }, -5 * scale, trunkWidth * 0.42, bark, random);
    branch(image, split, { x: split.x + forkSpread * 1.1, y: trunkTop + height * 0.005 }, 6 * scale, trunkWidth * 0.4, bark, random);
  }

  // Roots radiate from the root flare, vary in length and fork near their ends.
  const roots = ancient ? 10 : old ? 8 : 7;
  for (let i = 0; i < roots; i++) {
    const t = i / (roots - 1);
    const angle = mix(Math.PI * 0.08, Math.PI * 0.92, t) + (random() - 0.5) * 0.17;
    const reach = width * (ancient ? 0.16 : old ? 0.135 : 0.105) * (0.66 + random() * 0.62);
    const end = { x: base.x + Math.cos(angle) * reach, y: base.y + Math.sin(angle) * reach * 0.36 };
    const start = { x: base.x + (random() - 0.5) * trunkWidth * 0.4, y: base.y - 3 * scale };
    branch(image, start, end, (random() - 0.5) * 8 * scale, trunkWidth * (0.2 + random() * 0.16), bark, random);
    if (random() < 0.72) {
      const fork = { x: mix(start.x, end.x, 0.66), y: mix(start.y, end.y, 0.66) };
      const forkEnd = { x: end.x + (random() - 0.5) * 13 * scale, y: end.y + (random() - 0.5) * 5 * scale };
      branch(image, fork, forkEnd, (random() - 0.5) * 3 * scale, trunkWidth * 0.1, bark, random);
    }
  }

  // Main scaffold limbs are distributed by height and side, not mirrored.
  const scaffold = young ? 6 : ancient ? 10 : old ? 9 : 8;
  for (let i = 0; i < scaffold; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const level = 0.25 + (i / Math.max(1, scaffold - 1)) * 0.54;
    const start = { x: base.x + lean * level, y: height * (0.75 - level * 0.43) };
    const upward = -0.19 - random() * 0.34;
    const angle = side < 0 ? Math.PI + Math.abs(upward) : upward;
    const reach = width * (young ? 0.18 : ancient ? 0.32 : old ? 0.29 : 0.26) * (0.72 + random() * 0.48);
    grow(image, start, angle, reach, trunkWidth * (0.48 - level * 0.17), 0,
      ancient ? 4 : 3, (random() - 0.5) * 0.08, bark, random, tips);
  }

  // Crown clusters follow branch tips, with a few inner masses to create a connected canopy.
  if (!dead && options.season !== "winter") {
    const colors = foliageColors(options.season);
    const density = options.season === "sparse" ? 0.1 : dying ? 0.2 : young ? 0.7 : ancient ? 0.82 : 0.94;
    for (const tip of tips) {
      if (tip.depth < 2 || random() > density) continue;
      const size = width * (young ? 0.033 : 0.039) * (0.7 + random() * 0.68);
      const center = { x: tip.point.x + Math.cos(tip.angle) * size * 0.24, y: tip.point.y + Math.sin(tip.angle) * size * 0.2 };
      makeLeafMass(image, center, size * (1.08 + random() * 0.38), size * (0.76 + random() * 0.3), colors, random);
    }
    const masses = options.season === "sparse" ? 2 : young ? 5 : old ? 8 : 7;
    for (let i = 0; i < masses; i++) {
      const angle = (i / masses) * Math.PI * 2 + random() * 0.42;
      const rx = width * (young ? 0.145 : 0.205) * (0.76 + random() * 0.42);
      const ry = height * (young ? 0.105 : 0.12) * (0.76 + random() * 0.4);
      const center = { x: crownCenter.x + Math.cos(angle) * rx, y: crownCenter.y + Math.sin(angle) * ry };
      makeLeafMass(image, center, width * 0.047 * (0.72 + random() * 0.48), height * 0.038 * (0.75 + random() * 0.48), colors, random);
    }
    // A few shadow pockets break up the canopy silhouette and expose branch structure.
    if (!young) {
      const holes = 2 + Math.floor(random() * 3);
      for (let i = 0; i < holes; i++) {
        const x = crownCenter.x + (random() - 0.5) * width * 0.34;
        const y = crownCenter.y + (random() - 0.5) * height * 0.2;
        const radius = width * (0.009 + random() * 0.009);
        for (let py = Math.floor(y - radius); py <= y + radius; py++) for (let px = Math.floor(x - radius); px <= x + radius; px++) {
          if ((px - x) ** 2 + (py - y) ** 2 < radius ** 2) {
            const index = (py * width + px) * 4;
            if (px >= 0 && py >= 0 && px < width && py < height && index >= 0 && index + 3 < image.data.length) image.data[index + 3] = 0;
          }
        }
      }
    }
  }

  if (options.season === "winter") addSnow(image, random);
  const pivot: [number, number] = [Math.round(base.x), Math.round(base.y)];
  return { image, seed: options.seed, age: options.age, season: options.season, pivot, algorithmVersion: OAK_TREE_ALGORITHM_VERSION };
}
