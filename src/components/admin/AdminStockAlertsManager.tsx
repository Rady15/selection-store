import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { StockNotification } from '../../types';
import { BellRing, CheckCircle, RefreshCw, CheckCheck } from 'lucide-react';

export const AdminStockAlertsManager: React.FC = () => {
 const { language, t } = useLanguage();
 const [alerts, setAlerts] = useState<StockNotification[]>([]);
 const [loading, setLoading] = useState(true);

 const loadAlerts = async () => {
 setLoading(true);
 try {
 const res = await fetch('/api/admin/stock-notifications');
 if (!res.ok) throw new Error(`HTTP ${res.status}`);
 const data = await res.json();
 setAlerts(data);
 } catch (err) {
 console.error(err);
 }
 setLoading(false);
 };

 useEffect(() => { loadAlerts(); }, []);

 const handleMarkNotified = async (id: string) => {
 try {
 const res = await fetch(`/api/admin/stock-notifications/${id}`, {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ status: 'notified' })
 });
 if (!res.ok) return;
 setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'notified' } : a));
 } catch (err) {
 console.error(err);
 }
 };

 const handleMarkAllNotified = async () => {
 const pending = alerts.filter(a => a.status === 'pending');
 if (pending.length === 0) return;
 for (const a of pending) {
 await handleMarkNotified(a.id);
 }
 };

 const pendingCount = alerts.filter(a => a.status === 'pending').length;

 const formatDate = (iso: string) => {
 const d = new Date(iso);
 return d.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
 day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
 });
 };

 return (
 <div className="space-y-6 animate-fade-in">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-extrabold text-[#1A2E30] font-serif">
 {t('طلبات تنبيهات توفر المحاصيل', 'Restock Alert Subscriptions')}
 </h1>
 <p className="text-xs text-[#6B8C8E] mt-0.5">
 {t('العملاء المنتظرون توفر القهوة - أرسل لهم إشعار عند التوفر', 'Customers waiting for out-of-stock items - notify when available')}
 </p>
 </div>
 <div className="flex gap-2">
 {pendingCount > 1 && (
 <button
 onClick={handleMarkAllNotified}
 className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-600 hover:text-[#6CC6C9] transition cursor-pointer"
 title={t('تحديد الكل كتم الإشعار', 'Mark All Notified')}
 >
 <CheckCheck className="w-4 h-4" />
 </button>
 )}
 <button
 onClick={loadAlerts}
 className="p-2 rounded-xl bg-[#F0FAFA] border border-[#E8F2F2] text-[#4A6869] hover:text-[#6CC6C9] transition cursor-pointer"
 title={t('تحديث', 'Refresh')}
 >
 <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
 </button>
 </div>
 </div>

 <div className="bg-[#F0FAFA] border border-[#E8F2F2] rounded-3xl overflow-hidden shadow-2xl">
 {pendingCount > 0 && (
 <div className="m-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400 flex items-center gap-2">
 <BellRing className="w-4 h-4 flex-shrink-0" />
 <span>
 {language === 'ar'
 ? `هناك ${pendingCount} طلب تنبيه بانتظار الإشعار`
 : `${pendingCount} pending alert${pendingCount > 1 ? 's' : ''} waiting to be marked`
 }
 </span>
 </div>
 )}

 <div className="overflow-x-auto">
 <table className="w-full text-xs text-start">
 <thead className="bg-[#FFFFFF] text-[#6B8C8E] uppercase font-bold border-b border-[#E8F2F2]">
 <tr>
 <th className="p-4 text-start">{t('العميل', 'Customer')}</th>
 <th className="p-4 text-start">{t('المحصول', 'Product')}</th>
 <th className="p-4 text-start">{t('التاريخ', 'Date')}</th>
 <th className="p-4 text-start">{t('الحالة', 'Status')}</th>
 <th className="p-4 text-end">{t('إجراء', 'Action')}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[#E8F2F2]/60 text-[#4A6869]">
 {alerts.length === 0 ? (
 <tr><td colSpan={5} className="p-8 text-center text-[#6B8C8E]">
 {t('لا توجد طلبات تنبيه', 'No alert subscriptions yet')}
 </td></tr>
 ) : alerts.map(a => (
 <tr key={a.id} className="hover:bg-[#FFFFFF]/50 transition">
 <td className="p-4">
 <span className="font-bold text-[#1A2E30] block">{a.customer_name}</span>
 <span className="text-[10px] text-[#6B8C8E]">{a.phone} &middot; {a.email}</span>
 </td>
 <td className="p-4 font-bold text-[#6CC6C9]">
 {language === 'ar' ? a.product_name_ar : a.product_name_en}
 <span className="block text-[10px] text-[#6B8C8E] font-normal">{a.variant_info}</span>
 </td>
 <td className="p-4 text-[#6B8C8E]">{formatDate(a.created_at)}</td>
 <td className="p-4">
 <span className={`px-2 py-0.5 rounded font-bold ${
 a.status === 'notified'
 ? 'bg-emerald-500/20 text-emerald-400'
 : 'bg-amber-500/20 text-amber-400'
 }`}>
 {a.status === 'notified'
 ? t('تم الإشعار', 'Notified')
 : t('قيد الانتظار', 'Pending')
 }
 </span>
 </td>
 <td className="p-4 text-end">
 {a.status !== 'notified' && (
 <button
 onClick={() => handleMarkNotified(a.id)}
 className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-600 hover:text-[#6CC6C9] transition cursor-pointer"
 title={t('تم الإشعار', 'Mark as Notified')}
 >
 <CheckCircle className="w-4 h-4" />
 </button>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
};

export default AdminStockAlertsManager;
