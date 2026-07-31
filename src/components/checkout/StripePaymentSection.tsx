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
  clientSecret: string;
  customerName: string;
  email: string;
  phone: string;
  onSuccess: () => void;
}> = ({ orderId, clientSecret, customerName, email, phone, onSuccess }) => {
  const { language, t } = useLanguage();
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const ready = !!stripe && !!elements && !!clientSecret;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');

    // Never call confirmPayment until stripe, elements AND the clientSecret
    // are all available.
    if (!ready) {
      console.warn('[Stripe] confirmPayment blocked: stripe/elements/clientSecret not ready', {
        hasStripe: !!stripe,
        hasElements: !!elements,
        hasClientSecret: !!clientSecret
      });
      if (!clientSecret) {
        setError(t('عملية الدفع غير مهيأة بعد، أعد المحاولة', 'Payment is not ready yet, please retry'));
      }
      return;
    }

    setProcessing(true);

    // Safety net: never leave the UI stuck on "Processing payment".
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      setProcessing(false);
      setNotice('');
      setError(t('انتهت مهلة الدفع. تحقق من اتصالك ثم أعد المحاولة.', 'Payment timed out. Check your connection and try again.'));
      console.warn('[Stripe] confirmPayment timed out after 30s');
    }, 30000);

    try {
      console.log('[Stripe] confirmPayment called', { orderId, clientSecretPresent: !!clientSecret });
      const { error: confirmError, paymentIntent } = await stripe!.confirmPayment({
        elements: elements!,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${window.location.origin}/order-confirmation/${orderId}`,
          // Billing details are collected by the Payment Element itself
          // (default "auto"). We prefill what the customer already gave us
          // during checkout, and always supply address.country so Stripe
          // never raises the "billing_details address.country was not
          // provided" IntegrationError.
          payment_method_data: {
            billing_details: {
              name: customerName || undefined,
              email: email || undefined,
              phone: phone || undefined,
              address: { country: 'SA' }
            }
          }
        }
      });

      if (timedOut) return;

      if (confirmError) {
        console.error('[Stripe] confirmPayment error:', confirmError.message, confirmError);
        setError(confirmError.message || t('حدث خطأ أثناء الدفع، حاول مجدداً', 'Payment failed, please try again'));
        return;
      }

      const status = paymentIntent?.status;
      console.log('[Stripe] confirmPayment result:', { status, id: paymentIntent?.id, amount: paymentIntent?.amount });

      switch (status) {
        case 'succeeded':
          console.log('[Stripe] paymentIntent succeeded — redirecting to confirmation', { orderId, pi: paymentIntent?.id });
          onSuccess();
          break;
        case 'processing':
          console.log('[Stripe] paymentIntent processing — awaiting server confirmation');
          setNotice(t('جارٍ معالجة الدفع، سيتم تأكيد طلبك خلال لحظات', 'Processing your payment, your order will be confirmed shortly'));
          break;
        case 'requires_payment_method':
          console.error('[Stripe] paymentIntent requires_payment_method — payment failed');
          setError(t('تعذر إتمام الدفع، تحقق من بيانات البطاقة وحاول مرة أخرى', 'Payment could not be completed. Check your card details and try again'));
          break;
        default:
          console.error('[Stripe] unexpected paymentIntent status:', status);
          setError(t('حالة دفع غير متوقعة، يرجى التواصل معنا', 'Unexpected payment status, please contact us'));
      }
    } catch (err: any) {
      console.error('[Stripe] confirmPayment threw:', err?.message || err, err);
      if (!timedOut) {
        setError(err?.message || t('حدث خطأ غير متوقع أثناء الدفع', 'Unexpected payment error'));
      }
    } finally {
      window.clearTimeout(timeoutId);
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <div className="bg-[#110E0C] border border-[#2A221E] rounded-2xl p-4">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      {notice && (
        <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 flex items-center justify-center gap-2">
          <span className="inline-block w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          {notice}
        </p>
      )}

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={!ready || processing}
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
          clientSecret={clientSecret}
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
