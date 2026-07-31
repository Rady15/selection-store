import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Megaphone, Eye, Loader2, Save } from 'lucide-react';

interface Announcement {
  is_enabled: boolean;
  text_ar: string;
  text_en: string;
  link: string;
  bg_color: string;
  text_color: string;
  free_shipping_threshold: number;
}

const defaultAnnouncement: Announcement = {
  is_enabled: false,
  text_ar: '',
  text_en: '',
  link: '',
  bg_color: '#D99B26',
  text_color: '#110E0C',
  free_shipping_threshold: 0,
};

export const AdminAnnouncementManager: React.FC = () => {
  const { language, t } = useLanguage();
  const [announcement, setAnnouncement] = useState<Announcement>(defaultAnnouncement);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadAnnouncement(); }, []);

  const loadAnnouncement = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/announcement');
      if (res.ok) {
        const data = await res.json();
        setAnnouncement({ ...defaultAnnouncement, ...data });
      }
    } catch {
      setError(t('فشل في تحميل الإعلان', 'Failed to load announcement'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/announcement', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(announcement),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError(t('فشل في الحفظ', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof Announcement>(field: K, value: Announcement[K]) => {
    setAnnouncement(prev => ({ ...prev, [field]: value }));
  };

  const previewText = language === 'ar' ? announcement.text_ar : announcement.text_en;

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-extrabold text-white font-serif">{t('إدارة شريط الإعلانات', 'Announcement Bar')}</h1>
          <p className="text-xs text-[#A69B93] mt-0.5">{t('إدارة شريط الإعلانات العلوي', 'Manage the top announcement bar')}</p>
        </div>
        <div className="p-8 rounded-3xl bg-[#1C1613] border border-[#2A221E] animate-pulse space-y-4">
          <div className="h-10 bg-[#2A221E] rounded-xl w-1/3" />
          <div className="h-10 bg-[#2A221E] rounded-xl w-full" />
          <div className="h-10 bg-[#2A221E] rounded-xl w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-white font-serif">{t('إدارة شريط الإعلانات', 'Announcement Bar')}</h1>
          <p className="text-xs text-[#A69B93] mt-0.5">{t('إدارة شريط الإعلانات العلوي', 'Manage the top announcement bar')}</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4 p-6 rounded-3xl bg-[#1C1613] border border-[#2A221E]">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">{t('إعدادات الإعلان', 'Announcement Settings')}</h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={announcement.is_enabled}
                onChange={e => updateField('is_enabled', e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-[#2A221E] rounded-full peer peer-checked:bg-[#8C532B] peer-focus:ring-2 peer-focus:ring-[#D99B26]/30 after:content-[''] after:absolute after:top-0.5 after:right-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:-translate-x-full" />
              <span className="mr-2 text-xs font-bold text-[#D4C3B5]">
                {announcement.is_enabled ? t('مفعّل', 'Enabled') : t('معطّل', 'Disabled')}
              </span>
            </label>
          </div>

          <div>
            <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('النص بالعربي', 'Arabic Text')}</label>
            <input type="text" value={announcement.text_ar} onChange={e => updateField('text_ar', e.target.value)}
              placeholder={t('شحن مجاني للطلبات فوق 200 ﷼', 'Free shipping on orders over 200 SAR')}
              className="w-full bg-[#110E0C] border border-[#2A221E] rounded-xl p-2.5 text-white" />
          </div>

          <div>
            <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('النص بالإنجليزي', 'English Text')}</label>
            <input type="text" value={announcement.text_en} onChange={e => updateField('text_en', e.target.value)}
              placeholder="Free shipping on orders over 200 ﷼"
              className="w-full bg-[#110E0C] border border-[#2A221E] rounded-xl p-2.5 text-white" />
          </div>

          <div>
            <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('الرابط', 'Link')}</label>
            <input type="url" value={announcement.link} onChange={e => updateField('link', e.target.value)}
              placeholder="/collections"
              className="w-full bg-[#110E0C] border border-[#2A221E] rounded-xl p-2.5 text-white" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('لون الخلفية', 'Background Color')}</label>
              <div className="flex items-center gap-2">
                <input type="color" value={announcement.bg_color} onChange={e => updateField('bg_color', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-[#2A221E] cursor-pointer bg-transparent" />
                <input type="text" value={announcement.bg_color} onChange={e => updateField('bg_color', e.target.value)}
                  className="flex-1 bg-[#110E0C] border border-[#2A221E] rounded-xl p-2.5 text-white font-mono text-xs" />
              </div>
            </div>
            <div>
              <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('لون النص', 'Text Color')}</label>
              <div className="flex items-center gap-2">
                <input type="color" value={announcement.text_color} onChange={e => updateField('text_color', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-[#2A221E] cursor-pointer bg-transparent" />
                <input type="text" value={announcement.text_color} onChange={e => updateField('text_color', e.target.value)}
                  className="flex-1 bg-[#110E0C] border border-[#2A221E] rounded-xl p-2.5 text-white font-mono text-xs" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[#D4C3B5] mb-1 font-semibold">
              {t('الحد الأدنى للشحن المجاني (﷼)', 'Free Shipping Threshold (﷼)')}
            </label>
            <input type="number" value={announcement.free_shipping_threshold}
              onChange={e => updateField('free_shipping_threshold', Number(e.target.value))}
              className="w-full bg-[#110E0C] border border-[#2A221E] rounded-xl p-2.5 text-white" />
          </div>

          <button type="submit" disabled={saving}
            className="w-full bg-[#8C532B] hover:bg-[#A86434] text-white py-3 rounded-xl font-bold cursor-pointer transition flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? null : <Save className="w-4 h-4" />}
            {saving ? t('جاري الحفظ...', 'Saving...') : saved ? t('تم الحفظ!', 'Saved!') : t('حفظ', 'Save')}
          </button>
        </form>

        {/* Preview */}
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-[#1C1613] border border-[#2A221E]">
            <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#D99B26]" />
              {t('معاينة', 'Preview')}
            </h3>

            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: announcement.bg_color }}>
              <div className="px-4 py-2.5 text-center text-xs font-bold" style={{ color: announcement.text_color }}>
                {previewText || t('معاينة النص هنا', 'Preview text here')}
              </div>
            </div>

            <div className="mt-4 space-y-2 text-xs text-[#A69B93]">
              <div className="flex justify-between">
                <span>{t('الحالة', 'Status')}</span>
                <span className={announcement.is_enabled ? 'text-emerald-400' : 'text-red-400'}>
                  {announcement.is_enabled ? t('مفعّل', 'Enabled') : t('معطّل', 'Disabled')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{t('الرابط', 'Link')}</span>
                <span className="text-white font-mono">{announcement.link || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('الحد الأدنى للشحن المجاني', 'Free Shipping Threshold')}</span>
                <span className="text-white">{announcement.free_shipping_threshold} {t('﷼', 'SAR')}</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-[#1C1613] border border-[#2A221E]">
            <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#D99B26]" />
              {t('معاينة الموقع الكامل', 'Full Site Preview')}
            </h3>
            <div className="rounded-xl overflow-hidden border border-[#2A221E]">
              <div className="rounded-xl overflow-hidden" style={{ backgroundColor: announcement.bg_color }}>
                <div className="px-4 py-2 text-center text-[10px] font-bold" style={{ color: announcement.text_color }}>
                  {previewText || t('معاينة النص هنا', 'Preview text here')}
                </div>
              </div>
              <div className="h-6 bg-[#2A221E] flex items-center justify-center">
                <div className="w-8 h-1 bg-[#A69B93]/30 rounded" />
              </div>
              <div className="bg-[#110E0C] p-3 space-y-2">
                <div className="h-2 bg-[#2A221E] rounded w-3/4" />
                <div className="h-2 bg-[#2A221E] rounded w-1/2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnnouncementManager;
