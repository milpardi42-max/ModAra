import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import ResponsiveImage from './ResponsiveImage';

type HeroProps = {
  /** Clicking a cover filters the catalogue chapter by that department. */
  onSelectCategory: (slug: string) => void;
};

type Cover = {
  number: string;
  image: string;
  alt: string;
  title: string;
  tagline: string;
  /** Editor's note shown in the masthead while this cover is in focus. */
  note: string;
  category: string;
  /** Explicit grid placement fills the 12x2 wall with no gaps and no overlap. */
  placement: string;
  /** Parallax depth multiplier: the lead moves least, the panorama most. */
  depth: number;
};

const covers: Cover[] = [
  {
    number: '۰۱',
    image: '/images/hero-covers/cover-style.jpg',
    alt: 'مدلی با بلزر شتری و شلوار کرم در نور گرم بعدازظهر',
    title: 'استایل روزمره',
    tagline: 'لایه‌های ساده‌ای که با هم امضا می‌شوند',
    note: 'بلزر، شلوار واسه و یک کیف خوب — سه قطعه‌ای که استایل شما را برای همهٔ روزهای هفته می‌سازند.',
    category: 'clothing',
    placement: 'col-span-2 lg:col-span-5 lg:row-span-2',
    depth: 1,
  },
  {
    number: '۰۲',
    image: '/images/hero-covers/cover-watch.jpg',
    alt: 'نمای ماکرو ساعت مچی طلا روی سنگ خشن',
    title: 'لحظهٔ دقیق',
    tagline: 'فلز گران‌بها در نور پهیل',
    note: 'ساعت‌های مچی با صفحهٔ ساده و بند فلزی؛ جزئیاتی که در هر نگاه دیده می‌شود و سال‌ها می‌ماند.',
    category: 'watch',
    placement: 'lg:col-span-4',
    depth: 1.5,
  },
  {
    number: '۰۳',
    image: '/images/hero-covers/cover-glasses.jpg',
    alt: 'نمای نزدیک چهره با عینک آفتابی لاک‌پشتی',
    title: 'نور و چهره',
    tagline: 'فریم‌هایی که چهره را می‌سازند',
    note: 'عینک‌های آفتابی با فریم لاک‌پشتی و شیشهٔ تیره؛ یک انتخاب ساده که چهرهٔ شما را کامل می‌کند.',
    category: 'glasses',
    placement: 'lg:col-span-3',
    depth: 2,
  },
  {
    number: '۰۴',
    image: '/images/hero-covers/cover-bag.jpg',
    alt: 'مدلی با کیف چرمی در گذرگاهی با نور گرم',
    title: 'همراه همیشگی',
    tagline: 'چرم گرم و فرم ماندگار',
    note: 'کیف‌های چرمی با فرم ساختارمند؛ همراهی که با گذر زمان زیباتر می‌شود نه کهنه.',
    category: 'bag',
    placement: 'lg:col-span-7',
    depth: 2.5,
  },
];

/**
 * The opening chapter: four covers that form one composed wall.
 *
 * Nothing here scroll-jacks or auto-advances. The interaction is a spotlight —
 * hovering or focusing a cover lifts it, dims its neighbours and swaps the
 * editor's note in the masthead, so the visitor previews a department before
 * committing to it. Clicking a cover is the commitment: it filters the
 * catalogue chapter to that department. Every cover is a real button, so the
 * whole thing is reachable by keyboard and announced by a screen reader.
 */
