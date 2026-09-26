import { Eye, Heart, Star } from 'lucide-react';
import type { Product } from '../lib/supabase';
import { formatPrice } from '../lib/format';
import { useWishlist } from '../context/WishlistContext';
import { getProductVariants } from '../lib/variants';
import { categoryLabel, presentationFor } from '../lib/categories';
import ResponsiveImage from './ResponsiveImage';

type EditorialPieceProps = {
  product: Product;
  /** Position inside the edit, rendered as a two-digit piece number. */
  index: number;
  onQuickView: (slug: string) => void;
  /** `feature` is the lead piece; `stack` pieces sit beside it. */
  variant?: 'feature' | 'stack';
  className?: string;
};

/** Persian piece number (۰۱، ۰۲ …) used as the editorial index. */
function pieceNumber(index: number): string {
  return index.toLocaleString('fa-IR').padStart(2, '۰');
}

/**
 * Lookbook piece for the "Private Edit" chapter.
 *
 * Where the catalogue card is a compact tile, this is a full-bleed editorial
 * frame: the photography carries the layout and the copy sits on a gradient
 * scrim, the way a magazine spread does. The category art direction still
 * decides the frame ratio on small screens; from `lg` up the chapter layout
 * fixes the heights so the feature and the stacked pieces align.
 */
export default function EditorialPiece({
  product,
  index,
  onQuickView,
  variant = 'feature',
  className = '',
}: EditorialPieceProps) {
  const { isSaved, toggle } = useWishlist();
  const saved = isSaved(product.id);
  const presentation = presentationFor(product);
  const variants = getProductVariants(product);
  const isFeature = variant === 'feature';

  const open = () => onQuickView(product.slug);

  const handleWishlist = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    await toggle(product.id);
  };

  return (
    <article
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`مشاهده سریع ${product.name}`}
      style={{ animationDelay: `${index * 120}ms` }}
      className={`group animate-fade-in-up relative isolate cursor-pointer overflow-hidden rounded-[1.5rem] border border-white/70 bg-dark-900 shadow-[0_20px_45px_-30px_rgba(36,25,20,0.55)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_34px_60px_-30px_rgba(36,25,20,0.6)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:rounded-[1.75rem] ${presentation.ratio} sm:aspect-[4/3] lg:aspect-auto ${
        isFeature ? 'lg:h-[30rem]' : 'lg:h-full'
      } ${className}`}
    >
      <ResponsiveImage
        src={product.image_url}
        alt={product.name}
        sizes={isFeature ? '(max-width: 1024px) 92vw, 48vw' : '(max-width: 1024px) 92vw, 30vw'}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1100ms] ease-out group-hover:scale-[1.06]"
      />

      {/* Scrim + inner hairline: keeps the caption readable on any photograph. */}
      <div className="absolute inset-0 bg-gradient-to-t from-dark-950/92 via-dark-950/25 to-transparent" />
      <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />

      {/* Top rail: piece number + wishlist */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 sm:p-5">
        <span className="rounded-full bg-dark-950/40 px-3 py-1.5 text-[11px] font-bold tracking-[0.3em] text-white/85 backdrop-blur-md">
          {pieceNumber(index + 1)}
        </span>
        <button
          onClick={handleWishlist}
          aria-label={saved ? `حذف ${product.name} از علاقه‌مندی‌ها` : `افزودن ${product.name} به علاقه‌مندی‌ها`}
          aria-pressed={saved}
          className={`flex h-9 w-9 items-center justify-center rounded-full shadow-sm backdrop-blur-md transition-all active:scale-90 ${
            saved ? 'bg-error-500 text-white' : 'bg-white/85 text-dark-500 hover:bg-white hover:text-error-500'
          }`}
        >
          <Heart className={`h-4 w-4 ${saved ? 'fill-white' : ''}`} />
        </button>
      </div>

      {/* Caption */}
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-amber-300 px-2.5 py-1 text-[10px] font-bold text-dark-950">
            {categoryLabel(product)}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md">
            <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
            {new Intl.NumberFormat('fa-IR').format(product.rating)}
          </span>
          {product.stock > 0 && product.stock < 20 && (
            <span className="rounded-full bg-error-500/90 px-2.5 py-1 text-[10px] font-bold text-white">
              تنها {new Intl.NumberFormat('fa-IR').format(product.stock)} عدد
            </span>
          )}
        </div>

        <h3
          className={`font-bold leading-snug text-white ${
            isFeature ? 'text-lg sm:text-2xl' : 'text-base sm:text-xl'
          }`}
        >
          {product.name}
        </h3>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className={`font-black text-amber-300 ${isFeature ? 'text-xl sm:text-2xl' : 'text-lg'}`}>
              {formatPrice(product.price)}
            </p>
            {variants.colors.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5" aria-label="رنگ‌های موجود">
                {variants.colors.slice(0, 4).map((color) => (
                  <span
                    key={color.hex + color.name}
                    title={color.name}
                    className="h-3 w-3 rounded-full border border-white/50"
                    style={{ background: color.hex }}
                  />
                ))}
                {variants.colors.length > 4 && (
                  <span className="text-[10px] text-white/60">
                    +{new Intl.NumberFormat('fa-IR').format(variants.colors.length - 4)}
                  </span>
                )}
              </div>
            )}
          </div>

          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-2 text-[11px] font-bold text-dark-900 shadow-lg transition-all duration-300 sm:text-xs lg:translate-y-3 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100">
            <Eye className="h-3.5 w-3.5" />
            مشاهده سریع
          </span>
        </div>
      </div>
    </article>
  );
}
