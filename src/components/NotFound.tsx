import { Compass, Home as HomeIcon } from 'lucide-react';

type NotFoundProps = {
  onNavigate: (view: string, param?: string) => void;
};

/** Shown for unknown routes instead of silently falling back to the homepage. */
export default function NotFound({ onNavigate }: NotFoundProps) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-24" dir="rtl">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <Compass className="h-8 w-8" />
        </div>
        <p className="mb-2 text-5xl font-black text-dark-900">۴۰۴</p>
        <h1 className="mb-3 text-xl font-bold text-dark-900">این صفحه پیدا نشد</h1>
        <p className="mx-auto mb-8 max-w-md text-sm leading-6 text-dark-500">
          ممکن است نشانی را اشتباه وارد کرده باشید یا این صفحه جابه‌جا شده باشد. از کاتالوگ مُدارا ادامه دهید.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button onClick={() => onNavigate('home')} className="btn-primary">
            <HomeIcon className="h-4 w-4" />
            صفحه اصلی
          </button>
          <button onClick={() => onNavigate('shop')} className="btn-ghost">
            مشاهده کاتالوگ
          </button>
        </div>
      </div>
    </div>
  );
}
