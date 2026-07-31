import React, { useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useLanguage } from '../../context/LanguageContext';
import { Lock, ShieldCheck, X } from 'lucide-react';

interface StripePaymentSectionProps {
  publishableKey: string;
  clientSecret: string;
  orderId: string;
  customerName: string;
  email: string;
  phone: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const PaymentForm: React.FC<{
  orderId: string;
  customerName: string;
  email: string;
  phone: string;
  onSuccess: () => void;
}> = ({ orderId, customerName, email, phone, onSuccess }) => {
  const { language, t } = useLanguage();
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError('');

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        return_url: `${window.location.origin}/order-confirmation/${orderId}`,
        payment_method_data: {
          billing_details: { name: customerName, email, phone }
        } as any
      }
    });

    if (confirmError) {
      setProcessing(false);
      setError(confirmError.message || t('حدث خطأ أثناء الدفع، حاول مجدداً', 'Payment failed, please try again'));
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <div className="bg-[#110E0C] border border-[#2A221E] rounded-2xl p-4">
        <PaymentElement options={{ layout: 'tabs', fields: { billingDetails: 'never' } }} />
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-[#8C532B] hover:bg-[#A86434] disabled:opacity-50 text-white py-3.5 rounded-2xl text-xs sm:text-sm font-extrabold transition cursor-pointer flex items-center justify-center gap-2"
      >
        <Lock className="w-4 h-4" />
        <span>{processing ? t('جاري تأكيد الدفع...', 'Processing Payment...') : t('ادفع الآن', 'Pay Now')}</span>
      </button>

      <p className="text-[10px] text-[#A69B93] text-center flex items-center justify-center gap-1">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>{t('المعلومات محمية ومشفرة بواسطة Stripe وفق معايير PCI-DSS', 'Secured & encrypted by Stripe (PCI-DSS)')}</span>
      </p>
    </form>
  );
};

export const StripePaymentSection: React.FC<StripePaymentSectionProps> = ({
  publishableKey,
  clientSecret,
  orderId,
  customerName,
  email,
  phone,
  onSuccess,
  onCancel
}) => {
  const { t } = useLanguage();
  const [stripePromise] = useState(() => loadStripe(publishableKey));

  if (!publishableKey || !clientSecret) {
    return (
      <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
        {t('مفتاح الدفع غير مهيأ. راجع إعدادات Stripe في ملف .env', 'Payment key is not configured. Check Stripe settings in .env')}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <p className="text-xs text-[#D4C3B5]">
          {t('أدخل بيانات بطاقتك لإتمام الدفع. لاستخدام بطاقة اختبار: 4242 4242 4242 4242، أي تاريخ مستقبلي، CVC من 3 أرقام.', 'Enter your card details to complete payment. For testing use card 4242 4242 4242 4242, any future expiry, any 3-digit CVC.')}
        </p>
        <button
          onClick={onCancel}
          className="p-1 rounded-lg text-[#A69B93] hover:text-white hover:bg-[#2A221E] cursor-pointer shrink-0"
          title={t('إلغاء', 'Cancel')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <Elements
        stripe={stripePromise}
        options={{ clientSecret, appearance: { theme: 'night' } }}
      >
        <PaymentForm
          orderId={orderId}
          customerName={customerName}
          email={email}
          phone={phone}
          onSuccess={onSuccess}
        />
      </Elements>
    </div>
  );
};

export default StripePaymentSection;
