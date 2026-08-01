import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { User, Order, Review, Address, LoyaltyTransaction } from '../../types';
import {
  Users, Mail, Phone, Award, Calendar, Search,
  X, ShoppingBag, Star, MapPin, ChevronRight,
  Trash2, Save, Edit3, Plus, Minus, AlertCircle,
  CheckCircle, Clock, CreditCard, UserCog
} from 'lucide-react';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  paid: 'bg-blue-500/20 text-blue-400',
  roasting: 'bg-orange-500/20 text-orange-400',
  shipped: 'bg-cyan-500/20 text-cyan-400',
  delivered: 'bg-emerald-500/20 text-emerald-400',
  cancelled: 'bg-red-500/20 text-red-400',
};

const statItems = [
  { key: 'total_orders', icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { key: 'total_spent', icon: CreditCard, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { key: 'total_reviews', icon: Star, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { key: 'total_loyalty_earned', icon: Award, color: 'text-purple-400', bg: 'bg-purple-500/10' },
];

const EMPTY_ADDRESS: Omit<Address, 'id'> = {
  title: '',
  full_name: '',
  phone: '',
  country: 'SA',
  city: '',
  district: '',
  street: '',
  building: '',
  postal_code: '',
  is_default: false
};

export const AdminCustomersManager: React.FC = () => {
  const { language, t } = useLanguage();
  const isRtl = language === 'ar';

  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailData, setDetailData] = useState<{
    user: User; stats: any; orders: Order[]; reviews: Review[]; addresses: Address[];
  } | null>(null);
  const [detailTab, setDetailTab] = useState<'profile' | 'orders' | 'reviews' | 'addresses' | 'loyalty'>('profile');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', role: '' });
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [loyaltyType, setLoyaltyType] = useState<'add' | 'deduct'>('add');
  const [loyaltyReason, setLoyaltyReason] = useState('');
  const [loyaltyTransactions, setLoyaltyTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState<Omit<Address, 'id'>>(EMPTY_ADDRESS);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) { console.error('API error:', res.status); return; }
      setUsers(await res.json());
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const customers = users.filter(u => u && u.role === 'customer');
  const admins = users.filter(u => u && u.role === 'admin');

  const filteredUsers = customers.filter(u => {
    if (!u) return false;
    const term = searchTerm.toLowerCase();
    return String(u.name || '').toLowerCase().includes(term) ||
      String(u.email || '').toLowerCase().includes(term) ||
      String(u.phone || '').toLowerCase().includes(term) ||
      String(u.id || '').toLowerCase().includes(term);
  });

  const openUserDetail = async (user: User) => {
    setSelectedUser(user);
    setDetailTab('profile');
    setEditing(false);
    setError('');
    try {
      const res = await fetch(`/api/admin/users/${user.id}`);
      if (!res.ok) { console.error('API error:', res.status); return; }
      const data = await res.json();
      setDetailData(data);
      setEditForm({ name: data.user.name, email: data.user.email, phone: data.user.phone || '', role: data.user.role });
      const txRes = await fetch(`/api/admin/users/${user.id}/loyalty-transactions`);
      if (!txRes.ok) { console.error('API error:', txRes.status); return; }
      setLoyaltyTransactions(await txRes.json());
    } catch (err) { console.error(err); }
  };

  const closeDetail = () => {
    setSelectedUser(null);
    setDetailData(null);
    setEditing(false);
    setLoyaltyTransactions([]);
  };

  const handleSaveProfile = async () => {
    if (!selectedUser || !detailData) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (!res.ok) { setError('Failed to save'); return; }
      const updated = await res.json();
      setDetailData({ ...detailData, user: updated });
      setSelectedUser(updated);
      setEditing(false);
      fetchUsers();
    } catch (err) { setError('Error saving'); }
    setSaving(false);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    if (!confirm(t('هل أنت متأكد من حذف هذا المستخدم؟', 'Are you sure you want to delete this user?'))) return;
    try {
      await fetch(`/api/admin/users/${selectedUser.id}`, { method: 'DELETE' });
      closeDetail();
      fetchUsers();
    } catch (err) { console.error(err); }
  };

  const handleToggleBlock = async () => {
    if (!selectedUser || !detailData) return;
    const nextBlocked = !selectedUser.blocked;
    if (nextBlocked && !confirm(t('هل أنت متأكد من حظر هذا المستخدم؟', 'Are you sure you want to block this user?'))) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked: nextBlocked })
      });
      if (!res.ok) { console.error('API error:', res.status); return; }
      const updated = await res.json();
      setDetailData({ ...detailData, user: updated });
      setSelectedUser(updated);
      fetchUsers();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const handleLoyaltyAdjust = async () => {
    if (!selectedUser || loyaltyPoints <= 0 || !loyaltyReason) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/loyalty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          points: loyaltyPoints,
          type: loyaltyType === 'deduct' ? 'redeemed' : 'bonus',
          description_ar: loyaltyReason,
          description_en: loyaltyReason,
        })
      });
      if (!res.ok) { console.error('API error:', res.status); return; }
      const data = await res.json();
      if (detailData) {
        setDetailData({ ...detailData, user: data.user });
        setSelectedUser(data.user);
      }
      setLoyaltyTransactions(prev => [data.transaction, ...prev]);
      setLoyaltyPoints(0);
      setLoyaltyReason('');
      fetchUsers();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const saveAddressesToUser = async (updated: Address[]) => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses: updated })
      });
      if (!res.ok) { console.error('API error:', res.status); return; }
      const user = await res.json();
      if (detailData) {
        setDetailData({ ...detailData, user, addresses: user.addresses || [] });
        setSelectedUser(user);
      }
      fetchUsers();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const openEditAddress = (addr: Address) => {
    setEditingAddress(addr);
    setAddressForm({
      title: addr.title,
      full_name: addr.full_name,
      phone: addr.phone,
      country: addr.country,
      city: addr.city,
      district: addr.district,
      street: addr.street,
      building: addr.building || '',
      postal_code: addr.postal_code || '',
      delivery_notes: addr.delivery_notes || '',
      is_default: addr.is_default
    });
    setAddressFormOpen(true);
  };

  const handleSaveAddress = () => {
    if (!detailData) return;
    let updated: Address[];
    if (editingAddress) {
      updated = detailData.addresses.map(a => a.id === editingAddress.id ? { ...addressForm, id: editingAddress.id } as Address : a);
    } else {
      const newAddr: Address = { ...addressForm, id: `addr_${Date.now()}` } as Address;
      updated = [...detailData.addresses, newAddr];
    }
    if (addressForm.is_default) {
      updated = updated.map(a => ({ ...a, is_default: a.id === (editingAddress?.id || updated[updated.length - 1].id) }));
    }
    saveAddressesToUser(updated);
    setAddressFormOpen(false);
    setEditingAddress(null);
    setAddressForm(EMPTY_ADDRESS);
  };

  const handleDeleteAddress = (id: string) => {
    if (!detailData) return;
    const updated = detailData.addresses.filter(a => a.id !== id);
    saveAddressesToUser(updated);
  };

  const handleSetDefault = (id: string) => {
    if (!detailData) return;
    const updated = detailData.addresses.map(a => ({ ...a, is_default: a.id === id }));
    saveAddressesToUser(updated);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white font-serif">{t('إدارة العملاء', 'Customer Management')}</h1>
          <p className="text-xs text-[#A69B93] mt-0.5">{t('عرض وإدارة جميع المستخدمين', 'View and manage all users')}</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A69B93]" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={t('بحث بالاسم أو البريد...', 'Search by name or email...')}
            className="w-64 bg-[#1C1613] border border-[#2A221E] rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-[#A69B93] focus:outline-none focus:border-[#D99B26] transition"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-[#1C1613] border border-[#2A221E]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#A69B93] font-semibold">{t('العملاء', 'Customers')}</span>
            <Users className="w-5 h-5 text-[#D99B26]" />
          </div>
          <span className="font-extrabold text-2xl text-white block mt-2">{customers.length}</span>
        </div>
        <div className="p-5 rounded-3xl bg-[#1C1613] border border-[#2A221E]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#A69B93] font-semibold">{t('المديرين', 'Admins')}</span>
            <UserCog className="w-5 h-5 text-[#8C532B]" />
          </div>
          <span className="font-extrabold text-2xl text-white block mt-2">{admins.length}</span>
        </div>
        <div className="p-5 rounded-3xl bg-[#1C1613] border border-[#2A221E]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#A69B93] font-semibold">{t('إجمالي النقاط', 'Total Points')}</span>
            <Award className="w-5 h-5 text-amber-400" />
          </div>
          <span className="font-extrabold text-2xl text-white block mt-2">
            {customers.reduce((sum, u) => sum + (u?.loyalty_points || 0), 0).toLocaleString()}
          </span>
        </div>
        <div className="p-5 rounded-3xl bg-[#1C1613] border border-[#2A221E]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#A69B93] font-semibold">{t('إجمالي الطلبات', 'Total Orders')}</span>
            <ShoppingBag className="w-5 h-5 text-blue-400" />
          </div>
          <span className="font-extrabold text-2xl text-white block mt-2">
            {users.reduce((sum, u) => sum + (u.role === 'customer' ? 1 : 0), 0)}
          </span>
        </div>
      </div>

      <div className="bg-[#1C1613] border border-[#2A221E] rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-[#110E0C] text-[#A69B93] uppercase font-bold border-b border-[#2A221E]">
              <tr>
                <th className="p-4 text-start">{t('المستخدم', 'User')}</th>
                <th className="p-4 text-start">{t('البريد والجوال', 'Contact')}</th>
                <th className="p-4 text-start">{t('الدور', 'Role')}</th>
                <th className="p-4 text-start">{t('نقاط الولاء', 'Loyalty')}</th>
                <th className="p-4 text-start">{t('العناوين', 'Addresses')}</th>
                <th className="p-4 text-start">{t('التسجيل', 'Joined')}</th>
                <th className="p-4 text-start">{t('خيارات', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A221E]/60 text-[#D4C3B5]">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-[#110E0C]/50 transition">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        u.role === 'admin' ? 'bg-[#8C532B] text-white' : 'bg-[#2A221E] text-[#D99B26]'
                      }`}>
                        {(u.name || u.email || '?').charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-white block">{u.name || u.email || '-'}</span>
                        <span className="text-[10px] text-[#A69B93]">{u.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="flex items-center gap-1 text-[#D4C3B5]"><Mail className="w-3 h-3 text-[#A69B93]" />{u.email}</p>
                    {u.phone && <p className="flex items-center gap-1 text-[#D4C3B5] mt-0.5"><Phone className="w-3 h-3 text-[#A69B93]" />{u.phone}</p>}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      u.role === 'admin' ? 'bg-[#8C532B]/20 text-[#D99B26]' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {u.role === 'admin' ? 'Admin' : 'Customer'}
                    </span>
                    {u.blocked && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 ml-1">
                        {t('محظور', 'Blocked')}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-bold">
                      {u.loyalty_points} {t('نقطة', 'pts')}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-[#D4C3B5]">{u.addresses?.length || 0}</span>
                  </td>
                  <td className="p-4 text-[#A69B93] text-[10px]">
                    {new Date(u.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => openUserDetail(u)}
                      className="flex items-center gap-1 text-[#D99B26] hover:text-[#F8F5F0] transition text-[11px] font-bold cursor-pointer"
                    >
                      {t('تفاصيل', 'Details')} <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUser && detailData && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={closeDetail} />
          <div className="relative w-full max-w-4xl bg-[#110E0C] text-white border border-[#2A221E] rounded-3xl shadow-2xl z-50 animate-fade-in overflow-hidden">
            <div className="sticky top-0 bg-[#110E0C] z-10 p-4 sm:p-6 border-b border-[#2A221E] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                  detailData.user.role === 'admin' ? 'bg-[#8C532B] text-white' : 'bg-[#2A221E] text-[#D99B26]'
                }`}>
                  {(detailData.user.name || detailData.user.email || '?').charAt(0)}
                </div>
                <div>
                  <h2 className="font-extrabold text-lg text-white font-serif">{detailData.user.name || detailData.user.email}</h2>
                  <p className="text-[10px] text-[#A69B93]">{detailData.user.email} · {detailData.user.id}</p>
                </div>
              </div>
              <button onClick={closeDetail} className="p-1.5 rounded-lg text-[#A69B93] hover:text-white hover:bg-[#1C1613] transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-[#2A221E] overflow-x-auto">
              {[
                { id: 'profile', label_ar: 'الملف الشخصي', label_en: 'Profile', icon: Users },
                { id: 'orders', label_ar: 'الطلبات', label_en: 'Orders', icon: ShoppingBag },
                { id: 'reviews', label_ar: 'التقييمات', label_en: 'Reviews', icon: Star },
                { id: 'addresses', label_ar: 'العناوين', label_en: 'Addresses', icon: MapPin },
                { id: 'loyalty', label_ar: 'نقاط الولاء', label_en: 'Loyalty', icon: Award },
              ].map(tab => {
                const Icon = tab.icon;
                const active = detailTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setDetailTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition cursor-pointer shrink-0 ${
                      active ? 'border-[#D99B26] text-[#D99B26]' : 'border-transparent text-[#A69B93] hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t(tab.label_ar, tab.label_en)}
                  </button>
                );
              })}
            </div>

            <div className="p-4 sm:p-6 max-h-[60vh] overflow-y-auto space-y-4">

              {/* Profile Tab */}
              {detailTab === 'profile' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {statItems.map(item => {
                      const Icon = item.icon;
                      const val = detailData.stats[item.key];
                      const label = {
                        total_orders: t('الطلبات', 'Orders'),
                        total_spent: t('الإجمالي المنفق', 'Total Spent'),
                        total_reviews: t('التقييمات', 'Reviews'),
                        total_loyalty_earned: t('النقاط المكتسبة', 'Earned'),
                      }[item.key] || item.key;
                      return (
                        <div key={item.key} className={`${item.bg} rounded-2xl p-4 border border-[#2A221E]`}>
                          <Icon className={`w-4 h-4 ${item.color} mb-1`} />
                          <p className="text-lg font-extrabold text-white">
                            {item.key === 'total_spent' ? `${val.toLocaleString()} ${t('ريال', 'SAR')}` : val.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-[#A69B93]">{label}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-[#1C1613] rounded-2xl p-4 border border-[#2A221E] space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm">{t('المعلومات الشخصية', 'Personal Info')}</h3>
                      <button
                        onClick={() => editing ? handleSaveProfile() : setEditing(true)}
                        className="flex items-center gap-1 text-[#D99B26] text-[11px] font-bold hover:underline cursor-pointer"
                        disabled={saving}
                      >
                        {editing ? <Save className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                        {editing ? t('حفظ', 'Save') : t('تعديل', 'Edit')}
                      </button>
                    </div>
                    {error && <p className="text-red-400 text-xs">{error}</p>}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[#A69B93]">{t('الاسم', 'Name')}</span>
                        {editing ? (
                          <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full bg-[#110E0C] border border-[#2A221E] rounded-lg p-2 text-white mt-1 focus:outline-none focus:border-[#D99B26]" />
                        ) : <p className="font-bold text-white mt-0.5">{detailData.user.name}</p>}
                      </div>
                      <div>
                        <span className="text-[#A69B93]">{t('البريد', 'Email')}</span>
                        {editing ? (
                          <input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                            className="w-full bg-[#110E0C] border border-[#2A221E] rounded-lg p-2 text-white mt-1 focus:outline-none focus:border-[#D99B26]" />
                        ) : <p className="font-bold text-white mt-0.5">{detailData.user.email}</p>}
                      </div>
                      <div>
                        <span className="text-[#A69B93]">{t('الجوال', 'Phone')}</span>
                        {editing ? (
                          <input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                            className="w-full bg-[#110E0C] border border-[#2A221E] rounded-lg p-2 text-white mt-1 focus:outline-none focus:border-[#D99B26]" />
                        ) : <p className="font-bold text-white mt-0.5">{detailData.user.phone || '-'}</p>}
                      </div>
                      <div>
                        <span className="text-[#A69B93]">{t('الدور', 'Role')}</span>
                        {editing ? (
                          <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                            className="w-full bg-[#110E0C] border border-[#2A221E] rounded-lg p-2 text-white mt-1 focus:outline-none focus:border-[#D99B26]">
                            <option value="customer">Customer</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <p className="font-bold text-white mt-0.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                              detailData.user.role === 'admin' ? 'bg-[#8C532B]/20 text-[#D99B26]' : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {detailData.user.role === 'admin' ? 'Admin' : 'Customer'}
                            </span>
                          </p>
                        )}
                      </div>
                      <div>
                        <span className="text-[#A69B93]">{t('تاريخ التسجيل', 'Registered')}</span>
                        <p className="font-bold text-white mt-0.5">
                          {new Date(detailData.user.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                        </p>
                      </div>
                      <div>
                        <span className="text-[#A69B93]">{t('آخر طلب', 'Last Order')}</span>
                        <p className="font-bold text-white mt-0.5">
                          {detailData.stats.last_order_date
                            ? new Date(detailData.stats.last_order_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')
                            : '-'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 flex-wrap">
                      <button
                        onClick={handleToggleBlock}
                        disabled={saving}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition cursor-pointer disabled:opacity-50 ${
                          selectedUser.blocked
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20'
                        }`}
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        {selectedUser.blocked ? t('إلغاء الحظر', 'Unblock User') : t('حظر المستخدم', 'Block User')}
                      </button>
                      <button
                        onClick={handleDeleteUser}
                        className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-xl text-[11px] font-bold hover:bg-red-500/20 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t('حذف المستخدم', 'Delete User')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Orders Tab */}
              {detailTab === 'orders' && (
                <div className="space-y-2">
                  {detailData.orders.length === 0 ? (
                    <p className="text-center text-[#A69B93] text-xs py-8">{t('لا توجد طلبات', 'No orders yet')}</p>
                  ) : (
                    detailData.orders.map(order => (
                      <div key={order.id} className="bg-[#1C1613] rounded-2xl p-4 border border-[#2A221E] flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <span className="font-bold text-white text-sm">{order.order_number}</span>
                          <p className="text-[10px] text-[#A69B93]">{new Date(order.created_at).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColors[order.status] || ''}`}>
                          {t(
                            { pending: 'قيد الانتظار', paid: 'تم الدفع', roasting: 'تحميص', shipped: 'شحن', delivered: 'تم التوصيل', cancelled: 'ملغي' }[order.status] || order.status,
                            order.status.charAt(0).toUpperCase() + order.status.slice(1)
                          )}
                        </span>
                        <span className="font-bold text-[#D99B26]">{order.total_amount.toFixed(2)} {t('ريال', 'SAR')}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Reviews Tab */}
              {detailTab === 'reviews' && (
                <div className="space-y-2">
                  {detailData.reviews.length === 0 ? (
                    <p className="text-center text-[#A69B93] text-xs py-8">{t('لا توجد تقييمات', 'No reviews yet')}</p>
                  ) : (
                    detailData.reviews.map(review => (
                      <div key={review.id} className="bg-[#1C1613] rounded-2xl p-4 border border-[#2A221E]">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex text-amber-400">
                            {Array.from({ length: review.rating }, (_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                            {Array.from({ length: 5 - review.rating }, (_, i) => <Star key={i} className="w-3 h-3 text-[#2A221E]" />)}
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            review.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                            review.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                          }`}>{review.status}</span>
                        </div>
                        <p className="text-xs text-[#D4C3B5]">{review.comment}</p>
                        <p className="text-[10px] text-[#A69B93] mt-1">{new Date(review.created_at).toLocaleDateString()}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Addresses Tab */}
              {detailTab === 'addresses' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[#A69B93]">{t('عناوين هذا المستخدم المستخدمة في الشحن والفوترة', 'Shipping & billing addresses for this user')}</p>
                    <button
                      onClick={() => { setEditingAddress(null); setAddressForm(EMPTY_ADDRESS); setAddressFormOpen(true); }}
                      className="flex items-center gap-1 bg-[#8C532B] hover:bg-[#A86434] text-white px-3 py-2 rounded-xl text-[11px] font-bold transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {t('إضافة عنوان', 'Add Address')}
                    </button>
                  </div>

                  {addressFormOpen && (
                    <div className="bg-[#1C1613] rounded-2xl p-4 border border-[#D99B26]/40 space-y-3">
                      <h3 className="font-bold text-sm">{editingAddress ? t('تعديل العنوان', 'Edit Address') : t('عنوان جديد', 'New Address')}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[#A69B93]">{t('عنوان الحفظ', 'Label')}</span>
                          <input value={addressForm.title} onChange={e => setAddressForm({ ...addressForm, title: e.target.value })}
                            placeholder={t('المنزل، العمل...', 'Home, Work...')}
                            className="w-full bg-[#110E0C] border border-[#2A221E] rounded-lg p-2 text-white mt-1 focus:outline-none focus:border-[#D99B26]" />
                        </div>
                        <div>
                          <span className="text-[#A69B93]">{t('الاسم الكامل', 'Full Name')}</span>
                          <input value={addressForm.full_name} onChange={e => setAddressForm({ ...addressForm, full_name: e.target.value })}
                            className="w-full bg-[#110E0C] border border-[#2A221E] rounded-lg p-2 text-white mt-1 focus:outline-none focus:border-[#D99B26]" />
                        </div>
                        <div>
                          <span className="text-[#A69B93]">{t('الجوال', 'Phone')}</span>
                          <input value={addressForm.phone} onChange={e => setAddressForm({ ...addressForm, phone: e.target.value })}
                            className="w-full bg-[#110E0C] border border-[#2A221E] rounded-lg p-2 text-white mt-1 focus:outline-none focus:border-[#D99B26]" />
                        </div>
                        <div>
                          <span className="text-[#A69B93]">{t('المدينة', 'City')}</span>
                          <input value={addressForm.city} onChange={e => setAddressForm({ ...addressForm, city: e.target.value })}
                            className="w-full bg-[#110E0C] border border-[#2A221E] rounded-lg p-2 text-white mt-1 focus:outline-none focus:border-[#D99B26]" />
                        </div>
                        <div>
                          <span className="text-[#A69B93]">{t('الحي', 'District')}</span>
                          <input value={addressForm.district} onChange={e => setAddressForm({ ...addressForm, district: e.target.value })}
                            className="w-full bg-[#110E0C] border border-[#2A221E] rounded-lg p-2 text-white mt-1 focus:outline-none focus:border-[#D99B26]" />
                        </div>
                        <div>
                          <span className="text-[#A69B93]">{t('الشارع / المبنى', 'Street / Building')}</span>
                          <input value={addressForm.street} onChange={e => setAddressForm({ ...addressForm, street: e.target.value })}
                            className="w-full bg-[#110E0C] border border-[#2A221E] rounded-lg p-2 text-white mt-1 focus:outline-none focus:border-[#D99B26]" />
                        </div>
                        <div>
                          <span className="text-[#A69B93]">{t('الرقم الإضافي', 'Building No.')}</span>
                          <input value={addressForm.building} onChange={e => setAddressForm({ ...addressForm, building: e.target.value })}
                            className="w-full bg-[#110E0C] border border-[#2A221E] rounded-lg p-2 text-white mt-1 focus:outline-none focus:border-[#D99B26]" />
                        </div>
                        <div>
                          <span className="text-[#A69B93]">{t('الرمز البريدي', 'Postal Code')}</span>
                          <input value={addressForm.postal_code} onChange={e => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                            className="w-full bg-[#110E0C] border border-[#2A221E] rounded-lg p-2 text-white mt-1 focus:outline-none focus:border-[#D99B26]" />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-[#D4C3B5] cursor-pointer">
                        <input type="checkbox" checked={addressForm.is_default}
                          onChange={e => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                          className="accent-[#D99B26]" />
                        {t('تعيين كعنوان افتراضي', 'Set as default address')}
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveAddress}
                          disabled={saving}
                          className="flex items-center gap-1.5 bg-[#8C532B] hover:bg-[#A86434] disabled:opacity-50 text-white px-4 py-2 rounded-xl text-[11px] font-bold transition cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {t('حفظ العنوان', 'Save Address')}
                        </button>
                        <button
                          onClick={() => { setAddressFormOpen(false); setEditingAddress(null); setAddressForm(EMPTY_ADDRESS); }}
                          className="text-[#A69B93] hover:text-white px-3 py-2 rounded-xl text-[11px] font-bold transition cursor-pointer"
                        >
                          {t('إلغاء', 'Cancel')}
                        </button>
                      </div>
                    </div>
                  )}

                  {detailData.addresses.length === 0 ? (
                    <p className="text-center text-[#A69B93] text-xs py-8">{t('لا توجد عناوين', 'No addresses saved')}</p>
                  ) : (
                    detailData.addresses.map(addr => (
                      <div key={addr.id} className="bg-[#1C1613] rounded-2xl p-4 border border-[#2A221E]">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <MapPin className="w-3.5 h-3.5 text-[#D99B26]" />
                          <span className="font-bold text-xs text-white">{addr.title}</span>
                          {addr.is_default && <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded font-bold">{t('افتراضي', 'Default')}</span>}
                          <div className="ms-auto flex items-center gap-1">
                            {!addr.is_default && (
                              <button
                                onClick={() => handleSetDefault(addr.id)}
                                title={t('تعيين افتراضي', 'Set default')}
                                className="p-1.5 rounded-lg text-[#A69B93] hover:text-emerald-400 hover:bg-emerald-500/10 transition cursor-pointer"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => openEditAddress(addr)}
                              title={t('تعديل', 'Edit')}
                              className="p-1.5 rounded-lg text-[#A69B93] hover:text-[#D99B26] hover:bg-[#D99B26]/10 transition cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAddress(addr.id)}
                              title={t('حذف', 'Delete')}
                              className="p-1.5 rounded-lg text-[#A69B93] hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-[#D4C3B5]">{addr.street}, {addr.district}, {addr.city}</p>
                        <p className="text-[10px] text-[#A69B93]">{addr.full_name} · {addr.phone}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Loyalty Tab */}
              {detailTab === 'loyalty' && (
                <div className="space-y-4">
                  <div className="bg-[#1C1613] rounded-2xl p-4 border border-[#2A221E]">
                    <p className="text-[#A69B93] text-xs">{t('الرصيد الحالي', 'Current Balance')}</p>
                    <p className="text-3xl font-extrabold text-amber-400">{detailData.user.loyalty_points} <span className="text-sm font-bold">{t('نقطة', 'pts')}</span></p>
                  </div>

                  <div className="bg-[#1C1613] rounded-2xl p-4 border border-[#2A221E] space-y-3">
                    <h3 className="font-bold text-sm">{t('تعديل النقاط', 'Adjust Points')}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setLoyaltyType('add')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer transition ${
                          loyaltyType === 'add' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-[#110E0C] text-[#A69B93] border border-[#2A221E]'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5 inline mr-1" />{t('إضافة', 'Add')}
                      </button>
                      <button
                        onClick={() => setLoyaltyType('deduct')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer transition ${
                          loyaltyType === 'deduct' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-[#110E0C] text-[#A69B93] border border-[#2A221E]'
                        }`}
                      >
                        <Minus className="w-3.5 h-3.5 inline mr-1" />{t('خصم', 'Deduct')}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        value={loyaltyPoints || ''}
                        onChange={e => setLoyaltyPoints(Math.max(0, parseInt(e.target.value) || 0))}
                        placeholder={t('عدد النقاط', 'Points amount')}
                        className="w-28 bg-[#110E0C] border border-[#2A221E] rounded-xl p-2.5 text-xs text-white placeholder-[#A69B93] focus:outline-none focus:border-[#D99B26]"
                      />
                      <input
                        type="text"
                        value={loyaltyReason}
                        onChange={e => setLoyaltyReason(e.target.value)}
                        placeholder={t('سبب التعديل...', 'Reason...')}
                        className="flex-1 bg-[#110E0C] border border-[#2A221E] rounded-xl p-2.5 text-xs text-white placeholder-[#A69B93] focus:outline-none focus:border-[#D99B26]"
                      />
                      <button
                        onClick={handleLoyaltyAdjust}
                        disabled={saving || loyaltyPoints <= 0 || !loyaltyReason}
                        className="bg-[#8C532B] hover:bg-[#A86434] disabled:opacity-50 text-white px-4 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        {saving ? '...' : t('تطبيق', 'Apply')}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="font-bold text-xs text-[#A69B93]">{t('سجل النقاط', 'Transaction History')}</h3>
                    {loyaltyTransactions.length === 0 ? (
                      <p className="text-center text-[#A69B93] text-xs py-4">{t('لا توجد معاملات', 'No transactions yet')}</p>
                    ) : (
                      loyaltyTransactions.map(tx => (
                        <div key={tx.id} className="bg-[#1C1613] rounded-xl p-3 border border-[#2A221E] flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              tx.type === 'redeemed' ? 'bg-red-500/20' : 'bg-emerald-500/20'
                            }`}>
                              {tx.type === 'redeemed' ? <Minus className="w-3 h-3 text-red-400" /> : <Plus className="w-3 h-3 text-emerald-400" />}
                            </div>
                            <div>
                              <p className="text-xs text-white font-bold">
                                {t(tx.description_ar, tx.description_en)}
                              </p>
                              <p className="text-[10px] text-[#A69B93]">{new Date(tx.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <span className={`font-extrabold text-xs ${tx.type === 'redeemed' ? 'text-red-400' : 'text-emerald-400'}`}>
                            {tx.type === 'redeemed' ? '-' : '+'}{tx.points}
                          </span>
                        </div>
                      ))
                    )}
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

export default AdminCustomersManager;