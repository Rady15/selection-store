import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { WholesaleSubmission } from '../../types';
import { Building2, Phone, Mail, MapPin, Package, CheckCircle, X } from 'lucide-react';

export const AdminWholesaleManager: React.FC = () => {
  const { language, t } = useLanguage();
  const [requests, setRequests] = useState<WholesaleSubmission[]>([]);

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = () => {
    fetch('/api/admin/wholesale-requests')
      .then(async res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => setRequests(data))
      .catch(err => console.error(err));
  };

  const handleMarkContacted = async (id: string) => {
    await fetch(`/api/admin/wholesale/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'contacted' })
    });
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'contacted' as const } : r));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-white font-serif">{t('طلبات مبيعات الجملة والمقاهي B2B', 'Wholesale & B2B Cafe Inquiries')}</h1>
        <p className="text-xs text-[#A69B93] mt-0.5">{t('طلبات الشراكة والتموين للمقاهي والشركات', 'B2B roasting inquiries and partnership requests')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {requests.length === 0 ? (
          <div className="col-span-2 p-8 text-center text-[#A69B93] bg-[#1C1613] rounded-3xl border border-[#2A221E]">
            {t('لا توجد طلبات جملة بعد', 'No wholesale inquiries yet')}
          </div>
        ) : requests.map(req => (
          <div key={req.id} className="p-6 rounded-3xl bg-[#1C1613] border border-[#2A221E] space-y-3">
            <div className="flex justify-between items-start border-b border-[#2A221E] pb-3">
              <div>
                <h4 className="font-extrabold text-base text-white">{req.business_name}</h4>
                <span className="text-xs text-[#D99B26] font-bold">{req.contact_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2.5 py-0.5 rounded font-bold ${
                  req.status === 'new' ? 'bg-amber-500/20 text-amber-400' :
                  req.status === 'contacted' ? 'bg-blue-500/20 text-blue-400' :
                  req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {req.status === 'new' ? t('جديد', 'New') :
                   req.status === 'contacted' ? t('تم التواصل', 'Contacted') :
                   req.status === 'approved' ? t('موافق', 'Approved') : t('مرفوض', 'Rejected')}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-[#D4C3B5]">
              <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-[#A69B93]" /><span>{req.phone}</span></p>
              <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-[#A69B93]" /><span>{req.email}</span></p>
              <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-[#A69B93]" /><span>{req.city}</span></p>
              <p className="flex items-center gap-2"><Package className="w-3.5 h-3.5 text-[#A69B93]" /><span>{req.monthly_coffee_kg}</span></p>
            </div>

            {req.message && (
              <p className="text-xs text-[#A69B93] border-t border-[#2A221E] pt-2">{req.message}</p>
            )}

            {req.status === 'new' && (
              <button
                onClick={() => handleMarkContacted(req.id)}
                className="w-full mt-2 bg-[#8C532B]/20 text-[#D99B26] py-2 rounded-xl text-xs font-bold hover:bg-[#8C532B] hover:text-white transition cursor-pointer flex items-center justify-center gap-1"
              >
                <CheckCircle className="w-4 h-4" />
                {t('تم التواصل', 'Mark as Contacted')}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminWholesaleManager;
