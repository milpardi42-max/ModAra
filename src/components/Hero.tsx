import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, Sparkles } from 'lucide-react';
import { asset } from '../lib/format';

/**
 * Full-viewport opening chapter.
 *
 * Deliberately free of scroll-jacking, drag interactions and multi-screen
 * animation: the shopper sees the campaign, one call to action and the first
 * products within a single scroll. The background video is decorative and
 * degrades to a poster when autoplay is blocked or motion is reduced.
 */
export default function Hero() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const videoSrc = asset('/videos/hero-woman-polishing-shoes.mp4');
  // Phones get the 0.5 MB cut instead of the 2.7 MB desktop master.
  const videoSrcMobile = asset('/videos/hero-woman-polishing-shoes-mobile.mp4');

  return (
    <section
      id="chapter-hero"
      className="relative flex h-[100svh] min-h-[600px] w-full items-center overflow-hidden bg-dark-950"
      aria-label="کمپین کالکشن جدید مُدارا"
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ filter: 'brightness(1.05) saturate(1.03)' }}
        poster={asset('/images/hero-woman-polishing-poster.jpg')}
        autoPlay={!reducedMotion}
        loop
        muted
        playsInline
        preload="metadata"
        disablePictureInPicture
        aria-label="ویدئوی تبلیغاتی مراقبت از کفش و اکسسوری مُدارا"
      >
        <source src={videoSrcMobile} type="video/mp4" media="(max-width: 768px)" />
        <source src={videoSrc} type="video/mp4" />
        مرورگر شما از پخش ویدئو پشتیبانی نمی‌کند.
      </video>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(245,158,11,0.12),transparent_36%),linear-gradient(100deg,rgba(10,10,12,0.06),rgba(10,10,12,0.55))]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-dark-950/70 via-transparent to-dark-950/25" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8" dir="rtl">
        <div className="max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-black/25 px-4 py-2 text-sm font-medium text-white backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-amber-300" />
            کالکشن جدید — کفش، اکسسوری و جزئیات
          </div>

          <h1 className="text-4xl font-bold leading-[1.1] text-white sm:text-6xl lg:text-7xl text-balance">
            استایل شما
            <br />
            <span className="bg-gradient-to-l from-amber-300 via-orange-400 to-amber-500 bg-clip-text text-transparent">
              بیان شخصیت شماست
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75 sm:text-xl">
            از درخشش کفش چرمی تا اکسسوری‌های ماندگار؛ جزئیات درست، استایل شما را کامل می‌کند.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#chapter-catalog"
              className="group inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-dark-900 shadow-2xl shadow-black/20 transition-all hover:bg-amber-50 active:scale-95 sm:px-7 sm:py-4 sm:text-base"
            >
              مشاهده کالکشن
              <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
            </a>
            <a
              href="#chapter-journal"
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95 sm:px-7 sm:py-4 sm:text-base"
            >
              راهنمای استایل
            </a>
          </div>

          <div className="mt-8 flex flex-wrap gap-2 text-xs text-white/75">
            {['ارسال رایگان بالای ۵۰۰ هزار تومان', 'ضمانت اصالت', 'بازگشت تا ۷ روز'].map((tag) => (
              <span key={tag} className="rounded-full border border-white/15 bg-black/20 px-3 py-2 backdrop-blur-md">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <a
        href="#chapter-story"
        aria-label="اسکرول به بخش بعدی"
        className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-white/70 transition-colors hover:text-white"
      >
        <span className="text-[10px] uppercase tracking-[0.32em]">اسکرول کنید</span>
        <ChevronDown className="h-5 w-5 animate-bounce text-amber-300" />
      </a>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-dark-50 to-transparent" />
    </section>
  );
}
