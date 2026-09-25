import { useEffect, useState } from 'react';
import { Package, Clock, CheckCircle, Truck, LogOut, Mail, ShieldCheck } from 'lucide-react';
import { isDemoMode, supabase, type Order, type OrderItem } from '../lib/supabase';
import Breadcrumbs from '../components/Breadcrumbs';
import { useAuth } from '../context/AuthContext';
import { formatPrice, formatDateTime, asset } from '../lib/format';

type AccountProps = {
  onNavigate: (view: string, param?: string) => void;
};

const statusConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  pending: { label: 'در انتظار', icon: Clock, color: 'text-warning-600 bg-warning-50' },
  paid: { label: 'پرداخت شده', icon: CheckCircle, color: 'text-success-600 bg-success-50' },
  shipped: { label: 'ارسال شده', icon: Truck, color: 'text-amber-600 bg-amber-50' },
  delivered: { label: 'تحویل داده شده', icon: CheckCircle, color: 'text-success-600 bg-success-50' },
};

export default function Account({ onNavigate }: AccountProps) {
  const { user, signOut } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('orders')
      .select('*, order_items:order_items(*, product:products(*))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders((data as unknown as Order[]) || []);
        setLoading(false);
      });
  }, [user]);

  const isAdmin = Boolean(user) && (isDemoMode || user?.app_metadata?.role === 'admin');

  if (!user) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <p className="text-xl font-medium text-dark-700 mb-4">لطفاً وارد شوید</p>
          <button onClick={() => onNavigate('home')} className="btn-primary">بازگشت به خانه</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 min-h-screen bg-dark-50" dir="rtl">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[{ label: 'حساب کاربری' }]} onNavigate={onNavigate} />
        {/* Profile card */}
        <div className="card p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-2xl font-bold text-white">
              {user.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-dark-900">حساب کاربری</h1>
              <div className="flex items-center gap-1.5 text-sm text-dark-500 mt-1">
                <Mail className="h-4 w-4" />
                {user.email}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {isAdmin && <button onClick={() => onNavigate('admin')} className="btn-ghost px-3 py-2 text-sm"><ShieldCheck className="h-4 w-4" /> پنل مدیریت</button>}
              <button
                onClick={() => { signOut(); onNavigate('home'); }}
                className="flex items-center gap-2 rounded-xl border border-error-200 bg-error-50 px-4 py-2 text-sm font-medium text-error-600 transition-all hover:bg-error-100"
              >
                <LogOut className="h-4 w-4" />
                خروج
              </button>
            </div>
          </div>
        </div>

        {/* Orders */}
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5 text-amber-600" />
          <h2 className="text-xl font-bold text-dark-900">سفارش‌های من</h2>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            {new Intl.NumberFormat('fa-IR').format(orders.length)}
          </span>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-6">
                <div className="h-6 w-1/3 rounded shimmer-bg mb-4" />
                <div className="h-20 w-full rounded-xl shimmer-bg" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="card p-12 text-center">
            <Package className="h-16 w-16 text-dark-300 mx-auto mb-4" />
            <p className="text-lg font-medium text-dark-700 mb-2">هنوز سفارشی ثبت نکرده‌اید</p>
            <p className="text-sm text-dark-400 mb-6">اولین خرید خود را انجام دهید!</p>
            <button onClick={() => onNavigate('shop')} className="btn-primary">شروع خرید</button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, i) => {
              const status = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              return (
                <div key={order.id} className="card p-5 animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-sm">
                        <span className="text-dark-500">کد سفارش: </span>
                        <span className="font-mono font-bold text-dark-900">{order.id.slice(0, 8).toUpperCase()}</span>
                      </div>
                      <span className="text-dark-300">|</span>
                      <span className="text-sm text-dark-500">{formatDateTime(order.created_at)}</span>
                    </div>
                    <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${status.color}`}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      {status.label}
                    </div>
                  </div>

                  {/* Order items */}
                  <div className="space-y-2 mb-4">
                    {order.order_items?.map((item: OrderItem) => (
                      <div key={item.id} className="flex items-center gap-3 rounded-xl bg-dark-50 p-3">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white">
                          <img
                            src={asset(item.product?.image_url)}
                            alt={item.product?.name || ''}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-dark-900">{item.product?.name}</p>
                          <p className="text-xs text-dark-500">
                            {new Intl.NumberFormat('fa-IR').format(item.quantity)} عدد × {formatPrice(item.price)}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-dark-900">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between border-t border-dark-100 pt-3">
                    <div className="text-sm text-dark-500">
                      {order.address && <span>ارسال به: {order.address.slice(0, 30)}...</span>}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <button onClick={() => onNavigate('invoice', order.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50">مشاهده فاکتور</button>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-dark-500">مبلغ کل:</span>
                        <span className="text-lg font-bold text-amber-700">{formatPrice(order.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
