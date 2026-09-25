import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatPrice, asset } from '../lib/format';

type CartDrawerProps = {
  open: boolean;
  onClose: () => void;
  onCheckout: () => void;
};

export default function CartDrawer({ open, onClose, onCheckout }: CartDrawerProps) {
  const { items, loading, updateQuantity, removeFromCart, totalItems, totalPrice } = useCart();
  const { user } = useAuth();

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-dark-950/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-full max-w-md bg-white shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        dir="rtl"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-dark-100 p-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-amber-600" />
              <h2 className="text-lg font-bold text-dark-900">سبد خرید</h2>
              {totalItems > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {new Intl.NumberFormat('fa-IR').format(totalItems)} کالا
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-dark-500 hover:bg-dark-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <div className="h-20 w-20 rounded-xl shimmer-bg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 rounded shimmer-bg" />
                      <div className="h-4 w-1/2 rounded shimmer-bg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !user ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ShoppingBag className="h-16 w-16 text-dark-300 mb-4" />
                <p className="text-lg font-medium text-dark-700 mb-2">سبد خرید شما خالی است</p>
                <p className="text-sm text-dark-400 mb-6">برای افزودن محصول به سبد، ابتدا وارد شوید</p>
                <button onClick={onClose} className="btn-primary">
                  ادامه خرید
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ShoppingBag className="h-16 w-16 text-dark-300 mb-4" />
                <p className="text-lg font-medium text-dark-700 mb-2">سبد خرید شما خالی است</p>
                <p className="text-sm text-dark-400 mb-6">محصولات مورد علاقه را به سبد اضافه کنید</p>
                <button onClick={onClose} className="btn-primary">
                  شروع خرید
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 rounded-xl border border-dark-100 p-3 animate-fade-in"
                  >
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-dark-50">
                      <img
                        src={asset(item.product?.image_url)}
                        alt={item.product?.name || ''}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-dark-900 line-clamp-1">
                          {item.product?.name}
                        </h3>
                        <p className="text-sm font-bold text-amber-700">
                          {formatPrice(item.product?.price ?? 0)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-dark-200 text-dark-600 hover:bg-dark-50"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">
                            {new Intl.NumberFormat('fa-IR').format(item.quantity)}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-dark-200 text-dark-600 hover:bg-dark-50"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-error-500 hover:bg-error-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-dark-100 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-dark-600">مبلغ کل:</span>
                <span className="text-xl font-bold text-dark-900">{formatPrice(totalPrice)}</span>
              </div>
              <button
                onClick={onCheckout}
                className="btn-primary w-full"
              >
                تکمیل خرید
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
