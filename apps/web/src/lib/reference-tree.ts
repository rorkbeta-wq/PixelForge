export interface PixelImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface ReferenceAnalysis {
  readonly width: number;
  readonly height: number;
  readonly alphaBounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly baseAnchor: { readonly x: number; readonly y: number };
  readonly trunkAxisX: number;
  readonly rowOccupancy: readonly number[];
  readonly dominantColors: readonly string[];
  readonly opaquePixelCount: number;
}

export interface VariationOptions {
  readonly seed: number;
  readonly widthScale: number;
  readonly lean: number;
  readonly season: "summer" | "autumn" | "winter";
}

const ALGORITHM_VERSION = "0.1.0";
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function colorDistance(a: readonly number[], b: readonly number[]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

export function removeCornerBackground(source: PixelImage, tolerance: number): PixelImage {
  if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 441.7) {
    throw new RangeError("Background tolerance must be between 0 and 441.7.");
  }
  const { width, height, data } = source;
  if (width < 1 || height < 1 || data.length !== width * height * 4) {
    throw new RangeError("Image dimensions do not match its pixel data.");
  }
  const output = new Uint8ClampedArray(data);
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const corners = [0, width - 1, (height - 1) * width, height * width - 1];
  const backgrounds: number[][] = [];
  for (const index of corners) {
    const offset = index * 4;
    const color = [data[offset], data[offset + 1], data[offset + 2]];
    if (!backgrounds.some((entry) => colorDistance(entry, color) < 8)) backgrounds.push(color);
  }
  let head = 0;
  let tail = 0;
  for (const index of corners) {
    if (!visited[index]) {
      visited[index] = 1;
      queue[tail++] = index;
    }
  }
  while (head < tail) {
    const index = queue[head++];
    const offset = index * 4;
    const pixel = [data[offset], data[offset + 1], data[offset + 2]];
    if (!backgrounds.some((background) => colorDistance(pixel, background) <= tolerance)) continue;
    output[offset + 3] = 0;
    const x = index % width;
    const y = Math.floor(index / width);
    const neighbors = [x > 0 ? index - 1 : -1, x + 1 < width ? index + 1 : -1,
      y > 0 ? index - width : -1, y + 1 < height ? index + width : -1];
    for (const neighbor of neighbors) {
      if (neighbor >= 0 && !visited[neighbor]) {
        visited[neighbor] = 1;
        queue[tail++] = neighbor;
      }
    }
  }
  return { width, height, data: output };
}

export function cropTransparentBounds(source: PixelImage, padding = 0): PixelImage {
  let minX = source.width;
  let minY = source.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) {
    if (source.data[(y * source.width + x) * 4 + 3] > 0) {
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) throw new Error("No foreground pixels remain after background removal.");
  minX = Math.max(0, minX - padding); minY = Math.max(0, minY - padding);
  maxX = Math.min(source.width - 1, maxX + padding); maxY = Math.min(source.height - 1, maxY + padding);
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const from = ((minY + y) * source.width + minX) * 4;
    data.set(source.data.subarray(from, from + width * 4), y * width * 4);
  }
  return { width, height, data };
}


export function extractConnectedComponents(source: PixelImage, minimumPixels = 24): PixelImage[] {
  const total = source.width * source.height;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  const components: Array<{ pixels: number[]; minX: number; minY: number; maxX: number; maxY: number }> = [];
  for (let start = 0; start < total; start++) {
    if (visited[start] || source.data[start * 4 + 3] < 16) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    visited[start] = 1;
    const pixels: number[] = [];
    let minX = source.width; let minY = source.height; let maxX = -1; let maxY = -1;
    while (head < tail) {
      const index = queue[head++];
      pixels.push(index);
      const x = index % source.width;
      const y = Math.floor(index / source.width);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx; const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= source.width || ny >= source.height) continue;
        const neighbor = ny * source.width + nx;
        if (!visited[neighbor] && source.data[neighbor * 4 + 3] >= 16) {
          visited[neighbor] = 1;
          queue[tail++] = neighbor;
        }
      }
    }
    if (pixels.length >= minimumPixels) components.push({ pixels, minX, minY, maxX, maxY });
  }
  components.sort((a, b) => a.minY - b.minY || a.minX - b.minX);
  return components.map((component) => {
    const width = component.maxX - component.minX + 1;
    const height = component.maxY - component.minY + 1;
    const data = new Uint8ClampedArray(width * height * 4);
    for (const index of component.pixels) {
      const x = index % source.width - component.minX;
      const y = Math.floor(index / source.width) - component.minY;
      const from = index * 4;
      data.set(source.data.subarray(from, from + 4), (y * width + x) * 4);
    }
    return { width, height, data };
  });
}

