import type { Product } from './supabase';

/**
 * Variant model.
 *
 * A fashion store cannot sell without size/colour choice. Until the products
 * table carries explicit `sizes` / `colors` columns (see the
 * 20260926000000_immersive_commerce migration), variants are derived from the
 * catalogue itself:
 *   - sizes come from the category (apparel S-XXL, trousers 36-46, others one-size)
 *   - colours are detected from the Persian colour words in the product copy
 *
 * When the DB columns exist they always win, so moving to real data is a
 * zero-code-change operation.
 */
export type ProductColor = { name: string; hex: string };

export type ProductVariants = {
  sizes: string[];
  colors: ProductColor[];
};

const SIZES_BY_CATEGORY: Record<string, string[]> = {
  clothing: ['S', 'M', 'L', 'XL', 'XXL'],
  pants: ['36', '38', '40', '42', '44', '46'],
};

/** Persian colour words mapped to swatch hexes, detected in product copy. */
const COLOR_WORDS: [string, string][] = [
  ['مشکی', '#1c1917'],
  ['سفید', '#fafaf9'],
  ['قهوه‌ای', '#7c4a21'],
  ['بژ', '#e7d3b3'],
  ['کرم', '#efe3c8'],
  ['آبی', '#2b4acb'],
  ['سرمه‌ای', '#1e3a5f'],
  ['نوک‌مدادی', '#3b4a6b'],
  ['فیروزه‌ای', '#1fa2a6'],
  ['خاکستری', '#8a8a8a'],
  ['دودی', '#5c5c5c'],
  ['زرشکی', '#8f1d2c'],
  ['قرمز', '#c2262c'],
  ['صورتی', '#e8a0b4'],
  ['بنفش', '#6d28a8'],
  ['سبز', '#2f7a3d'],
  ['زیتونی', '#6b6b2a'],
  ['خاکی', '#b8a888'],
  ['طلایی', '#d4a017'],
  ['نقره‌ای', '#b8bcc2'],
  ['رزگلد', '#d99a7c'],
  ['مسی', '#b87333'],
  ['عدسی', '#8b8f98'],
  ['نارنجی', '#e26310'],
  ['شتری', '#c9b28a'],
  ['وینتیج', '#7c4a21'],
];

/** One-size categories (watches, eyewear, jewellery, bags) still need an explicit chip. */
const ONE_SIZE = 'وان سایز';

function detectColors(product: Product): ProductColor[] {
  const haystack = `${product.name ?? ''} ${product.description ?? ''}`;
  const found: ProductColor[] = [];
  const seen = new Set<string>();
  for (const [word, hex] of COLOR_WORDS) {
    if (haystack.includes(word) && !seen.has(hex)) {
      seen.add(hex);
      found.push({ name: word, hex });
    }
    if (found.length >= 3) break;
  }
  return found;
}

export function getProductVariants(product: Product): ProductVariants {
  // Explicit DB columns take precedence when present.
  const dbSizes = product.sizes;
  const dbColors = product.colors;
  if (Array.isArray(dbSizes) && dbSizes.length) {
    return { sizes: dbSizes, colors: Array.isArray(dbColors) ? dbColors : [] };
  }

  const slug = product.category?.slug ?? categorySlugFromId(product.category_id);
  const sizes = SIZES_BY_CATEGORY[slug ?? ''] ?? [ONE_SIZE];
  return { sizes, colors: detectColors(product) };
}

function categorySlugFromId(categoryId: string | null): string | null {
  if (!categoryId) return null;
  return categoryId.replace(/^cat-/, '');
}

/** Human-readable label for the selected variant, stored on the cart line. */
export function formatVariant(size?: string | null, colorName?: string | null): string | null {
  const parts = [colorName, size].filter(Boolean) as string[];
  return parts.length ? parts.join(' · ') : null;
}
