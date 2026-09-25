import { useEffect, useState } from 'react';
import { Star, ShoppingCart, Truck, Shield, RefreshCw, Check, MessageSquare, Send } from 'lucide-react';
import { supabase, type Product, type Review } from '../lib/supabase';
import Breadcrumbs from '../components/Breadcrumbs';
import { formatPrice, formatDate, asset } from '../lib/format';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

type ProductDetailProps = {
  slug: string;
  onNavigate: (view: string, param?: string) => void;
  onOpenAuth: () => void;
};

export default function ProductDetail({ slug, onNavigate, onOpenAuth }: ProductDetailProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addToCart } = useCart();
  const { user } = useAuth();

  // Review form state
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data }) => {
        setProduct(data);
        if (data) {
          supabase
            .from('products')
            .select('*')
            .neq('id', data.id)
            .eq('category_id', data.category_id || '')
            .limit(4)
            .then(({ data: rel }) => setRelated(rel || []));

          supabase
            .from('reviews')
            .select('*')
            .eq('product_id', data.id)
            .order('created_at', { ascending: false })
            .then(({ data: rev }) => setReviews(rev || []));
        }
        setLoading(false);
      });
  }, [slug]);

  const handleAddToCart = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!product) return;
    await addToCart(product.id, quantity);
    window.dispatchEvent(new CustomEvent('modara:open-cart'));
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError(null);

    if (!user) {
      setReviewError('برای ثبت نظر ابتدا وارد شوید');
      return;
    }
    if (!reviewName.trim() || !reviewComment.trim()) {
      setReviewError('لطفاً نام و متن نظر را وارد کنید');
      return;
    }
    if (!product) return;

    setReviewSubmitting(true);
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        product_id: product.id,
        name: reviewName.trim(),
        rating: reviewRating,
        comment: reviewComment.trim(),
      })
      .select()
      .single();

    if (error) {
      setReviewError('خطا در ثبت نظر: ' + error.message);
    } else if (data) {
      setReviews([data as Review, ...reviews]);
      setReviewName('');
      setReviewComment('');
      setReviewRating(5);
    }
    setReviewSubmitting(false);
  };

  if (loading) {
    return (
      <div className="pt-20 min-h-screen bg-dark-50" dir="rtl">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="aspect-square rounded-2xl shimmer-bg" />
            <div className="space-y-4">
              <div className="h-8 w-3/4 rounded shimmer-bg" />
              <div className="h-6 w-1/2 rounded shimmer-bg" />
              <div className="h-24 w-full rounded shimmer-bg" />
              <div className="h-12 w-full rounded shimmer-bg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <p className="text-xl font-medium text-dark-700 mb-4">محصول یافت نشد</p>
          <button onClick={() => onNavigate('shop')} className="btn-primary">بازگشت به فروشگاه</button>
        </div>
      </div>
    );
  }

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : product.rating;

  return (
    <div className="pt-20 min-h-screen bg-dark-50" dir="rtl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[{ label: 'فروشگاه', view: 'shop' }, { label: product.name }]} onNavigate={onNavigate} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image */}
          <div className="relative">
            <div className="lg:sticky lg:top-24">
              <div className="relative aspect-square overflow-hidden rounded-2xl border border-dark-100 bg-white shadow-lg">
                <img
                  src={asset(product.image_url)}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
                <div className="absolute top-4 right-4 flex items-center gap-1 rounded-full bg-dark-950/70 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {new Intl.NumberFormat('fa-IR').format(avgRating)}
                </div>
              </div>
            </div>
          </div>

          {/* Info */}
          <div>
            <h1 className="mb-3 text-2xl font-bold text-dark-900 sm:text-3xl">{product.name}</h1>
            <div className="mb-6 flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i <= Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-dark-200'}`}
                  />
                ))}
                <span className="text-sm text-dark-500 mr-1">({new Intl.NumberFormat('fa-IR').format(reviews.length)} نظر)</span>
              </div>
              <span className="text-dark-300">|</span>
              <span className={`text-sm font-medium ${product.stock > 0 ? 'text-success-600' : 'text-error-600'}`}>
                {product.stock > 0 ? `${new Intl.NumberFormat('fa-IR').format(product.stock)} عدد موجود` : 'ناموجود'}
              </span>
            </div>

            <p className="text-lg text-dark-600 leading-relaxed mb-6">{product.description}</p>

            <div className="mb-6 rounded-2xl border border-dark-100 bg-white p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-dark-600">قیمت:</span>
                <span className="text-3xl font-bold text-amber-700">{formatPrice(product.price)}</span>
              </div>

              {/* Quantity selector */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-dark-600">تعداد:</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-dark-200 text-dark-600 hover:bg-dark-50"
                  >
                    <span className="text-lg">−</span>
                  </button>
                  <span className="w-10 text-center font-medium">{new Intl.NumberFormat('fa-IR').format(quantity)}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-dark-200 text-dark-600 hover:bg-dark-50"
                  >
                    <span className="text-lg">+</span>
                  </button>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className={`w-full py-4 rounded-xl font-semibold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 ${
                  added ? 'bg-success-600 shadow-success-600/30' : 'bg-amber-600 shadow-amber-600/30 hover:bg-amber-700'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  {added ? (
                    <>
                      <Check className="h-5 w-5" />
                      به سبد اضافه شد
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-5 w-5" />
                      افزودن به سبد خرید
                    </>
                  )}
                </span>
              </button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { icon: Truck, label: 'ارسال رایگان' },
                { icon: Shield, label: 'ضمانت اصالت' },
                { icon: RefreshCw, label: 'بازگشت ۷ روزه' },
              ].map((f, i) => (
                <div key={i} className="flex flex-col items-center gap-2 rounded-xl border border-dark-100 bg-white p-3 text-center sm:p-4">
                  <f.icon className="h-6 w-6 text-amber-600" />
                  <span className="text-xs font-medium text-dark-600">{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reviews section */}
        <section className="mt-16">
          <div className="flex items-center gap-2 mb-6">
            <MessageSquare className="h-5 w-5 text-amber-600" />
            <h2 className="text-2xl font-bold text-dark-900">نظرات کاربران</h2>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              {new Intl.NumberFormat('fa-IR').format(reviews.length)} نظر
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Reviews list */}
            <div className="lg:col-span-2 space-y-4">
              {reviews.length === 0 ? (
                <div className="card p-8 text-center">
                  <MessageSquare className="h-12 w-12 text-dark-300 mx-auto mb-3" />
                  <p className="text-dark-500">هنوز نظری برای این محصول ثبت نشده است</p>
                  <p className="text-sm text-dark-400 mt-1">اولین نفری باشید که نظر می‌دهد!</p>
                </div>
              ) : (
                reviews.map((review, i) => (
                  <div key={review.id} className="card p-5 animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-bold text-white">
                          {review.name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-dark-900">{review.name}</p>
                          <p className="text-xs text-dark-400">{formatDate(review.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-4 w-4 ${s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-dark-200'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-dark-600 leading-relaxed">{review.comment}</p>
                  </div>
                ))
              )}
            </div>

            {/* Review form */}
            <div className="lg:col-span-1">
              <div className="card p-4 sm:p-6 lg:sticky lg:top-24">
                <h3 className="font-bold text-dark-900 mb-4">ثبت نظر شما</h3>
                {reviewError && (
                  <div className="mb-4 rounded-xl bg-error-50 border border-error-200 px-4 py-3 text-sm text-error-700 animate-fade-in">
                    {reviewError}
                  </div>
                )}
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-1.5">نام شما</label>
                    <input
                      type="text"
                      value={reviewName}
                      onChange={(e) => setReviewName(e.target.value)}
                      placeholder="نام و نام خانوادگی"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-1.5">امتیاز</label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setReviewRating(s)}
                          className="transition-transform hover:scale-110"
                        >
                          <Star
                            className={`h-7 w-7 ${s <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-dark-200'}`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-1.5">متن نظر</label>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="تجربه خود را با ما به اشتراک بگذارید..."
                      rows={4}
                      className="input-field resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-6 py-3 font-semibold text-white shadow-lg shadow-amber-600/30 transition-all hover:bg-amber-700 active:scale-95 disabled:opacity-60"
                  >
                    {reviewSubmitting ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        در حال ثبت...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        ثبت نظر
                      </>
                    )}
                  </button>
                  {!user && (
                    <p className="text-xs text-center text-dark-400">
                      برای ثبت نظر باید{' '}
                      <button type="button" onClick={onOpenAuth} className="text-amber-600 font-medium">وارد شوید</button>
                    </p>
                  )}
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* Related products */}
        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-dark-900 mb-6">محصولات مرتبط</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {related.map((p) => (
                <div key={p.id} onClick={() => onNavigate('product', p.slug)}>
                  <ProductCardLite product={p} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCardLite({ product }: { product: Product }) {
  const imageUrl = asset(product.image_url);

  return (
    <div className="group cursor-pointer overflow-hidden rounded-2xl border border-dark-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-square overflow-hidden bg-dark-50">
        <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
      </div>
      <div className="p-3">
        <h3 className="mb-1 line-clamp-1 text-sm font-semibold text-dark-900">{product.name}</h3>
        <p className="text-sm font-bold text-amber-700">{formatPrice(product.price)}</p>
      </div>
    </div>
  );
}
