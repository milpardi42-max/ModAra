import { useEffect, useMemo, useState } from 'react';
import { Check, Search, SlidersHorizontal, Star, X } from 'lucide-react';
import { supabase, type Product, type Category } from '../lib/supabase';
import { seedCategories, seedProducts } from '../lib/demoSeed';
import ProductCard from '../components/ProductCard';
import Breadcrumbs from '../components/Breadcrumbs';
import { formatPrice } from '../lib/format';

type ShopProps = {
  onNavigate: (view: string, param?: string) => void;
  initialCategory?: string;
};

type PriceInputProps = {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder: string;
};

export default function Shop({ onNavigate, initialCategory }: ShopProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(initialCategory ?? null);
  const [sortBy, setSortBy] = useState<'relevance' | 'rating' | 'price-asc' | 'price-desc' | 'newest'>('relevance');
  const [priceMin, setPriceMin] = useState<number | null>(null);
  const [priceMax, setPriceMax] = useState<number | null>(null);
  const [minRating, setMinRating] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setActiveCategory(initialCategory ?? null);
  }, [initialCategory]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [{ data: productData }, { data: categoryData }] = await Promise.all([
        supabase.from('products').select('*, category:categories(*)'),
        supabase.from('categories').select('*').order('name', { ascending: true }),
      ]);
      if (cancelled) return;
      const seededClothing = seedProducts.filter((product) => product.category_id === 'cat-clothing');
      setProducts((productData as Product[])?.length ? productData as Product[] : seededClothing);
      setCategories((categoryData as Category[])?.length ? categoryData as Category[] : seedCategories);
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const maxCatalogPrice = useMemo(() => Math.max(...products.map((product) => product.price), 0), [products]);
  const activeCategoryId = categories.find((category) => category.slug === activeCategory)?.id;

  const visibleProducts = useMemo(() => {
    const needle = search.toLocaleLowerCase('fa-IR');
    const filtered = products.filter((product) => {
      const searchableText = `${product.name} ${product.description || ''}`.toLocaleLowerCase('fa-IR');
      const matchesSearch = !needle || searchableText.includes(needle);
      const matchesCategory = !activeCategory || product.category_id === activeCategoryId || product.category_id === `cat-${activeCategory}`;
      const matchesMinPrice = priceMin === null || product.price >= priceMin;
      const matchesMaxPrice = priceMax === null || product.price <= priceMax;
      const matchesRating = product.rating >= minRating;
      const matchesStock = !inStockOnly || product.stock > 0;
      return matchesSearch && matchesCategory && matchesMinPrice && matchesMaxPrice && matchesRating && matchesStock;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'relevance' && needle) {
        const score = (product: Product) => {
          const name = product.name.toLocaleLowerCase('fa-IR');
          const description = (product.description || '').toLocaleLowerCase('fa-IR');
          return (name === needle ? 10 : 0) + (name.startsWith(needle) ? 5 : 0) + (name.includes(needle) ? 3 : 0) + (description.includes(needle) ? 1 : 0);
        };
        return score(b) - score(a) || b.rating - a.rating;
      }
      return b.rating - a.rating;
    });
  }, [activeCategory, activeCategoryId, inStockOnly, minRating, priceMax, priceMin, products, search, sortBy]);

  const activeFilterCount = [activeCategory, priceMin !== null, priceMax !== null, minRating > 0, inStockOnly].filter(Boolean).length;

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setActiveCategory(null);
    setPriceMin(null);
    setPriceMax(null);
    setMinRating(0);
    setInStockOnly(false);
    setSortBy('relevance');
  };

  return (
    <div className="min-h-screen bg-dark-50 pt-20" dir="rtl">
      <div className="bg-gradient-to-br from-dark-950 to-amber-900 py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="mb-2 text-3xl font-bold text-white sm:text-4xl">فروشگاه مُدارا</h1>
          <p className="text-sm text-white/60 sm:text-base">شیک‌ترین لباس‌ها و اکسسوری‌ها را با ما تجربه کنید</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Breadcrumbs items={[{ label: activeCategory ? categories.find((category) => category.slug === activeCategory)?.name || 'فروشگاه' : 'فروشگاه' }]} onNavigate={onNavigate} />
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-dark-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="جستجوی نام محصول، جنس یا ویژگی..."
              aria-label="جستجوی محصولات"
              autoComplete="off"
              className="input-field pr-11"
            />
            {searchInput && <button aria-label="پاک کردن جستجو" onClick={() => setSearchInput('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600"><X className="h-5 w-5" /></button>}
          </div>
          <div className="flex gap-2">
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} className="input-field min-w-0 flex-1 cursor-pointer sm:w-auto sm:min-w-36">
              <option value="relevance">مرتبط‌ترین</option>
              <option value="rating">محبوب‌ترین</option>
              <option value="price-asc">ارزان‌ترین</option>
              <option value="price-desc">گران‌ترین</option>
              <option value="newest">جدیدترین</option>
            </select>
            <button onClick={() => setShowFilters((visible) => !visible)} className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dark-200 bg-white text-dark-700 md:hidden" aria-label="نمایش فیلترها">
              <SlidersHorizontal className="h-5 w-5" />
              {activeFilterCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-[10px] text-white">{activeFilterCount}</span>}
            </button>
          </div>
        </div>

        <div className="flex items-start gap-4 sm:gap-6">
          <aside className={`${showFilters ? 'block' : 'hidden'} w-full shrink-0 md:block md:w-64`}>
            <div className="sticky top-24 space-y-4">
              <div className="card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-bold text-dark-900">فیلترهای پیشرفته</h2>
                  <button onClick={clearFilters} className="text-xs font-medium text-amber-700 hover:text-amber-800">حذف همه</button>
                </div>
                <div className="space-y-1">
                  <FilterCategoryButton active={!activeCategory} onClick={() => { setActiveCategory(null); setShowFilters(false); }}>همه محصولات</FilterCategoryButton>
                  {categories.map((category) => <FilterCategoryButton key={category.id} active={activeCategory === category.slug} onClick={() => { setActiveCategory(category.slug); setShowFilters(false); }}>{category.name}</FilterCategoryButton>)}
                </div>
              </div>

              <div className="card space-y-4 p-4">
                <h3 className="font-bold text-dark-900">محدوده قیمت</h3>
                <div className="grid grid-cols-2 gap-2">
                  <PriceInput value={priceMin} onChange={setPriceMin} placeholder="از" />
                  <PriceInput value={priceMax} onChange={setPriceMax} placeholder="تا" />
                </div>
                <p className="text-[11px] leading-5 text-dark-400">قیمت‌ها به تومان هستند{maxCatalogPrice > 0 ? ` · حداکثر ${formatPrice(maxCatalogPrice)}` : ''}</p>
              </div>

              <div className="card space-y-3 p-4">
                <h3 className="font-bold text-dark-900">حداقل امتیاز</h3>
                {[0, 4, 4.5].map((rating) => <button key={rating} onClick={() => setMinRating(rating)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${minRating === rating ? 'bg-amber-50 text-amber-700' : 'text-dark-600 hover:bg-dark-50'}`}><Star className={`h-4 w-4 ${rating > 0 ? 'fill-amber-400 text-amber-400' : 'text-dark-300'}`} />{rating === 0 ? 'همه امتیازها' : `${rating}+`}</button>)}
                <label className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-dark-600 hover:bg-dark-50">
                  <input type="checkbox" checked={inStockOnly} onChange={(event) => setInStockOnly(event.target.checked)} className="h-4 w-4 accent-amber-600" />
                  فقط کالاهای موجود
                </label>
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-dark-500">{loading ? 'در حال بارگذاری...' : `${new Intl.NumberFormat('fa-IR').format(visibleProducts.length)} محصول یافت شد`}</p>
              {search && <p className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">نتایج برای «{search}»</p>}
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">{[1, 2, 3, 4, 5, 6, 7, 8].map((item) => <div key={item} className="rounded-2xl border border-dark-100 bg-white p-4"><div className="mb-4 aspect-square rounded-xl shimmer-bg" /><div className="mb-2 h-4 w-3/4 rounded shimmer-bg" /><div className="h-4 w-1/2 rounded shimmer-bg" /></div>)}</div>
            ) : visibleProducts.length === 0 ? (
              <div className="card flex flex-col items-center justify-center p-10 text-center sm:p-16"><Search className="mb-4 h-16 w-16 text-dark-300" /><p className="mb-2 text-lg font-medium text-dark-700">محصولی با این مشخصات یافت نشد</p><p className="mb-5 text-sm text-dark-400">عبارت جستجو یا فیلترها را تغییر دهید</p><button onClick={clearFilters} className="btn-primary">پاک کردن فیلترها</button></div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">{visibleProducts.map((product) => <ProductCard key={product.id} product={product} onView={(slug) => onNavigate('product', slug)} />)}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterCategoryButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-right text-sm font-medium transition-all ${active ? 'bg-amber-50 text-amber-700' : 'text-dark-600 hover:bg-dark-50'}`}>{children}{active && <Check className="h-4 w-4" />}</button>;
}

function PriceInput({ value, onChange, placeholder }: PriceInputProps) {
  return <input type="number" min="0" step="100000" value={value ?? ''} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)} placeholder={placeholder} aria-label={`حداقل یا حداکثر قیمت ${placeholder}`} className="w-full rounded-lg border border-dark-200 px-3 py-2 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" />;
}
