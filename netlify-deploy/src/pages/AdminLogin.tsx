import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { isDemoMode } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type AdminLoginProps = {
  onNavigate: (view: string, param?: string) => void;
};

export default function AdminLogin({ onNavigate }: AdminLoginProps) {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!isDemoMode) {
      setError('ورود با نام کاربری دمو فقط در محیط توسعه فعال است. در production از حساب Supabase با نقش admin استفاده کنید.');
      return;
    }
    if (!username.trim() || !password) {
      setError('نام کاربری و رمز عبور را وارد کنید.');
      return;
    }

    setLoading(true);
    const result = await signIn(username.trim(), password);
    setLoading(false);
    if (result.error) setError(result.error);
    else onNavigate('admin');
  };

  return (
    <div className="min-h-screen bg-dark-50 px-4 pt-24" dir="rtl">
      <div className="mx-auto max-w-md">
        <button type="button" onClick={() => onNavigate('home')} className="mb-5 inline-flex items-center gap-2 text-sm text-dark-500 transition-colors hover:text-amber-700">
          <ArrowLeft className="h-4 w-4" /> بازگشت به فروشگاه
        </button>
        <div className="overflow-hidden rounded-3xl border border-dark-100 bg-white shadow-xl shadow-dark-900/5">
          <div className="bg-gradient-to-br from-dark-950 via-dark-900 to-amber-900 px-6 py-8 text-white sm:px-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 shadow-lg shadow-amber-500/30"><ShieldCheck className="h-6 w-6" /></div>
            <h1 className="text-2xl font-bold">ورود مدیریت</h1>
            <p className="mt-1 text-sm text-white/65">دسترسی امن به سفارش‌ها و عملیات فروشگاه</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5 p-6 sm:p-8">
            {!isDemoMode && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">در محیط production، این مسیر فقط صفحه راهنماست و اعتبارسنجی مدیر با نقش `app_metadata.role = admin` انجام می‌شود.</div>}
            {error && <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm leading-6 text-error-700">{error}</div>}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-dark-700">نام کاربری</span>
              <div className="relative"><UserRound className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-dark-400" /><input required value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" placeholder="admin" className="input-field pr-11" /></div>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-dark-700">رمز عبور</span>
              <div className="relative"><LockKeyhole className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-dark-400" /><input required type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="admin 1234" className="input-field pl-11 pr-11" /><button type="button" aria-label={showPassword ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'} onClick={() => setShowPassword((visible) => !visible)} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-700">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div>
            </label>
            <button type="submit" disabled={loading || !isDemoMode} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'در حال ورود...' : 'ورود به پنل مدیریت'}</button>
            {isDemoMode && <p className="text-center text-xs leading-5 text-dark-400">حساب آزمایشی: `admin` / `admin 1234`</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
