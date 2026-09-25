import { useEffect, useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Header from './components/Header';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import AuthModal from './components/AuthModal';
import CheckoutModal from './components/CheckoutModal';
import ChatWidget from './components/ChatWidget';
import ScrollToTop from './components/ScrollToTop';
import BackgroundDecor from './components/BackgroundDecor';
import FloatingSearch from './components/FloatingSearch';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Blog from './pages/Blog';
import BlogPostPage from './pages/BlogPostPage';
import Account from './pages/Account';
import AdminPanel from './pages/AdminPanel';
import AdminLogin from './pages/AdminLogin';
import PaymentCallback from './pages/PaymentCallback';
import Invoice from './pages/Invoice';

type View =
  | { name: 'home' }
  | { name: 'shop'; category?: string }
  | { name: 'product'; slug: string }
  | { name: 'blog' }
  | { name: 'blog-post'; slug: string }
  | { name: 'account' }
  | { name: 'admin' }
  | { name: 'admin-login' }
  | { name: 'payment-callback' }
  | { name: 'invoice'; orderId: string };

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * GitHub Pages serves this app from a static sub-path. Hash routes keep
 * navigation shareable without asking the server for a non-existent file.
 * The 404 fallback also converts path routes into these hashes.
 */
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
  if (name === 'product' && param) return { name: 'product', slug: param };
  if (name === 'blog-post' && param) return { name: 'blog-post', slug: param };
  if (name === 'blog') return param ? { name: 'blog-post', slug: param } : { name: 'blog' };
  if (name === 'account') return { name: 'account' };

  return null;
}

function initialView(): View {
  if (new URLSearchParams(window.location.search).get('payment') === 'zarinpal') return { name: 'payment-callback' };
  return viewFromHash(window.location.hash) ?? { name: 'home' };
}

function AppContent() {
  const [view, setView] = useState<View>(initialView);
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const handleNavigate = (name: string, param?: string) => {
    let nextView: View;
    let routeHash = '';

    if (name === 'home') {
      nextView = { name: 'home' };
    } else if (name === 'shop') {
      nextView = { name: 'shop', category: param };
      routeHash = param ? `#shop/${encodeURIComponent(param)}` : '#shop';
    } else if (name === 'product') {
      nextView = { name: 'product', slug: param || '' };
      routeHash = `#product/${encodeURIComponent(param || '')}`;
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
    } else {
      return;
    }

    window.history.replaceState(null, '', `${window.location.pathname}${routeHash}`);
    setView(nextView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleHashChange = () => setView(viewFromHash(window.location.hash) ?? { name: 'home' });
    const handleOpenCart = () => setCartOpen(true);
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('modara:open-cart', handleOpenCart);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('modara:open-cart', handleOpenCart);
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);

  const isHome = view.name === 'home';
  const isPaymentCallback = view.name === 'payment-callback';
  const isAdminLogin = view.name === 'admin-login';
  const isInvoice = view.name === 'invoice';
  const isUtilityPage = isPaymentCallback || isAdminLogin || isInvoice;

  return (
    <div className="relative min-h-screen flex flex-col">
      {!isPaymentCallback && <BackgroundDecor />}
      {!isUtilityPage && <Header onNavigate={handleNavigate} />}

      <main className="flex-1">
        {view.name === 'home' && <Home onNavigate={handleNavigate} />}
        {view.name === 'shop' && <Shop onNavigate={handleNavigate} initialCategory={view.category} />}
        {view.name === 'product' && (
          <ProductDetail slug={view.slug} onNavigate={handleNavigate} onOpenAuth={() => setAuthOpen(true)} />
        )}
        {view.name === 'blog' && <Blog onNavigate={handleNavigate} />}
        {view.name === 'blog-post' && <BlogPostPage slug={view.slug} onNavigate={handleNavigate} />}
        {view.name === 'account' && <Account onNavigate={handleNavigate} />}
        {view.name === 'admin-login' && <AdminLogin onNavigate={handleNavigate} />}
        {view.name === 'admin' && <AdminPanel onNavigate={handleNavigate} onOpenAuth={() => handleNavigate('admin-login')} />}
        {view.name === 'payment-callback' && <PaymentCallback onNavigate={handleNavigate} />}
        {view.name === 'invoice' && <Invoice orderId={view.orderId} onNavigate={handleNavigate} />}
      </main>

      {!isUtilityPage && <Footer onNavigate={handleNavigate} />}

      {!isUtilityPage && <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />}

      {!isUtilityPage && <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />}
      {!isUtilityPage && <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} onOpenInvoice={(id) => handleNavigate('invoice', id)} />}
      {!isUtilityPage && <ChatWidget />}
      {!isUtilityPage && <ScrollToTop />}
      {isHome && <FloatingSearch onNavigate={handleNavigate} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </AuthProvider>
  );
}
