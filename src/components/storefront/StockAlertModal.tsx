import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Product } from '../../types';
import { X, BellRing, Check, Send } from 'lucide-react';

interface StockAlertModalProps {
  product: Product;
  variantInfo?: string;
  onClose: () => void;
}

export const StockAlertModal: React.FC<StockAlertModalProps> = ({ product, variantInfo, onClose }) => {
  const { language, t } = useLanguage();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await fetch('/api/stock-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          product_name_ar: product.name_ar,
          product_name_en: product.name_en,
          variant_info: variantInfo || 'الافتراضي',
          customer_name: name,
          email,
          phone
        })
      });
      setSubmitting(false);
      setSuccess(true);
    } catch (err) {
      setSubmitting(false);
      alert(t('حدث خطأ أثناء إرسال الطلب', 'Failed to send request'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#110E0C] text-[#F8F5F0] border border-[#2A221E] rounded-3xl p-6 shadow-2xl z-50">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-[#1C1613] text-[#A69B93] hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-base text-white">
              {t('تم تسجيل طلب التنبيه بنجاح!', 'Restock Alert Subscribed!')}
            </h4>
            <p className="text-xs text-[#A69B93]">
              {t('سنقوم بإرسال رسالة نصية وبريدية فور توفر دفعة تحميص جديدة لهذا المحصول.', 'We will notify you via SMS and email as soon as fresh roasts arrive.')}
            </p>
            <button
              onClick={onClose}
              className="mt-4 bg-[#8C532B] hover:bg-[#A86434] text-white px-6 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              {t('حسنًا', 'Done')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 text-[#D99B26]">
              <BellRing className="w-5 h-5" />
              <h3 className="font-bold text-base text-white">
                {t('تنبيه عند توفر المحصول', 'Notify When In Stock')}
              </h3>
            </div>

            <p className="text-xs text-[#A69B93]">
              {t('سجل بياناتك وسيصلك تنبيه فوري بمجرد وصول دفعة جديدة من', 'Enter your contact details to receive instant restock alerts for')}{' '}
              <strong className="text-white">{language === 'ar' ? product.name_ar : product.name_en}</strong>.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('الاسم الكامل', 'Full Name')}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="عبدالرحمن العتيبي"
                  className="w-full bg-[#1C1613] border border-[#2A221E] rounded-xl p-2.5 text-white focus:outline-none focus:border-[#D99B26]"
                />
              </div>

              <div>
                <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('رقم الجوال (لإرسال SMS)', 'Phone Number (For SMS)')}</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+966 50 123 4567"
                  className="w-full bg-[#1C1613] border border-[#2A221E] rounded-xl p-2.5 text-white focus:outline-none focus:border-[#D99B26]"
                />
              </div>

              <div>
                <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('البريد الإلكتروني', 'Email Address')}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#1C1613] border border-[#2A221E] rounded-xl p-2.5 text-white focus:outline-none focus:border-[#D99B26]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#8C532B] hover:bg-[#A86434] text-white py-3 rounded-xl text-xs font-bold transition shadow-lg shadow-[#8C532B]/30 cursor-pointer flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? t('جاري التسجيل...', 'Subscribing...') : t('تأكيد الاشتراك للتنبيه', 'Subscribe To Alert')}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default StockAlertModal;
