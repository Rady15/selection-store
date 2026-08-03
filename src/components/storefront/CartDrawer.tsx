import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { grindLabels } from '../../utils/coffee';
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Truck,
  ArrowLeft,
  ArrowRight,
  Gift,
  Check,
  Tag
} from 'lucide-react';

interface CartDrawerProps {
  onNavigate: (path: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onNavigate }) => {
  const { language, t } = useLanguage();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const {
    items,
    updateQuantity,
    removeFromCart,
    isCartOpen,
    closeCart,
    subtotal,
    discountAmount,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    freeShippingThreshold,
    amountNeededForFreeShipping,
    isFreeShippingEligible,
    loyaltyPointsToRedeem,
    setLoyaltyPointsToRedeem,
    loyaltyDiscountSAR,
    taxAmount,
    totalAmount
  } = useCart();

  const [couponCode, setCouponCode] = useState('');
  const [couponMessage, setCouponMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [animState, setAnimState] = useState<'enter' | 'idle' | 'exit' | null>(null);

  useEffect(() => {
    if (isCartOpen) {
      setAnimState('enter');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimState('idle'));
      });
    } else if (animState === 'idle') {
      setAnimState('exit');
      setTimeout(() => setAnimState(null), 300);
    }
  }, [isCartOpen]);

  const handleClose = useCallback(() => {
    setAnimState('exit');
    setTimeout(() => {
      closeCart();
      setAnimState(null);
    }, 300);
  }, [closeCart]);

  if (animState === null) return null;

  const freeShippingProgressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    const res = await applyCoupon(couponCode.trim());
    setCouponMessage({ success: res.success, text: res.message });
    if (res.success) setCouponCode('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm transition-all duration-300 ${animState === 'exit' ? 'opacity-0' : 'opacity-100'
          }`}
        onClick={handleClose}
      />

      {/* Drawer */}
      <div
        className={`relative w-full max-w-md bg-[#110E0C] text-[#F8F5F0] h-full shadow-2xl flex flex-col z-50 border-l border-[#2A221E] transition-all duration-300 ease-out ${animState === 'idle' ? 'translate-x-0' : 'translate-x-full'
          }`}
      >

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#2A221E] flex items-center justify-between bg-[#1C1613]">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#D99B26]" />
            <h3 className="font-bold text-base text-[#F8F5F0]">
              {t('سلة التسوق', 'Your Shopping Cart')}
            </h3>
            <span className="text-xs bg-[#8C532B] text-white px-2 py-0.5 rounded-full font-bold">
              {items.reduce((s, i) => s + i.quantity, 0)}
            </span>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-[#A69B93] hover:text-white hover:bg-[#2A221E] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Shipping Goal Bar */}
        <div className={`p-4 border-b border-[#2A221E] ${isFreeShippingEligible ? 'bg-emerald-500/10' : 'bg-[#8C532B]/20'}`}>
          <div className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 mb-3 ${isFreeShippingEligible ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-[#D99B26]/40 bg-[#1C1613]/80'}`}>
            <Truck className={`w-6 h-6 shrink-0 ${isFreeShippingEligible ? 'text-emerald-400' : 'text-[#D99B26]'} animate-pulse`} />
            {isFreeShippingEligible ? (
              <span className="text-sm font-extrabold text-emerald-400 leading-snug">
                {t('مبروك! حصلت على شحن مجاني للطلب 🎉', 'Congratulations! You unlocked FREE shipping! 🎉')}
              </span>
            ) : (
              <span className="text-sm font-extrabold text-white leading-snug">
                {t('أضف', 'Add')}{' '}
                <strong className="text-base text-[#D99B26]">{formatPrice(amountNeededForFreeShipping)}</strong>{' '}
                {t('أخرى فقط للحصول على شحن مجاني 🚚', 'more to get FREE shipping 🚚')}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-[#A69B93] uppercase tracking-wider">
              {t('الهدف', 'Goal')}
            </span>
            <span className={`text-[10px] font-extrabold ${isFreeShippingEligible ? 'text-emerald-400' : 'text-[#D99B26]'}`}>
              {isFreeShippingEligible
                ? t('شحن مجاني ✓', 'FREE ✓')
                : `${formatPrice(freeShippingThreshold)} ${t('لتوصيل مجاني', 'for free delivery')}`}
            </span>
          </div>

          <div className="w-full bg-[#2A221E] h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${isFreeShippingEligible ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-[#8C532B] to-[#D99B26]'}`}
              style={{ width: `${freeShippingProgressPercent}%` }}
            />
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#1C1613] border border-[#2A221E] flex items-center justify-center mx-auto text-[#A69B93]">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-base text-[#F8F5F0]">
                {t('سلة التسوق فارغة حالياً', 'Your cart is empty')}
              </h4>
              <p className="text-xs text-[#A69B93] max-w-xs mx-auto">
                {t('استكشف محاصيل القهوة العالية التقييم وأدوات التقطير وأضف ما يعجبك.', 'Explore our specialty coffee crops and gear to start shopping.')}
              </p>
              <button
                onClick={() => {
                  onNavigate('/products');
                  closeCart();
                }}
                className="bg-[#8C532B] hover:bg-[#A86434] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow cursor-pointer inline-flex items-center gap-2"
              >
                <span>{t('تصفح المحاصيل الآن', 'Shop Crops Now')}</span>
                {language === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            items.map(item => (
              <div
                key={item.id}
                className="p-3 rounded-2xl bg-[#1C1613] border border-[#2A221E] flex gap-3 relative group"
              >
                {/* Image */}
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#110E0C] flex-shrink-0">
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name_ar}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="font-bold text-xs sm:text-sm text-[#F8F5F0] truncate">
                      {language === 'ar' ? item.product.name_ar : item.product.name_en}
                    </h5>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-[#A69B93] hover:text-red-400 p-1 transition cursor-pointer"
                      title={t('حذف', 'Remove')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-[10px] text-[#A69B93] mt-0.5 flex gap-2">
                    <span>{item.weight}</span>
                    <span>·</span>
                    <span>{grindLabels[item.grind]?.[language === 'ar' ? 'ar' : 'en'] || item.grind}</span>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center border border-[#2A221E] rounded-lg overflow-hidden bg-[#110E0C]">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-2 py-1 text-[#A69B93] hover:text-white hover:bg-[#2A221E] transition cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-3 py-1 text-xs font-bold text-white min-w-[24px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-2 py-1 text-[#A69B93] hover:text-white hover:bg-[#2A221E] transition cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-[#D99B26]">
                      {formatPrice(item.total_price)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Coupon & Summary Footer */}
        {items.length > 0 && (
          <div className="border-t border-[#2A221E] bg-[#1C1613] p-4 space-y-3">
            {/* Coupon */}
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A69B93]" />
                <input
                  type="text"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value)}
                  placeholder={t('كود الخصم', 'Coupon code')}
                  className="w-full bg-[#110E0C] border border-[#2A221E] rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#D99B26]"
                />
              </div>
              <button
                type="submit"
                className="px-4 bg-[#8C532B] hover:bg-[#A86434] text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {t('تطبيق', 'Apply')}
              </button>
            </form>
            {couponMessage && (
              <p className={`text-[11px] ${couponMessage.success ? 'text-emerald-400' : 'text-red-400'}`}>
                {couponMessage.text}
              </p>
            )}
            {appliedCoupon && (
              <div className="flex items-center justify-between text-xs text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-xl">
                <span>{t('الكوبون مطبق', 'Coupon applied')}: <strong>{appliedCoupon.code}</strong></span>
                <button onClick={removeCoupon} className="text-red-400 hover:underline cursor-pointer text-[10px]">
                  {t('إزالة', 'Remove')}
                </button>
              </div>
            )}

            {/* Loyalty Points */}
            {user && user.loyalty_points > 0 && (
              <div className="flex items-center justify-between text-xs text-[#D99B26] bg-[#D99B26]/10 px-3 py-2 rounded-xl">
                <span className="flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5" />
                  {t('استبدال نقاط الولاء', 'Redeem loyalty points')} ({user.loyalty_points})
                </span>
                <button
                  onClick={() => setLoyaltyPointsToRedeem(loyaltyPointsToRedeem > 0 ? 0 : Math.min(user.loyalty_points, Math.floor(subtotal / 10)))}
                  className={`font-bold transition cursor-pointer ${loyaltyPointsToRedeem > 0 ? 'text-emerald-400' : ''}`}
                >
                  {loyaltyPointsToRedeem > 0 ? t('تم', 'Applied') : t('استبدال', 'Redeem')}
                </button>
              </div>
            )}

            {loyaltyPointsToRedeem > 0 && (
              <div className="text-[11px] text-emerald-400 flex justify-between">
                <span>{t('خصم نقاط الولاء', 'Loyalty discount')}</span>
                <span>-{formatPrice(loyaltyDiscountSAR)}</span>
              </div>
            )}

            {/* Summary */}
            <div className="space-y-1 text-xs text-[#A69B93]">
              <div className="flex justify-between">
                <span>{t('المجموع الفرعي', 'Subtotal')}</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>{t('الخصم', 'Discount')}</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>{t('الشحن', 'Shipping')}</span>
                <span className={isFreeShippingEligible ? 'text-emerald-400 font-bold' : ''}>
                  {isFreeShippingEligible ? t('مجاني', 'Free') : t('تحسب عند الدفع', 'Calculated at checkout')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{t('ضريبة القيمة المضافة (15% VAT)', 'Tax (15% VAT)')}</span>
                <span>{formatPrice(taxAmount)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-[#2A221E]">
              <span className="text-xs text-[#A69B93]">{t('الإجمالي شامل ضريبة القيمة المضافة', 'Total incl. tax')}</span>
              <span className="text-lg font-extrabold text-[#D99B26]">{formatPrice(totalAmount)}</span>
            </div>

            <button
              onClick={() => {
                closeCart();
                onNavigate('/checkout');
              }}
              className="w-full bg-[#8C532B] hover:bg-[#A86434] text-white py-3 rounded-xl text-sm font-bold transition shadow-lg shadow-[#8C532B]/30 cursor-pointer"
            >
              {t('إتمام الطلب', 'Checkout')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
