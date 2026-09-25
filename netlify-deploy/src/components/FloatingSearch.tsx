import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, Sparkles, X } from 'lucide-react';
import { supabase, type Product } from '../lib/supabase';
import { formatPrice, asset } from '../lib/format';

type FloatingSearchProps = {
  onNavigate: (view: string, param?: string) => void;
};

const quickSearches = ['لباس', 'ساعت', 'کیف', 'اکسسوری'];

export default function FloatingSearch({ onNavigate }: FloatingSearchProps) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const checkVisibility = () => {
      let foundHeading: Element | null = null;
      document.querySelectorAll('h2').forEach((h) => {
        if (h.textContent?.includes('دسته‌بندی محصولات')) foundHeading = h;
      });
      if (foundHeading) {
        const rect = (foundHeading as HTMLElement).getBoundingClientRect();
        setVisible(rect.bottom < 0);
      }
    };
    checkVisibility();
    window.addEventListener('scroll', checkVisibility, { passive: true });
    return () => window.removeEventListener('scroll', checkVisibility);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .ilike('name', `%${query.trim()}%`)
        .limit(5);
      setResults(data || []);
      setLoading(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleResultClick = (slug: string) => {
    onNavigate('product', slug);
    setQuery('');
    setShowResults(false);
  };

  const handleQuickSearch = (term: string) => {
    setQuery(term);
    setShowResults(true);
  };

  return (
    <div
      className={`fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 transition-all duration-500 sm:bottom-6 sm:w-[92%] ${
        visible
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : 'translate-y-20 opacity-0 pointer-events-none'
      }`}
    >
      <div className="relative">
        {showResults && (
          <div className="absolute bottom-full left-0 right-0 mb-3 max-h-[min(22rem,calc(100svh-8rem))] overflow-y-auto rounded-[1.45rem] border border-dark-200/70 bg-white/95 p-2 shadow-[0_18px_55px_rgba(28,25,20,0.18)] backdrop-blur-xl animate-scale-in">
            {query.trim() ? (
              <>
                <div className="flex items-center justify-between px-3 pb-2 pt-1">
                  <div className="flex items-center gap-2 text-sm font-bold text-dark-900">
                    <Search className="h-4 w-4 text-amber-600" />
                    نتایج جستجو
                  </div>
                  <span className="text-[11px] text-dark-400">{loading ? 'در حال بررسی...' : `${results.length} نتیجه`}</span>
                </div>
                {loading ? (
                  <div className="space-y-2 p-2">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="flex animate-pulse items-center gap-3 rounded-xl p-2">
                        <div className="h-12 w-12 shrink-0 rounded-xl bg-dark-100" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="h-3 w-3/4 rounded bg-dark-100" />
                          <div className="h-2.5 w-1/3 rounded bg-amber-100" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : results.length === 0 ? (
                  <div className="px-4 py-7 text-center">
                    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                      <Search className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold text-dark-800">نتیجه‌ای یافت نشد</p>
                    <p className="mt-1 text-xs leading-5 text-dark-400">نام، جنس یا ویژگی دیگری را امتحان کنید.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {results.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleResultClick(p.slug)}
                        className="group flex w-full items-center gap-3 rounded-xl p-2 text-right transition-colors hover:bg-amber-50 focus:bg-amber-50 focus:outline-none"
                      >
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-dark-50 ring-1 ring-dark-100">
                          {p.image_url && <img src={asset(p.image_url)} alt={p.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-sm font-semibold text-dark-900">{p.name}</p>
                          <p className="mt-1 text-xs font-bold text-amber-700">{formatPrice(p.price)}</p>
                        </div>
                        <ArrowLeft className="h-4 w-4 shrink-0 text-dark-300 transition-transform group-hover:-translate-x-1 group-hover:text-amber-600" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="p-2">
                <div className="flex items-center gap-2 px-2 pb-3 pt-1">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  <div>
                    <p className="text-sm font-bold text-dark-900">جستجوی سریع</p>
                    <p className="text-[11px] text-dark-400">از دسته‌های محبوب شروع کنید</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {quickSearches.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleQuickSearch(term)}
                      className="rounded-full border border-dark-200 bg-dark-50 px-3 py-2 text-xs font-semibold text-dark-700 transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 focus:border-amber-400 focus:outline-none"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 rounded-[1.35rem] border border-white/70 bg-white/92 p-1.5 shadow-[0_12px_35px_rgba(28,25,20,0.16)] backdrop-blur-xl">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[1.05rem] bg-dark-50/80 px-3 py-2.5">
            <Search className="h-5 w-5 shrink-0 text-amber-600" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && results[0]) handleResultClick(results[0].slug);
              }}
              placeholder="جستجوی لباس، ساعت یا اکسسوری..."
              aria-label="جستجوی محصولات"
              aria-expanded={showResults}
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-sm text-dark-900 outline-none placeholder:text-dark-400"
            />
            {query && (
              <button
                type="button"
                aria-label="پاک کردن جستجو"
                onClick={() => {
                  setQuery('');
                  setResults([]);
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-dark-400 transition-colors hover:bg-white hover:text-dark-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <span className="hidden shrink-0 px-2 text-[10px] font-bold text-dark-400 sm:inline">جستجو</span>
        </div>
      </div>
    </div>
  );
}
