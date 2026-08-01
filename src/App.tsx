import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { CurrencyProvider, useCurrency } from './context/CurrencyContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { WishlistProvider, useWishlist } from './context/WishlistContext';

// Components
import Header from './components/storefront/Header';
import Footer from './components/storefront/Footer';
import SearchOverlay from './components/storefront/SearchOverlay';
import CartDrawer from './components/storefront/CartDrawer';
import AuthModal from './components/storefront/AuthModal';

// Pages
import HomePage from './pages/HomePage';
import ProductListingPage from './pages/ProductListingPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CoffeeFinderPage from './pages/CoffeeFinderPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import CustomerAccountPage from './pages/CustomerAccountPage';
import {
  AboutPage,
  WholesalePage,
  ContactPage,
  TermsPage,
  PrivacyPage,
  ShippingPolicyPage,
  FaqPage,
  BrewingGuidePage,
  SubscriptionsPage,
  LocationsPage,
  TrackOrderPage,
  BlogPage,
  GiftCardsPage
} from './pages/StaticPages';
import AdminPage from './pages/AdminPage';

function MainApp() {
  const { language } = useLanguage();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Sync browser history with internal state
  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPath]);

  const navigate = (path: string) => {
    if (path === currentPath) return;
    window.history.pushState({}, '', path);
    setCurrentPath(path.split('?')[0]);
  };

  const isAdminRoute = currentPath.startsWith('/admin');

  const renderContent = () => {
    if (currentPath === '/') {
      return <HomePage onNavigate={navigate} />;
    }

    if (currentPath === '/products') {
      return <ProductListingPage onNavigate={navigate} />;
    }

    if (currentPath.startsWith('/products/')) {
      const slug = currentPath.replace('/products/', '');
      return <ProductDetailPage slug={slug} onNavigate={navigate} />;
    }

    if (currentPath === '/coffee-finder') {
      return <CoffeeFinderPage onNavigate={navigate} />;
    }

    if (currentPath === '/cart') {
      return <CartPage onNavigate={navigate} />;
    }

    if (currentPath === '/checkout') {
      return <CheckoutPage onNavigate={navigate} />;
    }

    if (currentPath.startsWith('/order-confirmation/')) {
      const orderId = currentPath.replace('/order-confirmation/', '');
      return <OrderConfirmationPage orderId={orderId} onNavigate={navigate} />;
    }

    if (currentPath === '/account') {
      return <CustomerAccountPage onNavigate={navigate} />;
    }

    if (currentPath === '/about') {
      return <AboutPage onNavigate={navigate} />;
    }

    if (currentPath === '/wholesale') {
      return <WholesalePage onNavigate={navigate} />;
    }

    if (currentPath === '/contact') {
      return <ContactPage onNavigate={navigate} />;
    }

    if (currentPath === '/terms') {
      return <TermsPage onNavigate={navigate} />;
    }

    if (currentPath === '/privacy') {
      return <PrivacyPage onNavigate={navigate} />;
    }

    if (currentPath === '/shipping-policy') {
      return <ShippingPolicyPage onNavigate={navigate} />;
    }

    if (currentPath === '/faq') {
      return <FaqPage onNavigate={navigate} />;
    }

    if (currentPath === '/brewing-guide') {
      return <BrewingGuidePage onNavigate={navigate} />;
    }

    if (currentPath === '/subscriptions') {
      return <SubscriptionsPage onNavigate={navigate} />;
    }

    if (currentPath === '/locations') {
      return <LocationsPage onNavigate={navigate} />;
    }

    if (currentPath === '/track-order') {
      return <TrackOrderPage onNavigate={navigate} />;
    }

    if (currentPath.startsWith('/track-order/')) {
      const orderNumber = decodeURIComponent(currentPath.replace('/track-order/', ''));
      return <TrackOrderPage orderNumber={orderNumber} onNavigate={navigate} />;
    }

    if (currentPath === '/blog') {
      return <BlogPage onNavigate={navigate} />;
    }

    if (currentPath === '/gift-cards') {
      return <GiftCardsPage onNavigate={navigate} />;
    }

    if (isAdminRoute) {
      return <AdminPage onNavigate={navigate} />;
    }

    // 404 Fallback
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="text-6xl font-extrabold text-[#D99B26] font-serif mb-4">404</div>
        <h1 className="text-2xl font-bold text-white mb-2">{language === 'ar' ? 'الصفحة غير موجودة' : 'Page Not Found'}</h1>
        <p className="text-[#A69B93] mb-6 max-w-md">{language === 'ar' ? 'عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.' : 'Sorry, the page you are looking for does not exist or has been moved.'}</p>
        <button
          onClick={() => navigate('/')}
          className="bg-[#8C532B] hover:bg-[#A86434] text-white px-6 py-3 rounded-xl font-bold transition cursor-pointer"
        >
          {language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
        </button>
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-[#110E0C] text-[#F8F5F0] selection:bg-[#8C532B] selection:text-white ${language === 'ar' ? 'font-sans' : 'font-sans'}`}>
      
      {/* Show Navigation Header if not in Admin */}
      {!isAdminRoute && (
        <Header
          currentPath={currentPath}
          onNavigate={navigate}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenCart={() => setCartOpen(true)}
          onOpenAuth={() => setAuthModalOpen(true)}
        />
      )}

      {/* Main Dynamic View */}
      <main className="min-h-screen">
        {renderContent()}
      </main>

      {/* Show Storefront Footer if not in Admin */}
      {!isAdminRoute && (
        <Footer onNavigate={navigate} />
      )}

      {/* Modals & Overlays */}
      <SearchOverlay
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={navigate}
      />

      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        onNavigate={navigate}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onNavigate={navigate}
      />

    </div>
  );
}

const GoogleAuthShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language } = useLanguage();
  const googleClientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    import.meta.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    '';
  if (!googleClientId) {
    return <>{children}</>;
  }
  return (
    <GoogleOAuthProvider clientId={googleClientId} locale={language === 'ar' ? 'ar' : 'en'}>
      {children}
    </GoogleOAuthProvider>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <GoogleAuthShell>
        <CurrencyProvider>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <MainApp />
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </CurrencyProvider>
      </GoogleAuthShell>
    </LanguageProvider>
  );
}
