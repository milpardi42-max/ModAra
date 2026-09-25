import { useEffect, useState } from 'react';
import { Store } from 'lucide-react';

type HeaderProps = {
  onNavigate: (view: string, param?: string) => void;
};

export default function Header({ onNavigate }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 bg-transparent">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-center">
          <button
            type="button"
            aria-label="بازگشت به صفحه اصلی مُدارا"
            onClick={() => onNavigate('home')}
            className={`pointer-events-auto group absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 transition-transform duration-300 hover:scale-[1.04] ${scrolled ? 'text-dark-900' : 'text-white'}`}
          >
            <span className="flex h-10 w-10 items-center justify-center text-amber-300 transition-transform duration-300 group-hover:rotate-3 sm:h-11 sm:w-11">
              <Store className={`h-8 w-8 ${scrolled ? 'text-amber-600' : 'text-amber-300'}`} strokeWidth={2.3} />
            </span>
            <span className="flex flex-col items-start leading-none">
              <span className="text-xl font-black tracking-tight sm:text-2xl">
                مُدا<span className="bg-gradient-to-l from-amber-500 to-orange-500 bg-clip-text text-transparent">را</span>
              </span>
              <span className={`mt-1 text-[8px] font-bold uppercase tracking-[0.34em] ${scrolled ? 'text-dark-400' : 'text-white/60'}`}>MODARA</span>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
