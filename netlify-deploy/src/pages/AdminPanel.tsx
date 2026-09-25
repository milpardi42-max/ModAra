import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  Download,
  Edit3,
  FileText,
  FolderTree,
  LayoutDashboard,
  MessageSquare,
  LifeBuoy,
  Package,
  Percent,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Trash2,
  Truck,
  UserRound,
  Users,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import { isDemoMode, supabase, type BlogPost, type Category, type Coupon, type CustomerProfile, type Order, type OrderItem, type Product, type Review, type StoreSettings } from '../lib/supabase';
import Breadcrumbs from '../components/Breadcrumbs';
import { useAuth } from '../context/AuthContext';
import { asset, formatDateTime, formatPrice } from '../lib/format';

type AdminPanelProps = {
  onNavigate: (view: string, param?: string) => void;
  onOpenAuth: () => void;
};

type AdminTab = 'overview' | 'orders' | 'products' | 'categories' | 'blog' | 'reviews' | 'coupons' | 'customers' | 'settings';
type StatusMeta = { label: string; color: string; icon: typeof Clock3 };
type ActionResult = { error: { message: string } | null };

type ProductDraft = {
  name: string;
  slug: string;
  description: string;
  price: string;
  image_url: string;
  category_id: string;
  rating: string;
  stock: string;
};

type CategoryDraft = { name: string; slug: string; icon: string };
type BlogDraft = { title: string; slug: string; excerpt: string; content: string; image_url: string; author: string };
type ReviewDraft = { product_id: string; name: string; rating: string; comment: string; status: string };
type CouponDraft = { code: string; type: string; value: string; min_order: string; max_uses: string; active: boolean; expires_at: string };
type CustomerDraft = { full_name: string; email: string; phone: string; address: string; status: string };

const statusConfig: Record<string, StatusMeta> = {
  pending: { label: 'در انتظار پرداخت', color: 'bg-warning-50 text-warning-700', icon: Clock3 },
  paid: { label: 'پرداخت شده', color: 'bg-success-50 text-success-700', icon: CheckCircle2 },
  shipped: { label: 'ارسال شده', color: 'bg-amber-50 text-amber-700', icon: Truck },
  delivered: { label: 'تحویل داده شده', color: 'bg-success-50 text-success-700', icon: CheckCircle2 },
  cancelled: { label: 'لغو شده', color: 'bg-error-50 text-error-700', icon: XCircle },
};
const statusOptions = Object.entries(statusConfig).map(([value, meta]) => ({ value, label: meta.label }));

const tabs: Array<{ id: AdminTab; label: string; description: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'نمای کلی', description: 'آمار و سلامت فروشگاه', icon: LayoutDashboard },
  { id: 'orders', label: 'سفارش‌ها', description: 'پرداخت، ارسال و رهگیری', icon: ShoppingBag },
  { id: 'products', label: 'محصولات', description: 'کاتالوگ، قیمت و موجودی', icon: Package },
  { id: 'categories', label: 'دسته‌بندی‌ها', description: 'ساختار فروشگاه', icon: FolderTree },
  { id: 'blog', label: 'محتوای بلاگ', description: 'مقالات و محتوای آموزشی', icon: BookOpen },
  { id: 'reviews', label: 'نظرات', description: 'مدیریت بازخورد مشتریان', icon: MessageSquare },
  { id: 'coupons', label: 'تخفیف و کوپن', description: 'کمپین‌های فروش', icon: Percent },
  { id: 'customers', label: 'مشتریان', description: 'پرونده و وضعیت مشتری', icon: Users },
  { id: 'settings', label: 'تنظیمات', description: 'هویت و پیکربندی فروشگاه', icon: Settings },
];

const defaultSettings: StoreSettings = {
  id: 'store',
  store_name: 'مُدارا',
  support_phone: '۰۲۱-۱۲۳۴۵۶۷۸',
  support_email: 'info@technoshop.ir',
  shipping_threshold: 500000,
  currency: 'تومان',
  announcement: 'ارسال رایگان برای سفارش‌های بالای ۵۰۰ هزار تومان',
  maintenance_mode: false,
  updated_at: new Date().toISOString(),
};

function emptyProduct(): ProductDraft {
  return { name: '', slug: '', description: '', price: '0', image_url: '', category_id: '', rating: '4.5', stock: '0' };
}
function emptyCategory(): CategoryDraft { return { name: '', slug: '', icon: 'tag' }; }
function emptyBlog(): BlogDraft { return { title: '', slug: '', excerpt: '', content: '', image_url: '', author: 'تیم تحریریه' }; }
function emptyReview(): ReviewDraft { return { product_id: '', name: '', rating: '5', comment: '', status: 'published' }; }
function emptyCoupon(): CouponDraft { return { code: '', type: 'percentage', value: '10', min_order: '0', max_uses: '', active: true, expires_at: '' }; }
function emptyCustomer(): CustomerDraft { return { full_name: '', email: '', phone: '', address: '', status: 'active' }; }

