import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Banner } from '../../types';
import { Image, Plus, Trash2, X, Eye, EyeOff, GripVertical, Palette } from 'lucide-react';
import { ImageUploader } from './ImageUploader';

export const AdminBannersManager: React.FC = () => {
  const { language, t } = useLanguage();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  const [titleAr, setTitleAr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [subtitleAr, setSubtitleAr] = useState('');
  const [subtitleEn, setSubtitleEn] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [position, setPosition] = useState<Banner['position']>('mid_page');
  const [isActive, setIsActive] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bgColor, setBgColor] = useState('#1C1613');
  const [textColor, setTextColor] = useState('#D99B26');
  const [sortOrder, setSortOrder] = useState(0);

  useEffect(() => { loadBanners(); }, []);

  const loadBanners = () => {
    fetch('/api/admin/banners')
      .then(async res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => setBanners(data))
      .catch(err => console.error(err));
  };

  const resetForm = () => {
    setTitleAr('');
    setTitleEn('');
    setSubtitleAr('');
    setSubtitleEn('');
    setImageUrl('');
    setLinkUrl('');
    setPosition('mid_page');
    setIsActive(true);
    setStartDate('');
    setEndDate('');
    setBgColor('#1C1613');
    setTextColor('#D99B26');
    setSortOrder(0);
    setEditingBanner(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (banner: Banner) => {
    setEditingBanner(banner);
    setTitleAr(banner.title_ar);
    setTitleEn(banner.title_en);
    setSubtitleAr(banner.subtitle_ar);
    setSubtitleEn(banner.subtitle_en);
    setImageUrl(banner.image_url);
    setLinkUrl(banner.link_url);
    setPosition(banner.position);
    setIsActive(banner.is_active);
    setStartDate(banner.start_date || '');
    setEndDate(banner.end_date || '');
    setBgColor(banner.bg_color);
    setTextColor(banner.text_color);
    setSortOrder(banner.sort_order);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const bannerData = {
      id: editingBanner?.id || `banner-${Date.now()}`,
      title_ar: titleAr,
      title_en: titleEn,
      subtitle_ar: subtitleAr,
      subtitle_en: subtitleEn,
      image_url: imageUrl,
      link_url: linkUrl,
      position,
      is_active: isActive,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      bg_color: bgColor,
      text_color: textColor,
      sort_order: sortOrder,
      created_at: editingBanner?.created_at || new Date().toISOString()
    };

    await fetch('/api/admin/banners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bannerData)
    });

    setShowModal(false);
    resetForm();
    loadBanners();
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('هل أنت متأكد من حذف هذا البانر؟', 'Are you sure you want to delete this banner?'))) {
      await fetch(`/api/admin/banners/${id}`, { method: 'DELETE' });
      loadBanners();
    }
  };

  const toggleActive = async (banner: Banner) => {
    await fetch('/api/admin/banners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...banner, is_active: !banner.is_active })
    });
    loadBanners();
  };

  const getPositionBadge = (pos: string) => {
    const colors: Record<string, string> = {
      hero: 'bg-amber-900/50 text-amber-300',
      mid_page: 'bg-emerald-900/50 text-emerald-300',
      footer: 'bg-blue-900/50 text-blue-300',
      sidebar: 'bg-purple-900/50 text-purple-300'
    };
    const labels: Record<string, Record<string, string>> = {
      hero: { ar: 'هيرو', en: 'Hero' },
      mid_page: { ar: 'منتصف الصفحة', en: 'Mid Page' },
      footer: { ar: 'تذييل', en: 'Footer' },
      sidebar: { ar: 'شريط جانبي', en: 'Sidebar' }
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[pos] || 'bg-gray-700 text-gray-300'}`}>
        {labels[pos]?.[language] || pos}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image className="w-6 h-6 text-[#D99B26]" />
          <h2 className="text-xl font-bold text-[#E8DDD3]">{t('إدارة البانرات والإعلانات', 'Banners & Ads Manager')}</h2>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-[#8C532B] hover:bg-[#A6633A] text-white rounded-xl text-sm font-medium transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {t('إضافة بانر', 'Add Banner')}
        </button>
      </div>

      <div className="bg-[#1C1613] rounded-2xl border border-[#2A221E] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2A221E]">
                <th className="text-left p-4 text-sm font-medium text-[#A89888]">{t('معاينة', 'Preview')}</th>
                <th className="text-left p-4 text-sm font-medium text-[#A89888]">{t('العنوان', 'Title')}</th>
                <th className="text-left p-4 text-sm font-medium text-[#A89888]">{t('الموضع', 'Position')}</th>
                <th className="text-left p-4 text-sm font-medium text-[#A89888]">{t('الحالة', 'Status')}</th>
                <th className="text-left p-4 text-sm font-medium text-[#A89888]">{t('التواريخ', 'Dates')}</th>
                <th className="text-left p-4 text-sm font-medium text-[#A89888]">{t('الترتيب', 'Order')}</th>
                <th className="text-left p-4 text-sm font-medium text-[#A89888]">{t('إجراءات', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {banners.map(banner => (
                <tr key={banner.id} className="border-b border-[#2A221E]/50 hover:bg-[#2A221E]/30 transition">
                  <td className="p-4">
                    <div
                      className="w-24 h-14 rounded-lg overflow-hidden flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: banner.bg_color, color: banner.text_color }}
                    >
                      {banner.image_url ? (
                        <img src={banner.image_url} alt="" className="w-full h-full object-cover opacity-60" />
                      ) : (
                        <span className="truncate px-1">{language === 'ar' ? banner.title_ar : banner.title_en}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-[#E8DDD3] text-sm font-medium">{language === 'ar' ? banner.title_ar : banner.title_en}</p>
                    <p className="text-[#A89888] text-xs mt-0.5">{language === 'ar' ? banner.subtitle_ar : banner.subtitle_en}</p>
                  </td>
                  <td className="p-4">{getPositionBadge(banner.position)}</td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleActive(banner)}
                      className="flex items-center gap-1.5 cursor-pointer"
                    >
                      {banner.is_active ? (
                        <>
                          <Eye className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs text-emerald-400">{t('نشط', 'Active')}</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-4 h-4 text-red-400" />
                          <span className="text-xs text-red-400">{t('معطل', 'Inactive')}</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="text-xs text-[#A89888] space-y-0.5">
                      {banner.start_date && <p>{t('من:', 'From:')} {banner.start_date}</p>}
                      {banner.end_date && <p>{t('إلى:', 'To:')} {banner.end_date}</p>}
                      {!banner.start_date && !banner.end_date && <p>{t('دائماً', 'Always')}</p>}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-[#D99B26] text-sm font-mono">{banner.sort_order}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(banner)}
                        className="p-1.5 rounded-lg hover:bg-[#2A221E] text-[#A89888] hover:text-[#D99B26] transition cursor-pointer"
                      >
                        <GripVertical className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(banner.id)}
                        className="p-1.5 rounded-lg hover:bg-red-900/30 text-[#A89888] hover:text-red-400 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {banners.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#A89888] text-sm">
                    {t('لا توجد بانرات بعد', 'No banners yet')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1C1613] rounded-2xl border border-[#2A221E] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[#2A221E]">
              <h3 className="text-lg font-bold text-[#E8DDD3]">
                {editingBanner ? t('تعديل البانر', 'Edit Banner') : t('إضافة بانر جديد', 'New Banner')}
              </h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-1.5 rounded-lg hover:bg-[#2A221E] text-[#A89888] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#A89888] mb-1">{t('العنوان بالعربي', 'Title (AR)')}</label>
                  <input
                    type="text"
                    value={titleAr}
                    onChange={e => setTitleAr(e.target.value)}
                    className="w-full bg-[#2A221E] border border-[#3A322E] rounded-xl px-3 py-2 text-sm text-[#E8DDD3] focus:outline-none focus:border-[#D99B26]"
                    required
                    dir="rtl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A89888] mb-1">{t('العنوان بالإنجليزي', 'Title (EN)')}</label>
                  <input
                    type="text"
                    value={titleEn}
                    onChange={e => setTitleEn(e.target.value)}
                    className="w-full bg-[#2A221E] border border-[#3A322E] rounded-xl px-3 py-2 text-sm text-[#E8DDD3] focus:outline-none focus:border-[#D99B26]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#A89888] mb-1">{t('العنوان الفرعي بالعربي', 'Subtitle (AR)')}</label>
                  <input
                    type="text"
                    value={subtitleAr}
                    onChange={e => setSubtitleAr(e.target.value)}
                    className="w-full bg-[#2A221E] border border-[#3A322E] rounded-xl px-3 py-2 text-sm text-[#E8DDD3] focus:outline-none focus:border-[#D99B26]"
                    dir="rtl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A89888] mb-1">{t('العنوان الفرعي بالإنجليزي', 'Subtitle (EN)')}</label>
                  <input
                    type="text"
                    value={subtitleEn}
                    onChange={e => setSubtitleEn(e.target.value)}
                    className="w-full bg-[#2A221E] border border-[#3A322E] rounded-xl px-3 py-2 text-sm text-[#E8DDD3] focus:outline-none focus:border-[#D99B26]"
                  />
                </div>
              </div>

              <ImageUploader value={imageUrl} onChange={setImageUrl} label={t('رابط الصورة', 'Image URL')} />

              <div>
                <label className="block text-xs font-medium text-[#A89888] mb-1">{t('رابط الهدف', 'Link URL')}</label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  className="w-full bg-[#2A221E] border border-[#3A322E] rounded-xl px-3 py-2 text-sm text-[#E8DDD3] focus:outline-none focus:border-[#D99B26]"
                  placeholder="/products"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#A89888] mb-1">{t('الموضع', 'Position')}</label>
                  <select
                    value={position}
                    onChange={e => setPosition(e.target.value as Banner['position'])}
                    className="w-full bg-[#2A221E] border border-[#3A322E] rounded-xl px-3 py-2 text-sm text-[#E8DDD3] focus:outline-none focus:border-[#D99B26] cursor-pointer"
                  >
                    <option value="hero">{t('هيرو', 'Hero')}</option>
                    <option value="mid_page">{t('منتصف الصفحة', 'Mid Page')}</option>
                    <option value="footer">{t('تذييل', 'Footer')}</option>
                    <option value="sidebar">{t('شريط جانبي', 'Sidebar')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A89888] mb-1">{t('الترتيب', 'Sort Order')}</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={e => setSortOrder(Number(e.target.value))}
                    className="w-full bg-[#2A221E] border border-[#3A322E] rounded-xl px-3 py-2 text-sm text-[#E8DDD3] focus:outline-none focus:border-[#D99B26]"
                    min={0}
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={e => setIsActive(e.target.checked)}
                      className="w-4 h-4 accent-[#D99B26] rounded"
                    />
                    <span className="text-sm text-[#E8DDD3]">{t('نشط', 'Active')}</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#A89888] mb-1">{t('تاريخ البداية', 'Start Date')}</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-[#2A221E] border border-[#3A322E] rounded-xl px-3 py-2 text-sm text-[#E8DDD3] focus:outline-none focus:border-[#D99B26]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A89888] mb-1">{t('تاريخ النهاية', 'End Date')}</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full bg-[#2A221E] border border-[#3A322E] rounded-xl px-3 py-2 text-sm text-[#E8DDD3] focus:outline-none focus:border-[#D99B26]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-[#A89888] mb-1">
                    <Palette className="w-3 h-3" />
                    {t('لون الخلفية', 'Background Color')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={e => setBgColor(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-[#3A322E] cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={bgColor}
                      onChange={e => setBgColor(e.target.value)}
                      className="flex-1 bg-[#2A221E] border border-[#3A322E] rounded-xl px-3 py-2 text-sm text-[#E8DDD3] focus:outline-none focus:border-[#D99B26] font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-[#A89888] mb-1">
                    <Palette className="w-3 h-3" />
                    {t('لون النص', 'Text Color')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={textColor}
                      onChange={e => setTextColor(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-[#3A322E] cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={textColor}
                      onChange={e => setTextColor(e.target.value)}
                      className="flex-1 bg-[#2A221E] border border-[#3A322E] rounded-xl px-3 py-2 text-sm text-[#E8DDD3] focus:outline-none focus:border-[#D99B26] font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#3A322E] p-4" style={{ backgroundColor: bgColor }}>
                <p className="text-center font-bold font-serif" style={{ color: textColor }}>
                  {titleEn || titleAr || t('معاينة العنوان', 'Title Preview')}
                </p>
                <p className="text-center text-sm opacity-80" style={{ color: textColor }}>
                  {subtitleEn || subtitleAr || t('معاينة العنوان الفرعي', 'Subtitle Preview')}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#8C532B] hover:bg-[#A6633A] text-white rounded-xl font-medium text-sm transition cursor-pointer"
                >
                  {editingBanner ? t('حفظ التعديلات', 'Save Changes') : t('إضافة البانر', 'Add Banner')}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-6 py-2.5 bg-[#2A221E] hover:bg-[#3A322E] text-[#A89888] rounded-xl font-medium text-sm transition cursor-pointer"
                >
                  {t('إلغاء', 'Cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBannersManager;
