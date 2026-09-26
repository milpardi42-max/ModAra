/*
 * Logic test for the interaction layer: guest identity, local backend
 * tables (wishlist / cart / coupons), variant derivation and image helpers.
 * Runs the real modules through Vite's SSR loader inside jsdom.
 *
 * Run: node scripts/logic-test.mjs
 */
import { JSDOM } from 'jsdom';
import { existsSync } from 'node:fs';
import path from 'node:path';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:5173/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Event = dom.window.Event;

const { createServer } = await import('vite');
const server = await createServer({ root: process.cwd(), server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });

const guest = await server.ssrLoadModule('/src/lib/guest.ts');
const { localBackend } = await server.ssrLoadModule('/src/lib/localBackend.ts');
const variants = await server.ssrLoadModule('/src/lib/variants.ts');
const media = await server.ssrLoadModule('/src/lib/media.ts');
const { seedProducts } = await server.ssrLoadModule('/src/lib/demoSeed.ts');

let passed = 0;
let failed = 0;
function check(label, condition) {
  if (condition) {
    passed += 1;
    console.log(`  ok  ${label}`);
  } else {
    failed += 1;
    console.error(`FAIL  ${label}`);
  }
}

// --- guest identity -------------------------------------------------------
const id1 = guest.getGuestId();
const id2 = guest.getGuestId();
check('guest id is stable across calls', id1 === id2 && id1.startsWith('guest-'));

// --- guest cart persistence ----------------------------------------------
guest.writeJson(guest.GUEST_CART_KEY, [
  { id: 'line-1', product_id: 'prod-x', quantity: 2, variant: 'L', created_at: '2026-01-01T00:00:00.000Z' },
]);
const lines = guest.readJson(guest.GUEST_CART_KEY, []);
check('guest cart round-trips through localStorage', lines.length === 1 && lines[0].quantity === 2);
guest.removeKey(guest.GUEST_CART_KEY);
check('guest cart clears', guest.readJson(guest.GUEST_CART_KEY, []).length === 0);

// --- wishlist table through the local backend ----------------------------
await localBackend.from('wishlist').insert({ user_id: 'user-test', product_id: 'prod-a' });
await localBackend.from('wishlist').insert({ user_id: 'user-test', product_id: 'prod-b' });
const wish = await localBackend.from('wishlist').select('product_id').eq('user_id', 'user-test');
check('wishlist rows insert and select', (wish.data ?? []).length === 2);
await localBackend.from('wishlist').delete().eq('user_id', 'user-test').eq('product_id', 'prod-a');
const wishAfter = await localBackend.from('wishlist').select('product_id').eq('user_id', 'user-test');
check('wishlist row deletes', (wishAfter.data ?? []).length === 1);

// --- cart with variant through the local backend --------------------------
await localBackend.from('cart_items').insert({ user_id: 'user-test', product_id: 'prod-a', quantity: 1, variant: 'قهوه‌ای · L' });
const cartRows = await localBackend.from('cart_items').select('*').eq('user_id', 'user-test');
check('cart line stores its variant', cartRows.data?.[0]?.variant === 'قهوه‌ای · L');
await localBackend.from('cart_items').delete().eq('user_id', 'user-test');

// --- coupons --------------------------------------------------------------
const coupon = await localBackend.from('coupons').select('*').eq('code', 'WELCOME10').maybeSingle();
check('WELCOME10 coupon is active and usable', coupon.data?.active === true && coupon.data.min_order === 0);

// --- variants -------------------------------------------------------------
const shirt = seedProducts.find((p) => p.slug === 'classic-white-shirt');
const watch = seedProducts.find((p) => p.category_id === 'cat-watch');
const wallet = seedProducts.find((p) => p.name.includes('قهوه‌ای'));
const shirtVariants = variants.getProductVariants(shirt);
check('apparel gets S-XXL sizes', shirtVariants.sizes.join(',') === 'S,M,L,XL,XXL');
check('watch is one-size', variants.getProductVariants(watch).sizes[0] === 'وان سایز');
check('colour detected from product copy', variants.getProductVariants(wallet).colors.some((c) => c.name === 'قهوه‌ای'));
check('variant label formats as colour · size', variants.formatVariant('L', 'قهوه‌ای') === 'قهوه‌ای · L');
check('variant label is null without a choice', variants.formatVariant(null, null) === null);

// --- media helpers --------------------------------------------------------
check('webp srcset has both widths', media.webpSrcSet('/images/bag/tote.jpg') === '/images/bag/tote-640.webp 640w, /images/bag/tote-1280.webp 1280w');
check('detail image path', media.detailImage('/images/bag/tote.jpg') === '/images/bag/tote-detail.webp');
check('srcset skips non-bitmaps', media.webpSrcSet('https://example.com/x.svg') === undefined);

// --- generated assets exist ----------------------------------------------
const root = process.cwd();
check('640w webp generated for a product image', existsSync(path.join(root, 'public/images/bag/leather-tote-bag-tan-640.webp')));
check('1280w webp generated for a product image', existsSync(path.join(root, 'public/images/bag/leather-tote-bag-tan-1280.webp')));
check('detail webp generated for a product image', existsSync(path.join(root, 'public/images/bag/leather-tote-bag-tan-detail.webp')));
check('og cover exists', existsSync(path.join(root, 'public/images/og-cover.jpg')));
check('favicon exists', existsSync(path.join(root, 'public/favicon.svg')));

await server.close();
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
