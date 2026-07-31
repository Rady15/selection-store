import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useCurrency, currencies } from '../../context/CurrencyContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
import { Currency, AnnouncementBarConfig } from '../../types';
import MegaMenu from './MegaMenu';
import MobileMenuDrawer from './MobileMenuDrawer';
import {
  Search,
  ShoppingBag,
  Heart,
  User,
  Globe,
  Menu,
  Coffee,
  X,
  ChevronDown,
  ShieldCheck,
  Truck
} from 'lucide-react';

interface HeaderProps {
  onOpenSearch: () => void;
  onNavigate: (path: string) => void;
  onOpenCart?: () => void;
  onOpenAuth?: () => void;
  currentPath?: string;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSearch, onNavigate, currentPath = '/', onOpenAuth }) => {
  const { language, setLanguage, t } = useLanguage();
  const { currency, setCurrency } = useCurrency();
  const { totalItemCount, openCart, amountNeededForFreeShipping, isFreeShippingEligible } = useCart();
  const { wishlistCount } = useWishlist();
  const { user, isAdmin } = useAuth();

  const [announcement, setAnnouncement] = useState<AnnouncementBarConfig | null>(null);
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    fetch('/api/admin/announcement')
      .then(res => res.json())
      .then(data => setAnnouncement(data))
      .catch(err => console.error(err));

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[#110E0C] text-[#F8F5F0] border-b border-[#2A221E] transition-all max-w-full overflow-x-clip">
      {/* Announcement Bar */}
      {showAnnouncement && announcement && announcement.is_enabled && (
        <div
          style={{ backgroundColor: announcement.bg_color, color: announcement.text_color }}
          className="text-[11px] sm:text-xs py-1.5 sm:py-2 px-2 sm:px-4 flex items-center justify-between text-center border-b border-[#2A221E]/30 font-medium max-w-full overflow-hidden"
        >
          <div className="w-4 sm:w-6 shrink-0"></div>
          <div className="flex items-center gap-1.5 sm:gap-2 justify-center flex-wrap leading-tight py-0.5 max-w-[85%]">
            <Truck className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-bounce shrink-0" />
            <span className="line-clamp-1">{language === 'ar' ? announcement.text_ar : announcement.text_en}</span>
            {announcement.link && (
              <button
                onClick={() => onNavigate(announcement.link!)}
                className="underline hover:opacity-80 font-bold ml-1 cursor-pointer shrink-0"
              >
                {t('عرض المزيد', 'View Offer')}
              </button>
            )}
          </div>
          <button
            onClick={() => setShowAnnouncement(false)}
            className="text-current opacity-70 hover:opacity-100 p-1 cursor-pointer shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Top Header Bar */}
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-1.5 sm:gap-4">

          {/* Mobile Hamburger & Logo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-1.5 sm:p-2 rounded-lg text-[#D99B26] hover:bg-[#1C1613] transition cursor-pointer"
              aria-label="Toggle Mobile Menu"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Logo (Selectable / Editable) */}
            <div
              onClick={() => onNavigate('/')}
              className="cursor-pointer group select-text"
            >
              <img
                src="/whitelogo.png"
                alt="Selection Store"
                className="h-8 sm:h-10 w-auto group-hover:scale-105 transition duration-300 shrink-0"
              />
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium">
            <button
              onClick={() => onNavigate('/')}
              className={`hover:text-[#D99B26] transition py-1 border-b-2 cursor-pointer ${currentPath === '/' ? 'text-[#D99B26] border-[#D99B26]' : 'border-transparent text-[#E6DFD5]'
                }`}
            >
              {t('الرئيسية', 'Home')}
            </button>

            {/* Mega Menu Trigger */}
            <div
              className="relative py-6"
              onMouseEnter={() => setIsMegaMenuOpen(true)}
              onMouseLeave={() => setIsMegaMenuOpen(false)}
            >
              <button
                onClick={() => onNavigate('/products')}
                className={`flex items-center gap-1.5 hover:text-[#D99B26] transition py-1 border-b-2 cursor-pointer ${(currentPath || '').startsWith('/products') || (currentPath || '').startsWith('/category')
                    ? 'text-[#D99B26] border-[#D99B26]'
                    : 'border-transparent text-[#E6DFD5]'
                  }`}
              >
                <span>{t('متجر القهوة والمعدات', 'Coffee & Gear Shop')}</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMegaMenuOpen ? 'rotate-180 text-[#D99B26]' : ''}`} />
              </button>

              <MegaMenu
                isOpen={isMegaMenuOpen}
                onClose={() => setIsMegaMenuOpen(false)}
                onNavigate={onNavigate}
              />
            </div>

            <button
              onClick={() => onNavigate('/coffee-finder')}
              className={`flex items-center gap-1.5 hover:text-[#D99B26] transition py-1 border-b-2 cursor-pointer ${currentPath === '/coffee-finder' ? 'text-[#D99B26] border-[#D99B26]' : 'border-transparent text-[#E6DFD5]'
                }`}
            >
              <span>{t('مستشار القهوة', 'Coffee Quiz')}</span>
            </button>

            <button
              onClick={() => onNavigate('/about')}
              className={`hover:text-[#D99B26] transition py-1 border-b-2 cursor-pointer ${currentPath === '/about' ? 'text-[#D99B26] border-[#D99B26]' : 'border-transparent text-[#E6DFD5]'
                }`}
            >
              {t('عن المحمصة', 'About Us')}
            </button>

            <button
              onClick={() => onNavigate('/wholesale')}
              className={`hover:text-[#D99B26] transition py-1 border-b-2 cursor-pointer ${currentPath === '/wholesale' ? 'text-[#D99B26] border-[#D99B26]' : 'border-transparent text-[#E6DFD5]'
                }`}
            >
              {t('طلب مبيعات الجملة', 'Wholesale')}
            </button>
          </nav>

          {/* Right Action Icons & Selectors */}
          <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 shrink-0">

            {/* Currency Selector - Desktop only */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-[#1C1613] text-[#D4C3B5] hover:text-[#F8F5F0] hover:bg-[#2A221E] transition border border-[#2A221E] cursor-pointer"
              >
                <span>{currency}</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {isCurrencyDropdownOpen && (
                <div className="absolute top-full mt-2 left-0 right-0 w-24 bg-[#1C1613] border border-[#2A221E] rounded-xl shadow-2xl py-1 z-50">
                  {Object.keys(currencies).map(c => (
                    <button
                      key={c}
                      onClick={() => {
                        setCurrency(c as Currency);
                        setIsCurrencyDropdownOpen(false);
                      }}
                      className={`w-full text-center px-3 py-1.5 text-xs hover:bg-[#8C532B]/30 transition cursor-pointer ${currency === c ? 'text-[#D99B26] font-bold' : 'text-[#E6DFD5]'
                        }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Language Switcher - Desktop only */}
            <button
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="hidden md:flex p-2 rounded-lg text-[#D4C3B5] hover:text-[#F8F5F0] hover:bg-[#1C1613] transition text-xs font-semibold items-center gap-1 border border-[#2A221E] cursor-pointer"
              title="Switch Language"
            >
              <Globe className="w-3.5 h-3.5 text-[#D99B26]" />
              <span>{language === 'ar' ? 'EN' : 'العربية'}</span>
            </button>

            {/* Search Overlay Trigger */}
            <button
              onClick={onOpenSearch}
              className="p-1.5 sm:p-2 rounded-lg text-[#D4C3B5] hover:text-[#D99B26] hover:bg-[#1C1613] transition cursor-pointer"
              title={t('بحث', 'Search')}
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Wishlist Button */}
            <button
              onClick={() => onNavigate('/account?tab=wishlist')}
              className="relative p-1.5 sm:p-2 rounded-lg text-[#D4C3B5] hover:text-[#D99B26] hover:bg-[#1C1613] transition cursor-pointer hidden sm:flex"
              title={t('المفضلة', 'Wishlist')}
            >
              <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#8C532B] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Account Icon */}
            <button
              onClick={() => {
                if (user) {
                  onNavigate(isAdmin ? '/admin' : '/account');
                } else if (onOpenAuth) {
                  onOpenAuth();
                } else {
                  onNavigate('/account');
                }
              }}
              className="p-1.5 sm:p-2 rounded-lg text-[#D4C3B5] hover:text-[#D99B26] hover:bg-[#1C1613] transition flex items-center gap-1 cursor-pointer"
              title={user ? user.name : t('تسجيل الدخول', 'Sign In')}
            >
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
              {isAdmin && (
                <span className="hidden md:inline text-[10px] bg-[#D99B26] text-black font-bold px-1.5 py-0.5 rounded">
                  ADMIN
                </span>
              )}
            </button>

            {/* Cart Drawer Button */}
            <button
              onClick={openCart}
              className="relative flex items-center gap-1 sm:gap-2 bg-[#8C532B] hover:bg-[#A86434] text-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl transition shadow-lg shadow-[#8C532B]/20 cursor-pointer font-medium text-xs sm:text-sm ml-0.5"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">{t('السلة', 'Cart')}</span>
              {totalItemCount > 0 && (
                <span className="bg-[#D99B26] text-black font-bold text-xs px-1.5 sm:px-2 py-0.5 rounded-full">
                  {totalItemCount}
                </span>
              )}
            </button>

          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <MobileMenuDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onNavigate={onNavigate}
      />
    </header>
  );
};

export default Header;