export function analyzeReference(source: PixelImage): ReferenceAnalysis {
  const rowOccupancy: number[] = [];
  const colors = new Map<string, number>();
  let minX = source.width; let minY = source.height; let maxX = -1; let maxY = -1;
  let opaquePixelCount = 0; let weightedX = 0;
  let baseWeightedX = 0; let basePixelCount = 0;
  for (let y = 0; y < source.height; y++) {
    let rowCount = 0;
    for (let x = 0; x < source.width; x++) {
      const offset = (y * source.width + x) * 4;
      if (source.data[offset + 3] < 16) continue;
      rowCount++; opaquePixelCount++;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      weightedX += x;
      if (y >= source.height * 0.72) { baseWeightedX += x; basePixelCount++; }
      const key = [0, 1, 2].map((channel) => Math.round(source.data[offset + channel] / 16) * 16).join(",");
      colors.set(key, (colors.get(key) ?? 0) + 1);
    }
    rowOccupancy.push(rowCount / source.width);
  }
  if (!opaquePixelCount) throw new Error("The reference contains no visible tree pixels.");
  const dominantColors = [...colors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([key]) =>
    "#" + key.split(",").map((part) => clamp(Number(part), 0, 255).toString(16).padStart(2, "0")).join("")
  );
  const trunkAxisX = basePixelCount ? baseWeightedX / basePixelCount : weightedX / opaquePixelCount;
  return {
    width: source.width, height: source.height,
    alphaBounds: { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
    baseAnchor: { x: Math.round(trunkAxisX), y: maxY },
    trunkAxisX, rowOccupancy, dominantColors, opaquePixelCount
  };
}

function mapSeason(red: number, green: number, blue: number, season: VariationOptions["season"]): [number, number, number] {
  if (season === "summer") return [red, green, blue];
  const luminance = red * 0.24 + green * 0.66 + blue * 0.1;
  const foliage = green > red * 0.82 && green > blue * 0.9 && green - red > 8;
  if (season === "autumn") return foliage
    ? [clamp(luminance * 1.22, 0, 255), clamp(luminance * 0.58, 0, 255), clamp(luminance * 0.12, 0, 255)]
    : [red, green, blue];
  return foliage
    ? [clamp(luminance * 0.76, 0, 255), clamp(luminance * 0.86, 0, 255), clamp(luminance * 1.12 + 24, 0, 255)]
    : [clamp(red * 0.92 + 12, 0, 255), clamp(green * 0.95 + 14, 0, 255), clamp(blue * 1.04 + 20, 0, 255)];
}

export function createReferenceVariation(source: PixelImage, options: VariationOptions): PixelImage {
  if (!Number.isSafeInteger(options.seed) || options.seed < 0 || options.seed > 0xffffffff) {
    throw new RangeError("Seed must be an unsigned 32-bit integer.");
  }
  if (options.widthScale < 0.8 || options.widthScale > 1.2 || options.lean < -0.08 || options.lean > 0.08) {
    throw new RangeError("Width and lean variation are outside the supported range.");
  }
  const centerX = analyzeReference(source).trunkAxisX;
  let state = (options.seed >>> 0) || 0x9e3779b9;
  state = Math.imul(state ^ (state >>> 16), 0x45d9f3b) >>> 0;
  const seedWidthOffset = ((state & 0xffff) / 65535 - 0.5) * 0.012;
  const seedLeanOffset = ((state >>> 16) / 65535 - 0.5) * 0.004;
  const output = new Uint8ClampedArray(source.width * source.height * 4);
  for (let y = 0; y < source.height; y++) {
    const vertical = y / Math.max(1, source.height - 1);
    const scale = 1 + (options.widthScale - 1 + seedWidthOffset) * (0.35 + vertical * 0.65);
    const shift = (options.lean + seedLeanOffset) * source.width * (1 - vertical);
    for (let x = 0; x < source.width; x++) {
      const sourceX = Math.round(centerX + (x - centerX - shift) / scale);
      if (sourceX < 0 || sourceX >= source.width) continue;
      const targetOffset = (y * source.width + x) * 4;
      const sourceOffset = (y * source.width + sourceX) * 4;
      const alpha = source.data[sourceOffset + 3];
      if (!alpha) continue;
      const [red, green, blue] = mapSeason(source.data[sourceOffset], source.data[sourceOffset + 1],
        source.data[sourceOffset + 2], options.season);
      output[targetOffset] = red; output[targetOffset + 1] = green;
      output[targetOffset + 2] = blue; output[targetOffset + 3] = alpha;
    }
  }
  return { width: source.width, height: source.height, data: output };
}


export interface TreeGenerationOptions {
  readonly seed: number;
  readonly season: "summer" | "autumn" | "winter" | "sparse";
  readonly age: "young" | "mature" | "old";
}

export interface GeneratedTree {
  readonly image: PixelImage;
  readonly analysis: ReferenceAnalysis;
  readonly seed: number;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hexRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >>> 16) & 255, (value >>> 8) & 255, value & 255];
}

