import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Copy, Gem, Glasses, Package, RefreshCw, Shield, Shirt, ShoppingBag, Sparkles, Truck, Watch } from 'lucide-react';
import { supabase, type Product, type BlogPost, type Category } from '../lib/supabase';
import { seedCategories, seedProducts } from '../lib/demoSeed';
import { formatDate } from '../lib/format';
import { CATEGORY_PRESENTATION } from '../lib/categories';
import EditorialPiece from '../components/EditorialPiece';
import ResponsiveImage from '../components/ResponsiveImage';
import Hero from '../components/Hero';
import Catalog from '../components/Catalog';

type HomeProps = {
  onNavigate: (view: string, param?: string) => void;
  onQuickView: (slug: string) => void;
  /** Deep link support: /#shop or /#shop/<category> focuses the catalog chapter. */
  focusCatalog?: boolean;
  catalogCategory?: string | null;
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  shirt: Shirt,
  pants: Package,
  glasses: Glasses,
  watch: Watch,
  bag: ShoppingBag,
  gem: Gem,
};

const categoryImages: Record<string, string> = {
  clothing: '/images/cat-clothing.jpg',
  pants: '/images/cat-pants.jpg',
  glasses: '/images/cat-glasses.jpg',
  watch: '/images/cat-watch.jpg',
  bag: '/images/cat-bag.jpg',
  accessory: '/images/cat-accessory.jpg',
};

/**
 * Grid placement for the six department tiles on large screens
 * (6 columns x 2 rows). Unknown indexes simply fall back to auto-placement.
 */
const MOSAIC_PLACEMENT: Record<number, string> = {
  0: 'col-span-2 lg:col-span-3 lg:row-span-2',
  1: 'lg:col-start-4 lg:row-start-1',
  2: 'lg:col-start-5 lg:row-start-1',
  3: 'lg:col-start-4 lg:row-start-2',
  4: 'lg:col-start-5 lg:row-start-2',
  5: 'lg:col-start-6 lg:row-start-1 lg:row-span-2',
};

const storyFallback = seedProducts
  .filter((product) => product.category_id === 'cat-clothing' || product.category_id === 'cat-watch')
  .slice(0, 3);

