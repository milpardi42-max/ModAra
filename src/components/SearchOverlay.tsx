import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Search, Sparkles, X } from 'lucide-react';
import { supabase, type Product } from '../lib/supabase';
import { formatPrice } from '../lib/format';
import ResponsiveImage from './ResponsiveImage';

type SearchOverlayProps = {
  open: boolean;
  onClose: () => void;
  onSelectProduct: (slug: string) => void;
};

const quickSearches = ['لباس', 'ساعت', 'کیف', 'عینک', 'اکسسوری'];

/**
 * Storefront search, available from every view through the utility bar.
 * Extracted from the old home-only floating search so discovery is no longer
 * tied to a fragile scroll position.
 */
export default function SearchOverlay({ open, onClose, onSelectProduct }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

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
        .limit(6);
      setResults((data as Product[]) ?? []);
      setLoading(false);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  if (!open) return null;

  const go = (slug: string) => {
    onSelectProduct(slug);
    setQuery('');
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]" dir="rtl">
      <button aria-label="بستن جستجو" onClick={onClose} className="absolute inset-0 bg-dark-950/60 backdrop-blur-sm" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="جستجوی محصولات"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-dark-100 bg-white shadow-2xl animate-scale-in"
      >
        <div className="flex items-center gap-2 border-b border-dark-100 p-3">
          <Search className="mr-1 h-5 w-5 shrink-0 text-amber-600" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && results[0]) go(results[0].slug);
            }}
            placeholder="جستجوی لباس، ساعت، کیف یا اکسسوری..."
            aria-label="جستجوی محصولات"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-base text-dark-900 outline-none placeholder:text-dark-400"
          />
          <button
            onClick={onClose}
            aria-label="بستن"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-dark-400 transition-colors hover:bg-dark-50 hover:text-dark-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-3">
          {!query.trim() ? (
            <>
              <div className="mb-3 flex items-center gap-2 px-1">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-bold text-dark-900">جستجوی سریع</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {quickSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="rounded-full border border-dark-200 bg-dark-50 px-3 py-2 text-xs font-semibold text-dark-700 transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </>
          ) : loading ? (
            <div className="space-y-2 p-1">
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
            <div className="px-4 py-8 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <Search className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-dark-800">نتیجه‌ای یافت نشد</p>
              <p className="mt-1 text-xs leading-5 text-dark-400">نام، جنس یا ویژگی دیگری را امتحان کنید.</p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="px-2 pb-1 text-[11px] text-dark-400">
                {new Intl.NumberFormat('fa-IR').format(results.length)} نتیجه
              </p>
              {results.map((product) => (
                <button
                  key={product.id}
                  onClick={() => go(product.slug)}
                  className="group flex w-full items-center gap-3 rounded-xl p-2 text-right transition-colors hover:bg-amber-50"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-dark-50 ring-1 ring-dark-100">
                    <ResponsiveImage src={product.image_url} alt={product.name} sizes="48px" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold text-dark-900">{product.name}</p>
                    <p className="mt-1 text-xs font-bold text-amber-700">{formatPrice(product.price)}</p>
                  </div>
                  <ArrowLeft className="h-4 w-4 shrink-0 text-dark-300 transition-transform group-hover:-translate-x-1 group-hover:text-amber-600" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
