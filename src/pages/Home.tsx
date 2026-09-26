import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Gem, Glasses, Package, RefreshCw, Shield, Shirt, ShoppingBag, Sparkles, Star, Truck, Watch } from 'lucide-react';
import { supabase, type Product, type BlogPost, type Category } from '../lib/supabase';
import { seedCategories, seedProducts } from '../lib/demoSeed';
import { formatDate } from '../lib/format';
import ProductCard from '../components/ProductCard';
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

const storyFallback = seedProducts
  .filter((product) => product.category_id === 'cat-clothing' || product.category_id === 'cat-watch')
  .slice(0, 3);

export default function Home({ onNavigate, onQuickView, focusCatalog = false, catalogCategory = null }: HomeProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(catalogCategory);
  const catalogRef = useRef<HTMLDivElement | null>(null);
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
      <Hero />

      {/* Chapter: editorial story with shoppable pieces */}
      <section id="chapter-story" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mb-8 text-center sm:mb-10">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.32em] text-amber-600">MODARA PRIVATE EDIT</p>
          <h2 className="text-2xl font-bold text-dark-900 sm:text-3xl">انتخاب‌های ماندگار این فصل</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-dark-500 sm:text-base">
            هر قطعه با دقت انتخاب شده تا استایل روزمره شما را کامل کند — از پارچه‌های طبیعی تا جزئیاتی که
            امضای شخصی شما می‌شوند.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {storyItems.map((product, index) => (
            <article
              key={product.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <ProductCard product={product} onQuickView={onQuickView} />
            </article>
          ))}
        </div>
      </section>

      {/* Chapter: categories */}
      <section id="chapter-categories" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mb-8 text-center sm:mb-10">
          <h2 className="mb-2 text-2xl font-bold text-dark-900 sm:text-3xl">دسته‌بندی محصولات</h2>
          <p className="text-sm text-dark-500 sm:text-base">روی هر دسته‌بندی کلیک کنید تا کاتالوگ آن فیلتر شود</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          {categories.map((category, index) => {
            const Icon = iconMap[category.icon || ''] || Shirt;
            const isActive = activeCategory === category.slug;
            return (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.slug)}
                aria-pressed={isActive}
                className={`group relative overflow-hidden rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 animate-fade-in-up ${
                  isActive ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-dark-100 bg-white'
                }`}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-dark-50">
                  <ResponsiveImage
                    src={categoryImages[category.slug]}
                    alt={category.name}
                    sizes="(max-width: 640px) 46vw, 180px"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-dark-950/70 to-transparent" />
                  <div className="absolute bottom-0 right-0 left-0 p-3 text-center">
                    <div className="mb-1.5 flex justify-center">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-sm">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-white">{category.name}</span>
                  </div>
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
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {[
            { icon: Truck, title: 'ارسال رایگان', desc: 'برای سفارش‌های بالای ۵۰۰ هزار تومان' },
            { icon: Shield, title: 'ضمانت اصالت', desc: 'تمام محصولات اصل و تضمین‌شده' },
            { icon: RefreshCw, title: 'بازگشت کالا', desc: 'تا ۷ روز پس از تحویل' },
            { icon: Sparkles, title: 'تخفیف اعضا', desc: 'تخفیف ویژه برای کاربران عضو' },
          ].map((feature, index) => (
            <div
              key={feature.title}
              className="card flex items-center gap-2.5 p-3 animate-fade-in-up hover:shadow-lg sm:gap-3 sm:p-4"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 sm:h-12 sm:w-12">
                <feature.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-dark-900 sm:text-sm">{feature.title}</p>
                <p className="text-[11px] leading-4 text-dark-500 sm:text-xs">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Chapter: journal */}
      <section id="chapter-journal" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="mb-1 text-2xl font-bold text-dark-900 sm:text-3xl">آخرین مقالات</h2>
            <p className="text-dark-500">راهنمای مد و استایل</p>
          </div>
          <button
            onClick={() => onNavigate('blog')}
            className="group flex w-fit items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700 sm:text-base"
          >
            مشاهده همه
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {loading
            ? [1, 2, 3].map((item) => (
                <div key={item} className="rounded-2xl border border-dark-100 bg-white p-4">
                  <div className="mb-4 aspect-video rounded-xl shimmer-bg" />
                  <div className="h-4 w-3/4 rounded shimmer-bg" />
                </div>
              ))
            : posts.map((post, index) => (
                <button
                  key={post.id}
                  onClick={() => onNavigate('blog-post', post.slug)}
                  className="group overflow-hidden rounded-2xl border border-dark-100 bg-white text-right transition-all hover:-translate-y-1 hover:shadow-xl animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="aspect-video overflow-hidden bg-dark-50">
                    <ResponsiveImage
                      src={post.image_url}
                      alt={post.title}
                      sizes="(max-width: 768px) 100vw, 380px"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <div className="p-5">
                    <div className="mb-2 flex items-center gap-2 text-xs text-dark-400">
                      <span>{formatDate(post.created_at)}</span>
                      <span>•</span>
                      <span>{post.author}</span>
                    </div>
                    <h3 className="mb-2 line-clamp-2 font-bold text-dark-900 transition-colors group-hover:text-amber-700">
                      {post.title}
                    </h3>
                    <p className="line-clamp-2 text-sm text-dark-500">{post.excerpt}</p>
                  </div>
                </button>
              ))}
        </div>
      </section>

      {/* Inline promo */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#241914] p-6 text-white sm:p-8 md:p-12" dir="rtl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(245,158,11,0.24),transparent_30%),linear-gradient(115deg,#1b1412_0%,#472416_56%,#a34a10_100%)]" />
          <div className="relative z-10 grid items-center gap-10 md:grid-cols-[0.9fr_1.1fr] md:gap-14">
            <div className="order-2 text-center md:order-1 md:text-right">
              <div className="mx-auto mb-5 flex max-w-sm items-center justify-center gap-3 md:mx-0 md:justify-start">
                <span className="h-px w-12 bg-amber-300/60" />
                <span className="text-[10px] font-bold uppercase tracking-[0.32em] text-amber-200/80">MODARA PRIVATE EDIT</span>
              </div>
              <div className="relative mx-auto max-w-[18rem] md:mx-0">
                <span className="block text-8xl font-black leading-none tracking-[-0.08em] text-amber-300/90 sm:text-9xl">۴۰٪</span>
                <span className="mt-1 block text-sm font-bold tracking-[0.2em] text-white/60">SELECTED COLLECTION</span>
              </div>
              <div className="mt-7 flex flex-wrap justify-center gap-2 md:justify-start">
                {['لباس‌های منتخب', 'اکسسوری‌های خاص'].map((tag) => (
                  <span key={tag} className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/75">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="order-1 text-center md:order-2 md:text-right">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200/25 bg-amber-100/10 px-4 py-2 text-xs font-semibold text-amber-100">
                <Star className="h-4 w-4 text-amber-300" />
                انتخاب‌های ماندگار مُدارا
              </div>
              <h3 className="max-w-2xl text-3xl font-black leading-[1.25] text-white text-balance sm:text-4xl md:text-5xl">
                استایل بهتر،
                <span className="block text-amber-300">انتخاب هوشمندانه‌تر</span>
              </h3>
              <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/70 sm:text-base md:mx-0">
                قطعه‌های منتخب این فصل را با قیمت ویژه کشف کنید؛ از لباس‌های روزمره تا اکسسوری‌هایی که امضای
                شخصی شما را کامل می‌کنند.
              </p>
              <div className="mt-7 flex flex-col items-center gap-4 sm:flex-row sm:justify-center md:justify-start">
                <button
                  onClick={() => {
                    setActiveCategory(null);
                    catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-6 py-3.5 font-bold text-dark-950 transition-all hover:-translate-y-0.5 hover:bg-amber-200 active:scale-95 sm:w-auto"
                >
                  مشاهده کالکشن ویژه
                  <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
                </button>
                <span className="inline-flex items-center gap-2 text-xs text-white/55">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  ارسال رایگان برای سفارش‌های بالای ۵۰۰ هزار تومان
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
