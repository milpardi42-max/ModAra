/**
 * Guest identity + local persistence for shoppers who are not signed in.
 *
 * Guests keep their cart and wishlist in localStorage; the moment they sign in
 * the data is merged into their account (see CartContext / WishlistContext) so
 * nothing is ever lost and no login wall blocks browsing.
 */

import { supabase, type Product } from './supabase';

const GUEST_ID_KEY = 'modara-guest-id';
export const GUEST_CART_KEY = 'modara-guest-cart';
export const GUEST_WISHLIST_KEY = 'modara-guest-wishlist';

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Stable per-browser identifier used as the cart "owner" for guests. */
export function getGuestId(): string {
  const store = storage();
  if (!store) return 'guest-anonymous';
  let id = store.getItem(GUEST_ID_KEY);
  if (!id) {
    id = `guest-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    store.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

export function readJson<T>(key: string, fallback: T): T {
  const store = storage();
  if (!store) return fallback;
  try {
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or private mode: in-memory state still works for this session */
  }
}

export function removeKey(key: string): void {
  storage()?.removeItem(key);
}

/** Cart line shape used for the guest (localStorage) cart. */
export type GuestCartLine = {
  id: string;
  product_id: string;
  quantity: number;
  variant?: string | null;
  created_at: string;
};

let productsCache: Product[] | null = null;
let productsPending: Promise<Product[]> | null = null;

/** Catalogue cache so guest cart/wishlist rows can be hydrated with product data. */
export function loadAllProducts(): Promise<Product[]> {
  if (productsCache) return Promise.resolve(productsCache);
  if (productsPending) return productsPending;
  productsPending = (async () => {
    const { data } = await supabase.from('products').select('*');
    productsCache = (data as Product[]) ?? [];
    return productsCache;
  })();
  return productsPending;
}

export function invalidateProductsCache(): void {
  productsCache = null;
  productsPending = null;
}
