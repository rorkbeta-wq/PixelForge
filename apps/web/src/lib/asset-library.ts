import type { AssetCategory, AssetManifestEntry } from "@pixelforge/core";

const DATABASE_NAME = "pixelforge-assets";
const DATABASE_VERSION = 1;
const STORE_NAME = "assets";

export interface StoredAsset {
  manifest: AssetManifestEntry;
  blob: Blob;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "manifest.id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open the asset library."));
  });
}

async function runTransaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason: Error) => void) => void
): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    operation(transaction.objectStore(STORE_NAME), resolve, reject);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Asset library transaction failed."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Asset library transaction was aborted."));
    };
  });
}

export async function listStoredAssets(): Promise<StoredAsset[]> {
  return runTransaction("readonly", (store, resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as StoredAsset[]);
    request.onerror = () => reject(new Error("Unable to read the asset library."));
  });
}

export async function saveStoredAsset(
  file: File,
  category: AssetCategory
): Promise<StoredAsset> {
  if (file.type !== "image/png") {
    throw new Error("Only PNG images can be imported.");
  }
  const bitmap = await createImageBitmap(file);
  const manifest: AssetManifestEntry = {
    id: crypto.randomUUID(),
    name: file.name.replace(/\\.png$/i, "") || "Untitled asset",
    category,
    mimeType: "image/png",
    width: bitmap.width,
    height: bitmap.height,
    createdAt: new Date().toISOString(),
    source: {
      generatorId: "external-import",
      generatorVersion: "unknown",
      seed: null,
      upstreamRepository: null,
      license: null
    },
    tags: []
  };
  bitmap.close();
  const stored: StoredAsset = { manifest, blob: file.slice(0, file.size, "image/png") };
  await runTransaction("readwrite", (store, resolve, reject) => {
    const request = store.put(stored);
    request.onsuccess = () => resolve(stored);
    request.onerror = () => reject(new Error("Unable to save the imported asset."));
  });
  return stored;
}

export async function deleteStoredAsset(id: string): Promise<void> {
  await runTransaction("readwrite", (store, resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve(undefined);
    request.onerror = () => reject(new Error("Unable to delete the asset."));
  });
}