export default function AdminPanel({ onNavigate, onOpenAuth }: AdminPanelProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [productModal, setProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productDraft, setProductDraft] = useState<ProductDraft>(emptyProduct);
  const [categoryModal, setCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>(emptyCategory);
  const [blogModal, setBlogModal] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const [blogDraft, setBlogDraft] = useState<BlogDraft>(emptyBlog);
  const [reviewModal, setReviewModal] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft>(emptyReview);
  const [couponModal, setCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponDraft, setCouponDraft] = useState<CouponDraft>(emptyCoupon);
  const [customerModal, setCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerProfile | null>(null);
  const [customerDraft, setCustomerDraft] = useState<CustomerDraft>(emptyCustomer);
  const [settingsDraft, setSettingsDraft] = useState<StoreSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);

  const isAdmin = Boolean(user) && (isDemoMode || user?.app_metadata?.role === 'admin');

  const loadAll = useCallback(async () => {
    if (!isAdmin) return;
    setError(null);
    const [ordersResult, productsResult, categoriesResult, blogResult, reviewsResult, couponsResult, customersResult, settingsResult] = await Promise.all([
      supabase.from('orders').select('*, order_items:order_items(*, product:products(*))').order('created_at', { ascending: false }),
      supabase.from('products').select('*, category:categories(*)').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name', { ascending: true }),
      supabase.from('blog_posts').select('*').order('created_at', { ascending: false }),
      supabase.from('reviews').select('*, product:products(*)').order('created_at', { ascending: false }),
      supabase.from('coupons').select('*').order('created_at', { ascending: false }),
      supabase.from('customer_profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('store_settings').select('*').eq('id', 'store').maybeSingle(),
    ]);

    const failures = [ordersResult, productsResult, categoriesResult, blogResult, reviewsResult, couponsResult, customersResult, settingsResult].filter((result) => result.error);
    if (failures.length) {
      setError(`${failures[0].error?.message || 'خطا در دریافت داده‌ها'} — اگر جدول‌های جدید را ساخته‌اید، migration پنل مدیریت را در Supabase اجرا کنید.`);
    }
    setOrders((ordersResult.data as Order[]) || []);
    setProducts((productsResult.data as Product[]) || []);
    setCategories((categoriesResult.data as Category[]) || []);
    setBlogPosts((blogResult.data as BlogPost[]) || []);
    setReviews((reviewsResult.data as Review[]) || []);
    setCoupons((couponsResult.data as Coupon[]) || []);
    setCustomers((customersResult.data as CustomerProfile[]) || []);
    const loadedSettings = (settingsResult.data as StoreSettings | null) || defaultSettings;
    setSettingsDraft(loadedSettings);
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filteredOrders = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const haystack = [order.id, order.address, order.phone, order.tracking_code].filter(Boolean).join(' ').toLowerCase();
      return matchesStatus && (!needle || haystack.includes(needle));
    });
  }, [orders, search, statusFilter]);

  const filteredProducts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return products.filter((product) => [product.name, product.slug, product.description].filter(Boolean).join(' ').toLowerCase().includes(needle));
  }, [products, search]);

  const filteredCategories = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return categories.filter((category) => `${category.name} ${category.slug}`.toLowerCase().includes(needle));
  }, [categories, search]);

  const filteredBlogPosts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return blogPosts.filter((post) => `${post.title} ${post.slug} ${post.author}`.toLowerCase().includes(needle));
  }, [blogPosts, search]);

  const filteredReviews = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return reviews.filter((review) => `${review.name} ${review.comment || ''} ${review.product?.name || ''}`.toLowerCase().includes(needle));
  }, [reviews, search]);

  const filteredCoupons = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return coupons.filter((coupon) => coupon.code.toLowerCase().includes(needle));
  }, [coupons, search]);

  const filteredCustomers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return customers.filter((customer) => `${customer.full_name} ${customer.email || ''} ${customer.phone || ''}`.toLowerCase().includes(needle));
  }, [customers, search]);

  const stats = useMemo(() => {
    const paidStatuses = ['paid', 'shipped', 'delivered'];
    const paidOrders = orders.filter((order) => paidStatuses.includes(order.status));
    const revenue = paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    return {
      total: orders.length,
      pending: orders.filter((order) => order.status === 'pending').length,
      paid: paidOrders.length,
      revenue,
      average: revenue / Math.max(paidOrders.length, 1),
      lowStock: products.filter((product) => Number(product.stock) <= 5).length,
      activeCoupons: coupons.filter((coupon) => coupon.active).length,
    };
  }, [orders, products, coupons]);

  const tabCounts: Partial<Record<AdminTab, number>> = {
    orders: orders.length,
    products: products.length,
    categories: categories.length,
    blog: blogPosts.length,
    reviews: reviews.filter((review) => review.status !== 'published').length,
    coupons: coupons.filter((coupon) => coupon.active).length,
    customers: customers.length,
  };

  const runAction = async (action: () => PromiseLike<ActionResult>, successMessage: string) => {
    setSaving(true);
    setError(null);
    const result = await action();
    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      return false;
    }
    setNotice(successMessage);
    await loadAll();
    return true;
  };

  const updateOrder = async (order: Order, status: string, trackingCode?: string) => {
    setUpdatingId(order.id);
    const result = await supabase.from('orders').update({ status, tracking_code: trackingCode ?? order.tracking_code ?? null }).eq('id', order.id);
    if (result.error) setError(result.error.message);
    else {
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status, tracking_code: trackingCode ?? item.tracking_code } : item));
      setNotice('وضعیت سفارش بروزرسانی شد');
    }
    setUpdatingId(null);
  };

  const deleteRow = async (table: string, id: string, label: string) => {
    if (!window.confirm(`آیا از حذف ${label} مطمئن هستید؟ این عملیات قابل بازگشت نیست.`)) return;
    await runAction(() => supabase.from(table).delete().eq('id', id), `${label} حذف شد`);
  };

  const openProduct = (product?: Product) => {
    setEditingProduct(product || null);
    setProductDraft(product ? { name: product.name, slug: product.slug, description: product.description || '', price: String(product.price), image_url: product.image_url || '', category_id: product.category_id || '', rating: String(product.rating), stock: String(product.stock) } : emptyProduct());
    setProductModal(true);
  };
  const saveProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = { name: productDraft.name.trim(), slug: productDraft.slug.trim(), description: productDraft.description.trim() || null, price: Number(productDraft.price) || 0, image_url: productDraft.image_url.trim() || null, category_id: productDraft.category_id || null, rating: Number(productDraft.rating) || 0, stock: Number(productDraft.stock) || 0 };
    if (!payload.name || !payload.slug) return setError('نام و slug محصول الزامی است');
    const action = editingProduct ? () => supabase.from('products').update(payload).eq('id', editingProduct.id) : () => supabase.from('products').insert(payload);
    if (await runAction(action, editingProduct ? 'محصول ویرایش شد' : 'محصول جدید اضافه شد')) setProductModal(false);
  };

  const openCategory = (category?: Category) => {
    setEditingCategory(category || null);
    setCategoryDraft(category ? { name: category.name, slug: category.slug, icon: category.icon || 'tag' } : emptyCategory());
    setCategoryModal(true);
  };
  const saveCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = { name: categoryDraft.name.trim(), slug: categoryDraft.slug.trim(), icon: categoryDraft.icon.trim() || 'tag' };
    if (!payload.name || !payload.slug) return setError('نام و slug دسته‌بندی الزامی است');
    const action = editingCategory ? () => supabase.from('categories').update(payload).eq('id', editingCategory.id) : () => supabase.from('categories').insert(payload);
    if (await runAction(action, editingCategory ? 'دسته‌بندی ویرایش شد' : 'دسته‌بندی جدید اضافه شد')) setCategoryModal(false);
  };

  const openBlog = (post?: BlogPost) => {
    setEditingBlog(post || null);
    setBlogDraft(post ? { title: post.title, slug: post.slug, excerpt: post.excerpt || '', content: post.content || '', image_url: post.image_url || '', author: post.author } : emptyBlog());
    setBlogModal(true);
  };
  const saveBlog = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = { title: blogDraft.title.trim(), slug: blogDraft.slug.trim(), excerpt: blogDraft.excerpt.trim() || null, content: blogDraft.content.trim() || null, image_url: blogDraft.image_url.trim() || null, author: blogDraft.author.trim() || 'تیم تحریریه' };
    if (!payload.title || !payload.slug) return setError('عنوان و slug مقاله الزامی است');
    const action = editingBlog ? () => supabase.from('blog_posts').update(payload).eq('id', editingBlog.id) : () => supabase.from('blog_posts').insert(payload);
    if (await runAction(action, editingBlog ? 'مقاله ویرایش شد' : 'مقاله جدید اضافه شد')) setBlogModal(false);
  };

  const openReview = (review?: Review) => {
    setEditingReview(review || null);
    setReviewDraft(review ? { product_id: review.product_id, name: review.name, rating: String(review.rating), comment: review.comment || '', status: review.status || 'published' } : emptyReview());
    setReviewModal(true);
  };
  const saveReview = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = { product_id: reviewDraft.product_id, name: reviewDraft.name.trim(), rating: Number(reviewDraft.rating) || 5, comment: reviewDraft.comment.trim() || null, status: reviewDraft.status };
    if (!payload.product_id || !payload.name) return setError('محصول و نام ثبت‌کننده نظر الزامی است');
    const action = editingReview ? () => supabase.from('reviews').update(payload).eq('id', editingReview.id) : () => supabase.from('reviews').insert(payload);
    if (await runAction(action, editingReview ? 'نظر ویرایش شد' : 'نظر جدید اضافه شد')) setReviewModal(false);
  };

  const openCoupon = (coupon?: Coupon) => {
    setEditingCoupon(coupon || null);
    setCouponDraft(coupon ? { code: coupon.code, type: coupon.type, value: String(coupon.value), min_order: String(coupon.min_order), max_uses: coupon.max_uses === null ? '' : String(coupon.max_uses), active: coupon.active, expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 10) : '' } : emptyCoupon());
    setCouponModal(true);
  };
  const saveCoupon = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = { code: couponDraft.code.trim().toUpperCase(), type: couponDraft.type, value: Number(couponDraft.value) || 0, min_order: Number(couponDraft.min_order) || 0, max_uses: couponDraft.max_uses ? Number(couponDraft.max_uses) : null, active: couponDraft.active, expires_at: couponDraft.expires_at ? new Date(`${couponDraft.expires_at}T23:59:59`).toISOString() : null };
    if (!payload.code) return setError('کد کوپن الزامی است');
    const action = editingCoupon ? () => supabase.from('coupons').update(payload).eq('id', editingCoupon.id) : () => supabase.from('coupons').insert(payload);
    if (await runAction(action, editingCoupon ? 'کوپن ویرایش شد' : 'کوپن جدید اضافه شد')) setCouponModal(false);
  };

  const openCustomer = (customer?: CustomerProfile) => {
    setEditingCustomer(customer || null);
    setCustomerDraft(customer ? { full_name: customer.full_name, email: customer.email || '', phone: customer.phone || '', address: customer.address || '', status: customer.status } : emptyCustomer());
    setCustomerModal(true);
  };
  const saveCustomer = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = { full_name: customerDraft.full_name.trim(), email: customerDraft.email.trim() || null, phone: customerDraft.phone.trim() || null, address: customerDraft.address.trim() || null, status: customerDraft.status };
    if (!payload.full_name) return setError('نام مشتری الزامی است');
    const action = editingCustomer ? () => supabase.from('customer_profiles').update(payload).eq('id', editingCustomer.id) : () => supabase.from('customer_profiles').insert(payload);
    if (await runAction(action, editingCustomer ? 'پرونده مشتری ویرایش شد' : 'مشتری جدید اضافه شد')) setCustomerModal(false);
  };

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = { store_name: settingsDraft.store_name.trim(), support_phone: settingsDraft.support_phone.trim(), support_email: settingsDraft.support_email.trim(), shipping_threshold: Number(settingsDraft.shipping_threshold) || 0, currency: settingsDraft.currency.trim() || 'تومان', announcement: settingsDraft.announcement.trim(), maintenance_mode: settingsDraft.maintenance_mode, updated_at: new Date().toISOString() };
    const updateResult = await supabase.from('store_settings').update(payload).eq('id', 'store').select().maybeSingle();
    if (updateResult.error) return setError(updateResult.error.message);
    if (!updateResult.data) {
      const insertResult = await supabase.from('store_settings').insert({ id: 'store', ...payload });
      if (insertResult.error) return setError(insertResult.error.message);
    }
    setSettingsDraft({ ...settingsDraft, ...payload });
    setNotice('تنظیمات فروشگاه ذخیره شد');
  };

  const refresh = async () => { setRefreshing(true); await loadAll(); setRefreshing(false); };
  const exportExcel = () => downloadSalesCsv(orders);

  if (!user) {
    return <AccessState icon={UserRound} title="ورود مدیر مورد نیاز است" description="برای مشاهده پنل مدیریت ابتدا وارد حساب کاربری خود شوید." primary="ورود مدیر" onPrimary={onOpenAuth} secondary="بازگشت به فروشگاه" onSecondary={() => onNavigate('home')} />;
  }
  if (!isAdmin) {
    return <AccessState icon={ShieldCheck} title="دسترسی غیرمجاز" description="این صفحه فقط برای مدیرانی فعال است که نقش آن‌ها در app_metadata.role روی admin تنظیم شده باشد." primary="بازگشت به فروشگاه" onPrimary={() => onNavigate('home')} />;
  }

  return (
    <div className="min-h-screen bg-dark-50 pt-24" dir="rtl">
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Breadcrumbs items={[{ label: 'پنل مدیریت' }]} onNavigate={onNavigate} />
        <header className="mb-6 flex flex-col gap-4 rounded-3xl bg-dark-950 p-5 text-white shadow-xl shadow-dark-900/10 sm:p-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300"><ShieldCheck className="h-4 w-4" /> مرکز فرمان مُدارا</div>
            <h1 className="text-2xl font-bold sm:text-3xl">مدیریت حرفه‌ای فروشگاه</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">تمام بخش‌های کاتالوگ، سفارش، محتوا، مشتریان و تنظیمات را از یک مرکز کنترل امن مدیریت کنید.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => onNavigate('home')} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"><ArrowRight className="h-4 w-4" /> فروشگاه</button>
            <button onClick={exportExcel} disabled={!orders.length} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"><Download className="h-4 w-4" /> خروجی گزارش</button>
            <button onClick={refresh} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-dark-950 transition hover:bg-amber-400 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> بروزرسانی</button>
          </div>
        </header>

        {isDemoMode && <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><p>حالت Demo فعال است؛ تغییرات در همین مرورگر ذخیره می‌شوند. برای Production، migration پنل و RLS مدیر را در Supabase اجرا کنید.</p></div>}
        {error && <div className="mb-6 flex items-start gap-3 rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-sm leading-6 text-error-700"><XCircle className="mt-0.5 h-5 w-5 shrink-0" /><p>{error}</p><button onClick={() => setError(null)} className="mr-auto rounded-lg p-1 hover:bg-error-100" aria-label="بستن پیام خطا"><X className="h-4 w-4" /></button></div>}
        {notice && <div className="mb-6 flex items-center gap-2 rounded-2xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700"><CheckCircle2 className="h-5 w-5" /> {notice}</div>}

        <div className="grid gap-6 lg:grid-cols-[245px_minmax(0,1fr)]">
          <aside className="h-fit rounded-3xl border border-dark-100 bg-white p-3 shadow-sm lg:sticky lg:top-24">
            <div className="mb-3 hidden px-3 pt-2 text-xs font-semibold uppercase tracking-widest text-dark-400 lg:block">مرکز مدیریت</div>
            <nav className="scrollbar-hide flex gap-2 overflow-x-auto lg:flex-col">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearch(''); }} className={`flex min-w-max items-center gap-3 rounded-2xl px-3 py-3 text-right transition-all lg:w-full ${active ? 'bg-dark-950 text-white shadow-lg shadow-dark-900/10' : 'text-dark-600 hover:bg-amber-50 hover:text-amber-800'}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-amber-500 text-dark-950' : 'bg-dark-50 text-dark-500'}`}><Icon className="h-4 w-4" /></span><span className="hidden min-w-0 flex-1 lg:block"><span className="block text-sm font-semibold">{tab.label}</span><span className={`mt-0.5 block truncate text-[11px] ${active ? 'text-white/55' : 'text-dark-400'}`}>{tab.description}</span></span>{tabCounts[tab.id] !== undefined && <span className={`rounded-full px-2 py-0.5 text-[11px] ${active ? 'bg-white/10 text-white/70' : 'bg-dark-100 text-dark-500'}`}>{tabCounts[tab.id]}</span>}</button>;
              })}
            </nav>
            <div className="mt-4 hidden rounded-2xl bg-amber-50 p-4 text-xs leading-5 text-amber-900 lg:block"><div className="mb-2 flex items-center gap-2 font-semibold"><LifeBuoy className="h-4 w-4" /> راهنمای سریع</div><p>از تب نمای کلی سلامت فروشگاه را ببینید و سپس از هر تب، عملیات افزودن، ویرایش یا حذف را انجام دهید.</p></div>
          </aside>

          <section className="min-w-0">
            {activeTab !== 'settings' && <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-widest text-amber-700">{tabs.find((tab) => tab.id === activeTab)?.description}</p><h2 className="mt-1 text-2xl font-bold text-dark-900">{tabs.find((tab) => tab.id === activeTab)?.label}</h2></div>{activeTab !== 'overview' && <div className="relative w-full sm:w-72"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="input-field pr-10" placeholder="جستجو در این بخش..." /></div>}</div>}
            {loading ? <LoadingState /> : (
              <>
                {activeTab === 'overview' && <OverviewTab stats={stats} orders={orders} products={products} onNavigate={setActiveTab} />}
                {activeTab === 'orders' && <OrdersTab orders={filteredOrders} updatingId={updatingId} statusFilter={statusFilter} setStatusFilter={setStatusFilter} onUpdate={updateOrder} onDelete={(id) => deleteRow('orders', id, 'سفارش')} onExport={exportExcel} />}
                {activeTab === 'products' && <ProductsTab products={filteredProducts} categories={categories} onAdd={() => openProduct()} onEdit={openProduct} onDelete={(id) => deleteRow('products', id, 'محصول')} />}
                {activeTab === 'categories' && <CategoriesTab categories={filteredCategories} onAdd={() => openCategory()} onEdit={openCategory} onDelete={(id) => deleteRow('categories', id, 'دسته‌بندی')} />}
                {activeTab === 'blog' && <BlogTab posts={filteredBlogPosts} onAdd={() => openBlog()} onEdit={openBlog} onDelete={(id) => deleteRow('blog_posts', id, 'مقاله')} />}
                {activeTab === 'reviews' && <ReviewsTab reviews={filteredReviews} onAdd={() => openReview()} onEdit={openReview} onDelete={(id) => deleteRow('reviews', id, 'نظر')} />}
                {activeTab === 'coupons' && <CouponsTab coupons={filteredCoupons} onAdd={() => openCoupon()} onEdit={openCoupon} onDelete={(id) => deleteRow('coupons', id, 'کوپن')} />}
                {activeTab === 'customers' && <CustomersTab customers={filteredCustomers} onAdd={() => openCustomer()} onEdit={openCustomer} onDelete={(id) => deleteRow('customer_profiles', id, 'مشتری')} />}
                {activeTab === 'settings' && <SettingsTab settings={settingsDraft} setSettings={setSettingsDraft} onSave={saveSettings} saving={saving} />}
              </>
            )}
          </section>
        </div>
      </div>

      <Modal open={productModal} title={editingProduct ? 'ویرایش محصول' : 'افزودن محصول جدید'} onClose={() => setProductModal(false)}><ProductForm draft={productDraft} setDraft={setProductDraft} categories={categories} onSubmit={saveProduct} saving={saving} /></Modal>
      <Modal open={categoryModal} title={editingCategory ? 'ویرایش دسته‌بندی' : 'افزودن دسته‌بندی'} onClose={() => setCategoryModal(false)}><CategoryForm draft={categoryDraft} setDraft={setCategoryDraft} onSubmit={saveCategory} saving={saving} /></Modal>
      <Modal open={blogModal} title={editingBlog ? 'ویرایش مقاله' : 'افزودن مقاله'} onClose={() => setBlogModal(false)} wide><BlogForm draft={blogDraft} setDraft={setBlogDraft} onSubmit={saveBlog} saving={saving} /></Modal>
      <Modal open={reviewModal} title={editingReview ? 'ویرایش نظر' : 'افزودن نظر'} onClose={() => setReviewModal(false)}><ReviewForm draft={reviewDraft} setDraft={setReviewDraft} products={products} onSubmit={saveReview} saving={saving} /></Modal>
      <Modal open={couponModal} title={editingCoupon ? 'ویرایش کوپن' : 'افزودن کوپن'} onClose={() => setCouponModal(false)}><CouponForm draft={couponDraft} setDraft={setCouponDraft} onSubmit={saveCoupon} saving={saving} /></Modal>
      <Modal open={customerModal} title={editingCustomer ? 'ویرایش مشتری' : 'افزودن مشتری'} onClose={() => setCustomerModal(false)}><CustomerForm draft={customerDraft} setDraft={setCustomerDraft} onSubmit={saveCustomer} saving={saving} /></Modal>
    </div>
  );
}

