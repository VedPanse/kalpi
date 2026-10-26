import type { StoreData } from './types';
import type { ModelCatalog } from './model3d';

/** Reads a Shopify store's public catalogue through the Python helper. */
export async function fetchStore(store: string): Promise<StoreData> {
  const res = await fetch('/api/products?store=' + encodeURIComponent(store));
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Could not read that store.');
  if (!data.products?.length) throw new Error('That store has no products with photos.');
  return data as StoreData;
}

/** Product photos go through the helper so three.js can use them as textures. */
export function imageUrl(src: string): string {
  return '/img?u=' + encodeURIComponent(src);
}

export function cartUrl(store: string, variantId: number): string {
  return `https://${store}/cart/${variantId}:1`;
}

export function productUrl(store: string, handle: string): string {
  return `https://${store}/products/${handle}`;
}

/** 3D models made by tools/make3d.py for this store, if any. */
export async function fetchModels(store: string): Promise<ModelCatalog | null> {
  try {
    const res = await fetch('/api/models?store=' + encodeURIComponent(store));
    return res.ok ? ((await res.json()) as ModelCatalog) : null;
  } catch {
    return null;
  }
}

export function modelDir(store: string): string {
  return '/models/' + store.replace(/^www\./, '') + '/';
}
