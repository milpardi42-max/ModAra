import { useState } from 'react';
import { X, MapPin, Phone, Loader2, CheckCircle, Shield } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { isDemoMode, supabase } from '../lib/supabase';
import { formatPrice } from '../lib/format';

type CheckoutModalProps = {
  open: boolean;
  onClose: () => void;
  onOpenInvoice?: (orderId: string) => void;
};

export default function CheckoutModal({ open, onClose, onOpenInvoice }: CheckoutModalProps) {
  const { items, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const [step, setStep] = useState<'info' | 'payment' | 'success'>('info');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  if (!open) return null;

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim() || !phone.trim()) {
      setError('لطفاً آدرس و شماره تماس را وارد کنید');
      return;
    }
    setError(null);
    setStep('payment');
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!user) {
      setError('لطفاً ابتدا وارد شوید');
      setLoading(false);
      return;
    }

    if (!isDemoMode) {
      const { data, error: gatewayError } = await supabase.functions.invoke('zarinpal-request', {
        body: { address, phone },
      });

      if (gatewayError || !data?.payment_url) {
        setError(gatewayError?.message || 'امکان شروع پرداخت وجود ندارد. تنظیمات درگاه را بررسی کنید.');
        setLoading(false);
        return;
      }

      window.location.assign(data.payment_url as string);
      return;
    }

    // Local demo fallback: never use this branch for production payments.
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({ user_id: user.id, total: totalPrice, status: 'paid', address, phone })
      .select()
      .single();

    if (orderError || !order) {
      setError('خطا در ثبت سفارش: ' + (orderError?.message || 'سفارش ایجاد نشد'));
      setLoading(false);
      return;
    }

    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.product?.price ?? 0,
    }));
    const { error: itemError } = await supabase.from('order_items').insert(orderItems);
    if (itemError) {
      setError('خطا در ثبت اقلام سفارش: ' + itemError.message);
      setLoading(false);
      return;
    }

    await clearCart();
    setOrderId(order.id);
    setStep('success');
    setLoading(false);
  };

  const handleClose = () => {
    setStep('info');
    setAddress('');
    setPhone('');
    setError(null);
    setOrderId(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-dark-950/60 backdrop-blur-sm animate-fade-in" onClick={handleClose} />

      <div className="relative w-full max-w-lg animate-scale-in" dir="rtl">
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="relative bg-gradient-to-br from-amber-600 to-orange-700 px-6 py-6">
            <button
              onClick={handleClose}
              className="absolute top-4 left-4 flex h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold text-white">
              {step === 'info' ? 'تکمیل سفارش' : step === 'payment' ? 'پرداخت' : 'سفارش ثبت شد'}
            </h2>
            {/* Steps indicator */}
            <div className="mt-4 flex items-center gap-2">
              {['info', 'payment', 'success'].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    step === s || (step === 'success' && i < 2)
                      ? 'bg-white text-amber-700'
                      : 'bg-white/20 text-white/60'
                  }`}>
                    {new Intl.NumberFormat('fa-IR').format(i + 1)}
                  </div>
                  {i < 2 && <div className={`h-1 w-12 rounded-full ${step === 'success' ? 'bg-white' : 'bg-white/20'}`} />}
                </div>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            {error && (
              <div className="mb-4 rounded-xl bg-error-50 border border-error-200 px-4 py-3 text-sm text-error-700 animate-fade-in">
                {error}
              </div>
            )}

            {step === 'info' && (
              <form onSubmit={handleInfoSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1.5">آدرس ارسال</label>
                  <div className="relative">
                    <MapPin className="absolute right-3 top-3 h-5 w-5 text-dark-400" />
                    <textarea
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="نشانی کامل پستی"
                      rows={3}
                      className="input-field pr-11 resize-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1.5">شماره تماس</label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                      className="input-field pr-11"
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="rounded-xl bg-dark-50 p-4 space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-dark-600">{item.product?.name} × {new Intl.NumberFormat('fa-IR').format(item.quantity)}</span>
                      <span className="font-medium text-dark-900">{formatPrice((item.product?.price ?? 0) * item.quantity)}</span>
                    </div>
                  ))}
                  <div className="border-t border-dark-200 pt-2 flex items-center justify-between">
                    <span className="font-medium text-dark-700">مبلغ کل</span>
                    <span className="text-lg font-bold text-amber-700">{formatPrice(totalPrice)}</span>
                  </div>
                </div>

                <button type="submit" className="btn-primary w-full">
                  ادامه به پرداخت
                </button>
              </form>
            )}

            {step === 'payment' && (
              <form onSubmit={handlePayment} className="space-y-4">
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-700">
                  <Shield className="mt-1 h-4 w-4 shrink-0" />
                  {isDemoMode ? 'حالت دمو فعال است؛ ثبت سفارش بدون پرداخت واقعی انجام می‌شود.' : 'برای حفظ امنیت، اطلاعات کارت در سایت ذخیره نمی‌شود و پرداخت در صفحه امن زرین‌پال انجام خواهد شد.'}
                </div>

                <div className="rounded-xl bg-dark-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-dark-700">مبلغ قابل پرداخت</span>
                    <span className="text-xl font-bold text-amber-700">{formatPrice(totalPrice)}</span>
                  </div>
                  {!isDemoMode && <p className="mt-2 text-xs leading-5 text-dark-500">پس از کلیک، به درگاه زرین‌پال منتقل می‌شوید و پس از تأیید تراکنش به سایت بازمی‌گردید.</p>}
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
                  {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> در حال انتقال به درگاه...</> : isDemoMode ? 'ثبت سفارش دمو' : 'انتقال به زرین‌پال'}
                </button>
              </form>
            )}

            {step === 'success' && (
              <div className="flex flex-col items-center text-center py-8 animate-fade-in">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success-100 mb-4">
                  <CheckCircle className="h-12 w-12 text-success-600" />
                </div>
                <h3 className="text-xl font-bold text-dark-900 mb-2">سفارش شما با موفقیت ثبت شد!</h3>
                <p className="text-sm text-dark-500 mb-1">کد پیگیری سفارش:</p>
                <p className="text-lg font-mono font-bold text-amber-700 mb-6">
                  {orderId?.slice(0, 8).toUpperCase()}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  {orderId && onOpenInvoice && <button onClick={() => onOpenInvoice(orderId)} className="btn-primary">مشاهده فاکتور</button>}
                  <button onClick={handleClose} className="btn-ghost">بازگشت به فروشگاه</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
