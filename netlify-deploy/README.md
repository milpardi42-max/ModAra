# مُدارا — Netlify Deploy

این پوشه شامل تمام فایل‌های لازم برای دیپلوی سایت مُدارا روی Netlify است.

---

## روش دیپلوی

### گزینه ۱ — آپلود مستقیم (بدون Git)

۱. وارد داشبورد [Netlify](https://app.netlify.com) شوید.
۲. روی **"Add new site → Deploy manually"** کلیک کنید.
۳. **همین پوشه** (`netlify-deploy`) را به‌صورت drag & drop روی صفحه بکشید.

> ⚠️ این روش فقط برای تست سریع مناسب است چون ابتدا باید خودتان `npm run build` را اجرا کنید تا پوشه `dist` ساخته شود.

---

### گزینه ۲ — اتصال به Git (توصیه‌شده)

۱. محتویات این پوشه را در یک **ریپازیتوری جدید** در GitHub/GitLab قرار دهید.
۲. وارد داشبورد Netlify شوید → **"Add new site → Import an existing project"**.
۳. ریپازیتوری را انتخاب کنید.
۴. تنظیمات Build را به‌صورت زیر وارد کنید:

   | فیلد | مقدار |
   |------|-------|
   | Base directory | _(خالی بگذارید)_ |
   | Build command | `npm run build` |
   | Publish directory | `dist` |

۵. روی **"Deploy site"** کلیک کنید.

---

## متغیرهای محیطی (اختیاری)

سایت بدون هیچ تنظیمی در **حالت دمو** اجرا می‌شود (کاتالوگ، سبد خرید و ورود همه در مرورگر کار می‌کنند).

برای اتصال به Supabase واقعی، در داشبورد Netlify به **Site settings → Environment variables** بروید و موارد زیر را اضافه کنید:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## ساختار فایل‌ها

```
netlify-deploy/
├── netlify.toml          ← تنظیمات Netlify (build + redirect)
├── index.html
├── vite.config.ts        ← base: '/' برای Netlify
├── package.json
├── package-lock.json
├── tailwind.config.js
├── postcss.config.js
├── tsconfig*.json
├── eslint.config.js
├── .env.example
├── public/               ← تصاویر، ویدیوها، 404.html
└── src/                  ← کد اصلی React/TypeScript
```
