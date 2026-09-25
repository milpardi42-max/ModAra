import { useEffect, useState } from 'react';
import { Calendar, User, ArrowLeft } from 'lucide-react';
import { supabase, type BlogPost } from '../lib/supabase';
import Breadcrumbs from '../components/Breadcrumbs';
import { formatDate, asset } from '../lib/format';

type BlogPostPageProps = {
  slug: string;
  onNavigate: (view: string, param?: string) => void;
};

export default function BlogPostPage({ slug, onNavigate }: BlogPostPageProps) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data }) => {
        setPost(data);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="pt-20 min-h-screen bg-dark-50" dir="rtl">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="h-6 w-32 rounded shimmer-bg mb-6" />
          <div className="h-10 w-3/4 rounded shimmer-bg mb-4" />
          <div className="h-72 rounded-2xl shimmer-bg mb-6" />
          <div className="space-y-3">
            <div className="h-4 w-full rounded shimmer-bg" />
            <div className="h-4 w-full rounded shimmer-bg" />
            <div className="h-4 w-2/3 rounded shimmer-bg" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <p className="text-xl font-medium text-dark-700 mb-4">مقاله یافت نشد</p>
          <button onClick={() => onNavigate('blog')} className="btn-primary">بازگشت به بلاگ</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 min-h-screen bg-dark-50" dir="rtl">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[{ label: 'بلاگ', view: 'blog' }, { label: post.title }]} onNavigate={onNavigate} />

        {/* Article */}
        <article className="animate-fade-in">
          {/* Meta */}
          <div className="flex items-center gap-4 text-sm text-dark-400 mb-4">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(post.created_at)}
            </span>
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              {post.author}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-dark-900 mb-6 leading-tight">{post.title}</h1>

          {/* Cover image */}
          <div className="aspect-video overflow-hidden rounded-2xl mb-8 bg-dark-100">
            <img
              src={asset(post.image_url)}
              alt={post.title}
              className="h-full w-full object-cover"
            />
          </div>

          {/* Excerpt */}
          <p className="text-lg text-dark-600 leading-relaxed mb-6 font-medium">{post.excerpt}</p>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            <p className="text-dark-700 leading-loose whitespace-pre-line">{post.content}</p>
          </div>
        </article>

        {/* Back button */}
        <div className="mt-12 pt-8 border-t border-dark-100">
          <button
            onClick={() => onNavigate('blog')}
            className="group inline-flex items-center gap-2 text-amber-600 font-medium hover:text-amber-700"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            بازگشت به بلاگ
          </button>
        </div>
      </div>
    </div>
  );
}
