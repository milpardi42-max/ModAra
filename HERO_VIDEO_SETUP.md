# راهنمای ویدئوی Hero مُدارا

ویدئوی فعلی Hero از فایل ارسالی کاربر ساخته شده است. برای حفظ کیفیت و بارگذاری سریع، دو نسخهٔ سازگار با نمایشگرهای مختلف در پروژه نگهداری می‌شود:

- دسکتاپ: `public/videos/hero-woman-polishing-shoes.mp4`
- موبایل: `public/videos/hero-woman-polishing-shoes-mobile.mp4`
- تصویر fallback/poster: `public/images/hero-woman-polishing-poster.jpg`

## رفتار نمایش

کامپوننت `src/components/Hero.tsx` مسیر فایل را با helper `asset()` می‌سازد تا هم در ریشه و هم در مسیر `/Modara/` گیت‌هاب‌پیجز درست کار کند. ویدئو با `muted`، `playsInline`، `autoPlay` و `loop` نمایش داده می‌شود؛ `preload` همیشه روی `metadata` است تا اولین بارگذاری سنگین نباشد. پخش خودکار در حالت `prefers-reduced-motion: reduce` غیرفعال است و poster نمایش داده می‌شود.

Hero یک سکشن `100svh` است و **بدون scroll-jacking**: کاربر با یک اسکرول به فصل بعدی می‌رسد و عناصر متنی کشیدنی (drag) ندارند. دکمهٔ اصلی به `#chapter-catalog` لینک شده و در همان صفحه به کاتالوگ می‌رود.

## جایگزینی ویدئو در آینده

فایل MP4 جدید دسکتاپ را با نام `hero-woman-polishing-shoes.mp4` و نسخه موبایل را با نام `hero-woman-polishing-shoes-mobile.mp4` در پوشهٔ `public/videos/` قرار دهید. تصویر poster را در `public/images/hero-woman-polishing-poster.jpg` جایگزین کنید. اگر نام فایل‌ها تغییر کرد، مقدار `videoSrc` و مسیر `poster` را در `Hero.tsx` به‌روزرسانی کنید. برای شروع سریع‌تر MP4، metadata را با `-movflags +faststart` به ابتدای فایل منتقل کنید.

## بررسی پس از تغییر

```bash
npm run typecheck
npm run lint
npm run build
npm test
```
