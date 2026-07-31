import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { HomepageSection } from '../../types';
import { Layers, Eye, EyeOff, Save, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';

export const AdminHomepageEditor: React.FC = () => {
  const { language, t } = useLanguage();
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/homepage')
      .then(async res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => setSections(data.sort((a: HomepageSection, b: HomepageSection) => a.sort_order - b.sort_order)))
      .catch(err => console.error(err));
  }, []);

  const handleToggleEnable = (id: string) => {
    setSections(sections.map(s => s.id === id ? { ...s, is_enabled: !s.is_enabled } : s));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newSections = [...sections];
    [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
    newSections.forEach((s, i) => s.sort_order = i + 1);
    setSections(newSections);
  };

  const handleMoveDown = (index: number) => {
    if (index === sections.length - 1) return;
    const newSections = [...sections];
    [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
    newSections.forEach((s, i) => s.sort_order = i + 1);
    setSections(newSections);
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch('/api/admin/homepage', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sections)
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      hero_slider: { ar: 'سلايدر رئيسي', en: 'Hero Slider' },
      benefits: { ar: 'مميزات و مزايا', en: 'Benefits Bar' },
      coffee_quiz: { ar: 'دعوة لاختبار القهوة', en: 'Coffee Quiz Callout' },
      featured_categories: { ar: 'أقسام مميزة', en: 'Featured Categories' },
      product_carousel: { ar: 'كرسلة منتجات', en: 'Product Carousel' },
      values_carousel: { ar: 'قيم العلامة التجارية', en: 'Values Carousel' },
      roastery_story: { ar: 'قصة المحمصة', en: 'Roastery Story' },
      testimonials: { ar: 'شهادات العملاء', en: 'Testimonials' },
      newsletter: { ar: 'النشرة البريدية', en: 'Newsletter' }
    };
    return labels[type]?.[language === 'ar' ? 'ar' : 'en'] || type;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-white font-serif">{t('محرر أقسام الصفحة الرئيسية', 'Homepage Section Builder')}</h1>
          <p className="text-xs text-[#A69B93] mt-0.5">{t('إظهار/إخفاء وإعادة ترتيب أقسام الواجهة الرئيسية', 'Toggle visibility and reorder homepage sections')}</p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#8C532B] hover:bg-[#A86434] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? t('جاري الحفظ...', 'Saving...') : saved ? t('تم الحفظ!', 'Saved!') : t('حفظ', 'Save')}</span>
        </button>
      </div>

      <div className="space-y-2">
        {sections.map((sec, index) => (
          <div key={sec.id} className={`p-4 rounded-2xl border flex items-center justify-between transition ${
            sec.is_enabled ? 'bg-[#1C1613] border-[#2A221E]' : 'bg-[#1C1613]/50 border-[#2A221E]/50 opacity-60'
          }`}>
            <div className="flex items-center gap-3">
              <GripVertical className="w-4 h-4 text-[#A69B93]" />
              <div className="p-2.5 rounded-xl bg-[#110E0C] text-[#D99B26]">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">
                  {sec.title_ar || sec.title_en || getTypeLabel(sec.type)}
                </h4>
                <span className="text-[10px] text-[#A69B93] block font-mono">{sec.type} · {t('الترتيب', 'Order')}: {sec.sort_order}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                className="p-1.5 rounded-lg bg-[#110E0C] text-[#A69B93] hover:text-[#D99B26] disabled:opacity-30 transition cursor-pointer"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleMoveDown(index)}
                disabled={index === sections.length - 1}
                className="p-1.5 rounded-lg bg-[#110E0C] text-[#A69B93] hover:text-[#D99B26] disabled:opacity-30 transition cursor-pointer"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleToggleEnable(sec.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  sec.is_enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}
              >
                {sec.is_enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span>{sec.is_enabled ? t('ظاهر', 'Visible') : t('مخفي', 'Hidden')}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminHomepageEditor;
