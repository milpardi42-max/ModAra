import { useEffect, useState } from 'react';

type Chapter = { id: string; label: string };

const CHAPTERS: Chapter[] = [
  { id: 'chapter-hero', label: 'آغاز' },
  { id: 'chapter-story', label: 'داستان' },
  { id: 'chapter-categories', label: 'دسته‌بندی‌ها' },
  { id: 'chapter-catalog', label: 'کاتالوگ' },
  { id: 'chapter-trust', label: 'خدمات' },
  { id: 'chapter-journal', label: 'ژورنال' },
];

/**
 * Scroll-spy wayfinding for the single-page storefront: a quiet rail of dots
 * that shows which chapter the shopper is in and jumps between chapters.
 * Hidden on small screens where vertical space is precious.
 */
export default function ChapterDots() {
  const [active, setActive] = useState('chapter-hero');

  useEffect(() => {
    const elements = CHAPTERS.map((chapter) => document.getElementById(chapter.id)).filter(
      (element): element is HTMLElement => Boolean(element),
    );
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0.05, 0.25, 0.6] },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="فصل‌های صفحه" className="fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
      {CHAPTERS.map((chapter) => {
        const isActive = active === chapter.id;
        return (
          <a
            key={chapter.id}
            href={`#${chapter.id}`}
            aria-label={chapter.label}
            aria-current={isActive ? 'true' : undefined}
            className="group flex items-center gap-2"
          >
            <span
              className={`block rounded-full transition-all ${
                isActive ? 'h-2.5 w-2.5 bg-amber-500' : 'h-2 w-2 bg-dark-300 group-hover:bg-dark-400'
              }`}
            />
            <span
              className={`text-[11px] font-medium transition-all ${
                isActive ? 'text-dark-700 opacity-100' : 'text-dark-400 opacity-0 group-hover:opacity-100'
              }`}
            >
              {chapter.label}
            </span>
          </a>
        );
      })}
    </nav>
  );
}