export default function Home({ onNavigate, onQuickView, focusCatalog = false, catalogCategory = null }: HomeProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(catalogCategory);
  const [couponCopied, setCouponCopied] = useState(false);
  const catalogRef = useRef<HTMLDivElement | null>(null);

  // WELCOME10 is the live coupon in the store, so the promo can copy it for real.
  const copyCoupon = async () => {
    try {
      await navigator.clipboard.writeText('WELCOME10');
    } catch {
      // Clipboard access can be denied; the code stays readable on the chip.
    }
    setCouponCopied(true);
    window.setTimeout(() => setCouponCopied(false), 2200);
  };
  const focusHandledRef = useRef(false);

  // The story chapter shows live top-rated products once loaded, seed fallback before.
  const storyItems = products.length ? products.slice(0, 3) : storyFallback;

  useEffect(() => {
    Promise.all([
      supabase.from('products').select('*').order('rating', { ascending: false }).limit(8),
      supabase.from('blog_posts').select('*').order('created_at', { ascending: false }).limit(3),
      supabase.from('categories').select('*'),
    ]).then(([p, b, c]) => {
      const fallbackClothing = seedProducts.filter((product) => product.category_id === 'cat-clothing').slice(0, 8);
      if (p.data?.length) setProducts(p.data as Product[]);
      else setProducts(fallbackClothing);
      if (b.data?.length) setPosts(b.data as BlogPost[]);
      if (c.data?.length) setCategories(c.data as Category[]);
      else setCategories(seedCategories);
      setLoading(false);
    });
  }, []);

  // Deep links (#shop, #shop/watch) jump straight to the catalog chapter.
  useEffect(() => {
    if (!focusCatalog || focusHandledRef.current) return;
    focusHandledRef.current = true;
    const timer = window.setTimeout(() => {
      catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [focusCatalog]);

  useEffect(() => {
    setActiveCategory(catalogCategory ?? null);
  }, [catalogCategory]);

  const handleCategoryClick = useCallback((slug: string) => {
    setActiveCategory(slug);
    catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div>
      <Hero onSelectCategory={handleCategoryClick} />

      {/* Chapter: the private edit — an editorial spread of curated pieces */}
      <section id="chapter-story" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="relative overflow-hidden rounded-[1.75rem] border border-dark-100 bg-[#f4eee5] px-4 py-10 sm:rounded-[2.5rem] sm:px-8 sm:py-12 lg:px-12">
          {/* Warm paper light: the chapter reads as a printed spread. */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_92%_-18%,rgba(245,158,11,0.20),transparent_46%),radial-gradient(circle_at_2%_112%,rgba(126,78,45,0.13),transparent_44%)]" />

          <div className="relative">
            {/* Masthead: display headline beside the editor's note */}
            <div className="grid gap-7 lg:grid-cols-[1.25fr_1fr] lg:items-end lg:gap-14">
              <div>
                <div className="flex items-center gap-3">
                  <span className="h-px w-10 bg-amber-600/60" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.34em] text-amber-700">
                    MODARA PRIVATE EDIT
                  </span>
                </div>
                <h2 className="mt-4 text-3xl font-black leading-[1.2] tracking-tight text-dark-900 text-balance sm:text-4xl lg:text-[2.75rem]">
                  انتخاب‌های ماندگار
                  <span className="mt-1 block bg-gradient-to-l from-amber-600 via-amber-500 to-accent-500 bg-clip-text text-transparent">
                    این فصل
                  </span>
                </h2>
              </div>

              <div className="lg:border-r lg:border-dark-200/80 lg:pr-10">
                <p className="max-w-md text-sm leading-7 text-dark-600 sm:text-[0.95rem]">
                  هر قطعه با دقت انتخاب شده تا استایل روزمره شما را کامل کند — از پارچه‌های طبیعی تا جزئیاتی که
                  امضای شخصی شما می‌شوند.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {['پارچهٔ طبیعی', 'ساخت محدود', 'انتخاب سرراست'].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-dark-200/80 bg-white/70 px-3 py-1.5 text-[11px] font-semibold text-dark-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Pieces: one lead frame plus two stacked strips */}
            <div className="mt-9 grid gap-4 sm:mt-11 sm:gap-5 lg:grid-cols-12 lg:gap-6">
              {storyItems[0] && (
                <EditorialPiece
                  product={storyItems[0]}
                  index={0}
                  onQuickView={onQuickView}
                  className="lg:col-span-7"
                />
              )}
              {storyItems.length > 1 && (
                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:col-span-5 lg:grid-cols-1 lg:grid-rows-2 lg:gap-6">
                  {storyItems.slice(1, 3).map((product, offset) => (
                    <EditorialPiece
                      key={product.id}
                      product={product}
                      index={offset + 1}
                      variant="stack"
                      onQuickView={onQuickView}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Spread footer */}
            <div className="mt-9 flex flex-col items-center gap-3 sm:mt-10">
              <button
                onClick={() => {
                  setActiveCategory(null);
                  catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="group inline-flex items-center gap-2 rounded-full bg-dark-900 px-6 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-dark-800 hover:shadow-lg active:scale-95"
              >
                مشاهدهٔ همهٔ انتخاب‌ها
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              </button>
              <span className="text-[11px] text-dark-400">
                {new Intl.NumberFormat('fa-IR').format(storyItems.length)} قطعهٔ منتخب این فصل
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Chapter: categories — an editorial mosaic that filters the catalog */}
      <section id="chapter-categories" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-end lg:gap-14">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-amber-600/60" />
              <span className="text-[11px] font-bold uppercase tracking-[0.34em] text-amber-700">دسته‌بندی‌ها</span>
            </div>
            <h2 className="mt-4 text-3xl font-black leading-[1.2] tracking-tight text-dark-900 text-balance sm:text-4xl">
              شش دنیای
              <span className="bg-gradient-to-l from-amber-600 via-amber-500 to-accent-500 bg-clip-text text-transparent">مُدارا</span>
            </h2>
          </div>
          <div className="lg:border-r lg:border-dark-200/80 lg:pr-10">
            <p className="max-w-md text-sm leading-7 text-dark-600 sm:text-[0.95rem]">
              روی هر دسته کلیک کنید تا کاتالوگ همان‌جا فیلتر شود — از ست‌های ادیتوریال پوشاک تا استیل‌لایف مینیمال اکسسوری.
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 lg:h-[30rem] lg:grid-cols-6 lg:grid-rows-2 lg:gap-4">
          {categories.map((category, index) => {
            const Icon = iconMap[category.icon || ''] || Shirt;
            const isActive = activeCategory === category.slug;
            const tagline = CATEGORY_PRESENTATION[category.slug]?.tagline;
            const isLead = index === 0;
            // Explicit placement fills the 6x2 mosaic with no gaps and no overlap:
            // the lead piece takes a 3x2 block, two tiles sit beside it in each
            // row and the last one spans both rows.
            const placement = MOSAIC_PLACEMENT[index] ?? '';
            return (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.slug)}
                aria-pressed={isActive}
                aria-label={`فیلتر کاتالوگ بر اساس ${category.name}`}
                className={`group relative animate-fade-in-up overflow-hidden rounded-[1.35rem] border text-right transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  isLead ? 'aspect-[16/10] lg:aspect-auto' : 'aspect-[4/5] lg:aspect-auto'
                } ${placement} ${isActive ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-dark-100'}`}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <ResponsiveImage
                  src={categoryImages[category.slug]}
                  alt={category.name}
                  sizes={isLead ? '(max-width: 1024px) 92vw, 48vw' : '(max-width: 1024px) 46vw, 16vw'}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.07]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-dark-950/88 via-dark-950/15 to-transparent" />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />

                <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-md">
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    {isLead && (
                      <span className="rounded-full bg-amber-300 px-2.5 py-1 text-[10px] font-bold text-dark-950">شروع از اینجا</span>
                    )}
                  </div>
                  <span className="block text-sm font-bold text-white sm:text-base">{category.name}</span>
                  {tagline && <span className="mt-1 block text-[11px] leading-5 text-white/70">{tagline}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Chapter: catalog */}
      <div ref={catalogRef} className="scroll-mt-20">
        <Catalog onQuickView={onQuickView} initialCategory={activeCategory} />
      </div>

      {/* Chapter: trust & services */}
      <section id="chapter-trust" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="rounded-[1.75rem] border border-dark-100 bg-white/70 px-5 py-8 sm:px-8 sm:py-9">
          <div className="mb-7 flex items-center gap-3">
            <span className="h-px w-8 bg-amber-600/50" />
            <span className="text-[11px] font-bold uppercase tracking-[0.34em] text-amber-700">خدمات مُدارا</span>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-7 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-x-reverse lg:divide-dark-100">
            {[
              { icon: Truck, title: 'ارسال رایگان', desc: 'برای سفارش‌های بالای ۵۰۰ هزار تومان' },
              { icon: Shield, title: 'ضمانت اصالت', desc: 'تمام محصولات اصل و تضمین‌شده' },
              { icon: RefreshCw, title: 'بازگشت کالا', desc: 'تا ۷ روز پس از تحویل' },
              { icon: Sparkles, title: 'تخفیف اعضا', desc: 'تخفیف ویژه برای کاربران عضو' },
            ].map((feature, index) => (
              <div
                key={feature.title}
                className="flex animate-fade-in-up items-start gap-3.5 lg:px-7 lg:first:pr-0 lg:last:pl-0"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                  <feature.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-dark-900">{feature.title}</p>
                  <p className="mt-1 text-xs leading-5 text-dark-500">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Chapter: journal */}
      <section id="chapter-journal" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-end lg:gap-14">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-amber-600/60" />
              <span className="text-[11px] font-bold uppercase tracking-[0.34em] text-amber-700">ژورنال مُدارا</span>
            </div>
            <h2 className="mt-4 text-3xl font-black leading-[1.2] tracking-tight text-dark-900 text-balance sm:text-4xl">
              راهنمای مد و
              <span className="bg-gradient-to-l from-amber-600 via-amber-500 to-accent-500 bg-clip-text text-transparent">استایل</span>
            </h2>
          </div>
          <div className="flex flex-col items-start gap-4 lg:items-end">
            <p className="max-w-sm text-sm leading-7 text-dark-600 sm:text-[0.95rem] lg:text-left">
              مقاله‌های کوتاه و کاربردی دربارهٔ انتخاب، ست کردن و نگه‌داری از قطعه‌هایی که می‌خرید.
            </p>
            <button
              onClick={() => onNavigate('blog')}
              className="group inline-flex items-center gap-2 rounded-full bg-dark-900 px-5 py-2.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-dark-800 active:scale-95"
            >
              مشاهدهٔ همهٔ مقالات
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:mt-10 md:grid-cols-3">
          {loading
            ? [1, 2, 3].map((item) => (
                <div key={item} className="rounded-[1.4rem] border border-dark-100 bg-white p-4">
                  <div className="mb-4 aspect-video rounded-xl shimmer-bg" />
                  <div className="h-4 w-3/4 rounded shimmer-bg" />
                </div>
              ))
            : posts.map((post, index) => (
                <button
                  key={post.id}
                  onClick={() => onNavigate('blog-post', post.slug)}
                  className="group animate-fade-in-up overflow-hidden rounded-[1.4rem] border border-dark-100 bg-white text-right transition-all duration-500 hover:-translate-y-1.5 hover:border-amber-200 hover:shadow-2xl hover:shadow-amber-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="relative aspect-video overflow-hidden bg-dark-50">
                    <ResponsiveImage
                      src={post.image_url}
                      alt={post.title}
                      sizes="(max-width: 768px) 100vw, 380px"
                      className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.07]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-950/25 to-transparent" />
                  </div>
                  <div className="p-5">
                    <div className="mb-2.5 flex items-center gap-2 text-[11px] text-dark-400">
                      <span className="rounded-full bg-dark-50 px-2.5 py-1 font-semibold text-dark-600">{formatDate(post.created_at)}</span>
                      <span>•</span>
                      <span>{post.author}</span>
                    </div>
                    <h3 className="mb-2 line-clamp-2 text-base font-bold leading-6 text-dark-900 transition-colors group-hover:text-amber-700">
                      {post.title}
                    </h3>
                    <p className="line-clamp-2 text-sm leading-6 text-dark-500">{post.excerpt}</p>
                    <span className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-bold text-amber-700">
                      ادامهٔ مقاله
                      <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
                    </span>
                  </div>
                </button>
              ))}
        </div>
      </section>

      {/* Chapter: the member coupon. The code below is the live coupon in the
          store, so the promise on this panel is one the checkout keeps. */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#241914] p-6 text-white sm:p-8 md:p-12" dir="rtl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(245,158,11,0.24),transparent_30%),linear-gradient(115deg,#1b1412_0%,#472416_56%,#a34a10_100%)]" />
          <div className="relative z-10 grid items-center gap-10 md:grid-cols-[1.05fr_0.95fr] md:gap-14">
            <div className="order-2 text-center md:order-1 md:text-right">
              <div className="mx-auto mb-4 flex max-w-sm items-center justify-center gap-3 md:mx-0 md:justify-start">
                <span className="h-px w-10 bg-amber-300/60" />
                <span className="text-[11px] font-bold uppercase tracking-[0.34em] text-amber-200/80">
                  کد تخفیف اعضا
                </span>
              </div>
              <div className="relative mx-auto max-w-[18rem] md:mx-0">
                <span className="block text-8xl font-black leading-none tracking-[-0.06em] text-amber-300/90 sm:text-9xl">
                  ۱۰٪
                </span>
                <span className="mt-2 block text-sm font-bold tracking-[0.2em] text-white/60">
                  اولین سفارش شما
                </span>
              </div>
              <button
                type="button"
                onClick={copyCoupon}
                aria-label={couponCopied ? 'کد تخفیف کپی شد' : 'کپی کد تخفیف WELCOME10'}
                className="group mx-auto mt-6 flex items-center gap-3 rounded-full border border-dashed border-amber-300/50 bg-black/25 px-5 py-3 transition-all hover:border-amber-300 hover:bg-black/40 active:scale-95 md:mx-0"
              >
                <span className="text-lg font-black tracking-[0.18em] text-amber-200">WELCOME10</span>
                <span className="flex items-center gap-1.5 border-r border-white/15 pr-3 text-xs font-bold text-white/70">
                  {couponCopied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                  {couponCopied ? 'کپی شد' : 'کپی کد'}
                </span>
              </button>
            </div>

            <div className="order-1 text-center md:order-2 md:text-right">
              <h3 className="max-w-2xl text-3xl font-black leading-[1.25] text-white text-balance sm:text-4xl md:text-5xl">
                استایل بهتر،
                <span className="block text-amber-300">انتخاب هوشمندانه‌تر</span>
              </h3>
              <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/70 sm:text-base md:mx-0">
                کد <span className="font-bold text-amber-200">WELCOME10</span> را در صفحهٔ پرداخت وارد کنید تا ۱۰٪ از
                اولین سفارش شما کم شود — بدون حداقل مبلغ خرید و بدون تاریخ انقضا.
              </p>
              <div className="mt-7 flex flex-col items-center gap-4 sm:flex-row sm:justify-center md:justify-start">
                <button
                  onClick={() => {
                    setActiveCategory(null);
                    catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-amber-300 px-6 py-3 text-sm font-bold text-dark-950 transition-all hover:-translate-y-0.5 hover:bg-amber-200 hover:shadow-lg active:scale-95 sm:w-auto"
                >
                  مشاهدهٔ کالکشن
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
