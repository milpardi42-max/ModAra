import { Instagram, Mail, MapPin, Phone, Send, Store, Twitter } from 'lucide-react';

type FooterProps = {
  onNavigate: (view: string, param?: string) => void;
};

const socials = [
  { label: 'اینستاگرام', href: 'https://instagram.com', Icon: Instagram },
  { label: 'تیویتتر', href: 'https://twitter.com', Icon: Twitter },
  { label: 'تلگرام', href: 'https://telegram.org', Icon: Send },
];

const payments = ['شاپرک', 'زرین‌پال', 'ملت', 'سامان'];

export default function Footer({ onNavigate }: FooterProps) {
  const quickLinks = [
    { label: 'خانه', onClick: () => onNavigate('home') },
    { label: 'کاتالوگ کامل', onClick: () => onNavigate('shop') },
    { label: 'ژورنال مد', onClick: () => onNavigate('blog') },
    { label: 'حساب کاربری', onClick: () => onNavigate('account') },
  ];

  return (
    <footer className="relative mt-20 overflow-hidden bg-dark-950 text-white">
      {/* Warm ambience, kept low so the type stays the loudest thing here. */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.13]">
        <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-amber-500 blur-3xl" />
        <div className="absolute bottom-0 -left-16 h-72 w-72 rounded-full bg-accent-500 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600">
                <Store className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-black tracking-tight">
                مُدا
                <span className="bg-gradient-to-l from-amber-300 to-orange-500 bg-clip-text text-transparent">را</span>
              </span>
            </div>
            <p className="mb-6 text-sm leading-7 text-white/60">
              فروشگاه آنلاین مُدارا، تخصصی‌ترین فروشگاه مد و فشن در ایران. جدیدترین لباس‌ها، اکسسوری‌ها و
              ساعت‌های لوکس با بهترین قیمت و اصالت تضمین‌شده.
            </p>
            <div className="flex gap-2.5">
              {socials.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-all hover:border-amber-400/60 hover:bg-amber-400/10 hover:text-amber-300"
                >
                  <Icon className="h-[18px] w-[18px]" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="mb-4 font-black tracking-tight text-white">دسترسی سریع</h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={link.onClick}
                    className="text-sm text-white/60 transition-colors hover:text-amber-300"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="mb-4 font-black tracking-tight text-white">پشتیبانی</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-white/60">
                <Phone className="h-4 w-4 shrink-0 text-amber-400/80" />
                <span>۰۲۱-۱۲۳۴۵۶۷۸</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-white/60">
                <Mail className="h-4 w-4 shrink-0 text-amber-400/80" />
                <span>info@modara.ir</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-white/60">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/80" />
                <span>تهران، خیابان ولیعصر، پلاک ۱۲۳</span>
              </li>
            </ul>
            <p className="mt-4 text-xs leading-6 text-white/40">
              پاسخگویی شنبه تا پنجشنبه، ۹ صبح تا ۶ عصر
              <br />
              ارسال رایگان برای سفارش‌های بالای ۵۰۰ هزار تومان
            </p>
          </div>

          {/* Payment */}
          <div>
            <h3 className="mb-4 font-black tracking-tight text-white">روش‌های پرداخت</h3>
            <div className="flex flex-wrap gap-2">
              {payments.map((bank) => (
                <div
                  key={bank}
                  className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-white/55"
                >
                  {bank}
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-6 text-white/40">
              پرداخت شما از طریق درگاه امن انجام می‌شود و اطلاعات کارت در سایت ذخیره نمی‌گردد.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-sm text-white/40">© ۱۴۰۵ مُدارا. تمامی حقوق محفوظ است.</p>
            <button
              onClick={() => onNavigate('admin-login')}
              className="text-xs text-white/30 transition-colors hover:text-amber-300"
            >
              ورود مدیریت
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
