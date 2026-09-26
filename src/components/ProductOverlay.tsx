import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Heart,
  Link2,
  MessageSquare,
  Minus,
  Plus,
  RefreshCw,
  Share2,
  Shield,
  ShoppingCart,
  Star,
  Truck,
  X,
} from 'lucide-react';
import { supabase, type Product, type Review } from '../lib/supabase';
import { formatDate, formatPrice } from '../lib/format';
import { detailImage } from '../lib/media';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { formatVariant, getProductVariants } from '../lib/variants';
import { presentationFor } from '../lib/categories';
import ResponsiveImage from './ResponsiveImage';

type ProductOverlayProps = {
  slug: string;
  onClose: () => void;
  onSelectProduct: (slug: string) => void;
  onOpenAuth: () => void;
};

/**
 * Full-screen product experience.
 *
 * Replaces the old "product page" navigation: the shopper never leaves the
 * scroll position they were at, the browser Back button closes the overlay
 * (see App.tsx) and everything needed to decide — gallery, variants, reviews,
 * related items — is one gesture away.
 */
export default function ProductOverlay({ slug, onClose, onSelectProduct, onOpenAuth }: ProductOverlayProps) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { isSaved, toggle } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [activeImage, setActiveImage] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setActiveImage(0);
    setQuantity(1);
    setAdded(false);

    supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('slug', slug)
      .maybeSingle()
      .then(async ({ data }) => {
        if (cancelled) return;
        if (!data) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const loaded = data as Product;
        setProduct(loaded);

        const variants = getProductVariants(loaded);
        setSize(variants.sizes[0] ?? null);
        setColor(variants.colors[0]?.name ?? null);

        const [{ data: rel }, { data: rev }] = await Promise.all([
          supabase.from('products').select('*').neq('id', loaded.id).eq('category_id', loaded.category_id || '').limit(4),
          supabase.from('reviews').select('*').eq('product_id', loaded.id).order('created_at', { ascending: false }),
        ]);
        if (cancelled) return;
        setRelated((rel as Product[]) ?? []);
        setReviews((rev as Review[]) ?? []);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (user?.email) setReviewName((current) => current || (user.email ?? '').split('@')[0]);
  }, [user]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const variants = useMemo(() => (product ? getProductVariants(product) : { sizes: [], colors: [] }), [product]);
  const presentation = product ? presentationFor(product) : null;
  const gallery = useMemo(() => {
    if (!product?.image_url) return [];
    const detail = detailImage(product.image_url);
    return detail ? [product.image_url, detail] : [product.image_url];
  }, [product]);

  const avgRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : product?.rating ?? 0;

  const handleAdd = async () => {
    if (!product) return;
    await addToCart(product.id, quantity, formatVariant(size, color));
    window.dispatchEvent(new CustomEvent('modara:open-cart'));
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}#product/${encodeURIComponent(slug)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'مُدارا', text: product?.name ?? '', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      /* user dismissed the share sheet */
    }
  };

  const handleReviewSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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
      .insert({ product_id: product.id, name: reviewName.trim(), rating: reviewRating, comment: reviewComment.trim() })
      .select()
      .single();
    if (error) {
      setReviewError('خطا در ثبت نظر: ' + error.message);
    } else if (data) {
      setReviews([data as Review, ...reviews]);
      setReviewComment('');
      setReviewRating(5);
    }
    setReviewSubmitting(false);
  };

  const saved = product ? isSaved(product.id) : false;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-dark-950/60 backdrop-blur-sm animate-fade-in" dir="rtl">
      <button aria-label="بستن نمایش سریع" onClick={onClose} className="absolute inset-0 h-full w-full cursor-default" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={product ? `مشاهده سریع ${product.name}` : 'مشاهده سریع محصول'}
        className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden bg-dark-50 shadow-2xl sm:my-4 sm:h-[calc(100%-2rem)] sm:rounded-3xl"
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 border-b border-dark-100 bg-white px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={onClose}
              aria-label="بستن"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-dark-500 transition-colors hover:bg-dark-50"
            >
              <X className="h-5 w-5" />
            </button>
            <p className="truncate text-sm font-semibold text-dark-700 sm:text-base">{product?.name ?? 'مشاهده سریع'}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {product && (
              <button
                onClick={() => toggle(product.id)}
                aria-label={saved ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
                aria-pressed={saved}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                  saved ? 'bg-error-50 text-error-500' : 'text-dark-500 hover:bg-dark-50'
                }`}
              >
                <Heart className={`h-5 w-5 ${saved ? 'fill-error-500' : ''}`} />
              </button>
            )}
            <button
              onClick={handleShare}
              aria-label="اشتراک‌گذاری محصول"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-dark-500 transition-colors hover:bg-dark-50"
            >
              {linkCopied ? <Link2 className="h-5 w-5 text-success-600" /> : <Share2 className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="grid grid-cols-1 gap-8 p-4 sm:p-6 lg:grid-cols-2">
              <div className="aspect-square rounded-2xl shimmer-bg" />
              <div className="space-y-4">
                <div className="h-8 w-3/4 rounded shimmer-bg" />
                <div className="h-6 w-1/2 rounded shimmer-bg" />
                <div className="h-24 w-full rounded shimmer-bg" />
                <div className="h-12 w-full rounded shimmer-bg" />
              </div>
            </div>
          ) : notFound || !product ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <p className="mb-4 text-xl font-medium text-dark-700">محصول یافت نشد</p>
              <button onClick={onClose} className="btn-primary">
                بازگشت
              </button>
            </div>
          ) : (
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10">
                {/* Gallery */}
                <div>
                  <div className={`relative overflow-hidden rounded-2xl border border-dark-100 bg-white shadow-lg ${presentation?.ratio ?? 'aspect-square'}`}>
                    <ResponsiveImage
                      key={activeImage}
                      src={gallery[activeImage]}
                      alt={`${product.name} — تصویر ${activeImage + 1}`}
                      eager={activeImage === 0}
                      sizes="(max-width: 1024px) 100vw, 520px"
                      className="h-full w-full object-cover animate-fade-in"
                    />
                    <div className="pointer-events-none absolute top-4 right-4 flex items-center gap-1 rounded-full bg-dark-950/70 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      {new Intl.NumberFormat('fa-IR').format(avgRating)}
                    </div>
                    {gallery.length > 1 && (
                      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
                        {gallery.map((image, index) => (
                          <button
                            key={image}
                            onClick={() => setActiveImage(index)}
                            aria-label={`تصویر ${index + 1}`}
                            className={`h-1.5 rounded-full transition-all ${
                              index === activeImage ? 'w-6 bg-amber-500' : 'w-1.5 bg-dark-300'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  {gallery.length > 1 && (
                    <div className="mt-3 flex gap-3">
                      {gallery.map((image, index) => (
                        <button
                          key={image}
                          onClick={() => setActiveImage(index)}
                          aria-label={`نمایش تصویر ${index + 1}`}
                          aria-current={index === activeImage}
                          className={`h-20 w-20 overflow-hidden rounded-xl border-2 bg-white transition-all ${
                            index === activeImage ? 'border-amber-500' : 'border-dark-100 hover:border-dark-300'
                          }`}
                        >
                          <ResponsiveImage src={image} alt="" sizes="80px" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div>
                  <h2 className="mb-3 text-2xl font-bold text-dark-900 sm:text-3xl">{product.name}</h2>
                  <div className="mb-6 flex flex-wrap items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${star <= Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-dark-200'}`}
                        />
                      ))}
                      <span className="mr-1 text-sm text-dark-500">
                        ({new Intl.NumberFormat('fa-IR').format(reviews.length)} نظر)
                      </span>
                    </div>
                    <span className="text-dark-300">|</span>
                    <span className={`text-sm font-medium ${product.stock > 0 ? 'text-success-600' : 'text-error-600'}`}>
                      {product.stock > 0
                        ? `${new Intl.NumberFormat('fa-IR').format(product.stock)} عدد موجود`
                        : 'ناموجود'}
                    </span>
                  </div>

                  <p className="mb-6 leading-relaxed text-dark-600">{product.description}</p>

                  <div className="mb-6 rounded-2xl border border-dark-100 bg-white p-4 sm:p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-dark-600">قیمت:</span>
                      <span className="text-3xl font-bold text-amber-700">{formatPrice(product.price)}</span>
                    </div>

                    {variants.colors.length > 0 && (
                      <div className="mb-4">
                        <p className="mb-2 text-sm font-medium text-dark-700">
                          رنگ: <span className="text-dark-500">{color}</span>
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {variants.colors.map((option) => (
                            <button
                              key={option.hex + option.name}
                              onClick={() => setColor(option.name)}
                              aria-label={option.name}
                              aria-pressed={color === option.name}
                              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all ${
                                color === option.name
                                  ? 'border-amber-500 bg-amber-50 text-amber-800'
                                  : 'border-dark-200 text-dark-600 hover:border-dark-300'
                              }`}
                            >
                              <span className="h-4 w-4 rounded-full border border-dark-200" style={{ background: option.hex }} />
                              {option.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {variants.sizes.length > 1 && (
                      <div className="mb-4">
                        <p className="mb-2 text-sm font-medium text-dark-700">
                          سایز: <span className="text-dark-500">{size}</span>
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {variants.sizes.map((option) => (
                            <button
                              key={option}
                              onClick={() => setSize(option)}
                              aria-pressed={size === option}
                              className={`min-w-12 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                                size === option
                                  ? 'border-amber-500 bg-amber-500 text-white'
                                  : 'border-dark-200 text-dark-700 hover:border-dark-300'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-dark-600">تعداد:</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          aria-label="کاهش تعداد"
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-dark-200 text-dark-600 transition-colors hover:bg-dark-50"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-10 text-center font-medium">
                          {new Intl.NumberFormat('fa-IR').format(quantity)}
                        </span>
                        <button
                          onClick={() => setQuantity(Math.min(Math.max(product.stock, 1), quantity + 1))}
                          aria-label="افزایش تعداد"
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-dark-200 text-dark-600 transition-colors hover:bg-dark-50"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleAdd}
                      disabled={product.stock === 0}
                      className={`w-full rounded-xl py-4 font-semibold text-white shadow-lg transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
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
                    {size && color && (
                      <p className="mt-3 text-center text-xs text-dark-400">
                        انتخاب شما: {formatVariant(size, color)}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      { icon: Truck, label: 'ارسال رایگان' },
                      { icon: Shield, label: 'ضمانت اصالت' },
                      { icon: RefreshCw, label: 'بازگشت ۷ روزه' },
                    ].map((feature) => (
                      <div
                        key={feature.label}
                        className="flex flex-col items-center gap-2 rounded-xl border border-dark-100 bg-white p-3 text-center sm:p-4"
                      >
                        <feature.icon className="h-6 w-6 text-amber-600" />
                        <span className="text-xs font-medium text-dark-600">{feature.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reviews */}
              <section className="mt-12">
                <div className="mb-6 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-amber-600" />
                  <h3 className="text-xl font-bold text-dark-900">نظرات کاربران</h3>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                    {new Intl.NumberFormat('fa-IR').format(reviews.length)}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                  <div className="space-y-4 lg:col-span-2">
                    {reviews.length === 0 ? (
                      <div className="card p-8 text-center">
                        <MessageSquare className="mx-auto mb-3 h-12 w-12 text-dark-300" />
                        <p className="text-dark-500">هنوز نظری برای این محصول ثبت نشده است</p>
                        <p className="mt-1 text-sm text-dark-400">اولین نفری باشید که نظر می‌دهد!</p>
                      </div>
                    ) : (
                      reviews.map((review) => (
                        <div key={review.id} className="card p-5 animate-fade-in-up">
                          <div className="mb-3 flex items-start justify-between">
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
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-dark-200'}`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="leading-relaxed text-dark-600">{review.comment}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div>
                    <div className="card p-4 sm:p-6">
                      <h4 className="mb-4 font-bold text-dark-900">ثبت نظر شما</h4>
                      {reviewError && (
                        <div className="mb-4 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">
                          {reviewError}
                        </div>
                      )}
                      <form onSubmit={handleReviewSubmit} className="space-y-4">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-dark-700">نام شما</label>
                          <input
                            type="text"
                            value={reviewName}
                            onChange={(event) => setReviewName(event.target.value)}
                            placeholder="نام و نام خانوادگی"
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-dark-700">امتیاز</label>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setReviewRating(star)}
                                aria-label={`${star} ستاره`}
                                className="transition-transform hover:scale-110"
                              >
                                <Star
                                  className={`h-7 w-7 ${star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-dark-200'}`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-dark-700">متن نظر</label>
                          <textarea
                            value={reviewComment}
                            onChange={(event) => setReviewComment(event.target.value)}
                            placeholder="تجربه خود را با ما به اشتراک بگذارید..."
                            rows={4}
                            className="input-field resize-none"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={reviewSubmitting}
                          className="w-full rounded-xl bg-amber-600 px-6 py-3 font-semibold text-white shadow-lg shadow-amber-600/30 transition-all hover:bg-amber-700 active:scale-95 disabled:opacity-60"
                        >
                          {reviewSubmitting ? 'در حال ثبت...' : 'ثبت نظر'}
                        </button>
                        {!user && (
                          <p className="text-center text-xs text-dark-400">
                            برای ثبت نظر باید{' '}
                            <button type="button" onClick={onOpenAuth} className="font-medium text-amber-600">
                              وارد شوید
                            </button>
                          </p>
                        )}
                      </form>
                    </div>
                  </div>
                </div>
              </section>

              {/* Related */}
              {related.length > 0 && (
                <section className="mt-12">
                  <h3 className="mb-6 text-xl font-bold text-dark-900">محصولات مرتبط</h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {related.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => onSelectProduct(item.slug)}
                        className="group overflow-hidden rounded-2xl border border-dark-100 bg-white text-right shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
                      >
                        <div className={`overflow-hidden bg-dark-50 ${presentationFor(item).ratio}`}>
                          <ResponsiveImage
                            src={item.image_url}
                            alt={item.name}
                            sizes="(max-width: 640px) 46vw, 220px"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                        <div className="p-3">
                          <h4 className="mb-1 line-clamp-1 text-sm font-semibold text-dark-900">{item.name}</h4>
                          <p className="text-sm font-bold text-amber-700">{formatPrice(item.price)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
