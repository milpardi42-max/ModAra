import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { supabase, type Product } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { GUEST_WISHLIST_KEY, loadAllProducts, readJson, removeKey, writeJson } from '../lib/guest';

type WishlistContextType = {
  /** Product ids currently saved. */
  ids: string[];
  /** Hydrated products, in save order. */
  products: Product[];
  loading: boolean;
  isSaved: (productId: string) => boolean;
  toggle: (productId: string) => Promise<void>;
  clear: () => Promise<void>;
};

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const previousUserRef = useRef<string | null | undefined>(undefined);

  const hydrate = useCallback(async (productIds: string[]) => {
    const catalogue = await loadAllProducts();
    const ordered = productIds
      .map((id) => catalogue.find((product) => product.id === id))
      .filter((product): product is Product => Boolean(product));
    setProducts(ordered);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    if (user) {
      const { data } = await supabase.from('wishlist').select('product_id').eq('user_id', user.id);
      const nextIds = ((data as { product_id: string }[]) ?? []).map((row) => row.product_id);
      setIds(nextIds);
      await hydrate(nextIds);
    } else {
      const nextIds = readJson<string[]>(GUEST_WISHLIST_KEY, []);
      setIds(nextIds);
      await hydrate(nextIds);
    }
    setLoading(false);
  }, [user, hydrate]);

  useEffect(() => {
    const previous = previousUserRef.current;
    previousUserRef.current = user?.id ?? null;
    if (previous === null && user) {
      // Merge guest wishlist into the account.
      const guestIds = readJson<string[]>(GUEST_WISHLIST_KEY, []);
      void (async () => {
        for (const productId of guestIds) {
          const { data: existing } = await supabase
            .from('wishlist')
            .select('id')
            .eq('user_id', user.id)
            .eq('product_id', productId)
            .maybeSingle();
          if (!existing) {
            await supabase.from('wishlist').insert({ user_id: user.id, product_id: productId });
          }
        }
        removeKey(GUEST_WISHLIST_KEY);
        await refresh();
      })();
      return;
    }
    void refresh();
  }, [user, refresh]);

  const toggle = async (productId: string) => {
    const saved = ids.includes(productId);
    if (user) {
      if (saved) {
        await supabase.from('wishlist').delete().eq('user_id', user.id).eq('product_id', productId);
      } else {
        await supabase.from('wishlist').insert({ user_id: user.id, product_id: productId });
      }
      await refresh();
      return;
    }
    const next = saved ? ids.filter((id) => id !== productId) : [productId, ...ids];
    writeJson(GUEST_WISHLIST_KEY, next);
    setIds(next);
    await hydrate(next);
  };

  const clear = async () => {
    if (user) {
      await supabase.from('wishlist').delete().eq('user_id', user.id);
      await refresh();
      return;
    }
    removeKey(GUEST_WISHLIST_KEY);
    setIds([]);
    setProducts([]);
  };

  return (
    <WishlistContext.Provider
      value={{ ids, products, loading, isSaved: (productId) => ids.includes(productId), toggle, clear }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
