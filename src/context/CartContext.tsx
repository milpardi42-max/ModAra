import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { supabase, type CartItem, type Product } from '../lib/supabase';
import { useAuth } from './AuthContext';
import {
  GUEST_CART_KEY,
  loadAllProducts,
  readJson,
  removeKey,
  writeJson,
  type GuestCartLine,
} from '../lib/guest';

type CartContextType = {
  items: CartItem[];
  loading: boolean;
  /** True while the shopper is browsing without an account. */
  isGuest: boolean;
  addToCart: (productId: string, quantity?: number, variant?: string | null) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  totalItems: number;
  totalPrice: number;
  refreshCart: () => Promise<void>;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

let lineSeq = 0;
function guestLineId(): string {
  lineSeq += 1;
  return `guest-line-${Date.now().toString(36)}-${lineSeq}`;
}

function hydrateGuestLines(lines: GuestCartLine[], products: Product[]): CartItem[] {
  return lines.map((line) => ({
    ...line,
    user_id: null,
    product: products.find((p) => p.id === line.product_id),
  }));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const previousUserRef = useRef<string | null | undefined>(undefined);

  const refreshCart = useCallback(async () => {
    setLoading(true);
    if (user) {
      const { data, error } = await supabase
        .from('cart_items')
        .select('*, product:products(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && data) setItems(data as unknown as CartItem[]);
    } else {
      const [lines, products] = await Promise.all([readJson<GuestCartLine[]>(GUEST_CART_KEY, []), loadAllProducts()]);
      setItems(hydrateGuestLines(lines, products));
    }
    setLoading(false);
  }, [user]);

  /** Fold the guest cart into the freshly signed-in account, then clear it. */
  const mergeGuestCart = useCallback(async (userId: string) => {
    const guestLines = readJson<GuestCartLine[]>(GUEST_CART_KEY, []);
    if (!guestLines.length) return;
    const { data: existing } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', userId);
    const rows = (existing as (CartItem & { variant?: string | null })[]) ?? [];
    for (const line of guestLines) {
      const match = rows.find((row) => row.product_id === line.product_id && (row.variant ?? null) === (line.variant ?? null));
      if (match) {
        await supabase
          .from('cart_items')
          .update({ quantity: match.quantity + line.quantity })
          .eq('id', match.id);
      } else {
        await supabase
          .from('cart_items')
          .insert({ user_id: userId, product_id: line.product_id, quantity: line.quantity, variant: line.variant ?? null });
      }
    }
    removeKey(GUEST_CART_KEY);
  }, []);

  useEffect(() => {
    const previous = previousUserRef.current;
    previousUserRef.current = user?.id ?? null;
    const signedIn = previous === null && Boolean(user);
    if (signedIn && user) {
      void mergeGuestCart(user.id).then(refreshCart);
      return;
    }
    void refreshCart();
  }, [user, mergeGuestCart, refreshCart]);

  const addToCart = async (productId: string, quantity = 1, variant: string | null = null) => {
    if (user) {
      const { data: existing } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id);
      const match = ((existing as (CartItem & { variant?: string | null })[]) ?? []).find(
        (row) => row.product_id === productId && (row.variant ?? null) === variant,
      );
      if (match) {
        await supabase.from('cart_items').update({ quantity: match.quantity + quantity }).eq('id', match.id);
      } else {
        await supabase.from('cart_items').insert({ user_id: user.id, product_id: productId, quantity, variant });
      }
      await refreshCart();
      return;
    }

    const lines = readJson<GuestCartLine[]>(GUEST_CART_KEY, []);
    const match = lines.find((line) => line.product_id === productId && (line.variant ?? null) === variant);
    if (match) {
      match.quantity += quantity;
    } else {
      lines.unshift({
        id: guestLineId(),
        product_id: productId,
        quantity,
        variant,
        created_at: new Date().toISOString(),
      });
    }
    writeJson(GUEST_CART_KEY, lines);
    await refreshCart();
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    if (user) {
      await supabase.from('cart_items').update({ quantity }).eq('id', itemId);
      await refreshCart();
      return;
    }
    const lines = readJson<GuestCartLine[]>(GUEST_CART_KEY, []);
    const line = lines.find((entry) => entry.id === itemId);
    if (line) {
      line.quantity = quantity;
      writeJson(GUEST_CART_KEY, lines);
    }
    await refreshCart();
  };

  const removeFromCart = async (itemId: string) => {
    if (user) {
      await supabase.from('cart_items').delete().eq('id', itemId);
      await refreshCart();
      return;
    }
    const lines = readJson<GuestCartLine[]>(GUEST_CART_KEY, []).filter((line) => line.id !== itemId);
    writeJson(GUEST_CART_KEY, lines);
    await refreshCart();
  };

  const clearCart = async () => {
    if (user) {
      await supabase.from('cart_items').delete().eq('user_id', user.id);
      await refreshCart();
      return;
    }
    removeKey(GUEST_CART_KEY);
    await refreshCart();
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.product?.price ?? 0) * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        loading,
        isGuest: !user,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalItems,
        totalPrice,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
