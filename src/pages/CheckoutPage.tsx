import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { saudiCities, shippingProviders } from '../utils/coffee';
import { PaymentMethod } from '../types';
import { StripePaymentSection } from '../components/checkout/StripePaymentSection';
import {
  CreditCard,
  ShieldCheck,
  Truck,
  MapPin,
  User,
  Phone,
  Mail,
  CheckCircle2,
  Lock,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

interface CheckoutPageProps {
  onNavigate: (path: string) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onNavigate }) => {
  const { language, t } = useLanguage();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const {
    items,
    subtotal,
    discountAmount,
    appliedCoupon,
    loyaltyDiscountSAR,
    loyaltyPointsToRedeem,
    taxAmount,
    totalAmount,
    clearCart
  } = useCart();

  // Form State
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [formData, setFormData] = useState({
    city: 'الرياض',
    district: 'حطين',
    street: 'طريق الملك فهد، مبنى 12',
    building: '',
    postal_code: '',
    delivery_notes: ''
  });
  const [shippingProviderId, setShippingProviderId] = useState('smsa');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mada');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stripeMethods: PaymentMethod[] = ['visa', 'apple_pay'];
  const isStripeMethod = stripeMethods.includes(paymentMethod);

  // Payment step state
  const [pendingOrder, setPendingOrder] = useState<any>(null);
  const [paymentMode, setPaymentMode] = useState<'sandbox' | 'live' | null>(null);
  const [clientSecret, setClientSecret] = useState('');
  const [publishableKey, setPublishableKey] = useState('');
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const selectedShipping = shippingProviders.find(p => p.id === shippingProviderId) || shippingProviders[0];
  const shippingCost = totalAmount >= 199 ? 0 : selectedShipping.priceSAR;
  const codSurcharge = paymentMethod === 'cod' ? 15 : 0;
  const finalPayableTotal = totalAmount + shippingCost + codSurcharge;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setIsSubmitting(true);
    setPaymentError('');

    const orderPayload = {
      user_id: user?.id || undefined,
      customer_name: customerName,
      email,
      phone,
      shipping_address: {
        id: `addr-${Date.now()}`,
        title: 'عنوان الشحن',
        full_name: customerName,
        phone,
        country: 'المملكة العربية السعودية',
        city: formData.city,
        district: formData.district,
        street: formData.street,
        building: formData.building || '',
        postal_code: formData.postal_code || '',
        delivery_notes: formData.delivery_notes || '',
        is_default: false
      },
      items: items.map(i => ({
        product_id: i.product.id,
        product_name_ar: i.product.name_ar,
        product_name_en: i.product.name_en,
        image: i.product.images?.[0] || '',
        weight: i.selected_weight,
        grind: i.selected_grind,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.unit_price * i.quantity,
        sku: i.product.sku || ''
      })),
      subtotal,
      discount_amount: discountAmount,
      loyalty_discount: loyaltyDiscountSAR,
      shipping_cost: shippingCost,
      tax_amount: taxAmount,
      cod_surcharge: codSurcharge,
      total_amount: finalPayableTotal,
      payment_method: paymentMethod,
      shipping_method: selectedShipping.id,
      status: 'pending',
      payment_status: paymentMethod === 'cod' || isStripeMethod ? 'pending' : 'paid',
      customer_notes: '',
      coupon_code: appliedCoupon?.code,
      loyalty_points_used: loyaltyPointsToRedeem
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });
      const data = await res.json();
      setIsSubmitting(false);

      if (!data.id) {
        alert(t('حدث خطأ أثناء معالجة الطلب', 'Failed to place order'));
        return;
      }

      if (isStripeMethod) {
        setPendingOrder(data);
        setPaymentBusy(true);
        try {
          const cfg = await fetch('/api/payments/config').then(r => r.json()).catch(() => ({ mode: 'sandbox', publishable_key: '' }));
          const intent = await fetch('/api/payments/create-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: data.id })
          }).then(r => r.json());
          console.log('[Stripe] /api/payments/config:', cfg);
          console.log('[Stripe] /api/payments/create-intent:', intent);

          if (intent.error_ar || intent.error_en) {
            setPaymentError(intent.error_ar || intent.error_en || 'Payment error');
          } else if (cfg.key_mode_mismatch) {
            setPaymentError(t('توجد مشكلة في مفاتيح Stripe: المفتاح السري والمفتاح العام من وضعين مختلفين (test/live)', 'Stripe key issue: secret and publishable keys are in different modes (test/live)'));
          } else if (cfg.key_account_mismatch) {
            setPaymentError(t('توجد مشكلة في مفاتيح Stripe: المفتاح السري والمفتاح العام من حسابي Stripe مختلفين', 'Stripe key issue: secret and publishable keys belong to different Stripe accounts'));
          } else if ((intent.mode === 'live' || cfg.mode === 'live') && !intent.client_secret) {
            console.error('[Stripe] create-intent returned no clientSecret:', intent);
            setPaymentError(t('لم يستلم الخادم مفتاح دفع صالحاً، أعد المحاولة', 'Server did not return a valid clientSecret, please retry'));
          } else {
            setPaymentMode(intent.mode || cfg.mode || 'sandbox');
            setClientSecret(intent.client_secret || '');
            setPublishableKey(cfg.publishable_key || '');
          }
        } catch (err) {
          console.error('[Stripe] prepare-payment threw:', err);
          setPaymentError(t('تعذر تجهيز عملية الدفع', 'Could not prepare payment'));
        }
        setPaymentBusy(false);
      } else {
        clearCart();
        onNavigate(`/order-confirmation/${data.id}`);
      }
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      alert(t('خطأ بالاتصال بالسيرفر', 'Server error occurred'));
    }
  };

  const handlePaymentSuccess = () => {
    if (!pendingOrder) return;
    clearCart();
    onNavigate(`/order-confirmation/${pendingOrder.id}`);
  };

  const handlePaymentCancel = () => {
    setPendingOrder(null);
    setPaymentMode(null);
    setClientSecret('');
    setPaymentError('');
  };

  const handleSandboxPay = async () => {
    if (!pendingOrder) return;
    setPaymentBusy(true);
    setPaymentError('');
    try {
      const res = await fetch('/api/payments/sandbox-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: pendingOrder.id })
      });
      const data = await res.json();
      if (data.success) {
        handlePaymentSuccess();
      } else {
        setPaymentError(data.error_ar || data.error_en || t('فشل إتمام الدفع', 'Payment failed'));
        setPaymentBusy(false);
      }
    } catch (err) {
      console.error(err);
      setPaymentError(t('خطأ بالاتصال بالسيرفر', 'Server error occurred'));
      setPaymentBusy(false);
    }
  };

  return (
    <div className="bg-[#110E0C] text-[#F8F5F0] min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Title Bar */}
        <div className="border-b border-[#2A221E] pb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-serif">
              {t('إتمام الشراء والدفع الآمن', 'Checkout')}
            </h1>
            <p className="text-xs text-[#A69B93] mt-0.5">
              {t('أدخل عنوان التوصيل واختر طريقة الدفع المفضلة لتأكيد الشحنة', 'Enter shipping address and select payment method')}
            </p>
          </div>

          <button
            onClick={() => onNavigate('/cart')}
            className="text-xs font-bold text-[#D99B26] hover:underline cursor-pointer"
          >
            ← {t('العودة للسلة', 'Back to Cart')}
          </button>
        </div>

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Form Area */}
          <div className="lg:col-span-2 space-y-6">

            {/* Step 1: Contact Details */}
            <div className="p-6 rounded-3xl bg-[#1C1613] border border-[#2A221E] space-y-4">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2 border-b border-[#2A221E] pb-3">
                <User className="w-5 h-5 text-[#D99B26]" />
                <span>{t('1. معلومات العميل والاتصال', '1. Contact Details')}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('الاسم الكامل', 'Full Name')}</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="عبدالرحمن العتيبي"
                    className="w-full bg-[#110E0C] border border-[#2A221E] rounded-xl p-3 text-white focus:outline-none focus:border-[#D99B26]"
                  />
                </div>

                <div>
                  <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('رقم الجوال (لإشعارات الشحنة والـ SMS)', 'Phone Number')}</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+966 50 123 4567"
                    className="w-full bg-[#110E0C] border border-[#2A221E] rounded-xl p-3 text-white focus:outline-none focus:border-[#D99B26]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('البريد الإلكتروني (لإرسال الفاتورة الضريبية)', 'Email Address')}</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-[#110E0C] border border-[#2A221E] rounded-xl p-3 text-white focus:outline-none focus:border-[#D99B26]"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Shipping Address & City */}
            <div className="p-6 rounded-3xl bg-[#1C1613] border border-[#2A221E] space-y-4">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2 border-b border-[#2A221E] pb-3">
                <MapPin className="w-5 h-5 text-[#D99B26]" />
                <span>{t('2. عنوان التوصيل بالمملكة', '2. Shipping Address in KSA')}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('المدينة', 'City')}</label>
                  <select
                    value={formData.city}
                    onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full bg-[#110E0C] border border-[#2A221E] rounded-xl p-3 text-white focus:outline-none focus:border-[#D99B26] cursor-pointer"
                  >
                    {saudiCities.map(c => (
                      <option key={c.id} value={c.name_ar}>
                        {language === 'ar' ? c.name_ar : c.name_en}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('الحي', 'District')}</label>
                  <input
                    type="text"
                    required
                    value={formData.district}
                    onChange={e => setFormData(prev => ({ ...prev, district: e.target.value }))}
                    placeholder="حي حطين / النرجس / الملقا"
                    className="w-full bg-[#110E0C] border border-[#2A221E] rounded-xl p-3 text-white focus:outline-none focus:border-[#D99B26]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('تفاصيل الشارع', 'Street Address')}</label>
                  <input
                    type="text"
                    required
                    value={formData.street}
                    onChange={e => setFormData(prev => ({ ...prev, street: e.target.value }))}
                    placeholder="طريق الملك فهد"
                    className="w-full bg-[#110E0C] border border-[#2A221E] rounded-xl p-3 text-white focus:outline-none focus:border-[#D99B26]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                  <div>
                    <label className="block text-[10px] text-[#A69B93] mb-1">{t('المبنى/الفيلا', 'Building')}</label>
                    <input type="text" value={formData.building} onChange={e => setFormData(prev => ({ ...prev, building: e.target.value }))}
                      className="w-full bg-[#110E0C] border border-[#2A221E] rounded-xl px-3 py-2.5 text-xs text-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#A69B93] mb-1">{t('الرمز البريدي', 'Postal Code')}</label>
                    <input type="text" value={formData.postal_code} onChange={e => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                      className="w-full bg-[#110E0C] border border-[#2A221E] rounded-xl px-3 py-2.5 text-xs text-white" />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] text-[#A69B93] mb-1">{t('ملاحظات التوصيل', 'Delivery Notes')}</label>
                  <input type="text" value={formData.delivery_notes} onChange={e => setFormData(prev => ({ ...prev, delivery_notes: e.target.value }))}
                    placeholder={t('مثال: الباب الأزرق على اليمين', 'e.g. Blue door on the right')}
                    className="w-full bg-[#110E0C] border border-[#2A221E] rounded-xl px-3 py-2.5 text-xs text-white" />
                </div>
              </div>
            </div>

            {/* Step 3: Shipping Provider */}
            <div className="p-6 rounded-3xl bg-[#1C1613] border border-[#2A221E] space-y-4">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2 border-b border-[#2A221E] pb-3">
                <Truck className="w-5 h-5 text-[#D99B26]" />
                <span>{t('3. شركات الشحن والتوصيل', '3. Courier & Express Delivery')}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {shippingProviders.map(provider => {
                  const selected = shippingProviderId === provider.id;
                  const isFree = totalAmount >= 199;
                  return (
                    <div
                      key={provider.id}
                      onClick={() => setShippingProviderId(provider.id)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${selected
                          ? 'bg-[#8C532B]/20 border-[#D99B26]'
                          : 'bg-[#110E0C] border-[#2A221E] hover:border-[#8C532B]'
                        }`}
                    >
                      <div className="space-y-1">
                        <span className="font-bold text-xs text-white block">
                          {language === 'ar' ? provider.name_ar : provider.name_en}
                          {provider.id === 'smsa' && (
                            <span className="mr-1.5 inline-block text-[9px] bg-[#D99B26]/20 text-[#D99B26] px-1.5 py-0.5 rounded font-extrabold align-middle">
                              {t('مُوصى به', 'RECOMMENDED')}
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-[#A69B93]">
                          {language === 'ar' ? provider.estimatedDays_ar : provider.estimatedDays_en}
                        </span>
                      </div>

                      <span className="font-extrabold text-xs text-[#D99B26]">
                        {isFree ? t('مجاناً', 'FREE') : formatPrice(provider.priceSAR)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 4: Payment Method */}
            <div className="p-6 rounded-3xl bg-[#1C1613] border border-[#2A221E] space-y-4">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2 border-b border-[#2A221E] pb-3">
                <CreditCard className="w-5 h-5 text-[#D99B26]" />
                <span>{t('4. طريقة الدفع', '4. Payment Option')}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: 'mada', label_ar: 'بطاقة مدى MADA', label_en: 'Mada Debit Card', badge: 'مدى', img: 'https://upload.wikimedia.org/wikipedia/commons/f/fb/Mada_Logo.svg' },
                  { id: 'apple_pay', label_ar: 'Apple Pay (عبر Stripe)', label_en: 'Apple Pay (via Stripe)', badge: ' Pay', img: 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg' },
                  { id: 'tabby', label_ar: 'تابي (تقسيط 4 دفعات)', label_en: 'Tabby 4 Installments', badge: 'tabby', img: 'https://raw.githubusercontent.com/activemerchant/payment_icons/master/app/assets/images/payment_icons/tabby.svg' },
                  { id: 'tamara', label_ar: 'تمارا (تقسيط 4 دفعات)', label_en: 'Tamara 4 Installments', badge: 'tamara', img: 'https://cdn.tamara.co/assets/png/tamara-logo-badge-en.png' },
                  { id: 'visa', label_ar: 'فيزا / ماستركارد (عبر Stripe)', label_en: 'Visa / Mastercard (via Stripe)', badge: 'VISA', img: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Visa_Inc._logo_%282021%E2%80%93present%29.svg' },
                  { id: 'cod', label_ar: 'الدفع عند الاستلام (+15 ﷼)', label_en: 'Cash on Delivery', badge: 'COD', img: '' }
                ].map(p => {
                  const selected = paymentMethod === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setPaymentMethod(p.id as PaymentMethod)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${selected
                          ? 'bg-[#8C532B]/20 border-[#D99B26]'
                          : 'bg-[#110E0C] border-[#2A221E] hover:border-[#8C532B]'
                        }`}
                    >
                      <span className="font-bold text-xs text-white">
                        {language === 'ar' ? p.label_ar : p.label_en}
                      </span>
                      {p.img ? (
                        <img
                          src={p.img}
                          alt={p.badge}
                          className="h-5 w-auto"
                          onError={e => {
                            const t = e.currentTarget;
                            const s = document.createElement('span');
                            s.className = 'text-[10px] font-extrabold bg-[#2A221E] px-2 py-0.5 rounded text-[#D99B26]';
                            s.textContent = p.badge;
                            t.parentNode?.replaceChild(s, t);
                          }}
                        />
                      ) : (
                        <span className="text-[10px] font-extrabold bg-[#2A221E] px-2 py-0.5 rounded text-[#D99B26]">
                          {p.badge}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Checkout Order Review Sidebar */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-[#1C1613] border border-[#2A221E] space-y-5 sticky top-28 shadow-2xl">
              <h3 className="font-extrabold text-base text-white border-b border-[#2A221E] pb-3">
                {t('تفاصيل الفاتورة النهائية', 'Final Invoice Summary')}
              </h3>

              {/* Items Summary list */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between text-xs text-[#D4C3B5]">
                    <span className="truncate max-w-[180px]">
                      {item.quantity}x {language === 'ar' ? item.product.name_ar : item.product.name_en} ({item.selected_weight})
                    </span>
                    <span className="font-bold text-white">{formatPrice(item.unit_price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Math breakdown */}
              <div className="space-y-2 text-xs text-[#D4C3B5] pt-3 border-t border-[#2A221E]">
                <div className="flex justify-between">
                  <span>{t('المجموع الفرعي', 'Subtotal')}:</span>
                  <span className="font-bold text-white">{formatPrice(subtotal)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>{t('الخصم', 'Discount')}:</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>{t('تكلفة الشحن والتوصيل', 'Shipping Fee')}:</span>
                  <span className="font-bold text-white">{shippingCost === 0 ? t('مجاناً', 'FREE') : formatPrice(shippingCost)}</span>
                </div>

                <div className="flex justify-between text-[11px] text-[#A69B93]">
                  <span>{t('ضريبة القيمة المضافة (15%)', 'Includes 15% VAT')}:</span>
                  <span>{formatPrice(taxAmount)}</span>
                </div>

                {codSurcharge > 0 && (
                  <div className="flex justify-between text-[11px] text-[#D99B26]">
                    <span>{t('رسوم الدفع عند الاستلام', 'COD Surcharge')}:</span>
                    <span>+{formatPrice(codSurcharge)}</span>
                  </div>
                )}

                <div className="flex justify-between text-white font-extrabold text-xl pt-3 border-t border-[#2A221E]">
                  <span>{t('الإجمالي المطلوب دَفعه', 'Payable Amount')}:</span>
                  <span className="text-[#D99B26]">{formatPrice(finalPayableTotal)}</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#8C532B] hover:bg-[#A86434] text-white py-4 rounded-2xl text-xs sm:text-sm font-extrabold transition shadow-2xl shadow-[#8C532B]/40 cursor-pointer flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>{isSubmitting ? t('جاري تأكيد الشراء...', 'Processing Order...') : t('تأكيد الطلب والدفع الآن', 'Place & Confirm Order')}</span>
              </button>

              <div className="text-[10px] text-[#A69B93] text-center space-y-1">
                <p className="flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('دفع آمن ومضمون بمعايير PCI-DSS العالمية', 'PCI-DSS Compliant Secure Payment')}</span>
                </p>
                <p>{t('سجل تجاري رقم: 1010892341 - ضريبة: 310928374800003', 'CR: 1010892341 | VAT: 310928374800003')}</p>
              </div>

            </div>
          </div>

        </form>

        {/* Payment Modal */}
        {pendingOrder && isStripeMethod && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-md rounded-3xl bg-[#1C1613] border border-[#2A221E] p-6 shadow-2xl">
              <h3 className="font-extrabold text-white text-base mb-1 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#D99B26]" />
                <span>{t('إتمام الدفع الآمن', 'Complete Secure Payment')}</span>
              </h3>
              <p className="text-xs text-[#D4C3B5] mb-5">
                {t('الطلب رقم', 'Order')} <span className="text-white font-bold">{pendingOrder.order_number}</span>
                {' · '}{t('المبلغ', 'Amount')}: <span className="text-[#D99B26] font-extrabold">{formatPrice(finalPayableTotal)}</span>
              </p>

              {paymentBusy ? (
                <div className="py-10 text-center text-xs text-[#A69B93]">
                  {t('جاري تجهيز نموذج الدفع...', 'Preparing payment form...')}
                </div>
              ) : paymentError ? (
                <div className="space-y-4">
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">{paymentError}</p>
                  <button
                    onClick={() => { setPaymentError(''); setPaymentMode(null); setClientSecret(''); }}
                    className="w-full bg-[#8C532B] hover:bg-[#A86434] text-white py-3 rounded-2xl text-xs font-extrabold transition cursor-pointer"
                  >
                    {t('إعادة المحاولة', 'Retry')}
                  </button>
                  <button
                    onClick={handlePaymentCancel}
                    className="w-full text-[#A69B93] hover:text-white py-2 rounded-2xl text-xs font-bold transition cursor-pointer"
                  >
                    {t('إلغاء وإبقاء الطلب قيد الانتظار', 'Cancel (order stays pending)')}
                  </button>
                </div>
              ) : paymentMode === 'live' ? (
                <StripePaymentSection
                  publishableKey={publishableKey}
                  clientSecret={clientSecret}
                  orderId={pendingOrder.id}
                  customerName={customerName}
                  email={email}
                  phone={phone}
                  onSuccess={handlePaymentSuccess}
                  onCancel={handlePaymentCancel}
                />
              ) : paymentMode === 'sandbox' ? (
                <div className="space-y-4">
                  <div className="bg-[#110E0C] border border-[#2A221E] rounded-2xl p-4 text-xs text-[#D4C3B5] space-y-2">
                    <p className="font-bold text-[#D99B26]">{t('وضع تجريبي (Sandbox)', 'Sandbox mode')}</p>
                    <p>
                      {t(
                        'لم يتم إضافة مفاتيح Stripe بعد. هذا الزر يحاكي عملية دفع ناجحة للتجربة فقط، وتُفعَّل الدفعات الحقيقية تلقائياً عند إدخال المفاتيح في ملف .env.',
                        'Stripe keys are not set yet. This button simulates a successful payment for testing; real payments activate automatically once keys are added in .env.'
                      )}
                    </p>
                  </div>
                  <button
                    onClick={handleSandboxPay}
                    disabled={paymentBusy}
                    className="w-full bg-[#8C532B] hover:bg-[#A86434] disabled:opacity-50 text-white py-3.5 rounded-2xl text-xs sm:text-sm font-extrabold transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{paymentBusy ? t('جاري التأكيد...', 'Confirming...') : t('إتمام الدفع (محاكاة)', 'Complete Payment (Simulated)')}</span>
                  </button>
                  <button
                    onClick={handlePaymentCancel}
                    className="w-full text-[#A69B93] hover:text-white py-2 rounded-2xl text-xs font-bold transition cursor-pointer"
                  >
                    {t('إلغاء', 'Cancel')}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CheckoutPage;