function setPixel(image: PixelImage, x: number, y: number, color: readonly number[]): void {
  const px = Math.round(x); const py = Math.round(y);
  if (px < 0 || py < 0 || px >= image.width || py >= image.height) return;
  const offset = (py * image.width + px) * 4;
  image.data[offset] = color[0]; image.data[offset + 1] = color[1];
  image.data[offset + 2] = color[2]; image.data[offset + 3] = 255;
}

function drawPixelLine(image: PixelImage, x0: number, y0: number, x1: number, y1: number,
  thickness: number, color: readonly number[]): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const radius = Math.max(0, Math.floor(thickness / 2));
    for (let oy = -radius; oy <= radius; oy++) for (let ox = -radius; ox <= radius; ox++) {
      if (ox * ox + oy * oy <= radius * radius + 1) setPixel(image, x + ox, y + oy, color);
    }
  }
}

function paintFoliageCluster(image: PixelImage, cx: number, cy: number, rx: number, ry: number,
  palette: readonly (readonly number[])[], random: () => number): void {
  const left = Math.floor(cx - rx); const right = Math.ceil(cx + rx);
  const top = Math.floor(cy - ry); const bottom = Math.ceil(cy + ry);
  for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
    const nx = (x - cx) / Math.max(1, rx);
    const ny = (y - cy) / Math.max(1, ry);
    const irregular = 0.78 + random() * 0.32;
    if (nx * nx + ny * ny > irregular) continue;
    const edge = nx * nx + ny * ny;
    const colorIndex = edge > 0.68 ? 0 : random() < 0.17 ? palette.length - 1 : Math.min(palette.length - 1, 1 + Math.floor(random() * Math.max(1, palette.length - 1)));
    setPixel(image, x, y, palette[colorIndex]);
  }
}

function deriveFoliagePalette(colors: readonly string[], season: TreeGenerationOptions["season"]): number[][] {
  const rgb = colors.map(hexRgb);
  const foliage = rgb.filter(([r, g, b]) => g >= r * 0.82 && g >= b * 0.82 && g - r > 4);
  const source = foliage.length >= 3 ? foliage : [[44, 76, 38], [65, 104, 48], [91, 128, 56], [129, 151, 72]];
  const sorted = source.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
  if (season === "autumn") return sorted.map(([r, g, b], index) => index % 2
    ? [clamp(r * 1.55 + 28, 0, 255), clamp(g * 0.72, 0, 255), clamp(b * 0.28, 0, 255)]
    : [clamp(r * 1.35 + 35, 0, 255), clamp(g * 0.9 + 12, 0, 255), clamp(b * 0.45, 0, 255)]);
  if (season === "winter") return [[54, 68, 66], [82, 99, 94], [123, 137, 130], [165, 176, 168]];
  return sorted;
}

