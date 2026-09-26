import { useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import Header from './components/Header';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import AuthModal from './components/AuthModal';
import ScrollToTop from './components/ScrollToTop';
import BackgroundDecor from './components/BackgroundDecor';
import UtilityBar from './components/UtilityBar';
import SearchOverlay from './components/SearchOverlay';
import WishlistPanel from './components/WishlistPanel';
import ChapterDots from './components/ChapterDots';
import NotFound from './components/NotFound';
import Home from './pages/Home';
import { supabase } from './lib/supabase';

/*
 * Route-level code splitting: Home is the landing chapter and stays in the
 * entry chunk, every other route (and the heavy overlays) is fetched on
 * demand. The likely next hops are prefetched while the browser is idle.
 */
const Shop = lazy(() => import('./pages/Shop'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'));
const Account = lazy(() => import('./pages/Account'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const PaymentCallback = lazy(() => import('./pages/PaymentCallback'));
const Invoice = lazy(() => import('./pages/Invoice'));
const ProductOverlay = lazy(() => import('./components/ProductOverlay'));
const CheckoutModal = lazy(() => import('./components/CheckoutModal'));
const ChatWidget = lazy(() => import('./components/ChatWidget'));

type View =
  | { name: 'home' }
  | { name: 'shop'; category?: string }
  | { name: 'blog' }
  | { name: 'blog-post'; slug: string }
  | { name: 'account' }
  | { name: 'admin' }
  | { name: 'admin-login' }
  | { name: 'payment-callback' }
  | { name: 'invoice'; orderId: string }
  | { name: 'not-found' };

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Parses the hash route. `product` routes are handled as an overlay, not a view. */
function viewFromHash(hash: string): View | null {
  const route = hash.replace(/^#/, '').replace(/^\/+|\/+$/g, '');
  if (!route || route === 'home') return { name: 'home' };

  const [rawName, ...rawParams] = route.split('/');
  const name = rawName.toLowerCase();
  const param = safeDecode(rawParams.join('/'));

  if (name === 'admin') return { name: 'admin' };
  if (name === 'backoffice-login') return { name: 'admin-login' };
  if (name === 'invoice' && param) return { name: 'invoice', orderId: param };
  if (name === 'shop' || name === 'products') return { name: 'shop', category: param || undefined };
  if (name === 'blog-post' && param) return { name: 'blog-post', slug: param };
  if (name === 'blog') return param ? { name: 'blog-post', slug: param } : { name: 'blog' };
  if (name === 'account') return { name: 'account' };
  // In-page chapter anchors (#chapter-story ...) keep the shopper on the home page.
  if (name.startsWith('chapter')) return { name: 'home' };

  return null;
}

const TITLES: Record<View['name'], string> = {
  home: 'مُدارا | فروشگاه آنلاین مد و فشن',
  shop: 'کاتالوگ محصولات | مُدارا',
  blog: 'مجله مد و استایل | مُدارا',
  'blog-post': 'مقاله | مُدارا',
  account: 'حساب کاربری | مُدارا',
  admin: 'پنل مدیریت | مُدارا',
  'admin-login': 'ورود مدیریت | مُدارا',
  'payment-callback': 'نتیجه پرداخت | مُدارا',
  invoice: 'فاکتور سفارش | مُدارا',
  'not-found': 'صفحه پیدا نشد | مُدارا',
};

const DESCRIPTIONS: Partial<Record<View['name'], string>> = {
  home: 'فروشگاه آنلاین مُدارا - جدیدترین لباس‌ها، اکسسوری‌ها، عینک و ساعت‌های لوکس با بهترین قیمت',
  shop: 'کاتالوگ کامل محصولات مُدارا با فیلتر دسته‌بندی، قیمت و امتیاز',
  blog: 'راهنمای مد و استایل، مقاله‌های تخصصی مُدارا',
};

function AppContent() {
  const [view, setView] = useState<View>(() => {
    if (new URLSearchParams(window.location.search).get('payment') === 'zarinpal') return { name: 'payment-callback' };
    return viewFromHash(window.location.hash) ?? { name: 'not-found' };
  });
  const [overlaySlug, setOverlaySlug] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);

  /** Scroll position to restore when a product overlay closes. */
  const savedScrollRef = useRef(0);
  /** Whether the current overlay entry was pushed (so Back closes it). */
  const overlayPushedRef = useRef(false);

  const isProductHash = useCallback((hash: string) => {
    const route = hash.replace(/^#/, '');
    return route.startsWith('product/');
  }, []);

  const applyHash = useCallback(
    (hash: string) => {
      if (isProductHash(hash)) {
        const slug = safeDecode(hash.replace(/^#product\/?/, ''));
        setOverlaySlug(slug || null);
        return;
      }
      setOverlaySlug(null);
      const next = viewFromHash(hash) ?? { name: 'not-found' as const };
      setView(next);
    },
    [isProductHash],
  );

  /* ------------------------------------------------ navigation & routing */

  const handleNavigate = useCallback(
    (name: string, param?: string) => {
      let nextView: View;
      let routeHash = '';

      if (name === 'home') nextView = { name: 'home' };
      else if (name === 'shop') {
        nextView = { name: 'shop', category: param };
        routeHash = param ? `#shop/${encodeURIComponent(param)}` : '#shop';
      } else if (name === 'blog') {
        nextView = { name: 'blog' };
        routeHash = '#blog';
      } else if (name === 'blog-post') {
        nextView = { name: 'blog-post', slug: param || '' };
        routeHash = `#blog-post/${encodeURIComponent(param || '')}`;
      } else if (name === 'account') {
        nextView = { name: 'account' };
        routeHash = '#account';
      } else if (name === 'admin') {
        nextView = { name: 'admin' };
        routeHash = '#admin';
      } else if (name === 'admin-login') {
        nextView = { name: 'admin-login' };
        routeHash = '#backoffice-login';
      } else if (name === 'invoice') {
        nextView = { name: 'invoice', orderId: param || '' };
        routeHash = `#invoice/${encodeURIComponent(param || '')}`;
      } else return;

      setView(nextView);
      setOverlaySlug(null);
      setSearchOpen(false);
      setWishlistOpen(false);
      window.history.pushState(null, '', `${window.location.pathname}${routeHash}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [],
  );

  /** Opens the product overlay without losing the current scroll position. */
  const openProduct = useCallback((slug: string) => {
    savedScrollRef.current = window.scrollY;
    setSearchOpen(false);
    setWishlistOpen(false);
    setOverlaySlug(slug);
    const routeHash = `#product/${encodeURIComponent(slug)}`;
    if (window.location.hash !== routeHash) {
      window.history.pushState(null, '', `${window.location.pathname}${routeHash}`);
      overlayPushedRef.current = true;
    } else {
      overlayPushedRef.current = false;
    }
  }, []);

  /** Closes the overlay and returns the shopper to where they were. */
  const closeProduct = useCallback(() => {
    const restoreScroll = () => {
      window.requestAnimationFrame(() => window.scrollTo({ top: savedScrollRef.current }));
    };
    if (overlayPushedRef.current) {
      overlayPushedRef.current = false;
      // popstate → applyHash runs with the previous hash and closes the overlay.
      window.history.back();
      window.setTimeout(restoreScroll, 60);
      return;
    }
    const baseHash = view.name === 'home' ? '' : currentBaseHash(view);
    window.history.replaceState(null, '', `${window.location.pathname}${baseHash}`);
    setOverlaySlug(null);
    restoreScroll();
  }, [view]);

  useEffect(() => {
    const onHashChange = () => applyHash(window.location.hash);
    const onPopState = () => applyHash(window.location.hash);
    const onOpenCart = () => setCartOpen(true);
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('popstate', onPopState);
    window.addEventListener('modara:open-cart', onOpenCart);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('modara:open-cart', onOpenCart);
    };
  }, [applyHash]);

  // Deep link straight into a product: /#product/<slug>
  useEffect(() => {
    if (isProductHash(window.location.hash) && !overlaySlug) {
      const slug = safeDecode(window.location.hash.replace(/^#product\/?/, ''));
      if (slug) setOverlaySlug(slug);
    }
  }, [isProductHash, overlaySlug]);

  // Lock page scroll while the product overlay owns the viewport.
  useEffect(() => {
    if (!overlaySlug) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [overlaySlug]);

  /* ------------------------------------------------------------- metadata */

  useEffect(() => {
    let cancelled = false;
    const baseTitle = TITLES[view.name];
    if (!overlaySlug) {
      document.title = baseTitle;
    } else {
      document.title = 'مشاهده سریع محصول | مُدارا';
      void supabase
        .from('products')
        .select('name')
        .eq('slug', overlaySlug)
        .maybeSingle()
        .then(({ data }) => {
          if (!cancelled && data?.name) document.title = `${data.name} | مُدارا`;
        });
    }
    const description = DESCRIPTIONS[view.name];
    if (description) {
      document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    }
    return () => {
      cancelled = true;
    };
  }, [view, overlaySlug]);

  // Warm the route chunks the shopper is most likely to open next, while the
  // browser is idle. This costs nothing on first paint and makes navigation to
  // the catalogue and the journal feel instant.
  useEffect(() => {
    const warm = () => {
      void import('./pages/Shop');
      void import('./pages/Blog');
    };
    const idle = window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void };
    if (idle.requestIdleCallback) idle.requestIdleCallback(warm, { timeout: 2500 });
    else window.setTimeout(warm, 1800);
  }, []);

  /* ------------------------------------------------------------------ view */

  const isPaymentCallback = view.name === 'payment-callback';
  const isAdminLogin = view.name === 'admin-login';
  const isInvoice = view.name === 'invoice';
  const isUtilityPage = isPaymentCallback || isAdminLogin || isInvoice;
  const isAdmin = view.name === 'admin';
  const showStorefrontChrome = !isUtilityPage && !isAdmin;

  const quickView = useCallback((slug: string) => openProduct(slug), [openProduct]);

  return (
    <div className="relative flex min-h-screen flex-col">
      {!isPaymentCallback && <BackgroundDecor />}
      {!isUtilityPage && !isAdmin && <Header onNavigate={handleNavigate} />}

      <main className="flex-1">
        <Suspense fallback={<RouteFallback />}>
          {view.name === 'home' && <Home onNavigate={handleNavigate} onQuickView={quickView} focusCatalog={false} catalogCategory={null} />}
          {view.name === 'shop' && <Shop onQuickView={quickView} initialCategory={view.category} />}
          {view.name === 'blog' && <Blog onNavigate={handleNavigate} />}
          {view.name === 'blog-post' && <BlogPostPage slug={view.slug} onNavigate={handleNavigate} />}
          {view.name === 'account' && <Account onNavigate={handleNavigate} onOpenAuth={() => setAuthOpen(true)} />}
          {view.name === 'admin-login' && <AdminLogin onNavigate={handleNavigate} />}
          {view.name === 'admin' && <AdminPanel onNavigate={handleNavigate} onOpenAuth={() => handleNavigate('admin-login')} />}
          {view.name === 'payment-callback' && <PaymentCallback onNavigate={handleNavigate} />}
          {view.name === 'invoice' && <Invoice orderId={view.orderId} onNavigate={handleNavigate} />}
          {view.name === 'not-found' && <NotFound onNavigate={handleNavigate} />}
        </Suspense>
      </main>

      {!isUtilityPage && !isAdmin && <Footer onNavigate={handleNavigate} />}

      {showStorefrontChrome && (
        <>
          <UtilityBar onOpenSearch={() => setSearchOpen(true)} onOpenWishlist={() => setWishlistOpen(true)} />
          {view.name === 'home' && <ChapterDots />}
        </>
      )}

      {!isUtilityPage && !isAdmin && (
        <CartDrawer
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          onCheckout={() => {
            setCartOpen(false);
            setCheckoutOpen(true);
          }}
        />
      )}

      {!isUtilityPage && !isAdmin && <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />}
      {!isUtilityPage && !isAdmin && (
        <Suspense fallback={null}>
          <CheckoutModal
            open={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          onOpenInvoice={(id) => handleNavigate('invoice', id)}
            onOpenAuth={() => {
              setCheckoutOpen(false);
              setAuthOpen(true);
            }}
          />
        </Suspense>
      )}

      {!isUtilityPage && !isAdmin && (
        <>
          <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} onSelectProduct={quickView} />
          <WishlistPanel open={wishlistOpen} onClose={() => setWishlistOpen(false)} onSelectProduct={quickView} />
        </>
      )}

      {overlaySlug && (
        <Suspense fallback={null}>
          <ProductOverlay
            key={overlaySlug}
            slug={overlaySlug}
            onClose={closeProduct}
            onSelectProduct={quickView}
            onOpenAuth={() => setAuthOpen(true)}
          />
        </Suspense>
      )}

      {!isUtilityPage && !isAdmin && (
        <Suspense fallback={null}>
          <ChatWidget />
        </Suspense>
      )}
      {!isUtilityPage && !isAdmin && <ScrollToTop />}
    </div>
  );
}

/** Shown for a split second while a route chunk is fetched. */
function RouteFallback() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center" role="status" aria-live="polite" data-route-fallback="">
      <div className="flex flex-col items-center gap-3">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-dark-200 border-t-amber-500" />
        <span className="text-xs text-dark-400">در حال بارگذاری…</span>
      </div>
    </div>
  );
}

/** Rebuilds the base hash for the current view (used when closing overlays). */
function currentBaseHash(view: View): string {
  switch (view.name) {
    case 'shop':
      return view.category ? `#shop/${encodeURIComponent(view.category)}` : '#shop';
    case 'blog':
      return '#blog';
    case 'blog-post':
      return `#blog-post/${encodeURIComponent(view.slug)}`;
    case 'account':
      return '#account';
    case 'admin':
      return '#admin';
    case 'admin-login':
      return '#backoffice-login';
    case 'invoice':
      return `#invoice/${encodeURIComponent(view.orderId)}`;
    default:
      return '';
  }
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <AppContent />
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}
