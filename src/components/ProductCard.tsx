import { Eye, Heart, ShoppingCart, Star } from 'lucide-react';
import { useState } from 'react';
import type { Product } from '../lib/supabase';
import { formatPrice } from '../lib/format';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { formatVariant, getProductVariants } from '../lib/variants';
import { categoryLabel, presentationFor } from '../lib/categories';
import ResponsiveImage from './ResponsiveImage';

type ProductCardProps = {
  product: Product;
  onQuickView: (slug: string) => void;
};

/**
 * Editorial product card.
 *
 * The format follows the category art direction: worn categories (apparel,
 * trousers, eyewear) use a 4:5 portrait with model photography, while
 * product/macro categories (watches, bags, accessories) use a 1:1 square.
 */
export default function ProductCard({ product, onQuickView }: ProductCardProps) {
  const { addToCart } = useCart();
  const { isSaved, toggle } = useWishlist();
  const [added, setAdded] = useState(false);

  const presentation = presentationFor(product);
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
    <article
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
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-dark-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-200 hover:shadow-2xl hover:shadow-amber-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
    >
      {/* Image */}
      <div className={`relative overflow-hidden bg-dark-50 ${presentation.ratio}`}>
        <ResponsiveImage
          src={product.image_url}
          alt={product.name}
          sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 280px"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        />

        {/* Category eyebrow */}
        <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-dark-700 shadow-sm backdrop-blur-sm">
          {categoryLabel(product)}
        </span>

        {/* Rating */}
        <span className="pointer-events-none absolute top-3 left-3 flex items-center gap-1 rounded-full bg-dark-950/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          {new Intl.NumberFormat('fa-IR').format(product.rating)}
        </span>

        {/* Low stock */}
        {product.stock > 0 && product.stock < 20 && (
          <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-error-500/95 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm backdrop-blur-sm">
            تنها {new Intl.NumberFormat('fa-IR').format(product.stock)} عدد
          </span>
        )}

        {/* Wishlist */}
        <button
          onClick={handleWishlist}
          aria-label={saved ? `حذف ${product.name} از علاقه‌مندی‌ها` : `افزودن ${product.name} به علاقه‌مندی‌ها`}
          aria-pressed={saved}
          className={`absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-full shadow-sm backdrop-blur-sm transition-all active:scale-90 ${
            saved ? 'bg-error-500 text-white' : 'bg-white/90 text-dark-500 hover:bg-white hover:text-error-500'
          }`}
        >
          <Heart className={`h-4 w-4 ${saved ? 'fill-white' : ''}`} />
        </button>

        {/* Hover: quick view */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gradient-to-t from-dark-950/45 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="flex translate-y-2 items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-dark-900 shadow-lg transition-transform duration-300 group-hover:translate-y-0">
            <Eye className="h-4 w-4" />
            مشاهده سریع
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-1.5 line-clamp-2 font-semibold leading-6 text-dark-900 transition-colors group-hover:text-amber-700">
          {product.name}
        </h3>

        {variants.colors.length > 0 && (
          <div className="mb-2 flex items-center gap-1.5" aria-label="رنگ‌های موجود">
            {variants.colors.map((color) => (
              <span
                key={color.hex + color.name}
                title={color.name}
                className="h-3.5 w-3.5 rounded-full border border-dark-200 ring-1 ring-inset ring-black/5"
                style={{ background: color.hex }}
              />
            ))}
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div>
            <p className="text-lg font-bold leading-7 text-amber-700">{formatPrice(product.price)}</p>
            {needsChoice && <p className="text-[11px] text-dark-400">سایز و رنگ قابل انتخاب</p>}
          </div>
          <button
            onClick={handleAdd}
            disabled={product.stock === 0}
            aria-label={added ? 'به سبد خرید اضافه شد' : `افزودن ${product.name} به سبد خرید`}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 ${
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
    </article>
  );
}
