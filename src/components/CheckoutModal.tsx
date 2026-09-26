import { useState } from 'react';
import { CheckCircle, Loader2, LogIn, MapPin, Phone, Shield, Tag, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { isDemoMode, supabase, type Coupon } from '../lib/supabase';
import { formatPrice } from '../lib/format';

type CheckoutModalProps = {
  open: boolean;
  onClose: () => void;
  onOpenInvoice?: (orderId: string) => void;
  onOpenAuth?: () => void;
};

export default function CheckoutModal({ open, onClose, onOpenInvoice, onOpenAuth }: CheckoutModalProps) {
  const { items, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const [step, setStep] = useState<'info' | 'payment' | 'success'>('info');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);

  if (!open) return null;

  const discount = coupon
    ? coupon.type === 'percentage'
      ? Math.round((totalPrice * coupon.value) / 100)
      : Math.min(coupon.value, totalPrice)
    : 0;
  const payable = Math.max(totalPrice - discount, 0);

  const handleInfoSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!address.trim() || !phone.trim()) {
      setError('لطفاً آدرس و شماره تماس را وارد کنید');
      return;
    }
    setError(null);
    setStep('payment');
  };

  const applyCoupon = async (event: React.FormEvent) => {
    event.preventDefault();
    setCouponError(null);
    const code = couponCode.trim();
    if (!code) return;
    setCouponChecking(true);
    const { data } = await supabase.from('coupons').select('*').eq('code', code).maybeSingle();
    const found = (data as Coupon | null) ?? null;
    if (!found || !found.active) {
      setCouponError('کد تخفیف معتبر نیست.');
    } else if (found.expires_at && new Date(found.expires_at).getTime() < Date.now()) {
      setCouponError('این کد تخفیف منقضی شده است.');
    } else if (found.min_order > totalPrice) {
      setCouponError(`این کد برای سفارش‌های بالای ${formatPrice(found.min_order)} است.`);
    } else if (found.max_uses != null && found.used_count >= found.max_uses) {
      setCouponError('ظرفیت استفاده از این کد تمام شده است.');
    } else {
      setCoupon(found);
    }
    setCouponChecking(false);
  };

  const handlePayment = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!user) {
      setError('برای ثبت سفارش ابتدا وارد شوید. سبد خرید شما ذخیره می‌شود.');
      return;
    }

    setLoading(true);

    if (!isDemoMode) {
      const { data, error: gatewayError } = await supabase.functions.invoke('zarinpal-request', {
        body: { address, phone, discount, coupon_code: coupon?.code ?? null },
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
      .insert({
        user_id: user.id,
        total: payable,
        status: 'paid',
        address,
        phone,
        discount,
        coupon_code: coupon?.code ?? null,
      })
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
      variant: item.variant ?? null,
    }));
    const { error: itemError } = await supabase.from('order_items').insert(orderItems);
    if (itemError) {
      setError('خطا در ثبت اقلام سفارش: ' + itemError.message);
      setLoading(false);
      return;
    }

    if (coupon) {
      await supabase.from('coupons').update({ used_count: (coupon.used_count ?? 0) + 1 }).eq('id', coupon.id);
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
    setCoupon(null);
    setCouponCode('');
    setCouponError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
      <div className="absolute inset-0 animate-fade-in bg-dark-950/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="animate-scale-in relative w-full max-w-lg" dir="rtl">
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="relative bg-gradient-to-br from-amber-600 to-orange-700 px-6 py-6">
            <button
              onClick={handleClose}
              aria-label="بستن"
              className="absolute top-4 left-4 flex h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold text-white">
              {step === 'info' ? 'تکمیل سفارش' : step === 'payment' ? 'پرداخت' : 'سفارش ثبت شد'}
            </h2>
            <div className="mt-4 flex items-center gap-2">
              {['info', 'payment', 'success'].map((stage, index) => (
                <div key={stage} className="flex items-center gap-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      step === stage || (step === 'success' && index < 2) ? 'bg-white text-amber-700' : 'bg-white/20 text-white/60'
                    }`}
                  >
                    {new Intl.NumberFormat('fa-IR').format(index + 1)}
                  </div>
                  {index < 2 && <div className={`h-1 w-12 rounded-full ${step === 'success' ? 'bg-white' : 'bg-white/20'}`} />}
                </div>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            {error && (
              <div className="mb-4 animate-fade-in rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">
                {error}
              </div>
            )}

            {step === 'info' && (
              <form onSubmit={handleInfoSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-dark-700">آدرس ارسال</label>
                  <div className="relative">
                    <MapPin className="absolute top-3 right-3 h-5 w-5 text-dark-400" />
                    <textarea
                      required
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      placeholder="نشانی کامل پستی"
                      rows={3}
                      className="input-field resize-none pr-11"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-dark-700">شماره تماس</label>
                  <div className="relative">
                    <Phone className="absolute top-1/2 right-3 h-5 w-5 -translate-y-1/2 text-dark-400" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                      className="input-field pr-11"
                    />
                  </div>
                </div>

                {/* Coupon */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-dark-700">کد تخفیف</label>
                  {coupon ? (
                    <div className="flex items-center justify-between rounded-xl border border-success-200 bg-success-50 px-4 py-3">
                      <span className="flex items-center gap-2 text-sm font-semibold text-success-700">
                        <Tag className="h-4 w-4" />
                        {coupon.code} اعمال شد
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setCoupon(null);
                          setCouponCode('');
                        }}
                        className="text-xs font-medium text-dark-500 hover:text-error-600"
                      >
                        حذف
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Tag className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-dark-400" />
                          <input
                            value={couponCode}
                            onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                            placeholder="مثلاً WELCOME10"
                            className="input-field pr-10 uppercase"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={applyCoupon}
                          disabled={couponChecking || !couponCode.trim()}
                          className="btn-ghost shrink-0 px-4 py-3 text-sm disabled:opacity-50"
                        >
                          {couponChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'اعمال'}
                        </button>
                      </div>
                      {couponError && <p className="mt-2 text-xs text-error-600">{couponError}</p>}
                    </>
                  )}
                </div>

                {/* Summary */}
                <div className="space-y-2 rounded-xl bg-dark-50 p-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-dark-600">
                        {item.product?.name} × {new Intl.NumberFormat('fa-IR').format(item.quantity)}
                        {item.variant && <span className="text-dark-400"> · {item.variant}</span>}
                      </span>
                      <span className="font-medium text-dark-900">
                        {formatPrice((item.product?.price ?? 0) * item.quantity)}
                      </span>
                    </div>
                  ))}
                  {discount > 0 && (
                    <div className="flex items-center justify-between text-sm text-success-600">
                      <span>تخفیف ({coupon?.code})</span>
                      <span>-{formatPrice(discount)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-dark-200 pt-2">
                    <span className="font-medium text-dark-700">مبلغ قابل پرداخت</span>
                    <span className="text-lg font-bold text-amber-700">{formatPrice(payable)}</span>
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
                  {isDemoMode
                    ? 'حالت دمو فعال است؛ ثبت سفارش بدون پرداخت واقعی انجام می‌شود.'
                    : 'برای حفظ امنیت، اطلاعات کارت در سایت ذخیره نمی‌شود و پرداخت در صفحه امن زرین‌پال انجام خواهد شد.'}
                </div>

                <div className="rounded-xl bg-dark-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-dark-700">مبلغ قابل پرداخت</span>
                    <span className="text-xl font-bold text-amber-700">{formatPrice(payable)}</span>
                  </div>
                  {discount > 0 && (
                    <p className="mt-2 text-xs text-success-600">
                      {formatPrice(totalPrice)} با {formatPrice(discount)} تخفیف
                    </p>
                  )}
                  {!isDemoMode && (
                    <p className="mt-2 text-xs leading-5 text-dark-500">
                      پس از کلیک، به درگاه زرین‌پال منتقل می‌شوید و پس از تأیید تراکنش به سایت بازمی‌گردید.
                    </p>
                  )}
                </div>

                {!user && (
                  <div className="rounded-xl border border-dark-200 bg-white p-4 text-center">
                    <p className="mb-1 text-sm font-semibold text-dark-800">برای ثبت سفارش وارد شوید</p>
                    <p className="mb-4 text-xs leading-5 text-dark-500">
                      سبد خرید شما ذخیره شده است؛ پس از ورود، سفارش ثبت می‌شود.
                    </p>
                    <button
                      type="button"
                      onClick={() => onOpenAuth?.()}
                      className="btn-primary w-full"
                    >
                      <LogIn className="h-4 w-4" />
                      ورود / ثبت‌نام
                    </button>
                  </div>
                )}

                {user && (
                  <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" /> در حال انتقال به درگاه...
                      </>
                    ) : isDemoMode ? (
                      'ثبت سفارش دمو'
                    ) : (
                      'انتقال به زرین‌پال'
                    )}
                  </button>
                )}
              </form>
            )}

            {step === 'success' && (
              <div className="flex flex-col items-center py-8 text-center animate-fade-in">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-success-100">
                  <CheckCircle className="h-12 w-12 text-success-600" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-dark-900">سفارش شما با موفقیت ثبت شد!</h3>
                <p className="mb-1 text-sm text-dark-500">کد پیگیری سفارش:</p>
                <p className="mb-6 font-mono text-lg font-bold text-amber-700">
                  {orderId?.slice(0, 8).toUpperCase()}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  {orderId && onOpenInvoice && (
                    <button onClick={() => onOpenInvoice(orderId)} className="btn-primary">
                      مشاهده فاکتور
                    </button>
                  )}
                  <button onClick={handleClose} className="btn-ghost">
                    بازگشت به فروشگاه
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