export default function Hero({ onSelectCategory }: HeroProps) {
  const wallRef = useRef<HTMLDivElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [focused, setFocused] = useState<number | null>(null);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const active = focused ?? selected;
  const activeCover = covers[active];

  /** Cursor-driven depth: each cover's image drifts against the pointer. */
  const handleWallMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const wall = wallRef.current;
    if (reducedMotion || !wall) return;
    const rect = wall.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * -18;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * -12;
    wall.style.setProperty('--px', `${x.toFixed(1)}px`);
    wall.style.setProperty('--py', `${y.toFixed(1)}px`);
  };

  const resetParallax = () => {
    const wall = wallRef.current;
    if (!wall) return;
    wall.style.setProperty('--px', '0px');
    wall.style.setProperty('--py', '0px');
    setFocused(null);
  };

  /** Arrow keys walk the wall; the covers stay in a predictable order. */
  const handleCoverKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = event.key === 'ArrowLeft' ? 1 : -1;
    const next = (index + step + covers.length) % covers.length;
    wallRef.current?.querySelectorAll('button')[next]?.focus();
  };

  return (
    <section
      id="chapter-hero"
      className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden bg-[#100b08] py-28 sm:py-32"
      aria-label="کاورهای کالکشن جدید مُدارا"
    >
      {/* Warm ambience so the dark frame never reads as flat black. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_-10%,rgba(245,158,11,0.16),transparent_42%),radial-gradient(circle_at_8%_108%,rgba(194,65,12,0.14),transparent_46%)]" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8" dir="rtl">
        {/* Masthead: a fixed headline beside an editor's note that follows focus */}
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-end lg:gap-14">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-amber-300/70" />
              <span className="text-[11px] font-bold uppercase tracking-[0.34em] text-amber-200">
                کالکشن جدید مُدارا
              </span>
            </div>
            <h1 className="mt-4 text-4xl font-black leading-[1.08] tracking-tight text-white text-balance sm:text-5xl lg:text-[3.75rem]">
              استایل شما
              <span className="mt-1 block bg-gradient-to-l from-amber-300 via-orange-400 to-amber-500 bg-clip-text text-transparent">
                بیان شخصیت شماست
              </span>
            </h1>
          </div>

          <div className="lg:border-r lg:border-white/15 lg:pr-10">
            {/* Keyed on the active cover so the note re-mounts and re-fades. */}
            <p
              key={activeCover.number}
              className="max-w-md animate-fade-in text-sm leading-7 text-white/75 sm:text-[0.95rem]"
            >
              {activeCover.note}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {['ارسال رایگان بالای ۵۰۰ هزار تومان', 'ضمانت اصالت', 'بازگشت تا ۷ روز'].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/70"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* The cover wall */}
        <div
          ref={wallRef}
          onMouseMove={handleWallMove}
          onMouseLeave={resetParallax}
          className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 lg:h-[26rem] lg:grid-cols-12 lg:grid-rows-2"
        >
          {covers.map((cover, index) => {
            const isActive = index === active;
            return (
              <button
                key={cover.number}
                type="button"
                onClick={() => {
                  setSelected(index);
                  onSelectCategory(cover.category);
                }}
                onMouseEnter={() => setFocused(index)}
                onFocus={() => setFocused(index)}
                onBlur={() => setFocused(null)}
                onKeyDown={(event) => handleCoverKeyDown(event, index)}
                aria-pressed={index === selected}
                aria-label={`فیلتر کاتالوگ بر اساس ${cover.title}`}
                className={`group relative animate-fade-in-up overflow-hidden rounded-[1.35rem] border text-right transition-all duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                  cover.placement
                } ${
                  isActive
                    ? 'z-10 -translate-y-1 border-amber-300/60 shadow-2xl shadow-amber-500/20'
                    : 'border-white/10 opacity-70 hover:opacity-100'
                }`}
                style={{ animationDelay: `${index * 90}ms` }}
              >
                {/* Image layer drifts against the cursor; the zoom is separate. */}
                <div
                  className="absolute inset-0 transition-transform duration-500 ease-out"
                  style={{
                    transform:
                      'translate3d(calc(var(--px, 0px) * var(--depth)), calc(var(--py, 0px) * var(--depth)), 0)',
                    ['--depth' as string]: String(cover.depth),
                  }}
                >
                  <ResponsiveImage
                    src={cover.image}
                    alt={cover.alt}
                    eager={index === 0}
                    sizes={
                      index === 0
                        ? '(max-width: 1024px) 92vw, 42vw'
                        : index === 3
                          ? '(max-width: 1024px) 92vw, 58vw'
                          : '(max-width: 1024px) 46vw, 28vw'
                    }
                    wrapperClassName="absolute inset-0 block"
                    className="h-full w-full scale-[1.06] object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.12]"
                  />
                </div>

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#100b08]/90 via-[#100b08]/20 to-transparent" />
                <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />

                <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
                  <span className="block text-[10px] font-bold tracking-[0.3em] text-amber-200/80">
                    {cover.number}
                  </span>
                  <span className="mt-1 block text-sm font-bold text-white sm:text-base">{cover.title}</span>
                  <span
                    className={`mt-1 block max-h-0 overflow-hidden text-[11px] leading-5 text-white/70 transition-all duration-500 group-hover:max-h-16 group-hover:opacity-100 group-focus-visible:max-h-16 group-focus-visible:opacity-100 ${
                      isActive ? 'max-h-16 opacity-100' : 'opacity-0'
                    }`}
                  >
                    {cover.tagline}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Command strip: one way forward, and where you are on the wall */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <a
            href="#chapter-catalog"
            className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-dark-950 transition-all hover:-translate-y-0.5 hover:bg-amber-50 hover:shadow-lg active:scale-95"
          >
            مشاهدهٔ کالکشن
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          </a>

          <div className="flex items-center gap-2" aria-hidden="true">
            {covers.map((cover, index) => (
              <span
                key={cover.number}
                className={`h-1 rounded-full transition-all duration-500 ${
                  index === active ? 'w-8 bg-amber-300' : 'w-3 bg-white/25'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
