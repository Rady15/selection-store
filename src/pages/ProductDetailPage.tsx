import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { Product, GrindType } from '../types';
import { grindLabels } from '../utils/coffee';
import FlavorChart from '../components/storefront/FlavorChart';
import ReviewsSection from '../components/storefront/ReviewsSection';
import QuestionsSection from '../components/storefront/QuestionsSection';
import StockAlertModal from '../components/storefront/StockAlertModal';
import ProductGrid from '../components/storefront/ProductGrid';
import {
  Heart,
  ShoppingBag,
  Share2,
  Star,
  Truck,
  ShieldCheck,
  RotateCcw,
  Plus,
  Minus,
  Check,
  BellRing,
  Coffee,
  Award,
  ChevronRight,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

interface ProductDetailPageProps {
  slug: string;
  onNavigate: (path: string) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ slug, onNavigate }) => {
  const { language, t } = useLanguage();
  const { formatPrice } = useCurrency();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Configuration States
  const [selectedWeight, setSelectedWeight] = useState<string>('250g');
  const [selectedGrind, setSelectedGrind] = useState<GrindType>('beans');
  const [quantity, setQuantity] = useState(1);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews' | 'questions'>('details');
  const [showStockAlertModal, setShowStockAlertModal] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/products/${slug}`)
      .then(res => res.json())
      .then(data => {
        setProduct(data);
        if (data.weight_options?.[0]) setSelectedWeight(data.weight_options[0].value);
        if (data.grind_options?.[0]) setSelectedGrind(data.grind_options[0]);

        // Fetch category slug from categories list, then fetch related products
        fetch('/api/categories')
          .then(r => r.json())
          .then((cats: any[]) => {
            const cat = cats.find((c: any) => c.id === data.category_id);
            const slug = cat?.slug || data.category_slug;
            if (slug) {
              return fetch(`/api/products?category_slug=${slug}`);
            }
            return fetch('/api/products');
          })
          .then(r => r.json())
          .then(list => setRelatedProducts(list.filter((p: Product) => p.id !== data.id).slice(0, 4)));

        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="bg-[#110E0C] text-white min-h-screen py-20 flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-[#8C532B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="bg-[#110E0C] text-white min-h-screen py-20 text-center space-y-4">
        <Coffee className="w-16 h-16 text-[#8C532B] mx-auto" />
        <h2 className="text-2xl font-bold">{t('المنتج غير موجود', 'Product Not Found')}</h2>
        <button
          onClick={() => onNavigate('/products')}
          className="bg-[#8C532B] text-white px-6 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
        >
          {t('العودة للمتجر', 'Return to Store')}
        </button>
      </div>
    );
  }

  const isLiked = isInWishlist(product.id);
  const weightOpt = product.weight_options?.find(w => w.value === selectedWeight) || product.weight_options?.[0];
  const unitPrice = (product.sale_price ?? product.price) + (weightOpt ? weightOpt.priceModifier : 0);
  const isOutOfStock = product.stock <= 0;

  const handleAddToCart = () => {
    addToCart(product, selectedWeight, selectedGrind, quantity);
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 2000);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="bg-[#110E0C] text-[#F8F5F0] min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-[#A69B93]">
          <button onClick={() => onNavigate('/')} className="hover:text-white cursor-pointer">{t('الرئيسية', 'Home')}</button>
          <span>/</span>
          <button onClick={() => onNavigate('/products')} className="hover:text-white cursor-pointer">{t('المتجر', 'Store')}</button>
          <span>/</span>
          <span className="text-[#D99B26] font-bold">{language === 'ar' ? product.name_ar : product.name_en}</span>
        </div>

        {/* Main Product Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* Gallery Column */}
          <div className="space-y-4">
            <div className="aspect-square rounded-3xl bg-[#1C1613] border border-[#2A221E] overflow-hidden relative shadow-2xl">
              <img
                src={product.images[activeImageIdx] || product.images[0]}
                alt={product.name_ar}
                className="w-full h-full object-cover"
              />

              {/* Wishlist & Share buttons */}
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className={`p-3 rounded-full backdrop-blur-md transition cursor-pointer ${isLiked ? 'bg-red-500 text-white shadow-lg' : 'bg-[#110E0C]/70 text-[#D4C3B5] hover:text-white'
                    }`}
                >
                  <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                </button>

                <button
                  onClick={handleShare}
                  className="p-3 rounded-full bg-[#110E0C]/70 backdrop-blur-md text-[#D4C3B5] hover:text-white transition cursor-pointer"
                  title={t('مشاركة الرابط', 'Share Link')}
                >
                  {copiedLink ? <Check className="w-5 h-5 text-emerald-400" /> : <Share2 className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`w-20 h-20 rounded-2xl overflow-hidden border-2 flex-shrink-0 transition cursor-pointer ${activeImageIdx === idx ? 'border-[#D99B26]' : 'border-[#2A221E] opacity-60'
                      }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Coffee Origin Badge Card */}
            <div className="p-4 rounded-2xl bg-[#1C1613] border border-[#2A221E] grid grid-cols-3 gap-3 text-center text-xs">
              <div>
                <span className="text-[#A69B93] block text-[10px]">{t('الارتفاع', 'Altitude')}</span>
                <span className="font-bold text-white">{product.altitude || '1800 - 2200m'}</span>
              </div>
              <div className="border-x border-[#2A221E]">
                <span className="text-[#A69B93] block text-[10px]">{t('السلالة', 'Variety')}</span>
                <span className="font-bold text-white">{product.variety || 'بوربون / أورثدكس'}</span>
              </div>
              <div>
                <span className="text-[#A69B93] block text-[10px]">{t('التقييم', 'SCA Score')}</span>
                <span className="font-extrabold text-[#D99B26]">87.5/100</span>
              </div>
            </div>
          </div>

          {/* Product Info & Actions Column */}
          <div className="space-y-6">

            {/* Origin & Process Pills */}
            <div className="flex items-center gap-2">
              <span className="text-xs bg-[#8C532B] text-white px-3 py-1 rounded-md font-extrabold uppercase">
                {language === 'ar' ? product.origin_country_ar : product.origin_country_en}
              </span>
              <span className="text-xs text-[#D4C3B5] font-semibold">
                • {language === 'ar' ? product.process_ar : product.process_en}
              </span>
            </div>

            {/* Name & Subtitle */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-serif">
                {language === 'ar' ? product.name_ar : product.name_en}
              </h1>
              <p className="text-xs sm:text-sm text-[#A69B93]">
                {language === 'ar' ? product.subtitle_ar : product.subtitle_en}
              </p>
            </div>

            {/* Price & Rating */}
            <div className="flex items-center justify-between pb-4 border-b border-[#2A221E]">
              <div className="flex items-baseline gap-3">
                <span className="font-extrabold text-3xl text-[#D99B26]">
                  {formatPrice(unitPrice * quantity)}
                </span>
                {product.sale_price && (
                  <span className="text-sm text-[#A69B93] line-through">
                    {formatPrice(product.price * quantity)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-[#D99B26] font-bold">
                <Star className="w-4 h-4 fill-current" />
                <span>{product.rating}</span>
                <span className="text-[#A69B93]">({product.review_count} {t('تقييم', 'reviews')})</span>
              </div>
            </div>

            {/* Tasting Notes */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#A69B93] uppercase tracking-wider">{t('الإيحاءات العطرية والنكهات', 'Tasting Notes')}:</span>
              <div className="flex flex-wrap gap-2">
                {(language === 'ar' ? product.tasting_notes_ar : product.tasting_notes_en).map((note, idx) => (
                  <span key={idx} className="text-xs bg-[#1C1613] text-[#D99B26] font-bold px-3 py-1.5 rounded-xl border border-[#2A221E]">
                    {note}
                  </span>
                ))}
              </div>
            </div>

            {/* Weight Selection */}
            {product.weight_options.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#A69B93] uppercase tracking-wider">{t('اختر الوزن المطلوب', 'Select Bag Size')}:</span>
                <div className="grid grid-cols-3 gap-2">
                  {product.weight_options.map(w => (
                    <button
                      key={w.value}
                      onClick={() => setSelectedWeight(w.value)}
                      className={`p-3 rounded-2xl text-xs font-bold transition border cursor-pointer ${selectedWeight === w.value
                          ? 'bg-[#8C532B] text-white border-[#D99B26] shadow-lg shadow-[#8C532B]/30'
                          : 'bg-[#1C1613] text-[#D4C3B5] border-[#2A221E] hover:border-[#8C532B]'
                        }`}
                    >
                      {language === 'ar' ? w.label_ar : w.label_en}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Grind Selection */}
            {product.grind_options.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#A69B93] uppercase tracking-wider">{t('درجة الطحن المطلوبة', 'Grind Specification')}:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {product.grind_options.map(g => (
                    <button
                      key={g}
                      onClick={() => setSelectedGrind(g)}
                      className={`p-2.5 rounded-xl text-xs font-medium transition border cursor-pointer ${selectedGrind === g
                          ? 'bg-[#8C532B] text-white border-[#D99B26]'
                          : 'bg-[#1C1613] text-[#D4C3B5] border-[#2A221E] hover:border-[#8C532B]'
                        }`}
                    >
                      {grindLabels[g]?.[language] || g}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity & Add to Cart / Out of Stock Alert */}
            <div className="pt-2 space-y-3">
              {isOutOfStock ? (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs space-y-2">
                  <p className="font-bold">{t('هذا المحصول غير متوفر حالياً (الكمية نفدت)', 'This crop is currently out of stock')}</p>
                  <button
                    onClick={() => setShowStockAlertModal(true)}
                    className="w-full bg-[#8C532B] hover:bg-[#A86434] text-white py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <BellRing className="w-4 h-4" />
                    <span>{t('نبهني فور وصول دفعة جديدة', 'Notify Me On Restock')}</span>
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  {/* Quantity selector */}
                  <div className="flex items-center border border-[#2A221E] rounded-2xl bg-[#1C1613] px-2">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-3 hover:text-[#D99B26] transition cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-3 text-sm font-bold text-white min-w-[32px] text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="p-3 hover:text-[#D99B26] transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Add to Cart button */}
                  <button
                    onClick={handleAddToCart}
                    className={`flex-1 py-4 rounded-2xl text-xs sm:text-sm font-extrabold transition shadow-2xl flex items-center justify-center gap-2 cursor-pointer ${addedSuccess
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#8C532B] hover:bg-[#A86434] text-white shadow-[#8C532B]/40'
                      }`}
                  >
                    {addedSuccess ? (
                      <>
                        <Check className="w-5 h-5 animate-bounce" />
                        <span>{t('تمت الإضافة بنجاح للسلة!', 'Added To Cart!')}</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-5 h-5" />
                        <span>{t('إضافة لسلة التسوق', 'Add To Cart')}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Shipping Trust Indicators */}
            <div className="pt-4 border-t border-[#2A221E] grid grid-cols-2 gap-3 text-xs text-[#A69B93]">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#D99B26]" />
                <span>{t('شحن مجاني للطلبات فوق 199 ﷼', 'Free shipping over 199 SAR')}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#D99B26]" />
                <span>{t('ضمان جودة وطزاجة التحميص 100%', '100% Roast Freshness Guarantee')}</span>
              </div>
            </div>

          </div>

        </div>

        {/* Flavor Profile Chart & Brew Methods Box */}
        {product.flavor_profile && (
          <div className="p-8 rounded-3xl bg-[#1C1613] border border-[#2A221E] grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-extrabold text-lg text-white mb-4 flex items-center gap-2">
                <span>{t('مخطط نكهات الكوب التفصيلي', 'Detailed Cup Profile')}</span>
              </h3>
              <FlavorChart profile={product.flavor_profile} />
            </div>

            <div className="space-y-4">
              <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                <Coffee className="w-5 h-5 text-[#D99B26]" />
                <span>{t('وصفة التحضير الموصى بها', 'Head Roaster Brew Recipe')}</span>
              </h3>

              <div className="p-4 rounded-2xl bg-[#110E0C] border border-[#2A221E] space-y-2 text-xs text-[#D4C3B5]">
                <div className="flex justify-between border-b border-[#2A221E] pb-2">
                  <span>{t('أداة التحضير الموصى بها', 'Method')}:</span>
                  <strong className="text-[#D99B26]">V60 / Kalita Wave</strong>
                </div>
                <div className="flex justify-between border-b border-[#2A221E] pb-2">
                  <span>{t('نسبة القهوة للماء (Ratio)', 'Ratio')}:</span>
                  <strong className="text-white">1:15 (20g coffee to 300ml water)</strong>
                </div>
                <div className="flex justify-between border-b border-[#2A221E] pb-2">
                  <span>{t('درجة حرارة الماء', 'Water Temp')}:</span>
                  <strong className="text-white">91°C - 93°C</strong>
                </div>
                <div className="flex justify-between">
                  <span>{t('وقت الترشيح المستهدف', 'Brew Time')}:</span>
                  <strong className="text-white">2:30 - 2:45 {t('دقيقة', 'mins')}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs for Reviews and Q&A */}
        <div className="space-y-6">
          <div className="flex border-b border-[#2A221E] gap-6 text-sm font-bold">
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-3 transition cursor-pointer border-b-2 ${activeTab === 'details' ? 'border-[#D99B26] text-[#D99B26]' : 'border-transparent text-[#A69B93] hover:text-white'
                }`}
            >
              {t('وصف وتفاصيل المحصول', 'Product Details')}
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-3 transition cursor-pointer border-b-2 ${activeTab === 'reviews' ? 'border-[#D99B26] text-[#D99B26]' : 'border-transparent text-[#A69B93] hover:text-white'
                }`}
            >
              {t('تقييمات العملاء', 'Customer Reviews')} ({product.review_count})
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={`pb-3 transition cursor-pointer border-b-2 ${activeTab === 'questions' ? 'border-[#D99B26] text-[#D99B26]' : 'border-transparent text-[#A69B93] hover:text-white'
                }`}
            >
              {t('الأسئلة والاستفسارات', 'Q&A Questions')}
            </button>
          </div>

          {activeTab === 'details' && (
            <div className="p-6 bg-[#1C1613] border border-[#2A221E] rounded-3xl space-y-4 text-xs sm:text-sm text-[#D4C3B5] leading-relaxed">
              <p>{language === 'ar' ? product.description_ar : product.description_en}</p>
            </div>
          )}

          {activeTab === 'reviews' && (
            <ReviewsSection productId={product.id} />
          )}

          {activeTab === 'questions' && (
            <QuestionsSection productId={product.id} />
          )}
        </div>

        {/* Related Coffee Crops Carousel */}
        {relatedProducts.length > 0 && (
          <div className="space-y-6 pt-6">
            <h2 className="text-2xl font-extrabold text-white font-serif">
              {t('محاصيل أخرى قد تعجبك', 'You May Also Like')}
            </h2>
            <ProductGrid products={relatedProducts} onNavigate={onNavigate} />
          </div>
        )}

      </div>

      {/* Stock Alert Modal */}
      {showStockAlertModal && (
        <StockAlertModal
          product={product}
          onClose={() => setShowStockAlertModal(false)}
        />
      )}
    </div>
  );
};

export default ProductDetailPage;