export function generateTreeFromReference(reference: PixelImage, options: TreeGenerationOptions): GeneratedTree {
  if (!Number.isSafeInteger(options.seed) || options.seed < 0 || options.seed > 0xffffffff) {
    throw new RangeError("Seed must be an unsigned 32-bit integer.");
  }
  const analysis = analyzeReference(reference);
  const random = seededRandom(options.seed);
  const width = clamp(Math.round(reference.width * (options.age === "young" ? 0.82 : options.age === "old" ? 1.16 : 1)), 48, 512);
  const height = clamp(Math.round(reference.height * (options.age === "young" ? 0.78 : options.age === "old" ? 1.12 : 1)), 64, 640);
  const image: PixelImage = { width, height, data: new Uint8ClampedArray(width * height * 4) };
  const foliagePalette = deriveFoliagePalette(analysis.dominantColors, options.season);
  const barkSource = analysis.dominantColors.map(hexRgb).filter(([r, g, b]) => r > g * 1.08 && r > b * 1.08);
  const bark = barkSource.length ? barkSource.sort((a, b) => a[0] - b[0]) : [[45, 31, 25], [79, 49, 34], [112, 76, 49]];
  const trunkDark = bark[0]; const trunkMid = bark[Math.floor(bark.length / 2)]; const trunkLight = bark[bark.length - 1];
  const baseX = width * (0.48 + (random() - 0.5) * 0.06);
  const baseY = height - 2;
  const crownTop = height * (options.age === "young" ? 0.2 : 0.08);
  const crownBottom = height * (options.age === "young" ? 0.64 : 0.7);
  const crownCenterY = (crownTop + crownBottom) / 2;
  const crownRx = width * (options.age === "young" ? 0.27 : options.age === "old" ? 0.43 : 0.36);
  const crownRy = height * (options.age === "young" ? 0.24 : 0.3);
  const lean = (random() - 0.5) * width * 0.12 + (options.age === "old" ? (random() - 0.5) * width * 0.12 : 0);
  const trunkTopX = baseX + lean;
  const trunkWidth = Math.max(3, Math.round(width * (options.age === "young" ? 0.035 : options.age === "old" ? 0.075 : 0.052)));
  const trunkMidY = height * 0.57;
  drawPixelLine(image, baseX, baseY, trunkTopX, crownTop + crownRy * 0.42, trunkWidth, trunkDark);
  drawPixelLine(image, baseX - 1, baseY, trunkTopX - 1, crownTop + crownRy * 0.42, Math.max(1, trunkWidth - 2), trunkMid);
  drawPixelLine(image, baseX - trunkWidth * 0.25, baseY - 3, trunkTopX - trunkWidth * 0.2, crownTop + crownRy * 0.5, 1, trunkLight);
  if (options.age === "old") {
    drawPixelLine(image, baseX, baseY - height * 0.18, baseX + width * 0.12, height * 0.66, Math.max(2, trunkWidth * 0.55), trunkDark);
  }
  const branchTips: Array<{ x: number; y: number; reach: number }> = [];
  const branchCount = options.age === "young" ? 5 : options.age === "old" ? 11 : 8;
  for (let index = 0; index < branchCount; index++) {
    const side = index % 2 === 0 ? -1 : 1;
    const t = 0.24 + (index / Math.max(1, branchCount - 1)) * 0.57;
    const startY = baseY - height * t;
    const vertical = (startY - crownTop) / Math.max(1, crownBottom - crownTop);
    const reach = crownRx * (0.42 + random() * 0.48) * (options.age === "young" ? 0.72 : 1);
    const endX = baseX + lean * (1 - t) + side * reach;
    const endY = startY - height * (0.08 + random() * 0.12);
    const thickness = Math.max(1, Math.round(trunkWidth * (0.48 - vertical * 0.2)));
    drawPixelLine(image, baseX + lean * (1 - t), startY, endX, endY, thickness, trunkDark);
    drawPixelLine(image, baseX + lean * (1 - t) - 1, startY, endX - 1, endY, 1, trunkMid);
    branchTips.push({ x: endX, y: endY, reach });
    for (let twig = 0; twig < 2; twig++) {
      const twigSide = twig === 0 ? -1 : 1;
      const twigX = endX + twigSide * reach * (0.18 + random() * 0.2);
      const twigY = endY - height * (0.035 + random() * 0.055);
      drawPixelLine(image, endX, endY, twigX, twigY, 1, trunkMid);
      branchTips.push({ x: twigX, y: twigY, reach: reach * 0.45 });
    }
  }
  const clusterCount = options.age === "young" ? 13 : options.age === "old" ? 23 : 19;
  if (options.season !== "sparse" && options.season !== "winter") {
    for (let index = 0; index < clusterCount; index++) {
      const angle = random() * Math.PI * 2;
      const radius = Math.sqrt(random());
      const x = baseX + lean * 0.35 + Math.cos(angle) * crownRx * radius;
      const y = crownCenterY + Math.sin(angle) * crownRy * radius;
      const scale = 0.68 + random() * 0.58;
      paintFoliageCluster(image, x, y, crownRx * (0.13 + random() * 0.09) * scale,
        crownRy * (0.12 + random() * 0.08) * scale, foliagePalette, random);
    }
  } else {
    for (const tip of branchTips) {
      if (random() < 0.68) paintFoliageCluster(image, tip.x, tip.y, 2 + random() * 4, 2 + random() * 4,
        options.season === "winter" ? [[190, 198, 190], [220, 224, 216]] : [[73, 83, 59], [103, 105, 66]], random);
    }
  }
  if (options.season === "winter") {
    const snow = [207, 216, 215];
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      if (image.data[offset + 3] && random() < 0.11 && y < height * 0.72) {
        image.data[offset] = snow[0]; image.data[offset + 1] = snow[1]; image.data[offset + 2] = snow[2];
      }
    }
  }
  const cropped = cropTransparentBounds(image, 3);
  return { image: cropped, analysis, seed: options.seed };
}

export const REFERENCE_TREE_ALGORITHM_VERSION = "0.2.0";
