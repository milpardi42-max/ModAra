/*
 * SSR smoke test: renders the whole app (and a few routes) in a jsdom
 * environment through Vite's SSR module loader. Catches render-time crashes
 * that typecheck cannot see. Not part of the production build.
 *
 * Run: node scripts/smoke-test.mjs
 */
import { JSDOM } from 'jsdom';
import React from 'react';
import { renderToString } from 'react-dom/server';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:5173/',
  pretendToBeVisual: true,
});

const { window } = dom;
globalThis.window = window;
globalThis.document = window.document;
globalThis.localStorage = window.localStorage;
globalThis.HTMLElement = window.HTMLElement;
globalThis.HTMLInputElement = window.HTMLInputElement;
globalThis.Event = window.Event;
globalThis.CustomEvent = window.CustomEvent;
globalThis.getComputedStyle = window.getComputedStyle.bind(window);
globalThis.requestAnimationFrame = (cb) => window.setTimeout(cb, 0);
globalThis.cancelAnimationFrame = (id) => window.clearTimeout(id);
globalThis.matchMedia = () => ({
  matches: false,
  media: '',
  onchange: null,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent: () => false,
});
globalThis.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
};

const { createServer } = await import('vite');
const server = await createServer({
  root: process.cwd(),
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

const App = (await server.ssrLoadModule('/src/App.tsx')).default;

/** Text rendered by App's route Suspense fallback. */
const FALLBACK_MARKER = 'data-route-fallback';

const routes = [
  { hash: '', label: 'home' },
  { hash: '#shop', label: 'catalog page' },
  { hash: '#shop/watch', label: 'catalog + category' },
  { hash: '#product/classic-white-shirt', label: 'product deep link' },
  { hash: '#blog', label: 'blog' },
  { hash: '#blog-post/modara-style-guide', label: 'blog post' },
  { hash: '#account', label: 'account (guest)' },
  { hash: '#backoffice-login', label: 'admin login' },
  { hash: '#totally-unknown-route', label: '404' },
];

/**
 * Routes are code-split with React.lazy, so the first synchronous pass only
 * renders the Suspense fallback. Wait until the lazy chunk resolves (the
 * fallback marker disappears) and render again, so this test still covers the
 * real page and not just the loading state.
 */
async function renderRoute() {
  let html = renderToString(React.createElement(App));
  for (let attempt = 0; attempt < 40 && html.includes(FALLBACK_MARKER); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    html = renderToString(React.createElement(App));
  }
  return html;
}

let failures = 0;
for (const route of routes) {
  window.location.hash = route.hash;
  try {
    const html = await renderRoute();
    const meaningful = html.length > 2000;
    if (!meaningful) throw new Error(`render too small (${html.length} chars)`);
    if (html.includes(FALLBACK_MARKER)) throw new Error('route chunk never resolved');
    console.log(`  ok  ${route.label.padEnd(24)} ${html.length} chars`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL  ${route.label}: ${error.message}`);
  }
}

await server.close();
if (failures) {
  console.error(`\n${failures} route(s) failed`);
  process.exit(1);
}
console.log('\nAll routes render successfully.');
