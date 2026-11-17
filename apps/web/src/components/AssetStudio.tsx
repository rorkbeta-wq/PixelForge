import { useEffect, useMemo, useRef, useState } from "react";
import {
  PPAETreeGenerator,
  TREE_SPECIES,
  TREE_STAGES,
  type GeneratedTree,
  type PPAEStyleProfile
} from "@pixelforge/ppae/tree";
import type { AssetCategory, AssetManifestEntry } from "@pixelforge/core";
import {
  deleteStoredAsset,
  listStoredAssets,
  saveGeneratedAsset,
  saveStoredAsset,
  type StoredAsset
} from "../lib/asset-library";

const categories: AssetCategory[] = [
  "sprite",
  "terrain-tile",
  "terrain-transition",
  "autotile-set",
  "animation"
];

const profiles: PPAEStyleProfile[] = [
  "micro-4x4",
  "micro-6x6",
  "classic-8x8",
  "standard-16x16",
  "detailed-32x32",
  "hybrid-24"
];

const generator = new PPAETreeGenerator();

function AssetStudio() {
  const [assets, setAssets] = useState<StoredAsset[]>([]);
  const [category, setCategory] = useState<AssetCategory>("sprite");
  const [filter, setFilter] = useState("all");
  const [species, setSpecies] = useState<(typeof TREE_SPECIES)[number]>("oak");
  const [stage, setStage] = useState<(typeof TREE_STAGES)[number]>("mature");
  const [profile, setProfile] = useState<PPAEStyleProfile>("detailed-32x32");
  const [environment, setEnvironment] = useState<"normal" | "autumn" | "snowy" | "blossom">("normal");
  const [seed, setSeed] = useState("12345");
  const [generated, setGenerated] = useState<GeneratedTree | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let active = true;
    listStoredAssets().then((items) => {
      if (active) setAssets(items.sort((a, b) => b.manifest.createdAt.localeCompare(a.manifest.createdAt)));
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Unable to load the asset library.");
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !generated) return;
    canvas.width = generated.width;
    canvas.height = generated.height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.imageSmoothingEnabled = false;
    context.putImageData(
      new ImageData(new Uint8ClampedArray(generated.pixels), generated.width, generated.height),
      0,
      0
    );
  }, [generated]);

  const visibleAssets = useMemo(
    () => filter === "all" ? assets : assets.filter((asset) => asset.manifest.category === filter),
    [assets, filter]
  );

  const generateTree = () => {
    const parsedSeed = Number(seed);
    if (!Number.isSafeInteger(parsedSeed) || parsedSeed < 0 || parsedSeed > 0xffffffff) {
      setError("Seed must be an integer between 0 and 4294967295.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = generator.generate({
        species,
        stage,
        profile,
        seed: parsedSeed,
        environment
      });
      setGenerated(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Tree generation failed.");
    } finally {
      setBusy(false);
    }
  };

  const saveGenerated = async () => {
    const canvas = canvasRef.current;
    if (!generated || !canvas) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((value) => value ? resolve(value) : reject(new Error("PNG export failed.")), "image/png");
      });
      const manifest: AssetManifestEntry = {
        id: crypto.randomUUID(),
        name: `${generated.species}-${generated.stage}-${generated.seed}`,
        category,
        mimeType: "image/png",
        width: generated.width,
        height: generated.height,
        createdAt: new Date().toISOString(),
        source: {
          generatorId: generated.generatorId,
          generatorVersion: generated.generatorVersion,
          seed: generated.seed,
          upstreamRepository: generated.upstreamRepository,
          license: generated.license
        },
        tags: ["tree", generated.species, generated.stage, "procedural"]
      };
      const stored = await saveGeneratedAsset(blob, manifest);
      setAssets((current) => [stored, ...current]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save the generated tree.");
    } finally {
      setBusy(false);
    }
  };

  const importFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      const imported: StoredAsset[] = [];
      for (const file of Array.from(files)) imported.push(await saveStoredAsset(file, category));
      setAssets((current) => [...imported, ...current]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  };

  const removeAsset = async (id: string) => {
    try {
      await deleteStoredAsset(id);
      setAssets((current) => current.filter((asset) => asset.manifest.id !== id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete the asset.");
    }
  };

  return (
    <div className="asset-studio">
      <div className="asset-toolbar">
        <div>
          <div className="eyebrow">ASSET STUDIO</div>
          <h2>Procedural asset generator</h2>
          <p>Generate deterministic tree sprites with PPAE and store them in your local library.</p>
        </div>
        <div className="asset-import-controls">
          <label className="asset-category-label" htmlFor="asset-category">SAVE AS</label>
          <select id="asset-category" value={category} onChange={(event) => setCategory(event.target.value as AssetCategory)}>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <label className="button button-muted" htmlFor="asset-file-input">Import PNG</label>
          <input id="asset-file-input" type="file" accept="image/png,.png" multiple disabled={busy} onChange={(event) => {
            void importFiles(event.currentTarget.files);
            event.currentTarget.value = "";
          }} />
        </div>
      </div>

      <section className="tree-generator">
        <div className="tree-generator-controls">
          <label>SPECIES
            <select value={species} onChange={(event) => setSpecies(event.target.value as typeof species)}>
              {TREE_SPECIES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
            </select>
          </label>
          <label>LIFE STAGE
            <select value={stage} onChange={(event) => setStage(event.target.value as typeof stage)}>
              {TREE_STAGES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
            </select>
          </label>
          <label>DETAIL PROFILE
            <select value={profile} onChange={(event) => setProfile(event.target.value as PPAEStyleProfile)}>
              {profiles.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>ENVIRONMENT
            <select value={environment} onChange={(event) => setEnvironment(event.target.value as typeof environment)}>
              <option value="normal">Normal</option>
              <option value="autumn">Autumn</option>
              <option value="snowy">Snowy</option>
              <option value="blossom">Blossom</option>
            </select>
          </label>
          <label>SEED
            <input inputMode="numeric" type="number" min="0" max="4294967295" step="1" value={seed} onChange={(event) => setSeed(event.target.value)} />
          </label>
          <button className="button button-primary" type="button" onClick={generateTree} disabled={busy}>
            {busy ? "Working…" : "Generate tree"}
          </button>
        </div>
        <div className="tree-generator-preview">
          {generated ? (
            <>
              <div className="tree-preview-image"><canvas ref={canvasRef} /></div>
              <div className="tree-preview-details">
                <strong>{generated.species.replaceAll("_", " ")} · {generated.stage}</strong>
                <span>{generated.width} × {generated.height} px</span>
                <span>Ground pivot: {generated.pivot[0]}, {generated.pivot[1]}</span>
                <span>Seed: {generated.seed} · {generated.profile}</span>
                <button className="button button-primary" type="button" onClick={() => void saveGenerated()} disabled={busy}>
                  Save to library
                </button>
              </div>
            </>
          ) : (
            <div className="tree-preview-placeholder">Choose tree parameters and generate your first sprite.</div>
          )}
        </div>
      </section>

      <div className="asset-library-toolbar">
        <span>{assets.length} {assets.length === 1 ? "asset" : "assets"}</span>
        <select aria-label="Filter assets by category" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">All categories</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      {error && <div className="asset-error" role="alert">{error}</div>}
      {visibleAssets.length === 0 ? (
        <div className="asset-empty">
          <span className="asset-empty-icon">▧</span>
          <strong>{assets.length ? "No assets in this category" : "Your library is empty"}</strong>
          <span>Generated and imported assets are stored locally in this browser.</span>
        </div>
      ) : (
        <div className="asset-grid">
          {visibleAssets.map((asset) => <AssetCard key={asset.manifest.id} asset={asset} onDelete={removeAsset} />)}
        </div>
      )}
      <div className="asset-storage-note">Stored in this browser · IndexedDB · Not uploaded to a server</div>
    </div>
  );
}

function AssetCard({ asset, onDelete }: { asset: StoredAsset; onDelete: (id: string) => void }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    const url = URL.createObjectURL(asset.blob);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [asset.blob]);

  return (
    <article className="asset-card">
      <div className="asset-preview">
        {src && <img src={src} alt={asset.manifest.name} />}
      </div>
      <div className="asset-card-info">
        <strong title={asset.manifest.name}>{asset.manifest.name}</strong>
        <span>{asset.manifest.width} × {asset.manifest.height} · {asset.manifest.category}</span>
      </div>
      <button className="asset-delete" type="button" onClick={() => onDelete(asset.manifest.id)} aria-label={`Delete ${asset.manifest.name}`}>×</button>
    </article>
  );
}

export default AssetStudio;
