import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useCurrency } from '../../context/CurrencyContext';
import { Order, OrderStatus } from '../../types';
import { ShoppingBag, Eye, X, Trash2, Printer, Loader2 } from 'lucide-react';

const statusOptions: { value: OrderStatus; label_ar: string; label_en: string }[] = [
  { value: 'pending', label_ar: 'معلق', label_en: 'Pending' },
  { value: 'paid', label_ar: 'تم الدفع', label_en: 'Paid' },
  { value: 'roasting', label_ar: 'قيد التحميص', label_en: 'Roasting' },
  { value: 'shipped', label_ar: 'تم الشحن', label_en: 'Shipped' },
  { value: 'delivered', label_ar: 'تم التوصيل', label_en: 'Delivered' },
  { value: 'cancelled', label_ar: 'ملغي', label_en: 'Cancelled' }
];

const PAYMENT_LABELS: Record<string, [string, string]> = {
  paid: ['تم الدفع', 'Paid'],
  pending: ['قيد الدفع', 'Pending'],
  failed: ['فشل الدفع', 'Failed']
};

export const AdminOrdersManager: React.FC = () => {
  const { language, t } = useLanguage();
  const { formatPrice } = useCurrency();
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { loadOrders(); }, []);

  // A paid order is always shown as "تم الدفع" (Paid) even if the fulfillment
  // status was never bumped from pending (e.g. paid via Tabby/Tamara).
  const getEffectiveStatus = (o: Order): OrderStatus =>
    o.payment_status === 'paid' && o.status === 'pending' ? 'paid' : o.status;

  const loadOrders = () => {
    fetch('/api/orders')
      .then(async res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => setOrders(data))
      .catch(err => console.error(err));
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      if (updated) {
        setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, ...updated } : o)));
      }
    } catch (err) {
      console.error('Failed to update order status:', err);
      alert(t('فشل تحديث حالة الطلب', 'Failed to update order status'));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteOrder = async (ord: Order) => {
    if (!window.confirm(t('هل أنت متأكد من حذف هذا الطلب؟', 'Are you sure you want to delete this order?'))) return;
    setDeletingId(ord.id);
    try {
      const res = await fetch(`/api/admin/orders/${ord.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOrders(prev => prev.filter(o => o.id !== ord.id));
      if (selectedOrder?.id === ord.id) setSelectedOrder(null);
    } catch (err) {
      console.error('Failed to delete order:', err);
      alert(t('فشل حذف الطلب', 'Failed to delete order'));
    } finally {
      setDeletingId(null);
    }
  };

  const statusLabel = (s: string) => {
    const opt = statusOptions.find(o => o.value === s);
    if (!opt) return s;
    return language === 'ar' ? opt.label_ar : opt.label_en;
  };

  const printReceipt = (ord: Order) => {
    const win = window.open('', '_blank', 'width=420,height=700');
    if (!win) {
      alert(t('الرجاء السماح بالنوافذ المنبثقة لطباعة الإيصال', 'Please allow pop-ups to print the receipt'));
      return;
    }
    const dir = language === 'ar' ? 'rtl' : 'ltr';
    const formatItemTotal = (v: number) => formatPrice(v);
    const rows = ord.items.map((item, idx) => `
      <tr>
        <td style="padding:6px 4px;border-bottom:1px solid #e2ddd6;vertical-align:top">
          <strong>${language === 'ar' ? item.product_name_ar : item.product_name_en}</strong>
          <div style="font-size:11px;color:#666">${item.weight} • ${item.grind} × ${item.quantity}</div>
        </td>
        <td style="padding:6px 4px;border-bottom:1px solid #e2ddd6;text-align:${dir === 'rtl' ? 'left' : 'right'};white-space:nowrap">${formatItemTotal(item.total_price)}</td>
      </tr>
    `).join('');

    const priceRow = (label: string, value: string, style = '') => `
      <div style="display:flex;justify-content:space-between;padding:2px 0;font-size:13px;${style}">
        <span>${label}</span><span>${value}</span>
      </div>
    `;

    const totalRow = `
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:2px solid #2b2b2b;font-size:16px;font-weight:700">
        <span>${t('الإجمالي', 'Total')}</span><span>${formatPrice(ord.total_amount)}</span>
      </div>
    `;

    win.document.write(`
      <!DOCTYPE html>
      <html lang="${language === 'ar' ? 'ar' : 'en'}" dir="${dir}">
      <head>
        <meta charset="utf-8" />
        <title>${t('إيصال الطلب', 'Order Receipt')} - ${ord.order_number}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #1c1613; margin: 0; }
          .receipt { max-width: 420px; margin: 0 auto; padding: 24px; }
          h1 { font-size: 20px; margin: 0 0 2px; }
          .store { font-size: 11px; color: #8a7a6b; letter-spacing: 0.4px; }
          .meta { border-top: 1px dashed #c8bfb4; border-bottom: 1px dashed #c8bfb4; margin: 14px 0; padding: 10px 0; font-size: 13px; }
          .meta div { display: flex; justify-content: space-between; padding: 2px 0; }
          .meta span { color: #8a7a6b; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          .paid { display:inline-block; margin-top:6px; padding:4px 12px; border-radius:20px; background:#e8f5e9; color:#1b5e20; font-size:12px; font-weight:700; }
          .pending { background:#fff3e0; color:#b26a00; }
          .failed { background:#fdecea; color:#b71c1c; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <h1>Selection Specialty Coffee</h1>
          <div class="store">${t('قائمة مختصة - تحميص يومي طازج', 'Specialty coffee roasters - fresh daily roast')}</div>

          <div class="meta">
            <div><span>${t('رقم الطلب', 'Order No.')}</span><strong>${ord.order_number}</strong></div>
            <div><span>${t('التاريخ', 'Date')}</span><strong>${new Date(ord.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-GB')} ${new Date(ord.created_at).toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}</strong></div>
            <div><span>${t('العميل', 'Customer')}</span><strong>${ord.customer_name}</strong></div>
            <div><span>${t('الهاتف', 'Phone')}</span><strong dir="ltr">${ord.phone}</strong></div>
            <div><span>${t('الدفع', 'Payment')}</span><strong>${language === 'ar' ? (ord.payment_method || '').toUpperCase() : (ord.payment_method || '').toUpperCase()}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="text-align:${dir === 'rtl' ? 'right' : 'left'};font-size:12px;border-bottom:2px solid #2b2b2b;padding:4px">${t('المنتج', 'Item')}</th>
                <th style="text-align:${dir === 'rtl' ? 'left' : 'right'};font-size:12px;border-bottom:2px solid #2b2b2b;padding:4px">${t('المبلغ', 'Price')}</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          ${priceRow(t('المجموع الفرعي', 'Subtotal'), formatPrice(ord.subtotal))}
          ${ord.discount_amount > 0 ? priceRow(t('الخصم', 'Discount'), '-' + formatPrice(ord.discount_amount), 'color:#1b5e20') : ''}
          ${ord.loyalty_discount && ord.loyalty_discount > 0 ? priceRow(t('خصم الولاء', 'Loyalty'), '-' + formatPrice(ord.loyalty_discount), 'color:#b26a00') : ''}
          ${priceRow(t('الشحن', 'Shipping'), ord.shipping_cost > 0 ? formatPrice(ord.shipping_cost) : t('مجاني', 'Free'))}
          ${ord.cod_surcharge && ord.cod_surcharge > 0 ? priceRow(t('رسوم COD', 'COD Surcharge'), '+' + formatPrice(ord.cod_surcharge), 'color:#b26a00') : ''}
          ${priceRow(t('ضريبة القيمة المضافة 15%', 'VAT 15%'), formatPrice(ord.tax_amount))}
          ${totalRow}

          <div style="font-size:12px;margin-top:6px">
            <span style="color:#8a7a6b">${t('حالة الدفع', 'Payment Status')}:</span>
            <span class="${ord.payment_status === 'paid' ? 'paid' : ord.payment_status === 'pending' ? 'pending' : 'failed'}">
              ${language === 'ar' ? (PAYMENT_LABELS[ord.payment_status]?.[0] || ord.payment_status) : (PAYMENT_LABELS[ord.payment_status]?.[1] || ord.payment_status)}
            </span>
          </div>
          <div style="font-size:12px;margin-top:4px">
            <span style="color:#8a7a6b">${t('حالة الطلب', 'Order Status')}:</span>
            <strong>${statusLabel(getEffectiveStatus(ord))}</strong>
          </div>
          ${ord.tracking_number ? `<div style="font-size:12px;margin-top:4px"><span style="color:#8a7a6b">${t('رقم التتبع', 'Tracking No.')}:</span> <strong dir="ltr">${ord.tracking_number}</strong></div>` : ''}
          ${ord.shipping_address ? `<div style="font-size:12px;margin-top:4px"><span style="color:#8a7a6b">${t('العنوان', 'Address')}:</span> ${ord.shipping_address.city} - ${ord.shipping_address.district} - ${ord.shipping_address.street}</div>` : ''}

          <div style="margin-top:18px;text-align:center;font-size:11px;color:#8a7a6b;border-top:1px dashed #c8bfb4;padding-top:10px">
            ${t('شكراً لتسوقك من Selection', 'Thank you for shopping with Selection')}
          </div>
        </div>
        <script>
          window.addEventListener('load', function () {
            setTimeout(function () { window.print(); }, 250);
          });
        </script>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
  };

  const filteredOrders = statusFilter === 'all' ? orders : orders.filter(o => getEffectiveStatus(o) === statusFilter);
  const filtered = filteredOrders.filter(o =>
    o.order_number.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_name.includes(search) ||
    o.phone.includes(search)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-emerald-500/20 text-emerald-400';
      case 'shipped': return 'bg-blue-500/20 text-blue-400';
      case 'roasting': return 'bg-amber-500/20 text-amber-400';
      case 'cancelled': return 'bg-red-500/20 text-red-400';
      case 'paid': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-[#8C532B]/20 text-[#D99B26]';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-white font-serif">
          {t('إدارة الطلبات والشحنات', 'Orders & Fulfillment')}
        </h1>
        <p className="text-xs text-[#A69B93] mt-0.5">
          {t('متابعة حالة التجهيز والتحميص والشحن وتعديل حالة الطلب', 'Track preparation, roasting, shipping and update order status')}
        </p>
      </div>

      <div className="relative max-w-sm">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('بحث برقم الطلب أو اسم العميل...', 'Search by order number or customer...')}
          className="w-full bg-[#1C1613] border border-[#2A221E] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D99B26]"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'paid', 'roasting', 'shipped', 'delivered', 'cancelled'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === s
                ? 'bg-[#D99B26] text-[#110E0C]'
                : 'bg-[#1C1613] text-[#A69B93] border border-[#2A221E] hover:border-[#D99B26]'
            }`}
          >
            {s === 'all' ? t('الكل', 'All') : statusOptions.find(opt => opt.value === s) ? (language === 'ar' ? statusOptions.find(opt => opt.value === s)!.label_ar : statusOptions.find(opt => opt.value === s)!.label_en) : s}
          </button>
        ))}
      </div>

      <div className="bg-[#1C1613] border border-[#2A221E] rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-[#110E0C] text-[#A69B93] uppercase font-bold border-b border-[#2A221E]">
              <tr>
                <th className="p-4 text-start">{t('رقم الطلب والعميل', 'Order & Customer')}</th>
                <th className="p-4 text-start">{t('المدينة والشحن', 'City & Carrier')}</th>
                <th className="p-4 text-start">{t('المبلغ', 'Total')}</th>
                <th className="p-4 text-start">{t('الدفع', 'Payment')}</th>
                <th className="p-4 text-start">{t('الحالة', 'Status')}</th>
                <th className="p-4 text-end">{t('تفاصيل', 'Details')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A221E]/60 text-[#D4C3B5]">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-[#A69B93]">{t('لا توجد طلبات', 'No orders found')}</td></tr>
              ) : filtered.map(ord => (
                <tr key={ord.id} className="hover:bg-[#110E0C]/50 transition">
                  <td className="p-4">
                    <span className="font-extrabold text-white block text-sm">{ord.order_number}</span>
                    <span className="text-[10px] text-[#A69B93]">{ord.customer_name} · {ord.phone}</span>
                  </td>
                  <td className="p-4">
                    <span className="font-bold text-white block">{ord.shipping_address.city}</span>
                    <span className="text-[10px] text-[#D99B26]">{ord.shipping_method}</span>
                  </td>
                  <td className="p-4 font-extrabold text-[#D99B26]">
                    {formatPrice(ord.total_amount)}
                  </td>
                  <td className="p-4 uppercase font-bold text-xs">
                    {ord.payment_method}
                  </td>
                  <td className="p-4">
                    <select
                      value={getEffectiveStatus(ord)}
                      disabled={updatingId === ord.id}
                      onChange={e => handleUpdateStatus(ord.id, e.target.value as OrderStatus)}
                      className={`bg-[#110E0C] text-white border border-[#2A221E] rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#D99B26] cursor-pointer disabled:opacity-60 ${getStatusColor(getEffectiveStatus(ord))}`}
                    >
                      {statusOptions.map(s => (
                        <option key={s.value} value={s.value}>{language === 'ar' ? s.label_ar : s.label_en}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4 text-end">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedOrder(ord)}
                        className="p-1.5 rounded-lg bg-[#2A221E] text-white hover:bg-[#8C532B] transition cursor-pointer"
                        title={t('تفاصيل الطلب', 'Order details')}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(ord)}
                        disabled={deletingId === ord.id}
                        className="p-1.5 rounded-lg bg-[#2A221E] text-red-400 hover:bg-red-500/20 transition cursor-pointer disabled:opacity-50"
                        title={t('حذف الطلب', 'Delete order')}
                      >
                        {deletingId === ord.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
          <div className="relative w-full max-w-lg bg-[#110E0C] text-white border border-[#2A221E] rounded-3xl p-6 shadow-2xl z-50 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setSelectedOrder(null)} className="absolute top-4 right-4 text-[#A69B93] hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-lg text-white">{selectedOrder.order_number}</h3>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  getEffectiveStatus(selectedOrder) === 'delivered' ? 'bg-emerald-500/20 text-emerald-400' :
                  getEffectiveStatus(selectedOrder) === 'shipped' ? 'bg-blue-500/20 text-blue-400' :
                  getEffectiveStatus(selectedOrder) === 'roasting' ? 'bg-amber-500/20 text-amber-400' :
                  getEffectiveStatus(selectedOrder) === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                  getEffectiveStatus(selectedOrder) === 'paid' ? 'bg-purple-500/20 text-purple-400' :
                  'bg-[#8C532B]/20 text-[#D99B26]'
                }`}>
                  {statusLabel(getEffectiveStatus(selectedOrder))}
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  selectedOrder.payment_status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' :
                  selectedOrder.payment_status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {language === 'ar' ? (PAYMENT_LABELS[selectedOrder.payment_status]?.[0] || selectedOrder.payment_status) : (PAYMENT_LABELS[selectedOrder.payment_status]?.[1] || selectedOrder.payment_status)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => printReceipt(selectedOrder)}
                className="flex items-center gap-1.5 bg-[#D99B26] text-[#110E0C] px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-[#e8aa3d] transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                {t('طباعة الإيصال', 'Print Receipt')}
              </button>
              <button
                onClick={() => handleDeleteOrder(selectedOrder)}
                disabled={deletingId === selectedOrder.id}
                className="flex items-center gap-1.5 bg-red-500/10 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-red-500/20 transition cursor-pointer disabled:opacity-50"
              >
                {deletingId === selectedOrder.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {t('حذف الطلب', 'Delete Order')}
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-[#1C1613] border border-[#2A221E]">
                <span className="text-[#A69B93] font-semibold">{t('العميل', 'Customer')}</span>
                <p className="text-white font-bold mt-1">{selectedOrder.customer_name} · {selectedOrder.phone}</p>
                <p className="text-[#D4C3B5]">{selectedOrder.email}</p>
              </div>

              <div className="p-3 rounded-2xl bg-[#1C1613] border border-[#2A221E]">
                <span className="text-[#A69B93] font-semibold">{t('عنوان الشحن', 'Shipping Address')}</span>
                <p className="text-white font-bold mt-1">{selectedOrder.shipping_address.city} - {selectedOrder.shipping_address.district}</p>
                <p className="text-[#D4C3B5]">{selectedOrder.shipping_address.street} {selectedOrder.shipping_address.building}</p>
              </div>

              <div className="p-3 rounded-2xl bg-[#1C1613] border border-[#2A221E]">
                <span className="text-[#A69B93] font-semibold">{t('المنتجات', 'Items')}</span>
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between mt-2 text-[#D4C3B5]">
                    <div>
                      <span>{language === 'ar' ? item.product_name_ar : item.product_name_en} × {item.quantity}</span>
                      <span className="text-[10px] text-[#A69B93] block">{item.weight} • {item.grind}</span>
                    </div>
                    <span className="font-bold text-white">{formatPrice(item.total_price)}</span>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-2xl bg-[#1C1613] border border-[#2A221E] space-y-1">
                <div className="flex justify-between text-[#D4C3B5]">
                  <span>{t('المجموع الفرعي', 'Subtotal')}</span>
                  <span>{formatPrice(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>{t('الخصم', 'Discount')} ({selectedOrder.coupon_code})</span>
                    <span>-{formatPrice(selectedOrder.discount_amount)}</span>
                  </div>
                )}
                {selectedOrder.loyalty_discount && selectedOrder.loyalty_discount > 0 && (
                  <div className="flex justify-between text-[#D99B26]">
                    <span>{t('خصم الولاء', 'Loyalty')}{selectedOrder.loyalty_points_used ? ` (${selectedOrder.loyalty_points_used} pts)` : ''}</span>
                    <span>-{formatPrice(selectedOrder.loyalty_discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#D4C3B5]">
                  <span>{t('الشحن', 'Shipping')}</span>
                  <span>{selectedOrder.shipping_cost > 0 ? formatPrice(selectedOrder.shipping_cost) : t('مجاني', 'Free')}</span>
                </div>
                {selectedOrder.cod_surcharge && selectedOrder.cod_surcharge > 0 && (
                  <div className="flex justify-between text-[#D99B26]">
                    <span>{t('رسوم COD', 'COD Surcharge')}</span>
                    <span>+{formatPrice(selectedOrder.cod_surcharge)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#D4C3B5]">
                  <span>{t('الضريبة 15%', 'VAT 15%')}</span>
                  <span>{formatPrice(selectedOrder.tax_amount)}</span>
                </div>
                <div className="flex justify-between text-[#D99B26] font-extrabold text-sm border-t border-[#2A221E] pt-2">
                  <span>{t('الإجمالي', 'Total')}</span>
                  <span>{formatPrice(selectedOrder.total_amount)}</span>
                </div>
              </div>

              {selectedOrder.tracking_number && (
                <div className="p-3 rounded-2xl bg-[#1C1613] border border-[#2A221E]">
                  <span className="text-[#A69B93] font-semibold">{t('رقم التتبع', 'Tracking')}</span>
                  <p className="text-[#D99B26] font-bold mt-1">{selectedOrder.tracking_number}</p>
                </div>
              )}

              {selectedOrder.customer_notes && (
                <div className="p-3 rounded-2xl bg-[#1C1613] border border-[#2A221E]">
                  <span className="text-[#A69B93] font-semibold">{t('ملاحظات العميل', 'Customer Notes')}</span>
                  <p className="text-[#D4C3B5] mt-1">{selectedOrder.customer_notes}</p>
                </div>
              )}

              {selectedOrder.status_history.length > 0 && (
                <div className="p-3 rounded-2xl bg-[#1C1613] border border-[#2A221E]">
                  <span className="text-[#A69B93] font-semibold">{t('سجل الحالات', 'Status History')}</span>
                  <div className="mt-2 space-y-2">
                    {selectedOrder.status_history.map((h, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full bg-[#D99B26] mt-1.5 shrink-0"></div>
                        <div>
                          <span className="text-white font-bold">{language === 'ar' ? h.note_ar : h.note_en}</span>
                          <span className="text-[#A69B93] block">{new Date(h.timestamp).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersManager;
