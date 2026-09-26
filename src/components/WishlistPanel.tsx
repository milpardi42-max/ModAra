import { useEffect } from 'react';
import { Heart, ShoppingBag, X } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../lib/format';
import ResponsiveImage from './ResponsiveImage';

type WishlistPanelProps = {
  open: boolean;
  onClose: () => void;
  onSelectProduct: (slug: string) => void;
};

/** Side panel for saved products. Works for guests (localStorage) too. */
export default function WishlistPanel({ open, onClose, onSelectProduct }: WishlistPanelProps) {
  const { products, toggle } = useWishlist();
  const { addToCart } = useCart();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const quickAdd = async (productId: string) => {
    await addToCart(productId);
    window.dispatchEvent(new CustomEvent('modara:open-cart'));
  };

  return (
    <div className="fixed inset-0 z-[70]" dir="rtl">
      <button aria-label="بستن علاقه‌مندی‌ها" onClick={onClose} className="absolute inset-0 bg-dark-950/50 backdrop-blur-sm" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="علاقه‌مندی‌ها"
        className="absolute inset-y-0 left-0 flex w-full max-w-md flex-col bg-white shadow-2xl animate-fade-in"
      >
        <div className="flex items-center justify-between border-b border-dark-100 p-4">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 fill-error-500 text-error-500" />
            <h2 className="text-lg font-bold text-dark-900">علاقه‌مندی‌ها</h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {new Intl.NumberFormat('fa-IR').format(products.length)}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="بستن"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-dark-500 transition-colors hover:bg-dark-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {products.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Heart className="mb-4 h-16 w-16 text-dark-300" />
              <p className="mb-2 text-lg font-medium text-dark-700">لیست علاقه‌مندی‌ها خالی است</p>
              <p className="mb-6 text-sm text-dark-400">با زدن قلبی روی هر محصول، آن را اینجا ذخیره کنید.</p>
              <button onClick={onClose} className="btn-primary">
                ادامه خرید
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((product) => (
                <div key={product.id} className="flex gap-3 rounded-2xl border border-dark-100 p-3 animate-fade-in">
                  <button
                    onClick={() => onSelectProduct(product.slug)}
                    className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-dark-50"
                    aria-label={`مشاهده ${product.name}`}
                  >
                    <ResponsiveImage src={product.image_url} alt={product.name} sizes="80px" className="h-full w-full object-cover" />
                  </button>
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <button onClick={() => onSelectProduct(product.slug)} className="text-right">
                        <h3 className="line-clamp-1 text-sm font-semibold text-dark-900 hover:text-amber-700">
                          {product.name}
                        </h3>
                      </button>
                      <p className="text-sm font-bold text-amber-700">{formatPrice(product.price)}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => quickAdd(product.id)}
                        className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-600 hover:text-white"
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        افزودن به سبد
                      </button>
                      <button
                        onClick={() => toggle(product.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-error-500 transition-colors hover:bg-error-50"
                        aria-label={`حذف ${product.name} از علاقه‌مندی‌ها`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
