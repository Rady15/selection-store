import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Coupon } from '../../types';
import { Tag, Plus, Trash2, X, Percent, DollarSign, Truck } from 'lucide-react';

export const AdminCouponsManager: React.FC = () => {
  const { language, t } = useLanguage();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showModal, setShowModal] = useState(false);

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed' | 'free_shipping'>('percentage');
  const [discountValue, setDiscountValue] = useState(10);
  const [minOrderAmount, setMinOrderAmount] = useState(100);
  const [maxDiscount, setMaxDiscount] = useState<number>(0);
  const [validUntil, setValidUntil] = useState('2027-12-31');
  const [usageLimit, setUsageLimit] = useState(500);

  useEffect(() => { loadCoupons(); }, []);

  const loadCoupons = () => {
    fetch('/api/admin/coupons')
      .then(async res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => setCoupons(data))
      .catch(err => console.error(err));
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: `coup-${Date.now()}`,
        code: code.toUpperCase(),
        discount_type: discountType,
        discount_value: discountType === 'free_shipping' ? 0 : Number(discountValue),
        min_order_amount: Number(minOrderAmount),
        max_discount_amount: discountType === 'percentage' ? Number(maxDiscount) : undefined,
        valid_until: validUntil,
        usage_count: 0,
        usage_limit: Number(usageLimit),
        is_active: true
      })
    });
    setShowModal(false);
    resetForm();
    loadCoupons();
  };

  const handleDeleteCoupon = async (id: string) => {
    if (confirm(t('حذف الكوبون؟', 'Delete coupon?'))) {
      await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
      loadCoupons();
    }
  };

  const resetForm = () => {
    setCode('');
    setDiscountType('percentage');
    setDiscountValue(10);
    setMinOrderAmount(100);
    setMaxDiscount(0);
    setValidUntil('2027-12-31');
    setUsageLimit(500);
  };

  const getDiscountBadge = (c: Coupon) => {
    if (c.discount_type === 'percentage') return `-${c.discount_value}%`;
    if (c.discount_type === 'fixed') return `-${c.discount_value} ﷼`;
    return t('شحن مجاني', 'Free Ship');
  };

  const getDiscountIcon = (type: string) => {
    switch (type) {
      case 'percentage': return <Percent className="w-4 h-4" />;
      case 'fixed': return <DollarSign className="w-4 h-4" />;
      case 'free_shipping': return <Truck className="w-4 h-4" />;
      default: return <Tag className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-white font-serif">{t('كوبونات الخصم والعروض', 'Coupons & Promo Codes')}</h1>
          <p className="text-xs text-[#A69B93] mt-0.5">{t('إدارة وتوليد كوبونات الخصم الترويجية', 'Manage promo discount codes')}</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-[#8C532B] hover:bg-[#A86434] text-white px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          <span>{t('إضافة كوبون', 'Add Coupon')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map(c => (
          <div key={c.id} className="p-5 rounded-3xl bg-[#1C1613] border border-[#2A221E] space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-extrabold text-lg text-[#D99B26] font-mono tracking-wider">{c.code}</span>
              <span className={`text-xs px-2.5 py-0.5 rounded font-bold flex items-center gap-1 ${
                c.discount_type === 'free_shipping' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {getDiscountIcon(c.discount_type)}
                {getDiscountBadge(c)}
              </span>
            </div>

            <p className="text-xs text-[#A69B93]">
              {t('الحد الأدنى:', 'Min:')} <strong className="text-white">{c.min_order_amount} ﷼</strong>
              {c.max_discount_amount ? <>, {t('حد أقصى للخصم:', 'Max:')} <strong className="text-white">{c.max_discount_amount} ﷼</strong></> : null}
            </p>
            <p className="text-xs text-[#A69B93]">
              {t('صالح حتى:', 'Valid until:')} <strong className="text-white">{c.valid_until}</strong>
            </p>

            <div className="flex justify-between items-center pt-2 border-t border-[#2A221E] text-xs">
              <span className="text-[#A69B93]">{t('الاستخدام:', 'Used:')} {c.usage_count}/{c.usage_limit}</span>
              <button onClick={() => handleDeleteCoupon(c.id)} className="text-red-400 hover:text-red-300 cursor-pointer">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md bg-[#110E0C] text-white border border-[#2A221E] rounded-3xl p-6 shadow-2xl z-50 space-y-4 text-xs">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-[#A69B93] hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-base text-white">{t('إضافة كوبون خصم جديد', 'Create New Coupon')}</h3>
            <form onSubmit={handleCreateCoupon} className="space-y-3">
              <div>
                <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('كود الخصم', 'Coupon Code')}</label>
                <input type="text" required value={code} onChange={e => setCode(e.target.value)}
                  placeholder="WELCOME10"
                  className="w-full bg-[#1C1613] border border-[#2A221E] rounded-xl p-2.5 text-white uppercase font-mono" />
              </div>

              <div>
                <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('نوع الخصم', 'Discount Type')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['percentage', 'fixed', 'free_shipping'] as const).map(type => (
                    <button key={type} type="button"
                      onClick={() => setDiscountType(type)}
                      className={`p-2 rounded-xl border text-center font-bold transition cursor-pointer ${
                        discountType === type ? 'bg-[#8C532B] border-[#8C532B] text-white' : 'bg-[#1C1613] border-[#2A221E] text-[#D4C3B5]'
                      }`}>
                      {type === 'percentage' ? t('نسبة %', '%') : type === 'fixed' ? t('مبلغ ثابت', 'Fixed') : t('شحن مجاني', 'Free Ship')}
                    </button>
                  ))}
                </div>
              </div>

              {discountType !== 'free_shipping' && (
                <div>
                  <label className="block text-[#D4C3B5] mb-1 font-semibold">
                    {discountType === 'percentage' ? t('نسبة الخصم %', 'Discount %') : t('مبلغ الخصم (﷼)', 'Discount Amount (SAR)')}
                  </label>
                  <input type="number" required value={discountValue} onChange={e => setDiscountValue(Number(e.target.value))}
                    className="w-full bg-[#1C1613] border border-[#2A221E] rounded-xl p-2.5 text-white" />
                </div>
              )}

              {discountType === 'percentage' && (
                <div>
                  <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('حد أقصى للخصم (﷼)', 'Max Discount (﷼)')}</label>
                  <input type="number" value={maxDiscount} onChange={e => setMaxDiscount(Number(e.target.value))}
                    className="w-full bg-[#1C1613] border border-[#2A221E] rounded-xl p-2.5 text-white" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('الحد الأدنى للطلب (﷼)', 'Min Order (SAR)')}</label>
                  <input type="number" required value={minOrderAmount} onChange={e => setMinOrderAmount(Number(e.target.value))}
                    className="w-full bg-[#1C1613] border border-[#2A221E] rounded-xl p-2.5 text-white" />
                </div>
                <div>
                  <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('حد الاستخدام', 'Usage Limit')}</label>
                  <input type="number" required value={usageLimit} onChange={e => setUsageLimit(Number(e.target.value))}
                    className="w-full bg-[#1C1613] border border-[#2A221E] rounded-xl p-2.5 text-white" />
                </div>
              </div>

              <div>
                <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('صالح حتى', 'Valid Until')}</label>
                <input type="date" required value={validUntil} onChange={e => setValidUntil(e.target.value)}
                  className="w-full bg-[#1C1613] border border-[#2A221E] rounded-xl p-2.5 text-white" />
              </div>

              <button type="submit" className="w-full bg-[#8C532B] hover:bg-[#A86434] text-white py-3 rounded-xl font-bold cursor-pointer transition">
                {t('حفظ الكوبون', 'Save Coupon')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCouponsManager;
