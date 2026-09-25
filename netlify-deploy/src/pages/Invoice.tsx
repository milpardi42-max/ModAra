import { useEffect, useState } from 'react';
import { ArrowRight, FileText, Loader2, Printer, Store } from 'lucide-react';
import { supabase, type Order, type OrderItem } from '../lib/supabase';
import Breadcrumbs from '../components/Breadcrumbs';
import { asset, formatDateTime, formatPrice } from '../lib/format';

type InvoiceProps = {
  orderId: string;
  onNavigate: (view: string, param?: string) => void;
};

type InvoiceOrder = Order & {
  address?: string;
  phone?: string;
  payment_ref_id?: string | null;
  order_items?: OrderItem[];
};

export default function Invoice({ orderId, onNavigate }: InvoiceProps) {
  const [order, setOrder] = useState<InvoiceOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from('orders')
      .select('*, order_items:order_items(*, product:products(*))')
      .eq('id', orderId)
      .maybeSingle()
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) setError(queryError.message);
        setOrder((data as InvoiceOrder | null) || null);
        setLoading(false);
      });
    return () => { active = false; };
  }, [orderId]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-dark-50" dir="rtl"><Loader2 className="h-8 w-8 animate-spin text-amber-600" /></div>;
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-50 px-4 text-center" dir="rtl">
        <div><FileText className="mx-auto mb-4 h-14 w-14 text-dark-300" /><h1 className="mb-2 text-xl font-bold text-dark-900">فاکتور پیدا نشد</h1><p className="mb-6 text-sm text-dark-500">{error || 'این سفارش وجود ندارد یا اجازه مشاهده آن را ندارید.'}</p><button onClick={() => onNavigate('account')} className="btn-primary">بازگشت به حساب کاربری</button></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-50 px-4 py-10 sm:px-6" dir="rtl">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Breadcrumbs items={[{ label: 'حساب کاربری', view: 'account' }, { label: 'فاکتور سفارش' }]} onNavigate={onNavigate} />
          <div className="flex gap-2">
            <button onClick={() => onNavigate('account')} className="btn-ghost px-4 py-2 text-sm"><ArrowRight className="h-4 w-4" /> حساب کاربری</button>
            <button onClick={() => window.print()} className="btn-primary px-4 py-2 text-sm"><Printer className="h-4 w-4" /> چاپ فاکتور</button>
          </div>
        </div>

        <article className="rounded-3xl border border-dark-100 bg-white p-6 shadow-sm sm:p-10 print:border-0 print:p-0 print:shadow-none">
          <header className="flex flex-col gap-5 border-b border-dark-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white"><Store className="h-6 w-6" /></div>
              <div><h1 className="text-2xl font-bold text-dark-900">مُدارا</h1><p className="text-sm text-dark-500">فاکتور خرید آنلاین</p></div>
            </div>
            <div className="text-right text-sm text-dark-500 sm:text-left"><p>شماره فاکتور</p><p className="mt-1 font-mono font-bold text-dark-900">#{order.id.slice(0, 8).toUpperCase()}</p><p className="mt-2">تاریخ: {formatDateTime(order.created_at)}</p></div>
          </header>

          <div className="grid gap-4 border-b border-dark-100 py-6 text-sm sm:grid-cols-2">
            <div><p className="mb-1 text-dark-400">تحویل گیرنده</p><p className="font-medium text-dark-900">{order.phone || 'ثبت نشده'}</p><p className="mt-1 leading-6 text-dark-600">{order.address || 'آدرس ثبت نشده'}</p></div>
            <div className="sm:text-left"><p className="mb-1 text-dark-400">وضعیت سفارش</p><p className="font-semibold text-amber-700">{order.status === 'paid' ? 'پرداخت شده' : order.status === 'delivered' ? 'تحویل داده شده' : order.status === 'shipped' ? 'ارسال شده' : order.status === 'cancelled' ? 'لغو شده' : 'در انتظار پرداخت'}</p>{order.payment_ref_id && <p className="mt-1 text-dark-500">کد رهگیری: <span className="font-mono text-dark-900">{order.payment_ref_id}</span></p>}</div>
          </div>

          <div className="overflow-x-auto py-6"><table className="w-full min-w-[32rem] text-right text-sm"><thead><tr className="border-b border-dark-100 text-dark-400"><th className="pb-3 font-medium">محصول</th><th className="pb-3 text-center font-medium">تعداد</th><th className="pb-3 text-left font-medium">قیمت واحد</th><th className="pb-3 text-left font-medium">جمع</th></tr></thead><tbody>{order.order_items?.map((item) => <tr key={item.id} className="border-b border-dark-50"><td className="py-4"><div className="flex items-center gap-3"><img src={asset(item.product?.image_url)} alt="" className="h-11 w-11 rounded-lg object-cover" /><span className="font-medium text-dark-900">{item.product?.name || 'محصول'}</span></div></td><td className="py-4 text-center text-dark-600">{new Intl.NumberFormat('fa-IR').format(item.quantity)}</td><td className="py-4 text-left text-dark-600">{formatPrice(item.price)}</td><td className="py-4 text-left font-semibold text-dark-900">{formatPrice(item.price * item.quantity)}</td></tr>)}</tbody></table></div>

          <div className="mr-auto max-w-xs space-y-3 border-t border-dark-100 pt-5 text-sm"><div className="flex justify-between text-dark-500"><span>جمع کالاها</span><span>{formatPrice(order.total)}</span></div><div className="flex justify-between text-lg font-bold text-dark-900"><span>مبلغ نهایی</span><span className="text-amber-700">{formatPrice(order.total)}</span></div></div>
          <footer className="mt-10 border-t border-dark-100 pt-5 text-center text-xs leading-6 text-dark-400">از خرید شما از مُدارا سپاسگزاریم. این فاکتور به‌صورت خودکار صادر شده است.</footer>
        </article>
      </div>
    </div>
  );
}
