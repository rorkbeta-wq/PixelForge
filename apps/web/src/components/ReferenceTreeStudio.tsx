import { useEffect, useMemo, useRef, useState } from "react";
import type { AssetManifestEntry } from "@pixelforge/core";
import { saveGeneratedAsset, type StoredAsset } from "../lib/asset-library";
import {
  analyzeReference,
  generateTreeFromReference,
  cropTransparentBounds,
  extractConnectedComponents,
  REFERENCE_TREE_ALGORITHM_VERSION,
  removeCornerBackground,
  type PixelImage,
  type ReferenceAnalysis,
  type VariationOptions
} from "../lib/reference-tree";

interface ReferenceTreeStudioProps {
  onAssetSaved: (asset: StoredAsset) => void;
}

type Season = VariationOptions["season"];

async function fileToPixels(file: File): Promise<PixelImage> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas 2D is unavailable.");
    context.drawImage(bitmap, 0, 0);
    const image = context.getImageData(0, 0, bitmap.width, bitmap.height);
    return { width: image.width, height: image.height, data: new Uint8ClampedArray(image.data) };
  } finally {
    bitmap.close();
  }
}

async function pixelsToBlob(image: PixelImage): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable.");
  context.putImageData(new ImageData(image.data, image.width, image.height), 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG export failed.")), "image/png");
  });
}

