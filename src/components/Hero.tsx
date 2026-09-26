import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { asset } from '../lib/format';

/**
 * Full-viewport opening chapter.
 *
 * The masthead speaks the same editorial grammar as every chapter below it —
 * a hairline eyebrow, a display headline with one gradient accent line, and an
 * editor's note set apart by a hairline — so the page reads as one magazine
 * spread instead of a storefront header followed by an article. Deliberately
 * free of scroll-jacking, drag interactions and multi-screen animation: the
 * shopper sees the campaign, one call to action and the first products within
 * a single scroll. The background video is decorative and degrades to a poster
 * when autoplay is blocked or motion is reduced.
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

  // Trust markers belong to the editor's note, not the headline column.
  const assurances = ['ارسال رایگان بالای ۵۰۰ هزار تومان', 'ضمانت اصالت', 'بازگشت تا ۷ روز'];

  return (
    <section
      id="chapter-hero"
      className="relative flex h-[100svh] min-h-[620px] w-full items-end overflow-hidden bg-dark-950"
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

      {/* Top wash keeps the frame calm, the middle stays clear so the campaign
          footage reads, and the bottom darkens for the type that sits there. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(245,158,11,0.12),transparent_36%),linear-gradient(180deg,rgba(10,10,12,0.45),rgba(10,10,12,0.08)_34%,rgba(10,10,12,0.55)_72%,rgba(10,10,12,0.9)_100%)]" />

      <div
        className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-28 pt-32 sm:px-6 sm:pb-32 lg:px-8"
        dir="rtl"
      >
        <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-end lg:gap-14">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-amber-300/70" />
              <span className="text-[11px] font-bold uppercase tracking-[0.34em] text-amber-200">
                کالکشن جدید مُدارا
              </span>
            </div>

            <h1 className="mt-4 text-4xl font-black leading-[1.08] tracking-tight text-white text-balance sm:text-5xl lg:text-[4.25rem]">
              استایل شما
              <span className="mt-1 block bg-gradient-to-l from-amber-300 via-orange-400 to-amber-500 bg-clip-text text-transparent">
                بیان شخصیت شماست
              </span>
            </h1>

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 sm:mt-8">
              <a
                href="#chapter-catalog"
                className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-dark-900 transition-all hover:-translate-y-0.5 hover:bg-amber-50 hover:shadow-lg active:scale-95"
              >
                مشاهدهٔ کالکشن
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              </a>
              <a
                href="#chapter-journal"
                className="group inline-flex items-center gap-1.5 text-sm font-bold text-white/80 underline decoration-white/30 decoration-2 underline-offset-8 transition-colors hover:text-amber-200 hover:decoration-amber-300"
              >
                راهنمای استایل
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              </a>
            </div>
          </div>

          <div className="lg:border-r lg:border-white/15 lg:pr-10">
            <p className="max-w-md text-sm leading-7 text-white/75 sm:text-[0.95rem]">
              از درخشش کفش چرمی تا اکسسوری‌های ماندگار؛ جزئیات درست، استایل شما را کامل می‌کند.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {assurances.map((assurance) => (
                <span
                  key={assurance}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/70"
                >
                  {assurance}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <a
        href="#chapter-story"
        aria-label="اسکرول به بخش بعدی"
        className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-black/30 px-4 py-2 text-white/80 backdrop-blur-md transition-colors hover:text-white"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.32em]">اسکرول کنید</span>
        <ChevronDown className="h-4 w-4 animate-bounce text-amber-300" />
      </a>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-dark-50 to-transparent" />
    </section>
  );
}
