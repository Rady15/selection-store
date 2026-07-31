import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useCart } from '../../context/CartContext';
import { Product } from '../../types';
import { Search, X, Coffee, ArrowLeft, ArrowRight, Loader2, Tag, ShoppingBag } from 'lucide-react';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose, onNavigate }) => {
  const { language, t } = useLanguage();
  const { formatPrice } = useCurrency();
  const { addToCart } = useCart();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem('fursan_recent_searches');
    return saved ? JSON.parse(saved) : ['شلشلي', 'سانتواريو', 'V60', 'أظرف مقطرة'];
  });

  const inputRef = useRef<HTMLInputElement>(null);

  const trendingKeywords = ['شلشلي', 'سانتواريو', 'الخولاني', 'V60', 'طاحونة', 'أظرف مقطرة', 'صندوق التذوق'];

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/products?search=${encodeURIComponent(query.trim())}`)
        .then(res => res.json())
        .then(data => {
          setResults(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectKeyword = (kw: string) => {
    setQuery(kw);
    saveRecentSearch(kw);
  };

  const saveRecentSearch = (kw: string) => {
    const updated = [kw, ...recentSearches.filter(s => s !== kw)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('fursan_recent_searches', JSON.stringify(updated));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#110E0C]/95 backdrop-blur-xl text-[#F8F5F0] overflow-y-auto animate-fade-in">

      {/* Top Search Input Bar */}
      <div className="p-4 sm:p-6 border-b border-[#2A221E] bg-[#110E0C] sticky top-0 z-10 shadow-2xl">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Search className="w-6 h-6 text-[#D99B26] flex-shrink-0" />

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('ابحث عن اسم محصول، معالجة، بلد المنشأ، أو أداة...', 'Search crops, origins, processing methods or gear...')}
            className="w-full bg-transparent text-lg sm:text-2xl font-bold placeholder-[#A69B93]/50 text-[#F8F5F0] focus:outline-none"
          />

          {loading ? (
            <Loader2 className="w-6 h-6 text-[#D99B26] animate-spin flex-shrink-0" />
          ) : query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-[#A69B93] hover:text-white hover:bg-[#1C1613] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          ) : null}

          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1C1613] hover:bg-[#2A221E] text-[#D4C3B5] hover:text-white transition cursor-pointer border border-[#2A221E]"
          >
            {t('إلغاء (ESC)', 'Close (ESC)')}
          </button>
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 flex-1">

        {/* If no query entered yet, show popular & recent tags */}
        {!query.trim() && (
          <div className="space-y-8 py-4">

            {/* Trending Keywords */}
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#D99B26] uppercase tracking-wider mb-3">
                <span>{t('الأكثر بحثاً اليوم', 'Popular Coffee Searches')}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {trendingKeywords.map(kw => (
                  <button
                    key={kw}
                    onClick={() => handleSelectKeyword(kw)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#1C1613] hover:bg-[#8C532B]/30 border border-[#2A221E] hover:border-[#D99B26]/50 text-xs font-medium text-[#E6DFD5] hover:text-[#D99B26] transition cursor-pointer"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[#A69B93] uppercase tracking-wider mb-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#A69B93]" />
                    <span>{t('عمليات البحث الأخيرة', 'Recent Searches')}</span>
                  </div>
                  <button
                    onClick={() => {
                      setRecentSearches([]);
                      localStorage.removeItem('fursan_recent_searches');
                    }}
                    className="text-[10px] text-[#8C532B] hover:underline cursor-pointer"
                  >
                    {t('مسح السجل', 'Clear History')}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map(kw => (
                    <button
                      key={kw}
                      onClick={() => handleSelectKeyword(kw)}
                      className="px-3 py-1 rounded-lg bg-[#110E0C] hover:bg-[#1C1613] border border-[#2A221E] text-xs text-[#A69B93] hover:text-white transition cursor-pointer"
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* Live Search Results */}
        {query.trim() && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#2A221E] pb-3 text-xs text-[#A69B93]">
              <span>
                {t('نتائج البحث عن', 'Search results for')} <strong className="text-[#D99B26]">"{query}"</strong>
              </span>
              <span>{results.length} {t('منتج', 'products found')}</span>
            </div>

            {results.length === 0 && !loading ? (
              <div className="text-center py-16 space-y-3">
                <Coffee className="w-12 h-12 text-[#2A221E] mx-auto" />
                <h3 className="font-bold text-lg text-[#F8F5F0]">
                  {t('لم نجد نتائج مطابقة لبحثك', 'No products matching your search')}
                </h3>
                <p className="text-xs text-[#A69B93] max-w-sm mx-auto">
                  {t('تأكد من كتابة الكلمة بشكل صحيح، أو ابحث باسم البلد مثل إثيوبيا أو أدوات تحضير القهوة.', 'Check spelling or try searching by origin like Ethiopia or V60.')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {results.map(prod => (
                  <div
                    key={prod.id}
                    onClick={() => {
                      saveRecentSearch(query);
                      onNavigate(`/products/${prod.slug}`);
                      onClose();
                    }}
                    className="group p-3 rounded-2xl bg-[#1C1613]/80 hover:bg-[#1C1613] border border-[#2A221E] hover:border-[#D99B26]/50 transition cursor-pointer flex gap-3.5 items-center"
                  >
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#110E0C] relative flex-shrink-0">
                      <img
                        src={prod.images[0]}
                        alt={prod.name_ar}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-[10px] bg-[#8C532B]/30 text-[#D99B26] font-bold px-2 py-0.5 rounded">
                          {prod.origin_country_ar}
                        </span>
                        <span className="text-[10px] text-[#A69B93]">
                          {prod.process_ar}
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-[#F8F5F0] group-hover:text-[#D99B26] transition truncate">
                        {language === 'ar' ? prod.name_ar : prod.name_en}
                      </h4>

                      <div className="flex items-center justify-between mt-2">
                        <span className="font-extrabold text-sm text-[#D99B26]">
                          {formatPrice(prod.sale_price ?? prod.price)}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(prod, prod.weight_options[0]?.value || '250g', prod.grind_options[0] || 'beans', 1);
                          }}
                          className="p-1.5 rounded-lg bg-[#8C532B] hover:bg-[#A86434] text-white transition cursor-pointer"
                          title={t('أضف للسلة', 'Add to Cart')}
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};

export default SearchOverlay;
