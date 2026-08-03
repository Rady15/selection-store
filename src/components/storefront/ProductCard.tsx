import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { Product, GrindType } from '../../types';
import { grindLabels } from '../../utils/coffee';
import {
  Heart,
  ShoppingBag,
  Star,
  Eye,
  Check,
  ChevronDown
} from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onNavigate: (path: string) => void;
  onQuickView?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onNavigate, onQuickView }) => {
  const { language, t } = useLanguage();
  const { formatPrice } = useCurrency();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { user } = useAuth();
  const { openAuth } = useUI();

  const [selectedGrind, setSelectedGrind] = useState<GrindType>(product.grind_options?.[0] || 'beans');
  const [selectedWeight, setSelectedWeight] = useState<string>(product.weight_options?.[0]?.value || '250g');
  const [showGrindPopover, setShowGrindPopover] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);

  const isLiked = isInWishlist(product.id);
  const currentPrice = product.sale_price ?? product.price;
  const hasDiscount = product.sale_price && product.sale_price < product.price;
  const discountPercent = hasDiscount ? Math.round(((product.price - product.sale_price!) / product.price) * 100) : 0;

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      openAuth({
        message: t('سجّل الدخول أو أنشئ حساباً لحفظ المنتجات في قائمة المفضلة', 'Login or create an account to save products to your wishlist'),
        onSuccess: () => toggleWishlist(product.id)
      });
      return;
    }
    toggleWishlist(product.id);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, selectedWeight, selectedGrind, 1);
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 1800);
  };

  return (
    <div
      onClick={() => onNavigate(`/products/${product.slug}`)}
      className="group relative bg-[#1C1613] border border-[#2A221E] hover:border-[#D99B26]/60 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition duration-300 flex flex-col cursor-pointer"
    >
      {/* Top Image Box */}
      <div className="relative aspect-square bg-[#110E0C] overflow-hidden">
        {/* Primary Image */}
        <img
          src={product.images[0]}
          alt={product.name_ar}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Secondary Image on Hover if available */}
        {product.images[1] && (
          <img
            src={product.images[1]}
            alt={product.name_ar}
            className="w-full h-full object-cover absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          />
        )}

        {/* Overlay Dark Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#110E0C]/80 via-transparent to-transparent opacity-60" />

        {/* Top Right Badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10 items-end">
          {product.is_new && (
            <span className="bg-[#8C532B] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow uppercase">
              {t('جديد', 'NEW')}
            </span>
          )}
          {product.is_bestseller && (
            <span className="bg-[#D99B26] text-black text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow uppercase">
              {t('الأكثر مبيعاً', 'BESTSELLER')}
            </span>
          )}
          {hasDiscount && (
            <span className="bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow">
              -{discountPercent}%
            </span>
          )}
        </div>

        {/* Top Left Wishlist Button */}
        <button
          onClick={handleWishlistClick}
          className={`absolute top-3 left-3 p-2 rounded-full backdrop-blur-md transition z-10 cursor-pointer ${isLiked
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/40'
              : 'bg-[#110E0C]/60 text-[#D4C3B5] hover:text-white hover:bg-[#8C532B]'
            }`}
          title={t('إضافة للمفضلة', 'Wishlist')}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
        </button>

        {/* Quick View Button on Image Hover */}
        {onQuickView && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickView(product);
            }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#110E0C]/90 hover:bg-[#8C532B] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition opacity-0 group-hover:opacity-100 shadow-xl flex items-center gap-1.5 z-10 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{t('نظرة سريعة', 'Quick View')}</span>
          </button>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">

        <div>
          {/* Origin & Process Pill Bar */}
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className="text-[10px] font-bold bg-[#8C532B]/20 text-[#D99B26] px-2 py-0.5 rounded">
              {language === 'ar' ? product.origin_country_ar : product.origin_country_en}
            </span>
            <span className="text-[10px] text-[#A69B93]">
              • {language === 'ar' ? product.process_ar : product.process_en}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-bold text-sm sm:text-base text-[#F8F5F0] group-hover:text-[#D99B26] transition line-clamp-1">
            {language === 'ar' ? product.name_ar : product.name_en}
          </h3>

          {/* Tasting Notes Pills */}
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {(language === 'ar' ? product.tasting_notes_ar : product.tasting_notes_en).slice(0, 3).map((note, idx) => (
              <span
                key={idx}
                className="text-[10px] bg-[#110E0C] text-[#D4C3B5] px-2 py-0.5 rounded border border-[#2A221E]"
              >
                {note}
              </span>
            ))}
          </div>
        </div>

        {/* Price & Add to Cart Action */}
        <div className="pt-2 border-t border-[#2A221E] space-y-2">

          {/* Rating & Stock */}
          <div className="flex items-center justify-between text-xs text-[#A69B93]">
            <div className="flex items-center gap-1 text-[#D99B26] font-bold">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>{product.rating}</span>
              <span className="text-[10px] text-[#A69B93]">({product.review_count})</span>
            </div>

            {product.stock <= 5 ? (
              <span className="text-[10px] text-amber-400 font-bold animate-pulse">
                {t('متبقي كمية محدودة!', 'Low stock!')}
              </span>
            ) : (
              <span className="text-[10px] text-emerald-400">
                {t('متوفر طازج', 'Fresh In Stock')}
              </span>
            )}
          </div>

          {/* Price & Button Bar */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="font-extrabold text-base sm:text-lg text-[#D99B26]">
                {formatPrice(currentPrice)}
              </div>
              {hasDiscount && (
                <div className="text-[11px] text-[#A69B93] line-through">
                  {formatPrice(product.price)}
                </div>
              )}
            </div>

            {/* Grind Popover Toggle & Quick Add */}
            <div className="relative">
              <button
                onClick={handleAddToCart}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg cursor-pointer ${addedSuccess
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#8C532B] hover:bg-[#A86434] text-white shadow-[#8C532B]/30'
                  }`}
              >
                {addedSuccess ? (
                  <>
                    <Check className="w-4 h-4 animate-bounce" />
                    <span className="hidden sm:inline">{t('تمت الإضافة!', 'Added!')}</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>{t('إضافة للسلة', 'Add')}</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default ProductCard;