function ReferenceTreeStudio({ onAssetSaved }: ReferenceTreeStudioProps) {
  const [sourceName, setSourceName] = useState("");
  const [source, setSource] = useState<PixelImage | null>(null);
  const [cleaned, setCleaned] = useState<PixelImage | null>(null);
  const [components, setComponents] = useState<PixelImage[]>([]);
  const [analysis, setAnalysis] = useState<ReferenceAnalysis | null>(null);
  const [variation, setVariation] = useState<PixelImage | null>(null);
  const [tolerance, setTolerance] = useState(32);
  const [age, setAge] = useState<"young" | "mature" | "old">("mature");
  const [season, setSeason] = useState<Season>("summer");
  const [seed, setSeed] = useState("12345");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas || !variation) return;
    canvas.width = variation.width;
    canvas.height = variation.height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.imageSmoothingEnabled = false;
    context.putImageData(new ImageData(variation.data, variation.width, variation.height), 0, 0);
  }, [variation]);

  const analyze = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Choose a PNG, JPEG, or WebP image.");
      return;
    }
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const pixels = await fileToPixels(file);
      if (pixels.width * pixels.height > 16_000_000) throw new Error("Reference images must be 16 megapixels or smaller.");
      setSource(pixels);
      setSourceName(file.name.replace(/\.[^.]+$/, "") || "tree-reference");
      const backgroundRemoved = removeCornerBackground(pixels, tolerance);
      const detected = extractConnectedComponents(backgroundRemoved, Math.max(24, Math.floor(pixels.width * pixels.height * 0.00008)));
      setComponents(detected);
      const selected = detected.length === 1 ? cropTransparentBounds(detected[0], 2) : null;
      setCleaned(selected);
      setAnalysis(selected ? analyzeReference(selected) : null);
      setVariation(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to analyze this image.");
    } finally {
      setBusy(false);
    }
  };

  const reprocess = () => {
    if (!source) return;
    try {
      const backgroundRemoved = removeCornerBackground(source, tolerance);
      const detected = extractConnectedComponents(backgroundRemoved, Math.max(24, Math.floor(source.width * source.height * 0.00008)));
      setComponents(detected);
      const cropped = detected.length === 1 ? cropTransparentBounds(detected[0], 2) : null;
      setCleaned(cropped);
      setAnalysis(cropped ? analyzeReference(cropped) : null);
      setVariation(null);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to process the reference.");
    }
  };

  const selectComponent = (index: number) => {
    const selected = components[index];
    if (!selected) return;
    const cropped = cropTransparentBounds(selected, 2);
    setCleaned(cropped);
    setAnalysis(analyzeReference(cropped));
    setVariation(null);
    setError(null);
  };

  const generate = () => {
    if (!cleaned) return;
    const parsedSeed = Number(seed);
    if (!Number.isSafeInteger(parsedSeed) || parsedSeed < 0 || parsedSeed > 0xffffffff) {
      setError("Seed must be an integer between 0 and 4294967295.");
      return;
    }
    try {
      const generated = generateTreeFromReference(cleaned, { seed: parsedSeed, age, season });
      setVariation(generated.image);
      setStatus("A new tree structure was generated from the reference proportions and palette.");
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Variant generation failed.");
    }
  };

  const saveImage = async (image: PixelImage, kind: "reference" | "variant") => {
    setBusy(true);
    setError(null);
    try {
      const blob = await pixelsToBlob(image);
      const parsedSeed = Number(seed);
      const manifest: AssetManifestEntry = {
        id: crypto.randomUUID(),
        name: kind === "reference" ? `${sourceName}-reference` : `${sourceName}-${age}-${season}-${parsedSeed}`,
        category: "sprite",
        mimeType: "image/png",
        width: image.width,
        height: image.height,
        createdAt: new Date().toISOString(),
        source: {
          generatorId: kind === "reference" ? "reference-import" : "reference-tree-generator",
          generatorVersion: REFERENCE_TREE_ALGORITHM_VERSION,
          seed: kind === "variant" ? parsedSeed : null,
          upstreamRepository: null,
          license: null
        },
        tags: ["tree", "reference-based", kind]
      };
      const stored = await saveGeneratedAsset(blob, manifest);
      onAssetSaved(stored);
      setStatus(kind === "reference" ? "Clean reference saved to the asset library." : "Reference-derived variant saved to the asset library.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save the image.");
    } finally {
      setBusy(false);
    }
  };

  const palette = useMemo(() => analysis?.dominantColors ?? [], [analysis]);

  return (
    <section className="reference-tree-studio">
      <div className="reference-intro">
        <div>
          <div className="eyebrow">REFERENCE-BASED GENERATOR</div>
          <h3>Tree reference</h3>
          <p>Use an approved tree sprite as the source for analysis and controlled variants. Processing stays on this device.</p>
        </div>
        <label className="button button-muted reference-upload">
          {busy ? "Processing…" : "Load tree reference"}
          <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void analyze(file);
            event.currentTarget.value = "";
          }} />
        </label>
      </div>

      <div className="reference-workspace">
        <div className="reference-controls">
          <label>BACKGROUND TOLERANCE <strong>{tolerance}</strong>
            <input type="range" min="0" max="120" value={tolerance} onChange={(event) => setTolerance(Number(event.target.value))} />
          </label>
          <button className="button button-muted" type="button" disabled={!source || busy} onClick={reprocess}>Reprocess background</button>
          <div className="reference-divider" />
          <label>TREE AGE
            <select value={age} onChange={(event) => setAge(event.target.value as typeof age)}>
              <option value="young">Young</option>
              <option value="mature">Mature</option>
              <option value="old">Old</option>
            </select>
          </label>
          <label>SEASON
            <select value={season} onChange={(event) => setSeason(event.target.value as Season)}>
              <option value="summer">Summer</option>
              <option value="autumn">Autumn</option>
              <option value="winter">Winter</option>
              <option value="sparse">Almost leafless</option>
            </select>
          </label>
          <label>SEED
            <input type="number" min="0" max="4294967295" step="1" value={seed} onChange={(event) => setSeed(event.target.value)} />
          </label>
          <button className="button button-primary" type="button" disabled={!cleaned || busy} onClick={generate}>Generate variant</button>
          <button className="button button-muted" type="button" disabled={!cleaned || busy} onClick={() => cleaned && void saveImage(cleaned, "reference")}>Save clean reference</button>
          <button className="button button-primary" type="button" disabled={!variation || busy} onClick={() => variation && void saveImage(variation, "variant")}>Save variant</button>
        </div>

        <div className="reference-preview-column">
          {components.length > 1 && !cleaned && <div className="reference-component-picker"><strong>Detected {components.length} separate sprites — choose one tree</strong><div>{components.map((item, index) => <button type="button" key={index} onClick={() => selectComponent(index)}><ComponentPreview image={item} /><span>Tree {index + 1}</span></button>)}</div></div>}
          <div className="reference-preview checkerboard">
            {variation ? <canvas ref={previewRef} /> : cleaned ? <ReferenceImagePreview image={cleaned} /> : <span>{components.length > 1 ? "Choose a tree from the detected sprites above." : "Load a tree image to begin."}</span>}
          </div>
          <div className="reference-preview-caption">{variation ? "GENERATED VARIANT" : cleaned ? "CLEANED REFERENCE" : "PREVIEW"}</div>
          {analysis && <div className="reference-analysis">
            <div><span>Canvas</span><strong>{analysis.width} × {analysis.height}</strong></div>
            <div><span>Visible pixels</span><strong>{analysis.opaquePixelCount.toLocaleString()}</strong></div>
            <div><span>Base anchor</span><strong>{analysis.baseAnchor.x}, {analysis.baseAnchor.y}</strong></div>
            <div><span>Silhouette</span><strong>{analysis.alphaBounds.width} × {analysis.alphaBounds.height}</strong></div>
            <div className="reference-palette"><span>Dominant palette</span><div>{palette.map((color) => <i key={color} title={color} style={{ backgroundColor: color }} />)}</div></div>
          </div>}
        </div>
      </div>
      {status && <div className="reference-status">{status}</div>}
      {error && <div className="asset-error" role="alert">{error}</div>}
      <p className="reference-caveat">Generated trees use a new seeded branch layout and foliage clusters. The reference supplies proportions and palette; it is not copied pixel-for-pixel.</p>
    </section>
  );
}

function ComponentPreview({ image }: { image: PixelImage }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    canvas.width = image.width; canvas.height = image.height;
    context.putImageData(new ImageData(image.data, image.width, image.height), 0, 0);
  }, [image]);
  return <canvas ref={canvasRef} />;
}

function ReferenceImagePreview({ image }: { image: PixelImage }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    canvas.width = image.width;
    canvas.height = image.height;
    context.putImageData(new ImageData(image.data, image.width, image.height), 0, 0);
  }, [image]);
  return <canvas ref={canvasRef} aria-label="Cleaned tree reference" />;
}

export default ReferenceTreeStudio;
