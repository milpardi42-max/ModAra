import { useEffect, useState } from 'react';
import { CheckCircle, Clock3, XCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { formatPrice } from '../lib/format';

type PaymentCallbackProps = {
  onNavigate: (view: string, param?: string) => void;
};

type CallbackState = 'loading' | 'success' | 'cancelled' | 'failed';

export default function PaymentCallback({ onNavigate }: PaymentCallbackProps) {
  const { clearCart } = useCart();
  const [state, setState] = useState<CallbackState>('loading');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [refId, setRefId] = useState<string | null>(null);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('result');
    const callbackOrderId = params.get('order_id');
    const callbackRefId = params.get('ref_id');
    setOrderId(callbackOrderId);
    setRefId(callbackRefId);

    if (result === 'success' && callbackOrderId) {
      supabase.from('orders').select('total, status').eq('id', callbackOrderId).maybeSingle().then(({ data }) => {
        if (data?.status === 'paid') {
          setTotal(Number(data.total));
          setState('success');
          void clearCart();
        } else {
          setState('failed');
        }
      });
    } else if (result === 'cancelled') {
      setState('cancelled');
    } else {
      setState('failed');
    }
  }, [clearCart]);

  const content = {
    loading: { icon: Clock3, title: 'در حال بررسی پرداخت...', description: 'لطفاً چند لحظه صبر کنید.' },
    success: { icon: CheckCircle, title: 'پرداخت با موفقیت تأیید شد', description: 'سفارش شما ثبت شده و برای آماده‌سازی ارسال خواهد شد.' },
    cancelled: { icon: XCircle, title: 'پرداخت لغو شد', description: 'هیچ مبلغی بابت این سفارش ثبت نهایی نشده است.' },
    failed: { icon: XCircle, title: 'تأیید پرداخت ناموفق بود', description: 'در صورت کسر وجه، موضوع را از پشتیبانی درگاه پیگیری کنید.' },
  }[state];
  const Icon = content.icon;

  return (
    <div className="min-h-screen bg-dark-50 px-4 pt-28" dir="rtl">
      <div className="card mx-auto max-w-lg p-8 text-center sm:p-12">
        <div className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full ${state === 'success' ? 'bg-success-100 text-success-600' : state === 'loading' ? 'bg-amber-100 text-amber-600' : 'bg-error-100 text-error-600'}`}>
          <Icon className={`h-11 w-11 ${state === 'loading' ? 'animate-pulse' : ''}`} />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-dark-900">{content.title}</h1>
        <p className="mb-6 text-dark-500">{content.description}</p>
        {orderId && <p className="mb-2 text-sm text-dark-500">کد سفارش: <strong className="font-mono text-dark-900">{orderId.slice(0, 8).toUpperCase()}</strong></p>}
        {refId && <p className="mb-2 text-sm text-dark-500">کد رهگیری درگاه: <strong className="font-mono text-dark-900">{refId}</strong></p>}
        {total !== null && <p className="mb-6 text-sm text-dark-500">مبلغ پرداخت‌شده: <strong className="text-amber-700">{formatPrice(total)}</strong></p>}
        {state !== 'loading' && <div className="flex flex-wrap justify-center gap-3"><button onClick={() => onNavigate('shop')} className="btn-ghost">بازگشت به فروشگاه</button>{state === 'success' && orderId && <button onClick={() => onNavigate('invoice', orderId)} className="btn-primary">مشاهده فاکتور</button>}</div>}
      </div>
    </div>
  );
}