function AccessState({ icon: Icon, title, description, primary, onPrimary, secondary, onSecondary }: { icon: typeof UserRound; title: string; description: string; primary: string; onPrimary: () => void; secondary?: string; onSecondary?: () => void }) {
  return <div className="min-h-screen bg-dark-50 pt-24" dir="rtl"><div className="mx-auto max-w-xl px-4 py-20 text-center"><Icon className="mx-auto mb-4 h-14 w-14 text-amber-500" /><h1 className="mb-2 text-2xl font-bold text-dark-900">{title}</h1><p className="mb-6 leading-7 text-dark-500">{description}</p><div className="flex flex-wrap justify-center gap-3"><button onClick={onPrimary} className="btn-primary">{primary}</button>{secondary && onSecondary && <button onClick={onSecondary} className="btn-ghost">{secondary}</button>}</div></div></div>;
}

function LoadingState() { return <div className="space-y-4"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="card h-28 shimmer-bg" />)}</div><div className="card h-96 shimmer-bg" /></div>; }

function OverviewTab({ stats, orders, products, onNavigate }: { stats: { total: number; pending: number; paid: number; revenue: number; average: number; lowStock: number; activeCoupons: number }; orders: Order[]; products: Product[]; onNavigate: (tab: AdminTab) => void }) {
  const statusRows = Object.entries(statusConfig).map(([status, meta]) => ({ ...meta, status, count: orders.filter((order) => order.status === status).length }));
  const lowStock = products.filter((product) => Number(product.stock) <= 5).slice(0, 5);
  return <div className="space-y-6"><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6"><MetricCard label="کل سفارش‌ها" value={fa(stats.total)} icon={ShoppingBag} tone="dark" /><MetricCard label="در انتظار پرداخت" value={fa(stats.pending)} icon={Clock3} tone="amber" /><MetricCard label="پرداخت موفق" value={fa(stats.paid)} icon={CheckCircle2} tone="green" /><MetricCard label="درآمد ثبت‌شده" value={formatPrice(stats.revenue)} icon={Wallet} tone="orange" /><MetricCard label="موجودی کم" value={fa(stats.lowStock)} icon={AlertTriangle} tone="red" /><MetricCard label="کوپن فعال" value={fa(stats.activeCoupons)} icon={Percent} tone="purple" /></div><div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]"><div className="card p-5 sm:p-6"><div className="mb-6 flex items-center justify-between"><div><p className="text-xs text-dark-400">عملکرد مالی</p><h3 className="mt-1 text-lg font-bold text-dark-900">درآمد و وضعیت سفارش‌ها</h3></div><BarChart3 className="h-5 w-5 text-amber-600" /></div><div className="mb-7 flex items-end gap-3"><span className="text-3xl font-bold text-dark-900">{formatPrice(stats.revenue)}</span><span className="mb-1 text-xs text-dark-400">میانگین سفارش: {formatPrice(stats.average)}</span></div><div className="space-y-4">{statusRows.map((row) => { const Icon = row.icon; const percent = Math.min(100, orders.length ? row.count / orders.length * 100 : 0); return <div key={row.status}><div className="mb-1.5 flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-dark-600"><Icon className="h-4 w-4" />{row.label}</span><strong className="text-dark-900">{fa(row.count)}</strong></div><div className="h-2 overflow-hidden rounded-full bg-dark-100"><div className="h-full rounded-full bg-gradient-to-l from-amber-500 to-orange-500 transition-all" style={{ width: `${percent}%` }} /></div></div>; })}</div></div><div className="card p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs text-dark-400">کنترل موجودی</p><h3 className="mt-1 text-lg font-bold text-dark-900">نیازمند توجه</h3></div><button onClick={() => onNavigate('products')} className="text-xs font-semibold text-amber-700">مشاهده محصولات</button></div>{lowStock.length ? <div className="space-y-3">{lowStock.map((product) => <div key={product.id} className="flex items-center gap-3 rounded-2xl bg-dark-50 p-3"><img src={asset(product.image_url)} alt={product.name} className="h-12 w-12 rounded-xl object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-dark-900">{product.name}</p><p className="mt-1 text-xs text-error-600">موجودی: {fa(product.stock)} عدد</p></div><button onClick={() => onNavigate('products')} className="rounded-lg p-2 text-dark-400 hover:bg-white hover:text-amber-700" aria-label="ویرایش محصول"><Edit3 className="h-4 w-4" /></button></div>)}</div> : <EmptyState icon={CheckCircle2} title="موجودی بحرانی ندارید" description="همه محصولات موجودی مناسبی دارند." compact />}</div></div><div className="card overflow-hidden"><div className="flex items-center justify-between border-b border-dark-100 p-5"><div><p className="text-xs text-dark-400">آخرین فعالیت</p><h3 className="mt-1 text-lg font-bold text-dark-900">آخرین سفارش‌ها</h3></div><button onClick={() => onNavigate('orders')} className="text-xs font-semibold text-amber-700">مشاهده همه</button></div>{orders.length ? <div className="divide-y divide-dark-100">{orders.slice(0, 5).map((order) => <div key={order.id} className="flex flex-wrap items-center gap-3 p-4 sm:px-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><ShoppingBag className="h-4 w-4" /></div><div className="min-w-[150px] flex-1"><p className="font-mono text-sm font-semibold text-dark-900">#{order.id.slice(0, 8).toUpperCase()}</p><p className="mt-1 text-xs text-dark-400">{formatDateTime(order.created_at)} · {order.phone || 'بدون تلفن'}</p></div><span className="text-sm font-bold text-amber-700">{formatPrice(order.total)}</span><StatusBadge status={order.status} /></div>)}</div> : <EmptyState icon={ShoppingBag} title="هنوز سفارشی ثبت نشده است" description="با اولین خرید مشتری، فعالیت‌ها اینجا نمایش داده می‌شوند." />}</div></div>;
}

function OrdersTab({ orders, updatingId, statusFilter, setStatusFilter, onUpdate, onDelete, onExport }: { orders: Order[]; updatingId: string | null; statusFilter: string; setStatusFilter: (value: string) => void; onUpdate: (order: Order, status: string, trackingCode?: string) => void; onDelete: (id: string) => void; onExport: () => void }) {
  return <div className="space-y-4"><div className="flex flex-col gap-3 rounded-2xl border border-dark-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-dark-900">مدیریت چرخه سفارش</p><p className="mt-1 text-xs text-dark-400">وضعیت پرداخت، ارسال و کد رهگیری را به‌روزرسانی کنید.</p></div><div className="flex flex-wrap gap-2"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="input-field w-full cursor-pointer py-2 text-sm sm:w-48"><option value="all">همه وضعیت‌ها</option>{statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select><button onClick={onExport} disabled={!orders.length} className="btn-ghost px-3 py-2 text-sm disabled:opacity-40"><Download className="h-4 w-4" /> CSV</button></div></div>{orders.length ? orders.map((order) => <OrderCard key={order.id} order={order} updating={updatingId === order.id} onUpdate={onUpdate} onDelete={onDelete} />) : <EmptyState icon={ShoppingBag} title="سفارشی با این فیلتر پیدا نشد" description="فیلتر وضعیت یا عبارت جستجو را تغییر دهید." />}</div>;
}

function OrderCard({ order, updating, onUpdate, onDelete }: { order: Order; updating: boolean; onUpdate: (order: Order, status: string, trackingCode?: string) => void; onDelete: (id: string) => void }) {
  const [trackingCode, setTrackingCode] = useState(order.tracking_code || '');
  const meta = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = meta.icon;
  return <article className="card overflow-hidden"><div className="flex flex-col gap-4 border-b border-dark-100 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5"><div><div className="flex flex-wrap items-center gap-2"><span className="font-mono font-bold text-dark-900">#{order.id.slice(0, 8).toUpperCase()}</span><span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${meta.color}`}><StatusIcon className="h-3.5 w-3.5" />{meta.label}</span></div><p className="mt-2 text-xs text-dark-500">{formatDateTime(order.created_at)} · {order.phone || 'بدون تلفن'}</p></div><div className="flex flex-wrap items-center gap-2"><select value={order.status} disabled={updating} onChange={(event) => onUpdate(order, event.target.value, trackingCode)} className="rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm disabled:opacity-60">{statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select><button onClick={() => onDelete(order.id)} className="rounded-xl border border-error-200 p-2 text-error-600 transition hover:bg-error-50" aria-label="حذف سفارش"><Trash2 className="h-4 w-4" /></button></div></div><div className="space-y-2 p-4 sm:p-5">{order.order_items?.map((item: OrderItem) => <div key={item.id} className="flex items-center gap-3 rounded-xl bg-dark-50 p-3"><img src={asset(item.product?.image_url)} alt={item.product?.name || ''} className="h-12 w-12 rounded-lg object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-dark-900">{item.product?.name || 'محصول حذف‌شده'}</p><p className="text-xs text-dark-500">{fa(item.quantity)} عدد × {formatPrice(item.price)}</p></div><span className="text-sm font-bold text-dark-900">{formatPrice(item.price * item.quantity)}</span></div>)}</div><div className="flex flex-col gap-3 border-t border-dark-100 p-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:p-5"><p className="leading-6 text-dark-500">آدرس: {order.address || 'ثبت نشده'}</p><div className="flex flex-wrap items-center gap-2"><input value={trackingCode} onChange={(event) => setTrackingCode(event.target.value)} placeholder="کد رهگیری" className="input-field w-36 py-2 text-xs" /><button onClick={() => onUpdate(order, order.status, trackingCode)} disabled={updating} className="btn-ghost px-3 py-2 text-xs disabled:opacity-50"><Save className="h-3.5 w-3.5" /> ذخیره رهگیری</button><strong className="text-amber-700">مجموع: {formatPrice(order.total)}</strong></div></div></article>;
}

function ProductsTab({ products, categories, onAdd, onEdit, onDelete }: { products: Product[]; categories: Category[]; onAdd: () => void; onEdit: (product: Product) => void; onDelete: (id: string) => void }) {
  return <CrudShell title="کاتالوگ محصولات" description="قیمت، موجودی، تصویر، slug و دسته‌بندی هر محصول را مدیریت کنید." actionLabel="افزودن محصول" onAdd={onAdd}>{products.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{products.map((product) => <div key={product.id} className="card overflow-hidden"><div className="relative aspect-[4/3] bg-dark-50"><img src={asset(product.image_url)} alt={product.name} className="h-full w-full object-cover" /><span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ${product.stock <= 5 ? 'bg-error-600 text-white' : 'bg-dark-950/75 text-white'}`}>{product.stock <= 5 ? `موجودی کم: ${fa(product.stock)}` : `موجودی: ${fa(product.stock)}`}</span></div><div className="p-4"><div className="mb-2 flex items-start justify-between gap-3"><div><h3 className="font-bold text-dark-900">{product.name}</h3><p className="mt-1 text-xs text-dark-400">/{product.slug}</p></div><span className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">★ {fa(product.rating)}</span></div><p className="mb-4 line-clamp-2 text-sm leading-6 text-dark-500">{product.description || 'بدون توضیحات'}</p><div className="mb-4 flex items-center justify-between"><span className="text-lg font-bold text-amber-700">{formatPrice(product.price)}</span><span className="text-xs text-dark-400">{categories.find((category) => category.id === product.category_id)?.name || 'بدون دسته'}</span></div><div className="flex gap-2"><button onClick={() => onEdit(product)} className="btn-ghost flex-1 px-3 py-2 text-sm"><Edit3 className="h-4 w-4" /> ویرایش</button><button onClick={() => onDelete(product.id)} className="rounded-xl border border-error-200 px-3 py-2 text-error-600 transition hover:bg-error-50" aria-label="حذف محصول"><Trash2 className="h-4 w-4" /></button></div></div></div>)}</div> : <EmptyState icon={Package} title="محصولی وجود ندارد" description="با افزودن اولین محصول، کاتالوگ شما اینجا نمایش داده می‌شود." />}</CrudShell>;
}

function CategoriesTab({ categories, onAdd, onEdit, onDelete }: { categories: Category[]; onAdd: () => void; onEdit: (category: Category) => void; onDelete: (id: string) => void }) {
  return <CrudShell title="ساختار دسته‌بندی" description="دسته‌های فروشگاه و slug قابل اشتراک آن‌ها را مدیریت کنید." actionLabel="افزودن دسته‌بندی" onAdd={onAdd}>{categories.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{categories.map((category) => <div key={category.id} className="card flex items-center gap-4 p-5"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"><FolderTree className="h-5 w-5" /></div><div className="min-w-0 flex-1"><h3 className="font-bold text-dark-900">{category.name}</h3><p className="mt-1 truncate text-xs text-dark-400">/{category.slug} · icon: {category.icon || 'tag'}</p></div><div className="flex gap-1"><button onClick={() => onEdit(category)} className="rounded-xl p-2 text-dark-500 hover:bg-amber-50 hover:text-amber-700" aria-label="ویرایش دسته‌بندی"><Edit3 className="h-4 w-4" /></button><button onClick={() => onDelete(category.id)} className="rounded-xl p-2 text-error-600 hover:bg-error-50" aria-label="حذف دسته‌بندی"><Trash2 className="h-4 w-4" /></button></div></div>)}</div> : <EmptyState icon={FolderTree} title="دسته‌ای وجود ندارد" description="دسته‌بندی جدید بسازید تا سازمان‌دهی محصولات ساده‌تر شود." />}</CrudShell>;
}

function BlogTab({ posts, onAdd, onEdit, onDelete }: { posts: BlogPost[]; onAdd: () => void; onEdit: (post: BlogPost) => void; onDelete: (id: string) => void }) {
  return <CrudShell title="مدیریت محتوای بلاگ" description="عنوان، slug، تصویر، نویسنده و متن مقالات را در یکجا کنترل کنید." actionLabel="افزودن مقاله" onAdd={onAdd}>{posts.length ? <div className="grid gap-4 md:grid-cols-2">{posts.map((post) => <article key={post.id} className="card flex flex-col overflow-hidden"><div className="aspect-[16/8] bg-dark-50">{post.image_url ? <img src={asset(post.image_url)} alt={post.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-dark-300"><FileText className="h-10 w-10" /></div>}</div><div className="flex flex-1 flex-col p-5"><div className="mb-2 flex items-center justify-between gap-3"><span className="text-xs text-dark-400">{post.author}</span><span className="text-xs text-dark-400">{formatDateTime(post.created_at)}</span></div><h3 className="text-lg font-bold text-dark-900">{post.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-dark-500">{post.excerpt || 'بدون خلاصه'}</p><div className="mt-auto flex gap-2 pt-5"><button onClick={() => onEdit(post)} className="btn-ghost flex-1 px-3 py-2 text-sm"><Edit3 className="h-4 w-4" /> ویرایش</button><button onClick={() => onDelete(post.id)} className="rounded-xl border border-error-200 px-3 py-2 text-error-600 hover:bg-error-50" aria-label="حذف مقاله"><Trash2 className="h-4 w-4" /></button></div></div></article>)}</div> : <EmptyState icon={BookOpen} title="مقاله‌ای وجود ندارد" description="محتوای آموزشی و کمپین‌های محتوایی خود را ایجاد کنید." />}</CrudShell>;
}

function ReviewsTab({ reviews, onAdd, onEdit, onDelete }: { reviews: Review[]; onAdd: () => void; onEdit: (review: Review) => void; onDelete: (id: string) => void }) {
  return <CrudShell title="نظرات و امتیازها" description="بازخوردهای مشتریان را بررسی، منتشر، مخفی یا حذف کنید." actionLabel="افزودن نظر" onAdd={onAdd}>{reviews.length ? <div className="space-y-3">{reviews.map((review) => <div key={review.id} className="card p-4 sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 font-bold text-white">{review.name[0] || '؟'}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-dark-900">{review.name}</h3><span className="text-xs text-dark-400">برای {review.product?.name || 'محصول حذف‌شده'}</span><span className={`rounded-full px-2 py-0.5 text-[11px] ${review.status === 'published' ? 'bg-success-50 text-success-700' : review.status === 'hidden' ? 'bg-dark-100 text-dark-500' : 'bg-warning-50 text-warning-700'}`}>{review.status === 'published' ? 'منتشرشده' : review.status === 'hidden' ? 'مخفی' : 'در انتظار بررسی'}</span></div><p className="mt-2 text-amber-500">{'★'.repeat(Math.min(5, Math.max(1, Number(review.rating))))}<span className="mr-2 text-xs text-dark-400">{formatDateTime(review.created_at)}</span></p><p className="mt-2 leading-7 text-dark-600">{review.comment || 'بدون متن'}</p></div><div className="flex gap-1"><button onClick={() => onEdit(review)} className="rounded-xl p-2 text-dark-500 hover:bg-amber-50 hover:text-amber-700" aria-label="ویرایش نظر"><Edit3 className="h-4 w-4" /></button><button onClick={() => onDelete(review.id)} className="rounded-xl p-2 text-error-600 hover:bg-error-50" aria-label="حذف نظر"><Trash2 className="h-4 w-4" /></button></div></div></div>)}</div> : <EmptyState icon={LifeBuoy} title="نظری ثبت نشده است" description="نظرات مشتریان پس از ثبت در این بخش قابل مدیریت هستند." />}</CrudShell>;
}

function CouponsTab({ coupons, onAdd, onEdit, onDelete }: { coupons: Coupon[]; onAdd: () => void; onEdit: (coupon: Coupon) => void; onDelete: (id: string) => void }) {
  return <CrudShell title="کمپین‌ها و کوپن‌ها" description="کد تخفیف، سقف مصرف، حداقل سبد و تاریخ انقضا را مدیریت کنید." actionLabel="افزودن کوپن" onAdd={onAdd}>{coupons.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{coupons.map((coupon) => <div key={coupon.id} className="card overflow-hidden"><div className="flex items-center justify-between bg-gradient-to-l from-amber-600 to-orange-500 p-5 text-white"><div><p className="text-xs text-white/70">کد تخفیف</p><h3 className="mt-1 font-mono text-xl font-bold tracking-wider">{coupon.code}</h3></div><Tag className="h-7 w-7 opacity-80" /></div><div className="p-5"><div className="mb-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-dark-50 p-3"><span className="block text-xs text-dark-400">مقدار تخفیف</span><strong className="mt-1 block text-dark-900">{fa(coupon.value)} {coupon.type === 'percentage' ? '٪' : 'تومان'}</strong></div><div className="rounded-xl bg-dark-50 p-3"><span className="block text-xs text-dark-400">مصرف</span><strong className="mt-1 block text-dark-900">{fa(coupon.used_count)} / {coupon.max_uses === null ? '∞' : fa(coupon.max_uses)}</strong></div></div><div className="mb-4 flex flex-wrap gap-2 text-xs"><span className={`rounded-full px-2.5 py-1 ${coupon.active ? 'bg-success-50 text-success-700' : 'bg-dark-100 text-dark-500'}`}>{coupon.active ? 'فعال' : 'غیرفعال'}</span>{coupon.expires_at && <span className="rounded-full bg-dark-100 px-2.5 py-1 text-dark-500">تا {new Date(coupon.expires_at).toLocaleDateString('fa-IR')}</span>}</div><div className="flex gap-2"><button onClick={() => onEdit(coupon)} className="btn-ghost flex-1 px-3 py-2 text-sm"><Edit3 className="h-4 w-4" /> ویرایش</button><button onClick={() => onDelete(coupon.id)} className="rounded-xl border border-error-200 px-3 py-2 text-error-600 hover:bg-error-50" aria-label="حذف کوپن"><Trash2 className="h-4 w-4" /></button></div></div></div>)}</div> : <EmptyState icon={Percent} title="کوپنی تعریف نشده است" description="اولین کمپین تخفیف خود را ایجاد کنید." />}</CrudShell>;
}

function CustomersTab({ customers, onAdd, onEdit, onDelete }: { customers: CustomerProfile[]; onAdd: () => void; onEdit: (customer: CustomerProfile) => void; onDelete: (id: string) => void }) {
  return <CrudShell title="پرونده مشتریان" description="اطلاعات تماس، آدرس و وضعیت مشتریان را مدیریت کنید." actionLabel="افزودن مشتری" onAdd={onAdd}>{customers.length ? <div className="overflow-hidden rounded-2xl border border-dark-100 bg-white"><div className="hidden grid-cols-[1.5fr_1fr_1fr_1.5fr_auto] gap-4 border-b border-dark-100 bg-dark-50 px-5 py-3 text-xs font-semibold text-dark-500 md:grid"><span>مشتری</span><span>تماس</span><span>وضعیت</span><span>آدرس</span><span /></div>{customers.map((customer) => <div key={customer.id} className="grid gap-3 border-b border-dark-100 p-4 last:border-0 md:grid-cols-[1.5fr_1fr_1fr_1.5fr_auto] md:items-center md:gap-4 md:px-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 font-bold text-amber-700">{customer.full_name[0] || '؟'}</div><div><p className="font-semibold text-dark-900">{customer.full_name}</p><p className="text-xs text-dark-400">{customer.email || 'ایمیل ثبت نشده'}</p></div></div><div className="text-sm text-dark-600">{customer.phone || 'بدون تلفن'}</div><span className={`w-fit rounded-full px-2.5 py-1 text-xs ${customer.status === 'blocked' ? 'bg-error-50 text-error-700' : 'bg-success-50 text-success-700'}`}>{customer.status === 'blocked' ? 'مسدود' : 'فعال'}</span><p className="truncate text-sm text-dark-500">{customer.address || 'آدرس ثبت نشده'}</p><div className="flex gap-1"><button onClick={() => onEdit(customer)} className="rounded-xl p-2 text-dark-500 hover:bg-amber-50 hover:text-amber-700" aria-label="ویرایش مشتری"><Edit3 className="h-4 w-4" /></button><button onClick={() => onDelete(customer.id)} className="rounded-xl p-2 text-error-600 hover:bg-error-50" aria-label="حذف مشتری"><Trash2 className="h-4 w-4" /></button></div></div>)}</div> : <EmptyState icon={Users} title="مشتری‌ای ثبت نشده است" description="پرونده مشتریان از ثبت سفارش یا افزودن دستی ساخته می‌شود." />}</CrudShell>;
}

function SettingsTab({ settings, setSettings, onSave, saving }: { settings: StoreSettings; setSettings: (settings: StoreSettings) => void; onSave: (event: React.FormEvent) => void; saving: boolean }) {
  const update = (patch: Partial<StoreSettings>) => setSettings({ ...settings, ...patch });
  return <form onSubmit={onSave} className="space-y-6"><div className="flex flex-col gap-4 rounded-3xl bg-gradient-to-l from-dark-950 to-amber-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs text-amber-300">پیکربندی مرکزی</p><h2 className="mt-1 text-2xl font-bold">تنظیمات فروشگاه</h2><p className="mt-2 text-sm text-white/60">هویت فروشگاه و پیام‌های ارتباطی را از این بخش به‌روزرسانی کنید.</p></div><Settings className="h-12 w-12 text-white/25" /></div><div className="grid gap-6 xl:grid-cols-2"><div className="card space-y-4 p-5 sm:p-6"><SectionHeading icon={ShoppingBag} title="هویت فروشگاه" description="اطلاعاتی که در تجربه خرید و ارتباط با مشتری دیده می‌شود." /><Field label="نام فروشگاه" value={settings.store_name} onChange={(value) => update({ store_name: value })} /><Field label="واحد پول" value={settings.currency} onChange={(value) => update({ currency: value })} /><Field label="پیام اطلاع‌رسانی" value={settings.announcement} onChange={(value) => update({ announcement: value })} textarea /></div><div className="card space-y-4 p-5 sm:p-6"><SectionHeading icon={LifeBuoy} title="پشتیبانی و ارسال" description="اطلاعات تماس و آستانه ارسال رایگان را تنظیم کنید." /><Field label="شماره پشتیبانی" value={settings.support_phone} onChange={(value) => update({ support_phone: value })} /><Field label="ایمیل پشتیبانی" value={settings.support_email} onChange={(value) => update({ support_email: value })} type="email" /><Field label="حداقل مبلغ ارسال رایگان" value={String(settings.shipping_threshold)} onChange={(value) => update({ shipping_threshold: Number(value) || 0 })} type="number" /></div></div><div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><h3 className="font-bold text-dark-900">حالت تعمیر و نگهداری</h3><p className="mt-1 text-sm leading-6 text-dark-500">برای توقف موقت خرید در زمان تغییرات عمده استفاده کنید. فعال‌سازی واقعی storefront نیازمند اتصال این flag در frontend است.</p></div><button type="button" onClick={() => update({ maintenance_mode: !settings.maintenance_mode })} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${settings.maintenance_mode ? 'bg-error-50 text-error-700' : 'bg-success-50 text-success-700'}`}><span className={`h-2.5 w-2.5 rounded-full ${settings.maintenance_mode ? 'bg-error-500' : 'bg-success-500'}`} />{settings.maintenance_mode ? 'فعال است' : 'غیرفعال است'}</button></div><button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto"><Save className="h-4 w-4" />{saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}</button></form>;
}

function CrudShell({ title, description, actionLabel, onAdd, children }: { title: string; description: string; actionLabel: string; onAdd: () => void; children: React.ReactNode }) { return <div className="space-y-5"><div className="flex flex-col gap-3 rounded-2xl border border-dark-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5"><div><p className="font-semibold text-dark-900">{title}</p><p className="mt-1 text-xs leading-5 text-dark-400">{description}</p></div><button onClick={onAdd} className="btn-primary w-full px-4 py-2 text-sm sm:w-auto"><Plus className="h-4 w-4" /> {actionLabel}</button></div>{children}</div>; }

function MetricCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Package; tone: 'dark' | 'amber' | 'green' | 'orange' | 'red' | 'purple' }) { const tones = { dark: 'bg-dark-950 text-white', amber: 'bg-amber-50 text-amber-800', green: 'bg-success-50 text-success-800', orange: 'bg-orange-50 text-orange-800', red: 'bg-error-50 text-error-800', purple: 'bg-purple-50 text-purple-800' }; return <div className={`rounded-2xl p-4 shadow-sm ${tones[tone]}`}><div className="mb-3 flex items-center justify-between"><span className="text-[11px] opacity-65">{label}</span><Icon className="h-4 w-4 opacity-70" /></div><strong className="block truncate text-xl font-bold">{value}</strong></div>; }
function StatusBadge({ status }: { status: string }) { const meta = statusConfig[status] || statusConfig.pending; const Icon = meta.icon; return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${meta.color}`}><Icon className="h-3.5 w-3.5" />{meta.label}</span>; }
function SectionHeading({ icon: Icon, title, description }: { icon: typeof Settings; title: string; description: string }) { return <div className="mb-2 flex items-start gap-3 border-b border-dark-100 pb-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Icon className="h-5 w-5" /></div><div><h3 className="font-bold text-dark-900">{title}</h3><p className="mt-1 text-xs leading-5 text-dark-400">{description}</p></div></div>; }
function Field({ label, value, onChange, type = 'text', textarea = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; textarea?: boolean }) { return <label className="block"><span className="mb-1.5 block text-sm font-medium text-dark-700">{label}</span>{textarea ? <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="input-field resize-none" /> : <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="input-field" />}</label>; }
function EmptyState({ icon: Icon, title, description, compact = false }: { icon: typeof Package; title: string; description: string; compact?: boolean }) { return <div className={`card text-center ${compact ? 'p-6' : 'p-12'}`}><Icon className={`mx-auto mb-3 text-dark-300 ${compact ? 'h-9 w-9' : 'h-12 w-12'}`} /><p className="font-semibold text-dark-700">{title}</p><p className="mt-1 text-sm text-dark-400">{description}</p></div>; }

function FormActions({ saving }: { saving: boolean }) { return <div className="flex gap-2 pt-2"><button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5 text-sm"><Save className="h-4 w-4" />{saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}</button></div>; }
function ProductForm({ draft, setDraft, categories, onSubmit, saving }: { draft: ProductDraft; setDraft: (draft: ProductDraft) => void; categories: Category[]; onSubmit: (event: React.FormEvent) => void; saving: boolean }) { const update = (patch: Partial<ProductDraft>) => setDraft({ ...draft, ...patch }); return <form onSubmit={onSubmit} className="space-y-4"><Field label="نام محصول" value={draft.name} onChange={(value) => update({ name: value })} /><div className="grid gap-4 sm:grid-cols-2"><Field label="Slug" value={draft.slug} onChange={(value) => update({ slug: value })} /><label className="block"><span className="mb-1.5 block text-sm font-medium text-dark-700">دسته‌بندی</span><select value={draft.category_id} onChange={(event) => update({ category_id: event.target.value })} className="input-field cursor-pointer"><option value="">بدون دسته‌بندی</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></div><Field label="توضیحات" value={draft.description} onChange={(value) => update({ description: value })} textarea /><Field label="آدرس تصویر" value={draft.image_url} onChange={(value) => update({ image_url: value })} /><div className="grid gap-4 sm:grid-cols-3"><Field label="قیمت" value={draft.price} onChange={(value) => update({ price: value })} type="number" /><Field label="موجودی" value={draft.stock} onChange={(value) => update({ stock: value })} type="number" /><Field label="امتیاز" value={draft.rating} onChange={(value) => update({ rating: value })} type="number" /></div><FormActions saving={saving} /></form>; }
function CategoryForm({ draft, setDraft, onSubmit, saving }: { draft: CategoryDraft; setDraft: (draft: CategoryDraft) => void; onSubmit: (event: React.FormEvent) => void; saving: boolean }) { const update = (patch: Partial<CategoryDraft>) => setDraft({ ...draft, ...patch }); return <form onSubmit={onSubmit} className="space-y-4"><Field label="نام دسته‌بندی" value={draft.name} onChange={(value) => update({ name: value })} /><Field label="Slug" value={draft.slug} onChange={(value) => update({ slug: value })} /><Field label="نام آیکن" value={draft.icon} onChange={(value) => update({ icon: value })} /><FormActions saving={saving} /></form>; }
function BlogForm({ draft, setDraft, onSubmit, saving }: { draft: BlogDraft; setDraft: (draft: BlogDraft) => void; onSubmit: (event: React.FormEvent) => void; saving: boolean }) { const update = (patch: Partial<BlogDraft>) => setDraft({ ...draft, ...patch }); return <form onSubmit={onSubmit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="عنوان مقاله" value={draft.title} onChange={(value) => update({ title: value })} /><Field label="Slug" value={draft.slug} onChange={(value) => update({ slug: value })} /></div><div className="grid gap-4 sm:grid-cols-2"><Field label="نویسنده" value={draft.author} onChange={(value) => update({ author: value })} /><Field label="آدرس تصویر" value={draft.image_url} onChange={(value) => update({ image_url: value })} /></div><Field label="خلاصه" value={draft.excerpt} onChange={(value) => update({ excerpt: value })} textarea /><Field label="متن کامل" value={draft.content} onChange={(value) => update({ content: value })} textarea /><FormActions saving={saving} /></form>; }
function ReviewForm({ draft, setDraft, products, onSubmit, saving }: { draft: ReviewDraft; setDraft: (draft: ReviewDraft) => void; products: Product[]; onSubmit: (event: React.FormEvent) => void; saving: boolean }) { const update = (patch: Partial<ReviewDraft>) => setDraft({ ...draft, ...patch }); return <form onSubmit={onSubmit} className="space-y-4"><label className="block"><span className="mb-1.5 block text-sm font-medium text-dark-700">محصول</span><select value={draft.product_id} onChange={(event) => update({ product_id: event.target.value })} className="input-field cursor-pointer"><option value="">انتخاب محصول</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><div className="grid gap-4 sm:grid-cols-3"><Field label="نام" value={draft.name} onChange={(value) => update({ name: value })} /><Field label="امتیاز" value={draft.rating} onChange={(value) => update({ rating: value })} type="number" /><label className="block"><span className="mb-1.5 block text-sm font-medium text-dark-700">وضعیت</span><select value={draft.status} onChange={(event) => update({ status: event.target.value })} className="input-field cursor-pointer"><option value="published">منتشرشده</option><option value="pending">در انتظار بررسی</option><option value="hidden">مخفی</option></select></label></div><Field label="متن نظر" value={draft.comment} onChange={(value) => update({ comment: value })} textarea /><FormActions saving={saving} /></form>; }
function CouponForm({ draft, setDraft, onSubmit, saving }: { draft: CouponDraft; setDraft: (draft: CouponDraft) => void; onSubmit: (event: React.FormEvent) => void; saving: boolean }) { const update = (patch: Partial<CouponDraft>) => setDraft({ ...draft, ...patch }); return <form onSubmit={onSubmit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="کد کوپن" value={draft.code} onChange={(value) => update({ code: value })} /><label className="block"><span className="mb-1.5 block text-sm font-medium text-dark-700">نوع تخفیف</span><select value={draft.type} onChange={(event) => update({ type: event.target.value })} className="input-field cursor-pointer"><option value="percentage">درصدی</option><option value="fixed">مبلغ ثابت</option></select></label></div><div className="grid gap-4 sm:grid-cols-3"><Field label="مقدار" value={draft.value} onChange={(value) => update({ value: value })} type="number" /><Field label="حداقل سبد" value={draft.min_order} onChange={(value) => update({ min_order: value })} type="number" /><Field label="حداکثر مصرف" value={draft.max_uses} onChange={(value) => update({ max_uses: value })} type="number" /></div><Field label="تاریخ انقضا" value={draft.expires_at} onChange={(value) => update({ expires_at: value })} type="date" /><label className="flex items-center gap-2 text-sm text-dark-700"><input type="checkbox" checked={draft.active} onChange={(event) => update({ active: event.target.checked })} className="h-4 w-4 accent-amber-600" /> این کوپن فعال باشد</label><FormActions saving={saving} /></form>; }
function CustomerForm({ draft, setDraft, onSubmit, saving }: { draft: CustomerDraft; setDraft: (draft: CustomerDraft) => void; onSubmit: (event: React.FormEvent) => void; saving: boolean }) { const update = (patch: Partial<CustomerDraft>) => setDraft({ ...draft, ...patch }); return <form onSubmit={onSubmit} className="space-y-4"><Field label="نام و نام خانوادگی" value={draft.full_name} onChange={(value) => update({ full_name: value })} /><div className="grid gap-4 sm:grid-cols-2"><Field label="ایمیل" value={draft.email} onChange={(value) => update({ email: value })} type="email" /><Field label="تلفن" value={draft.phone} onChange={(value) => update({ phone: value })} /></div><Field label="آدرس" value={draft.address} onChange={(value) => update({ address: value })} textarea /><label className="block"><span className="mb-1.5 block text-sm font-medium text-dark-700">وضعیت</span><select value={draft.status} onChange={(event) => update({ status: event.target.value })} className="input-field cursor-pointer"><option value="active">فعال</option><option value="blocked">مسدود</option></select></label><FormActions saving={saving} /></form>; }

function Modal({ open, title, onClose, children, wide = false }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) { if (!open) return null; return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-dark-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}><div className={`max-h-[92svh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6 ${wide ? 'max-w-3xl' : 'max-w-xl'}`}><div className="mb-5 flex items-center justify-between border-b border-dark-100 pb-4"><h2 className="text-lg font-bold text-dark-900">{title}</h2><button onClick={onClose} className="rounded-xl p-2 text-dark-400 hover:bg-dark-50 hover:text-dark-700" aria-label="بستن"><X className="h-5 w-5" /></button></div>{children}</div></div>; }

function fa(value: number | string) { return new Intl.NumberFormat('fa-IR').format(Number(value) || 0); }

function downloadSalesCsv(orders: Order[]) {
  const header = ['نوع ردیف', 'کد سفارش', 'تاریخ', 'وضعیت', 'تلفن', 'آدرس', 'مبلغ سفارش', 'محصول', 'تعداد', 'قیمت واحد', 'کد رهگیری'];
  const paidStatuses = new Set(['paid', 'shipped', 'delivered']);
  const summary = [['خلاصه', '', '', '', '', '', 'درآمد تاییدشده', '', '', '', ''], ['خلاصه', '', '', '', '', '', orders.filter((order) => paidStatuses.has(order.status)).reduce((sum, order) => sum + Number(order.total || 0), 0), '', '', '', ''], [], header];
  const rows = orders.flatMap((order) => (order.order_items?.length ? order.order_items : [undefined]).map((item) => ['سفارش', order.id, new Date(order.created_at).toLocaleString('fa-IR'), statusConfig[order.status]?.label || order.status, order.phone || '', order.address || '', order.total, item?.product?.name || '', item?.quantity || '', item?.price || '', order.tracking_code || '']));
  const csv = '\uFEFF' + [...summary, ...rows].map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `modara-sales-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
