import { Mail, MapPin, Phone, Store } from 'lucide-react';

type FooterProps = {
  onNavigate: (view: string, param?: string) => void;
};

const socials = [
  { label: 'اینستاگرام', href: 'https://instagram.com' },
  { label: 'تیویتتر', href: 'https://twitter.com' },
  { label: 'تلگرام', href: 'https://telegram.org' },
];

export default function Footer({ onNavigate }: FooterProps) {
  const quickLinks = [
    { label: 'خانه', onClick: () => onNavigate('home') },
    { label: 'کاتالوگ کامل', onClick: () => onNavigate('shop') },
    { label: 'ژورنال مد', onClick: () => onNavigate('blog') },
    { label: 'حساب کاربری', onClick: () => onNavigate('account') },
  ];

  return (
    <footer className="relative mt-20 overflow-hidden bg-dark-950 text-white">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-amber-500 blur-3xl" />
        <div className="absolute bottom-0 -left-20 h-80 w-80 rounded-full bg-accent-500 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700">
                <Store className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">
                مُدا<span className="bg-gradient-to-l from-amber-400 to-orange-500 bg-clip-text text-transparent">را</span>
              </span>
            </div>
            <p className="mb-6 text-sm leading-relaxed text-white/60">
              فروشگاه آنلاین مُدارا، تخصصی‌ترین فروشگاه مد و فشن در ایران. جدیدترین لباس‌ها، اکسسوری‌ها و
              ساعت‌های لوکس با بهترین قیمت و اصالت تضمین‌شده.
            </p>
            <div className="flex gap-3">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs transition-all hover:border-amber-500 hover:bg-amber-500"
                >
                  {social.label.slice(0, 2)}
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="mb-4 font-bold text-white">دسترسی سریع</h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <button onClick={link.onClick} className="text-sm text-white/60 transition-colors hover:text-amber-400">
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="mb-4 font-bold text-white">پشتیبانی</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-white/60">
                <Phone className="h-4 w-4 shrink-0 text-amber-400" />
                <span>۰۲۱-۱۲۳۴۵۶۷۸</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-white/60">
                <Mail className="h-4 w-4 shrink-0 text-amber-400" />
                <span>info@modara.ir</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-white/60">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span>تهران، خیابان ولیعصر، پلاک ۱۲۳</span>
              </li>
            </ul>
            <p className="mt-4 text-xs leading-5 text-white/40">
              پاسخگویی شنبه تا پنجشنبه، ۹ صبح تا ۶ عصر
              <br />
              ارسال رایگان برای سفارش‌های بالای ۵۰۰ هزار تومان
            </p>
          </div>

          {/* Payment */}
          <div>
            <h3 className="mb-4 font-bold text-white">روش‌های پرداخت</h3>
            <div className="flex flex-wrap gap-2">
              {['شاپرک', 'زرین‌پال', 'ملت', 'سامان'].map((bank) => (
                <div key={bank} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50">
                  {bank}
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-white/40">
              پرداخت شما از طریق درگاه امن انجام می‌شود و اطلاعات کارت در سایت ذخیره نمی‌گردد.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-sm text-white/40">© ۱۴۰۵ مُدارا. تمامی حقوق محفوظ است.</p>
            <button onClick={() => onNavigate('admin-login')} className="text-xs text-white/30 transition-colors hover:text-amber-400">
              ورود مدیریت
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
