import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { grindLabels } from '../utils/coffee';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Truck,
  ArrowLeft,
  ArrowRight,
  Tag,
  Check,
  ShieldCheck
} from 'lucide-react';

interface CartPageProps {
  onNavigate: (path: string) => void;
}

export const CartPage: React.FC<CartPageProps> = ({ onNavigate }) => {
  const { language, t } = useLanguage();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const { openAuth } = useUI();
  const {
    items,
    updateQuantity,
    removeFromCart,
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

  const [couponInput, setCouponInput] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ success: boolean; text: string } | null>(null);

  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    const res = await applyCoupon(couponInput.trim());
    setCouponMsg({ success: res.success, text: res.message });
    if (res.success) setCouponInput('');
  };

  return (
    <div className="bg-[#110E0C] text-[#F8F5F0] min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Page Header */}
        <div className="flex items-center justify-between border-b border-[#2A221E] pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#8C532B]/20 text-[#D99B26]">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-serif">
                {t('سلة التسوق الخاصة بك', 'Shopping Cart')}
              </h1>
              <p className="text-xs text-[#A69B93] mt-0.5">
                {items.length} {t('عناصر مختارة في السلة', 'items selected')}
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('/products')}
            className="text-xs font-bold text-[#D99B26] hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>{t('متابعة التسوق', 'Continue Shopping')}</span>
            {language === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 bg-[#1C1613] border border-[#2A221E] rounded-3xl p-8 space-y-4">
            <ShoppingBag className="w-16 h-16 text-[#A69B93] mx-auto" />
            <h3 className="font-extrabold text-xl text-white">
              {t('سلة التسوق فارغة حالياً', 'Your Cart is Currently Empty')}
            </h3>
            <p className="text-xs text-[#A69B93] max-w-sm mx-auto">
              {t('تصفح قسم القهوة المختصة وأدوات التقطير وأضف ما يناسب ذوقك.', 'Explore single-origin coffee crops and manual brewing equipment to fill your cart.')}
            </p>
            <button
              onClick={() => onNavigate('/products')}
              className="bg-[#8C532B] hover:bg-[#A86434] text-white px-8 py-3 rounded-2xl text-xs font-bold transition cursor-pointer inline-flex items-center gap-2"
            >
              <span>{t('تصفح المحاصيل الآن', 'Shop Crops Now')}</span>
              {language === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Cart Items List */}
            <div className="lg:col-span-2 space-y-4">

              {/* Free Shipping Alert Bar */}
              <div className="p-4 rounded-2xl bg-[#1C1613] border border-[#2A221E] space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-2 text-[#D4C3B5]">
                    <Truck className="w-4 h-4 text-[#D99B26]" />
                    {isFreeShippingEligible ? (
                      <span className="text-emerald-400 font-bold">
                        {t('مبروك! حصلت على شحن مجاني للطلب 🎉', 'You unlocked FREE express shipping!')}
                      </span>
                    ) : (
                      <span>
                        {t('أضف', 'Add')}{' '}
                        <strong className="text-[#D99B26]">{formatPrice(amountNeededForFreeShipping)}</strong>{' '}
                        {t('أخرى للحصول على شحن مجاني!', 'more for FREE shipping!')}
                      </span>
                    )}
                  </div>
                  <span className="text-[#D99B26]">{Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100))}%</span>
                </div>

                <div className="w-full bg-[#110E0C] h-2 rounded-full overflow-hidden border border-[#2A221E]">
                  <div
                    className="bg-gradient-to-r from-[#8C532B] to-[#D99B26] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Items Card List */}
              <div className="space-y-3">
                {items.map(item => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-[#1C1613] border border-[#2A221E] flex flex-col sm:flex-row items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#110E0C] flex-shrink-0 border border-[#2A221E]">
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name_ar}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <h4 className="font-extrabold text-sm sm:text-base text-white truncate">
                          {language === 'ar' ? item.product.name_ar : item.product.name_en}
                        </h4>

                        <div className="flex flex-wrap gap-1.5">
                          <span className="text-[10px] bg-[#2A221E] text-[#D4C3B5] px-2.5 py-0.5 rounded font-bold">
                            {item.selected_weight}
                          </span>
                          <span className="text-[10px] bg-[#8C532B]/30 text-[#D99B26] px-2.5 py-0.5 rounded font-bold">
                            {grindLabels[item.selected_grind]?.[language] || item.selected_grind}
                          </span>
                        </div>

                        <span className="text-xs text-[#A69B93] block">
                          {formatPrice(item.unit_price)} / {t('حبة', 'unit')}
                        </span>
                      </div>
                    </div>

                    {/* Quantity & Total Price Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-[#2A221E]">
                      <div className="flex items-center border border-[#2A221E] rounded-xl bg-[#110E0C]">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-2 hover:text-[#D99B26] transition cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 text-xs font-bold text-white">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-2 hover:text-[#D99B26] transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="font-extrabold text-base text-[#D99B26]">
                        {formatPrice(item.unit_price * item.quantity)}
                      </span>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-[#A69B93] hover:text-red-400 p-1 transition cursor-pointer"
                        title={t('حذف', 'Remove')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                ))}
              </div>

            </div>

            {/* Order Summary & Coupon Box */}
            <div className="space-y-6">

              <div className="p-6 rounded-3xl bg-[#1C1613] border border-[#2A221E] space-y-5 sticky top-28 shadow-2xl">
                <h3 className="font-extrabold text-lg text-white border-b border-[#2A221E] pb-3">
                  {t('ملخص الفاتورة', 'Order Summary')}
                </h3>

                {/* Coupon Code Input */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#A69B93] block">{t('كود الخصم / الكوبون', 'Promo Code')}</label>
                  {appliedCoupon ? (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <Check className="w-4 h-4" />
                        <span>{appliedCoupon.code} (-{appliedCoupon.discount_percentage}%)</span>
                      </div>
                      <button onClick={removeCoupon} className="text-red-400 hover:underline text-[11px] cursor-pointer">
                        {t('إزالة', 'Remove')}
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleCouponSubmit} className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#A69B93]" />
                        <input
                          type="text"
                          value={couponInput}
                          onChange={e => setCouponInput(e.target.value)}
                          placeholder="WELCOME10"
                          className="w-full bg-[#110E0C] border border-[#2A221E] rounded-xl pl-9 pr-3 py-2 text-xs text-white uppercase placeholder-[#A69B93]/50 focus:outline-none focus:border-[#D99B26]"
                        />
                      </div>
                      <button
                        type="submit"
                        className="bg-[#2A221E] hover:bg-[#8C532B] text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        {t('تطبيق', 'Apply')}
                      </button>
                    </form>
                  )}

                  {couponMsg && !appliedCoupon && (
                    <p className={`text-[11px] ${couponMsg.success ? 'text-emerald-400' : 'text-red-400'}`}>
                      {couponMsg.text}
                    </p>
                  )}
                </div>

                {/* Loyalty Points Redeem */}
                {user && user.loyalty_points > 0 && (
                  <div className="p-3 rounded-2xl bg-[#8C532B]/10 border border-[#8C532B]/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div>
                        <span className="font-bold text-white">{t('نقاط الولاء', 'Loyalty Points')}: </span>
                        <span className="text-[#D99B26] font-bold">{user.loyalty_points} {t('نقطة', 'pts')}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setLoyaltyPointsToRedeem(loyaltyPointsToRedeem > 0 ? 0 : Math.min(user.loyalty_points, Math.floor(subtotal * 20)))}
                      className="bg-[#8C532B] hover:bg-[#A86434] text-white px-3 py-1 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      {loyaltyPointsToRedeem > 0 ? t('إلغاء', 'Cancel') : t('استبدال الخصم', 'Redeem')}
                    </button>
                  </div>
                )}

                {/* Numbers Itemization */}
                <div className="space-y-2 text-xs text-[#D4C3B5] pt-2 border-t border-[#2A221E]">
                  <div className="flex justify-between">
                    <span>{t('المجموع الفرعي', 'Subtotal')}:</span>
                    <span className="font-bold text-white">{formatPrice(subtotal)}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span>{t('خصم الكوبون', 'Coupon Discount')}:</span>
                      <span>-{formatPrice(discountAmount)}</span>
                    </div>
                  )}

                  {loyaltyDiscountSAR > 0 && (
                    <div className="flex justify-between text-[#D99B26] font-bold">
                      <span>{t('خصم نقاط الولاء', 'Loyalty Discount')}:</span>
                      <span>-{formatPrice(loyaltyDiscountSAR)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-[11px] text-[#A69B93]">
                    <span>{t('شامل ضريبة القيمة المضافة (15%)', 'Includes 15% VAT')}:</span>
                    <span>{formatPrice(taxAmount)}</span>
                  </div>

                  <div className="flex justify-between text-white font-extrabold text-lg pt-3 border-t border-[#2A221E]">
                    <span>{t('المجموع النهائي', 'Grand Total')}:</span>
                    <span className="text-[#D99B26]">{formatPrice(totalAmount)}</span>
                  </div>
                </div>

                {/* Checkout CTA */}
                <button
                  onClick={() => {
                    if (!user) {
                      openAuth({
                        message: t('سجّل الدخول لإتمام الطلب ومتابعة الشراء', 'Login to proceed to checkout and complete your order')
                      });
                      return;
                    }
                    onNavigate('/checkout');
                  }}
                  className="w-full bg-[#8C532B] hover:bg-[#A86434] text-white py-4 rounded-2xl text-xs sm:text-sm font-extrabold transition shadow-2xl shadow-[#8C532B]/40 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>{t('الانتهاء وإتمام الشراء', 'Proceed to Checkout')}</span>
                  {language === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>

                <p className="text-[10px] text-[#A69B93] text-center flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('دفع آمن ومشفّر 100% مدى، فيزا و Apple Pay', '100% Encrypted & Secure Checkout')}</span>
                </p>

              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default CartPage;
