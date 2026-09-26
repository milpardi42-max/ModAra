import { Eye, Heart, ShoppingCart, Star } from 'lucide-react';
import { useState } from 'react';
import type { Product } from '../lib/supabase';
import { formatPrice } from '../lib/format';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { getProductVariants, formatVariant } from '../lib/variants';
import ResponsiveImage from './ResponsiveImage';

type ProductCardProps = {
  product: Product;
  onQuickView: (slug: string) => void;
};

export default function ProductCard({ product, onQuickView }: ProductCardProps) {
  const { addToCart } = useCart();
  const { isSaved, toggle } = useWishlist();
  const [added, setAdded] = useState(false);

  const variants = getProductVariants(product);
  const needsChoice = variants.sizes.length > 1 || variants.colors.length > 1;
  const saved = isSaved(product.id);

  const openQuickView = () => onQuickView(product.slug);

  const handleAdd = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    // Products with a real size/colour choice go through Quick View so the
    // shopper picks a variant; one-size items are added straight away.
    if (needsChoice) {
      openQuickView();
      return;
    }
    await addToCart(product.id, 1, formatVariant(variants.sizes[0], variants.colors[0]?.name));
    window.dispatchEvent(new CustomEvent('modara:open-cart'));
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  };

  const handleWishlist = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    await toggle(product.id);
  };

  return (
    <div
      onClick={openQuickView}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openQuickView();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`مشاهده سریع ${product.name}`}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-dark-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-dark-50">
        <ResponsiveImage
          src={product.image_url}
          alt={product.name}
          sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 280px"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        <div className="pointer-events-none absolute top-3 right-3 flex items-center gap-1 rounded-full bg-dark-950/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          {new Intl.NumberFormat('fa-IR').format(product.rating)}
        </div>

        {product.stock > 0 && product.stock < 20 && (
          <div className="pointer-events-none absolute top-3 left-3 rounded-full bg-error-500/90 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            تنها {new Intl.NumberFormat('fa-IR').format(product.stock)} عدد
          </div>
        )}

        <button
          onClick={handleWishlist}
          aria-label={saved ? `حذف ${product.name} از علاقه‌مندی‌ها` : `افزودن ${product.name} به علاقه‌مندی‌ها`}
          aria-pressed={saved}
          className={`absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm transition-all active:scale-90 ${
            saved ? 'bg-error-500 text-white' : 'bg-white/90 text-dark-500 hover:bg-white hover:text-error-500'
          }`}
        >
          <Heart className={`h-4 w-4 ${saved ? 'fill-white' : ''}`} />
        </button>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-dark-950/30 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-dark-900 shadow-lg">
            <Eye className="h-4 w-4" />
            مشاهده سریع
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="mb-2 line-clamp-2 font-semibold text-dark-900 transition-colors group-hover:text-amber-700">
          {product.name}
        </h3>
        <p className="mb-3 line-clamp-1 text-sm text-dark-500">{product.description}</p>
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold text-amber-700">{formatPrice(product.price)}</p>
          <button
            onClick={handleAdd}
            disabled={product.stock === 0}
            aria-label={added ? 'به سبد خرید اضافه شد' : `افزودن ${product.name} به سبد خرید`}
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 ${
              added ? 'bg-success-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white'
            }`}
          >
            {added ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <ShoppingCart className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
