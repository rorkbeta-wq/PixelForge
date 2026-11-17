import { useEffect, useMemo, useState } from "react";
import { deleteStoredAsset, listStoredAssets, saveStoredAsset, type StoredAsset } from "../lib/asset-library";
import type { AssetCategory } from "@pixelforge/core";

const categories: AssetCategory[] = [
  "sprite",
  "terrain-tile",
  "terrain-transition",
  "autotile-set",
  "animation"
];

function AssetStudio() {
  const [assets, setAssets] = useState<StoredAsset[]>([]);
  const [category, setCategory] = useState<AssetCategory>("sprite");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listStoredAssets().then((items) => {
      if (active) setAssets(items.sort((a, b) => b.manifest.createdAt.localeCompare(a.manifest.createdAt)));
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Unable to load the asset library.");
    });
    return () => { active = false; };
  }, []);

  const visibleAssets = useMemo(
    () => filter === "all" ? assets : assets.filter((asset) => asset.manifest.category === filter),
    [assets, filter]
  );

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
          <h2>Asset library</h2>
          <p>Import PNG exports from procedural generators and keep them locally in this browser.</p>
        </div>
        <div className="asset-import-controls">
          <label className="asset-category-label" htmlFor="asset-category">CATEGORY</label>
          <select id="asset-category" value={category} onChange={(event) => setCategory(event.target.value as AssetCategory)}>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <label className="button button-primary" htmlFor="asset-file-input">{busy ? "Importing…" : "Import PNG"}</label>
          <input id="asset-file-input" type="file" accept="image/png,.png" multiple disabled={busy} onChange={(event) => {
            void importFiles(event.currentTarget.files);
            event.currentTarget.value = "";
          }} />
        </div>
      </div>

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
          <span>Export a PNG from a generator such as PPAE Playground, then import it here.</span>
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
