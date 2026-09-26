import { Heart, Search, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

type UtilityBarProps = {
  onOpenSearch: () => void;
  onOpenWishlist: () => void;
};

/**
 * The only persistent chrome on the storefront — a floating utility pill with
 * search, wishlist and cart. It deliberately carries no navigation menu: the
 * site is explored by scrolling through chapters, and these three tools are
 * always one thumb-reach away.
 */
export default function UtilityBar({ onOpenSearch, onOpenWishlist }: UtilityBarProps) {
  const { totalItems } = useCart();
  const { ids: wishlistIds } = useWishlist();

  return (
    <nav
      aria-label="ابزارهای فروشگاه"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2"
    >
      <div className="flex items-center gap-1 rounded-full border border-white/70 bg-white/92 p-1.5 shadow-[0_12px_35px_rgba(28,25,20,0.16)] backdrop-blur-xl">
        <button
          onClick={onOpenSearch}
          aria-label="جستجوی محصولات"
          className="flex h-11 w-11 items-center justify-center rounded-full text-dark-600 transition-colors hover:bg-dark-50 hover:text-amber-700 active:scale-95"
        >
          <Search className="h-5 w-5" />
        </button>

        <button
          onClick={onOpenWishlist}
          aria-label={`علاقه‌مندی‌ها (${wishlistIds.length})`}
          className="relative flex h-11 w-11 items-center justify-center rounded-full text-dark-600 transition-colors hover:bg-dark-50 hover:text-error-500 active:scale-95"
        >
          <Heart className="h-5 w-5" />
          {wishlistIds.length > 0 && (
            <span className="absolute -top-0.5 -left-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-error-500 px-1 text-[10px] font-bold text-white">
              {new Intl.NumberFormat('fa-IR').format(wishlistIds.length)}
            </span>
          )}
        </button>

        <button
          onClick={() => window.dispatchEvent(new CustomEvent('modara:open-cart'))}
          aria-label={`سبد خرید (${totalItems} کالا)`}
          className="relative flex h-11 items-center gap-2 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 px-4 text-white shadow-lg shadow-amber-500/30 transition-transform active:scale-95"
        >
          <ShoppingBag className="h-5 w-5" />
          {totalItems > 0 && (
            <span className="text-sm font-bold">{new Intl.NumberFormat('fa-IR').format(totalItems)}</span>
          )}
        </button>
      </div>
    </nav>
  );
}
