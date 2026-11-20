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
  let opaquePixelCount = 0; let weightedX = 0;\n  let baseWeightedX = 0; let basePixelCount = 0;
  for (let y = 0; y < source.height; y++) {
    let rowCount = 0;
    for (let x = 0; x < source.width; x++) {
      const offset = (y * source.width + x) * 4;
      if (source.data[offset + 3] < 16) continue;
      rowCount++; opaquePixelCount++;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      weightedX += x;
      const key = [0, 1, 2].map((channel) => Math.round(source.data[offset + channel] / 16) * 16).join(",");
      colors.set(key, (colors.get(key) ?? 0) + 1);
    }
    rowOccupancy.push(rowCount / source.width);
  }
  if (!opaquePixelCount) throw new Error("The reference contains no visible tree pixels.");
  const dominantColors = [...colors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([key]) =>
    "#" + key.split(",").map((part) => clamp(Number(part), 0, 255).toString(16).padStart(2, "0")).join("")
  );
  return {
    width: source.width, height: source.height,
    alphaBounds: { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
    baseAnchor: { x: Math.round(weightedX / opaquePixelCount), y: maxY },
    trunkAxisX: weightedX / opaquePixelCount, rowOccupancy, dominantColors, opaquePixelCount
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
  const output = new Uint8ClampedArray(source.width * source.height * 4);
  for (let y = 0; y < source.height; y++) {
    const vertical = y / Math.max(1, source.height - 1);
    const scale = 1 + (options.widthScale - 1) * (0.35 + vertical * 0.65);
    const shift = options.lean * source.width * (1 - vertical);
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

export const REFERENCE_TREE_ALGORITHM_VERSION = ALGORITHM_VERSION;
