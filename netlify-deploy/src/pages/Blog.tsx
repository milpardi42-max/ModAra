import { useEffect, useState } from 'react';
import { Calendar, User, ArrowLeft } from 'lucide-react';
import { supabase, type BlogPost } from '../lib/supabase';
import Breadcrumbs from '../components/Breadcrumbs';
import { formatDate, asset } from '../lib/format';

type BlogProps = {
  onNavigate: (view: string, param?: string) => void;
};

export default function Blog({ onNavigate }: BlogProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPosts(data || []);
        setLoading(false);
      });
  }, []);

  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <div className="pt-20 min-h-screen bg-dark-50" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-br from-dark-950 to-amber-900 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">بلاگ مُدارا</h1>
          <p className="text-white/60">راهنمای مد، استایل و ترندهای فشن</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[{ label: 'بلاگ' }]} onNavigate={onNavigate} />
        {loading ? (
          <div className="space-y-6">
            <div className="h-80 rounded-2xl shimmer-bg" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-60 rounded-2xl shimmer-bg" />
              <div className="h-60 rounded-2xl shimmer-bg" />
            </div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-lg text-dark-500">مقاله‌ای یافت نشد</p>
          </div>
        ) : (
          <>
            {/* Featured post */}
            {featured && (
              <button
                onClick={() => onNavigate('blog-post', featured.slug)}
                className="group block w-full mb-8 text-right overflow-hidden rounded-2xl border border-dark-100 bg-white transition-all hover:shadow-xl"
              >
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="aspect-video md:aspect-auto md:h-80 overflow-hidden bg-dark-50">
                    <img
                      src={asset(featured.image_url)}
                      alt={featured.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-3 text-sm text-dark-400 mb-3">
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">ویژه</span>
                      <span>{formatDate(featured.created_at)}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-dark-900 mb-3 group-hover:text-amber-700 transition-colors">
                      {featured.title}
                    </h2>
                    <p className="text-dark-500 leading-relaxed mb-4">{featured.excerpt}</p>
                    <div className="flex items-center gap-2 text-amber-600 font-medium">
                      ادامه مطلب
                      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    </div>
                  </div>
                </div>
              </button>
            )}

            {/* Rest of posts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rest.map((post, i) => (
                <button
                  key={post.id}
                  onClick={() => onNavigate('blog-post', post.slug)}
                  className="group text-right overflow-hidden rounded-2xl border border-dark-100 bg-white transition-all hover:shadow-xl hover:-translate-y-1 animate-fade-in-up"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="aspect-video overflow-hidden bg-dark-50">
                    <img
                      src={asset(post.image_url)}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-3 text-xs text-dark-400 mb-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(post.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {post.author}
                      </span>
                    </div>
                    <h3 className="font-bold text-dark-900 mb-2 line-clamp-2 group-hover:text-amber-700 transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-sm text-dark-500 line-clamp-2">{post.excerpt}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
