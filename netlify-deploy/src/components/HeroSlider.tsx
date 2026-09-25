import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { ArrowLeft, ChevronDown, Clock3, Gem, Glasses, ShoppingBag, Sparkles } from 'lucide-react';
import { asset } from '../lib/format';

type HeroSliderProps = {
  onNavigate: (view: string, param?: string) => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

type DragPosition = { x: number; y: number };
type DragState = DragPosition & { id: string; pointerId: number; moved: boolean };

const DRAG_STORAGE_KEY = 'modara-hero-drag-positions';

export default function HeroSlider({ onNavigate }: HeroSliderProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [dragPositions, setDragPositions] = useState<Record<string, DragPosition>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const parsed = JSON.parse(window.localStorage.getItem(DRAG_STORAGE_KEY) || '{}') as Record<string, DragPosition>;
      return Object.fromEntries(Object.entries(parsed).filter(([, position]) => Number.isFinite(position?.x) && Number.isFinite(position?.y)));
    } catch {
      return {};
    }
  });
  const dragStateRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 767px)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMediaPreferences = () => {
      setIsMobile(mobileQuery.matches);
      setPrefersReducedMotion(motionQuery.matches);
    };

    updateMediaPreferences();
    mobileQuery.addEventListener('change', updateMediaPreferences);
    motionQuery.addEventListener('change', updateMediaPreferences);
    return () => {
      mobileQuery.removeEventListener('change', updateMediaPreferences);
      motionQuery.removeEventListener('change', updateMediaPreferences);
    };
  }, []);

  const videoSrc = isMobile
    ? asset('/videos/hero-woman-polishing-shoes-mobile.mp4')
    : asset('/videos/hero-woman-polishing-shoes.mp4');

  const syncToScroll = useCallback(() => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);

    frameRef.current = window.requestAnimationFrame(() => {
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const scrollDistance = Math.max(section.offsetHeight - window.innerHeight, 1);
      const progress = clamp(-rect.top / scrollDistance, 0, 1);
      progressRef.current = progress;
      setScrollProgress(progress);

      const video = videoRef.current;
      if (!prefersReducedMotion && video && Number.isFinite(video.duration) && video.duration > 0) {
        const targetTime = progress * video.duration;
        if (Math.abs(video.currentTime - targetTime) > 0.06) {
          if (typeof video.fastSeek === 'function') video.fastSeek(targetTime);
          else video.currentTime = targetTime;
        }
      }
    });
  }, [prefersReducedMotion]);

  useEffect(() => {
    syncToScroll();
    window.addEventListener('scroll', syncToScroll, { passive: true });
    window.addEventListener('resize', syncToScroll);

    return () => {
      window.removeEventListener('scroll', syncToScroll);
      window.removeEventListener('resize', syncToScroll);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, [syncToScroll]);

  const handleVideoMetadata = () => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    video.currentTime = prefersReducedMotion ? 0 : progressRef.current * video.duration;
    setVideoReady(true);
  };

  const handleVideoCanPlay = () => {
    const video = videoRef.current;
    if (!video || prefersReducedMotion) return;
    void video.play().catch(() => {
      // Muted autoplay is normally allowed; the poster remains the graceful fallback if a browser blocks it.
    });
  };

  const progressPercent = Math.round(scrollProgress * 100);
  const contentShift = scrollProgress * (isMobile ? -12 : -28);
  const detailOpacity = clamp(0.35 + scrollProgress * 0.65, 0, 1);

  useEffect(() => {
    try {
      window.localStorage.setItem(DRAG_STORAGE_KEY, JSON.stringify(dragPositions));
    } catch {
      // Drag positions are a visual preference; failure to persist them is harmless.
    }
  }, [dragPositions]);

  const getDragPosition = (id: string): DragPosition => dragPositions[id] || { x: 0, y: 0 };

  const handlePointerDown = (id: string, event: ReactPointerEvent<HTMLDivElement>) => {
    const current = getDragPosition(id);
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = { id, pointerId: event.pointerId, moved: false, x: event.clientX - current.x, y: event.clientY - current.y };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const nextX = clamp(event.clientX - drag.x, isMobile ? -96 : -260, isMobile ? 96 : 260);
    const nextY = clamp(event.clientY - drag.y, isMobile ? -110 : -220, isMobile ? 110 : 220);
    if (Math.abs(nextX - (dragPositions[drag.id]?.x || 0)) > 3 || Math.abs(nextY - (dragPositions[drag.id]?.y || 0)) > 3) {
      drag.moved = true;
      suppressClickRef.current = true;
      setDragPositions((previous) => {
        const next = { ...previous, [drag.id]: { x: nextX, y: nextY } };
        try {
          window.localStorage.setItem(DRAG_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // The in-memory state still preserves the position for the current session.
        }
        return next;
      });
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (drag?.pointerId === event.pointerId) {
      dragStateRef.current = null;
      window.setTimeout(() => { suppressClickRef.current = false; }, 0);
    }
  };

  const makeDraggable = (id: string, children: ReactNode, className = '') => {
    const position = getDragPosition(id);
    return (
      <div
        className={`hero-draggable ${className}`}
        style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
        onPointerDown={(event) => handlePointerDown(id, event)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={(event) => {
          if (suppressClickRef.current) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        title="برای جابه‌جایی کلیک کنید و بکشید"
      >
        {children}
      </div>
    );
  };

  return (
    <section ref={sectionRef} className="relative h-[135vh] min-h-[780px] w-full bg-dark-950 sm:h-[220vh] sm:min-h-[1420px]" aria-label="کمپین ویدئویی کالکشن جدید مُدارا">
      <div className="sticky top-0 h-[100svh] min-h-[620px] w-full overflow-hidden bg-dark-950">
        <video
          key={videoSrc}
          ref={videoRef}
          className="hero-video absolute inset-0 h-full w-full object-cover"
          style={{
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transform: 'translateZ(0)',
            touchAction: 'pan-y',
            willChange: prefersReducedMotion ? 'auto' : 'transform',
            filter: isMobile ? 'brightness(1.08) saturate(1.04)' : 'brightness(1.12) saturate(1.05)',
          }}
          poster={asset('/images/hero-woman-polishing-poster.jpg')}
          autoPlay={!prefersReducedMotion}
          loop
          muted
          playsInline
          preload={prefersReducedMotion ? 'metadata' : isMobile ? 'metadata' : 'auto'}
          disablePictureInPicture
          aria-label="ویدئوی تبلیغاتی مراقبت از کفش و اکسسوری مُدارا"
          onLoadedMetadata={handleVideoMetadata}
          onCanPlay={handleVideoCanPlay}
          onError={() => setVideoReady(false)}
        >
          <source src={videoSrc} type="video/mp4" />
          مرورگر شما از پخش ویدئو پشتیبانی نمی‌کند.
        </video>

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(245,158,11,0.11),transparent_34%),linear-gradient(100deg,rgba(10,10,12,0.04),rgba(10,10,12,0.48))]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-dark-950/65 via-dark-950/6 to-transparent" />
        <div className="pointer-events-none absolute inset-0 opacity-25 mix-blend-screen" style={{ background: 'linear-gradient(115deg, transparent 24%, rgba(245,158,11,0.12) 48%, transparent 72%)' }} />

        <div className="absolute inset-0 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" dir="rtl">
          <div
            className="flex h-full max-w-2xl items-center pb-24 pt-20 transition-transform duration-100 sm:pb-20 sm:pt-24"
            style={{ transform: `translate3d(0, ${contentShift}px, 0)` }}
          >
            <div className="relative z-10">
              {makeDraggable('campaign-badge', <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-black/25 px-4 py-2 text-sm font-medium text-white backdrop-blur-md">
                <Sparkles className="h-4 w-4 text-amber-300" />
                کمپین ویدئویی کفش و اکسسوری
              </div>, 'w-fit')}

              {makeDraggable('campaign-eyebrow', <p className="text-sm font-semibold tracking-[0.24em] text-amber-300/90">MODARA / SHOE CARE EDIT</p>, 'w-fit')}
              {makeDraggable('campaign-title', <h1 className="text-4xl font-bold leading-[1.08] text-white sm:text-6xl lg:text-7xl text-balance">
                استایل شما
                <br />
                <span className="bg-gradient-to-l from-amber-300 via-orange-400 to-amber-500 bg-clip-text text-transparent">بیان شخصیت شماست</span>
              </h1>)}
              {makeDraggable('campaign-description', <p className="max-w-xl text-base leading-relaxed text-white/75 sm:text-xl">
                از درخشش کفش چرمی تا اکسسوری‌های ماندگار؛ جزئیات درست، استایل شما را کامل می‌کند.
              </p>, 'mt-5 sm:mt-6')}

              {makeDraggable('campaign-actions', <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => onNavigate('shop')}
                  className="group inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-dark-900 shadow-2xl shadow-black/20 transition-all hover:bg-amber-50 active:scale-95 sm:px-7 sm:py-4 sm:text-base"
                >
                  مشاهده کالکشن
                  <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
                </button>
                <button
                  onClick={() => onNavigate('blog')}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95 sm:px-7 sm:py-4 sm:text-base sm:backdrop-blur-md"
                >
                  راهنمای استایل
                </button>
              </div>, 'mt-8')}

              {makeDraggable('campaign-tags', <div className="flex flex-wrap gap-2 text-xs text-white/75">
                <span className="rounded-full border border-white/15 bg-black/20 px-3 py-2 backdrop-blur-md">ساختار مینیمال</span>
                <span className="rounded-full border border-white/15 bg-black/20 px-3 py-2 backdrop-blur-md">جزئیات طلایی</span>
                <span className="rounded-full border border-white/15 bg-black/20 px-3 py-2 backdrop-blur-md">استایل شهری</span>
              </div>, 'mt-6 sm:mt-8')}
            </div>
          </div>

          <div className="absolute bottom-20 left-4 right-4 hidden items-end justify-between gap-4 md:flex lg:left-8 lg:right-8">
            {makeDraggable('campaign-detail', <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/25 px-4 py-3 text-white/80 backdrop-blur-md" style={{ opacity: detailOpacity }}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300"><Clock3 className="h-5 w-5" /></div>
              <div><p className="text-xs text-white/50">جزئیات کمپین</p><p className="font-semibold">کفش / اکسسوری</p></div>
            </div>, 'w-fit')}
            {makeDraggable('campaign-meta', <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-2 text-xs text-white/55">
                <span>{videoReady ? 'ویدئو آماده است' : 'نسخه نمایشی کمپین'}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/25 px-4 py-3 backdrop-blur-md">
                <div className="flex items-center gap-2 text-white/85"><Glasses className="h-4 w-4 text-amber-300" /> اکسسوری</div>
                <div className="h-5 w-px bg-white/15" />
                <div className="flex items-center gap-2 text-white/85"><ShoppingBag className="h-4 w-4 text-amber-300" /> کیف چرمی</div>
                <div className="h-5 w-px bg-white/15" />
                <div className="flex items-center gap-2 text-white/85"><Gem className="h-4 w-4 text-amber-300" /> جزئیات</div>
              </div>
            </div>, 'w-fit')}
          </div>
        </div>

        <div className="absolute bottom-9 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2 text-white/65 sm:bottom-7">
          <span className="text-[10px] uppercase tracking-[0.32em]">اسکرول کنید</span>
          <ChevronDown className="h-5 w-5 animate-bounce text-amber-300" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20 h-1 bg-white/10">
          <div className="h-full bg-gradient-to-l from-amber-300 via-orange-500 to-transparent transition-[width] duration-100" style={{ width: `${Math.max(progressPercent, 3)}%` }} />
        </div>
        <div className="absolute bottom-6 left-4 z-20 font-mono text-xs text-white/45 sm:left-8">{String(progressPercent).padStart(2, '0')} / 100</div>
        <div className="absolute bottom-20 left-4 right-4 z-20 flex justify-center md:hidden">
          <div className="rounded-full border border-white/15 bg-black/25 px-3 py-2 text-[11px] text-white/70 backdrop-blur-sm">
            {prefersReducedMotion ? 'حرکت‌های اضافی خاموش است' : isMobile ? 'نسخه سبک موبایل فعال است' : 'نسخه نمایشی کمپین'}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-dark-50 to-transparent" />
      </div>
    </section>
  );
}
