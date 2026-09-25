import { useEffect, useState, useCallback, useRef } from 'react';
import { ArrowLeft, Star, Truck, Shield, Sparkles, RefreshCw, Shirt, Glasses, Watch, ShoppingBag, Gem, Package, X } from 'lucide-react';
import { supabase, type Product, type BlogPost, type Category } from '../lib/supabase';
import { seedCategories, seedProducts } from '../lib/demoSeed';
import { formatDate, asset } from '../lib/format';
import ProductCard from '../components/ProductCard';
import HeroSlider from '../components/HeroSlider';

type HomeProps = {
  onNavigate: (view: string, param?: string) => void;
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

const sampleClothingProducts = seedProducts
  .filter((product) => product.category_id === 'cat-clothing')
  .slice(0, 8);

export default function Home({ onNavigate }: HomeProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>('clothing');
  const [categoryProducts, setCategoryProducts] = useState<Product[]>(sampleClothingProducts);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const categorySectionRef = useRef<HTMLDivElement>(null);

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

  const fetchCategoryProducts = useCallback(async (slug: string) => {
    setCategoryLoading(true);
    const { data: cat } = await supabase.from('categories').select('id').eq('slug', slug).maybeSingle();
    const fallbackProducts = seedProducts.filter((product) => product.category_id === cat?.id || product.category_id === `cat-${slug}`);
    if (cat) {
      const { data } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('category_id', cat.id)
        .order('rating', { ascending: false });
      setCategoryProducts((data as Product[])?.length ? data as Product[] : fallbackProducts);
    } else {
      setCategoryProducts(fallbackProducts);
    }
    setCategoryLoading(false);
  }, []);

  const handleCategoryClick = (slug: string) => {
    if (activeCategory === slug) return;
    setActiveCategory(slug);
    fetchCategoryProducts(slug);
    setTimeout(() => {
      categorySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const activeCat = categories.find((c) => c.slug === activeCategory);

  return (
    <div>
      {/* Hero Slider */}
      <HeroSlider onNavigate={onNavigate} />

      {/* Features bar */}
      <section className="relative z-20 mx-auto -mt-5 max-w-7xl px-4 sm:-mt-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {[
            { icon: Truck, title: 'ارسال رایگان', desc: 'برای سفارش‌های بالای ۵۰۰ هزار تومان' },
            { icon: Shield, title: 'ضمانت اصالت', desc: 'تمام محصولات اصل و تضمین‌شده' },
            { icon: RefreshCw, title: 'بازگشت کالا', desc: 'تا ۷ روز پس از تحویل' },
            { icon: Sparkles, title: 'تخفیف اعضا', desc: 'تخفیف ویژه برای کاربران عضو' },
          ].map((f, i) => (
            <div
              key={i}
              className="card flex items-center gap-2.5 p-3 hover:shadow-lg transition-all animate-fade-in-up sm:gap-3 sm:p-4"
              style={{ animationDelay: `${i * 100}ms` }}
            >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 sm:h-12 sm:w-12">
                <f.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-dark-900 sm:text-sm">{f.title}</p>
                <p className="text-[11px] leading-4 text-dark-500 sm:text-xs">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mb-8 text-center sm:mb-10">
          <h2 className="mb-2 text-2xl font-bold text-dark-900 sm:text-3xl">دسته‌بندی محصولات</h2>
          <p className="text-sm text-dark-500 sm:text-base">روی هر دسته‌بندی کلیک کنید تا محصولات آن را ببینید</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          {categories.map((cat, i) => {
            const Icon = iconMap[cat.icon || ''] || Shirt;
            const isActive = activeCategory === cat.slug;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.slug)}
                className={`group relative overflow-hidden rounded-2xl border transition-all hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-1 animate-fade-in-up ${
                  isActive
                    ? 'border-amber-500 ring-2 ring-amber-500/30 shadow-xl shadow-amber-500/10'
                    : 'border-dark-100 bg-white'
                }`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-dark-50">
                  <img
                    src={asset(categoryImages[cat.slug])}
                    alt={cat.name}
                    className={`h-full w-full object-cover transition-transform duration-500 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-dark-950/70 to-transparent" />
                  {isActive && (
                    <div className="absolute top-2 left-2 flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg">
                      <X className="h-4 w-4" />
                    </div>
                  )}
                  <div className="absolute bottom-0 right-0 left-0 p-3 text-center">
                    <div className="mb-1.5 flex justify-center">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <span className="font-semibold text-white text-sm">{cat.name}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Selected category products; clothing is the sample category shown by default */}
      {activeCategory && (
        <section ref={categorySectionRef} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16 scroll-mt-20">
          <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="mb-1 text-2xl font-bold text-dark-900 sm:text-3xl">
                محصولات {activeCat?.name || 'لباس'}
              </h2>
              <p className="text-dark-500">
                {categoryLoading
                  ? 'در حال بارگذاری...'
                  : `${categoryProducts.length} محصول در این دسته‌بندی`}
              </p>
            </div>
            {activeCategory !== 'clothing' && (
              <button
                onClick={() => {
                  setActiveCategory('clothing');
                  setCategoryProducts(sampleClothingProducts);
                  fetchCategoryProducts('clothing');
                }}
                className="flex w-fit items-center gap-2 rounded-xl border border-dark-200 bg-white px-4 py-2 text-sm font-medium text-dark-700 transition-all hover:border-amber-300 hover:text-amber-700"
              >
                <Shirt className="h-4 w-4" />
                بازگشت به لباس
              </button>
            )}
          </div>

          {categoryLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl border border-dark-100 bg-white p-4">
                  <div className="aspect-square rounded-xl shimmer-bg mb-4" />
                  <div className="h-4 w-3/4 rounded shimmer-bg mb-2" />
                  <div className="h-4 w-1/2 rounded shimmer-bg" />
                </div>
              ))}
            </div>
          ) : categoryProducts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-dark-500">محصولاتی برای این دسته‌بندی یافت نشد.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in-up">
              {categoryProducts.map((p) => (
                <ProductCard key={p.id} product={p} onView={(slug) => onNavigate('product', slug)} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Featured products */}
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="mb-1 text-2xl font-bold text-dark-900 sm:text-3xl">پرفروش‌ترین محصولات</h2>
            <p className="text-dark-500">محبوب‌ترین کالاهای مُدارا</p>
          </div>
          <button
            onClick={() => onNavigate('shop')}
            className="group flex w-fit items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700 sm:text-base"
          >
            مشاهده همه
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="rounded-2xl border border-dark-100 bg-white p-4">
                <div className="aspect-square rounded-xl shimmer-bg mb-4" />
                <div className="h-4 w-3/4 rounded shimmer-bg mb-2" />
                <div className="h-4 w-1/2 rounded shimmer-bg" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onView={(slug) => onNavigate('product', slug)} />
            ))}
          </div>
        )}
      </section>

      {/* Campaign banner */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#241914] p-6 text-white sm:p-8 md:p-12" dir="rtl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(245,158,11,0.24),transparent_30%),linear-gradient(115deg,#1b1412_0%,#472416_56%,#a34a10_100%)]" />
          <div className="promo-poster-shine pointer-events-none absolute inset-y-0 -left-1/3 w-1/4 bg-gradient-to-r from-transparent via-amber-100/30 to-transparent" aria-hidden="true" />
          <div className="promo-poster-scan pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/70 to-transparent" aria-hidden="true" />
          <div className="promo-poster-orbit pointer-events-none absolute -left-20 -top-24 h-80 w-80 rounded-full border border-amber-300/15" aria-hidden="true" />
          <div className="pointer-events-none absolute -left-6 -top-10 h-52 w-52 rounded-full border border-amber-300/10" />
          <div className="relative z-10 grid items-center gap-10 md:grid-cols-[0.9fr_1.1fr] md:gap-14">
            <div className="order-2 text-center md:order-1 md:text-right">
              <div className="mx-auto mb-5 flex max-w-sm items-center justify-center gap-3 md:mx-0 md:justify-start">
                <span className="h-px w-12 bg-amber-300/60" />
                <span className="text-[10px] font-bold uppercase tracking-[0.32em] text-amber-200/80">MODARA PRIVATE EDIT</span>
              </div>
              <div className="relative mx-auto max-w-[18rem] md:mx-0">
                <span className="promo-poster-float block text-8xl font-black leading-none tracking-[-0.08em] text-amber-300/90 sm:text-9xl">۴۰٪</span>
                <span className="mt-1 block text-sm font-bold tracking-[0.2em] text-white/60">SELECTED COLLECTION</span>
              </div>
              <div className="mt-7 flex flex-wrap justify-center gap-2 md:justify-start">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/75">لباس‌های منتخب</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/75">اکسسوری‌های خاص</span>
              </div>
            </div>

            <div className="order-1 text-center md:order-2 md:text-right">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200/25 bg-amber-100/10 px-4 py-2 text-xs font-semibold text-amber-100">
                <Star className="h-4 w-4 text-amber-300" />
                انتخاب‌های ماندگار مُدارا
              </div>
              <h2 className="max-w-2xl text-3xl font-black leading-[1.25] text-white text-balance sm:text-4xl md:text-5xl">
                استایل بهتر،
                <span className="block text-amber-300">انتخاب هوشمندانه‌تر</span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/70 sm:text-base md:mx-0">
                قطعه‌های منتخب این فصل را با قیمت ویژه کشف کنید؛ از لباس‌های روزمره تا اکسسوری‌هایی که امضای شخصی شما را کامل می‌کنند.
              </p>
              <div className="mt-7 flex flex-col items-center gap-4 sm:flex-row sm:justify-center md:justify-start">
                <button
                  onClick={() => onNavigate('shop')}
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

      {/* Blog preview */}
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.map((post, i) => (
            <button
              key={post.id}
              onClick={() => onNavigate('blog-post', post.slug)}
              className="group text-right overflow-hidden rounded-2xl border border-dark-100 bg-white transition-all hover:shadow-xl hover:-translate-y-1 animate-fade-in-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="aspect-video overflow-hidden bg-dark-50">
                <img
                  src={asset(post.image_url)}
                  alt={post.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 text-xs text-dark-400 mb-2">
                  <span>{formatDate(post.created_at)}</span>
                  <span>•</span>
                  <span>{post.author}</span>
                </div>
                <h3 className="font-bold text-dark-900 mb-2 line-clamp-2 group-hover:text-amber-700 transition-colors">
                  {post.title}
                </h3>
                <p className="text-sm text-dark-500 line-clamp-2">{post.excerpt}</p>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
