/*
 * Client-side interaction test: mounts the real app in jsdom (effects run,
 * data loads) and drives the interactions that SSR cannot cover — the
 * catalogue's incremental rendering, the guest cart and the quick-view
 * overlay. Run: node scripts/client-test.mjs
 */
import { JSDOM } from 'jsdom';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:5173/',
  pretendToBeVisual: true,
});
const { window } = dom;
for (const key of ['document', 'localStorage', 'HTMLElement', 'HTMLInputElement', 'Event', 'CustomEvent', 'Node']) {
  globalThis[key] = window[key];
}
globalThis.window = window;

// jsdom has no IntersectionObserver; ChapterDots and friends use it for scroll-spy.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
window.IntersectionObserver = IntersectionObserverStub;
globalThis.IntersectionObserver = IntersectionObserverStub;

// jsdom does not implement these layout APIs; the app calls them freely.
window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() {};
window.scrollTo = () => {};

// Components call window.matchMedia directly, so it must live on the window.
const matchMedia = () => ({
  matches: false,
  media: '',
  onchange: null,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent: () => false,
});
window.matchMedia = matchMedia;
globalThis.matchMedia = matchMedia;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { createServer } = await import('vite');
const server = await createServer({
  root: process.cwd(),
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
const App = (await server.ssrLoadModule('/src/App.tsx')).default;

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

const container = window.document.createElement('div');
window.document.body.appendChild(container);
const root = createRoot(container);

/** Renders the app at `hash` and waits until `marker` shows up in the DOM. */
async function mount(hash, marker) {
  window.location.hash = hash;
  await act(async () => {
    root.render(React.createElement(App));
  });
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 50));
    });
    // Markers may live in text or in an attribute (e.g. an aria-label).
    if (`${container.textContent || ''}${container.innerHTML}`.includes(marker)) return true;
  }
  return false;
}

const cardCount = () => window.document.querySelectorAll('button[aria-label*="به سبد خرید"]').length;
const loadMoreButton = () =>
  [...window.document.querySelectorAll('button')].find((button) => button.textContent?.includes('نمایش بیشتر'));
const remainingLabel = () => {
  const match = (window.document.body.textContent || '').match(/([۰-۹]+)\s*مورد باقی‌مانده/);
  return match ? Number(match[1].replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))) : null;
};

/* ------------------------------------------------------- catalogue paging */
check('catalogue chapter mounts', await mount('#shop', 'محصول یافت شد'));
const firstPage = cardCount();
check('catalogue renders only the first page', firstPage === 24, `${firstPage} cards`);
check('load-more button appears', Boolean(loadMoreButton()));

const before = remainingLabel();
if (loadMoreButton()) {
  await act(async () => {
    loadMoreButton().click();
  });
  const secondPage = cardCount();
  check('load-more adds another page', secondPage === 48, `${firstPage} -> ${secondPage}`);
  check('remaining counter counts down', remainingLabel() === 94 - 48, `${before} -> ${remainingLabel()} of 94`);
} else {
  check('load-more button appears', false);
}

/* ------------------------------------------------------------ guest cart */
await mount('', 'دسته‌بندی‌ها');
const addButtons = window.document.querySelectorAll('button[aria-label*="به سبد خرید"]');
check('product cards expose an add-to-cart button', addButtons.length > 0, `${addButtons.length} buttons`);

// Cards with a real size/colour choice route through Quick View instead, so
// pick a one-size product (no "سایز و رنگ قابل انتخاب" hint) to test the cart.
const oneSizeCard = [...window.document.querySelectorAll('article')].find(
  (card) => card.querySelector('button[aria-label*="به سبد خرید"]') && !card.textContent?.includes('سایز و رنگ قابل انتخاب'),
);
const addButton = oneSizeCard?.querySelector('button[aria-label*="به سبد خرید"]');
check('a one-size product is on the page', Boolean(addButton));

if (addButton) {
  await act(async () => {
    addButton.click();
  });
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 120));
  });
  const stored = window.localStorage.getItem('modara-guest-cart');
  check('guest cart persists to localStorage', Boolean(stored), stored ? `${JSON.parse(stored).length} line(s)` : 'empty');
}

/* ----------------------------------------------------------- quick view */
// «بستن نمایش سریع» only exists inside the overlay, unlike the cards' pill text.
check('quick view opens from a deep link', await mount('#product/classic-white-shirt', 'بستن نمایش سریع'));
const closeButton = [...window.document.querySelectorAll('button')].find((button) =>
  button.getAttribute('aria-label')?.includes('بستن'),
);
check('quick view offers a close control', Boolean(closeButton));

await server.close();
if (failures) {
  console.error(`\n${failures} interaction(s) failed`);
  process.exit(1);
}
console.log('\nAll client interactions behave.');
