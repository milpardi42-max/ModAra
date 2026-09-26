import type { Product } from './supabase';

/**
 * Category presentation metadata.
 *
 * Each category gets its own art direction so the storefront reads as a
 * curated edit rather than one flat catalogue:
 *   - `ratio` drives the card format (editorial 4:5 portraits for worn
 *     categories, 1:1 squares for product/macro categories)
 *   - `label` is the Persian eyebrow shown on every card
 */
export type CategoryPresentation = {
  slug: string;
  label: string;
  /** Tailwind aspect utility for cards. */
  ratio: 'aspect-[4/5]' | 'aspect-square';
  /** Short line used in the catalog intro and empty states. */
  tagline: string;
};

export const CATEGORY_PRESENTATION: Record<string, CategoryPresentation> = {
  clothing: { slug: 'clothing', label: 'لباس', ratio: 'aspect-[4/5]', tagline: 'ست‌های ادیتوریال، عکاس‌شده با مدل' },
  pants: { slug: 'pants', label: 'شلوار', ratio: 'aspect-[4/5]', tagline: 'برش‌های امروزی، از چینو تا جین' },
  glasses: { slug: 'glasses', label: 'عینک', ratio: 'aspect-[4/5]', tagline: 'پرترهٔ نزدیک با هر فریم' },
  watch: { slug: 'watch', label: 'ساعت', ratio: 'aspect-square', tagline: 'ماکرو مچ، جزئیات لوکس' },
  bag: { slug: 'bag', label: 'کیف', ratio: 'aspect-square', tagline: 'چرم و بافت، در قالب و استیل‌لایف' },
  accessory: { slug: 'accessory', label: 'اکسسوری', ratio: 'aspect-square', tagline: 'استیل‌لایف مینیمال جزئیات' },
};

const FALLBACK: CategoryPresentation = {
  slug: 'other',
  label: 'محصول',
  ratio: 'aspect-[4/5]',
  tagline: 'انتخاب‌های مُدارا',
};

/** Resolves the presentation for a product, tolerating missing embeds. */
export function presentationFor(product: Product): CategoryPresentation {
  const slug = product.category?.slug ?? (product.category_id ? product.category_id.replace(/^cat-/, '') : '');
  return CATEGORY_PRESENTATION[slug] ?? FALLBACK;
}

export function categoryLabel(product: Product): string {
  return presentationFor(product).label;
}
