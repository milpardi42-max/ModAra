import { Store, Mail, Phone, MapPin, Instagram, Twitter, Facebook, Send } from 'lucide-react';

type FooterProps = {
  onNavigate: (view: string, param?: string) => void;
};

export default function Footer({ onNavigate }: FooterProps) {
  const links = [
    { label: 'خانه', view: 'home' },
    { label: 'فروشگاه', view: 'shop' },
    { label: 'بلاگ', view: 'blog' },
  ];

  const helpLinks = ['شرایط ارسال', 'پاسخ به پرسش‌های متداول', 'پیگیری سفارش', 'حریم خصوصی', 'بازگشت کالا'];

  return (
    <footer className="relative mt-20 overflow-hidden bg-dark-950 text-white">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-amber-500 blur-3xl" />
        <div className="absolute bottom-0 -left-20 h-80 w-80 rounded-full bg-accent-500 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700">
                <Store className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">
                مُدا<span className="bg-gradient-to-l from-amber-400 to-orange-500 bg-clip-text text-transparent">را</span>
              </span>
            </div>
            <p className="text-sm text-white/60 leading-relaxed mb-6">
              فروشگاه آنلاین مُدارا، تخصصی‌ترین فروشگاه مد و فشن در ایران. جدیدترین لباس‌ها، اکسسوری‌ها و ساعت‌های لوکس با بهترین قیمت و اصالت تضمین‌شده.
            </p>
            <div className="flex gap-3">
              {[Instagram, Twitter, Facebook, Send].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 transition-all hover:bg-amber-500 hover:border-amber-500"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="font-bold mb-4 text-white">دسترسی سریع</h3>
            <ul className="space-y-3">
              {links.map((link) => (
                <li key={link.view}>
                  <button
                    onClick={() => onNavigate(link.view)}
                    className="text-sm text-white/60 transition-colors hover:text-amber-400"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="font-bold mb-4 text-white">پشتیبانی</h3>
            <ul className="space-y-3">
              {helpLinks.map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm text-white/60 transition-colors hover:text-amber-400">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold mb-4 text-white">تماس با ما</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-white/60">
                <Phone className="h-4 w-4 text-amber-400 shrink-0" />
                <span>۰۲۱-۱۲۳۴۵۶۷۸</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-white/60">
                <Mail className="h-4 w-4 text-amber-400 shrink-0" />
                <span>info@technoshop.ir</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-white/60">
                <MapPin className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>تهران، خیابان ولیعصر، پلاک ۱۲۳</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-sm text-white/40">© ۱۴۰۵ مُدارا. تمامی حقوق محفوظ است.</p>
            <button onClick={() => onNavigate('admin-login')} className="text-xs text-white/30 transition-colors hover:text-amber-400">ورود مدیریت</button>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/40">روش‌های پرداخت:</span>
            <div className="flex gap-2">
              {['شاپرک', 'زرین‌پال', 'ملت', 'سامان'].map((bank) => (
                <div key={bank} className="rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white/50">
                  {bank}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
