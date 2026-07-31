import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import {
  Plus, Trash2, Edit, X, Grid3X3, Image, Star, StarOff, Loader2
} from 'lucide-react';
import { ImageUploader } from './ImageUploader';

interface Category {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  slug: string;
  image: string;
  icon: string;
  sort_order: number;
  featured: boolean;
}

const emptyCategory: Category = {
  id: '',
  name_ar: '',
  name_en: '',
  description_ar: '',
  description_en: '',
  slug: '',
  image: '',
  icon: '',
  sort_order: 0,
  featured: false,
};

export const AdminCategoriesManager: React.FC = () => {
  const { language, t } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Category>(emptyCategory);

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setCategories(data.sort((a: Category, b: Category) => a.sort_order - b.sort_order));
    } catch {
      setError(t('فشل في تحميل الأقسام', 'Failed to load categories'));
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyCategory, sort_order: categories.length });
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({ ...cat });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingId ? 'POST' : 'POST';
      const url = editingId ? `/api/categories/${editingId}` : '/api/categories';
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setShowModal(false);
      loadCategories();
    } catch {
      setError(t('فشل في الحفظ', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('هل أنت متأكد من حذف هذا القسم؟', 'Delete this category?'))) return;
    try {
      await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      loadCategories();
    } catch {
      setError(t('فشل في الحذف', 'Failed to delete'));
    }
  };

  const updateField = (field: keyof Category, value: string | number | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-extrabold text-white font-serif">{t('إدارة الأقسام', 'Categories Manager')}</h1>
          <p className="text-xs text-[#A69B93] mt-0.5">{t('إدارة أقسام المنتجات', 'Manage product categories')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-5 rounded-3xl bg-[#1C1613] border border-[#2A221E] animate-pulse">
              <div className="w-full h-32 bg-[#2A221E] rounded-xl mb-3" />
              <div className="h-4 bg-[#2A221E] rounded w-2/3 mb-2" />
              <div className="h-3 bg-[#2A221E] rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-white font-serif">{t('إدارة الأقسام', 'Categories Manager')}</h1>
          <p className="text-xs text-[#A69B93] mt-0.5">{t('إدارة أقسام المنتجات', 'Manage product categories')}</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-[#8C532B] hover:bg-[#A86434] text-white px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          <span>{t('إضافة قسم', 'Add Category')}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <X className="w-4 h-4" />
          {error}
          <button onClick={() => setError(null)} className="mr-auto cursor-pointer"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(cat => (
          <div key={cat.id} className="p-5 rounded-3xl bg-[#1C1613] border border-[#2A221E] space-y-3">
            <div className="w-full h-32 rounded-xl overflow-hidden bg-[#2A221E] flex items-center justify-center">
              {cat.image ? (
                <img src={cat.image} alt={language === 'ar' ? cat.name_ar : cat.name_en} className="w-full h-full object-cover" />
              ) : (
                <Image className="w-8 h-8 text-[#A69B93]" />
              )}
            </div>

            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-white text-sm">{language === 'ar' ? cat.name_ar : cat.name_en}</h3>
                <p className="text-[10px] text-[#A69B93] font-mono">/{cat.slug}</p>
              </div>
              <span className="text-[9px] text-[#A69B93] bg-[#2A221E] px-2 py-0.5 rounded font-bold">
                #{cat.sort_order}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-[#2A221E]">
              <button
                onClick={() => { setForm(prev => ({ ...prev, featured: !prev.featured })); }}
                className={`flex items-center gap-1 text-[10px] font-bold cursor-pointer ${
                  cat.featured ? 'text-[#D99B26]' : 'text-[#A69B93]'
                }`}
                disabled
              >
                {cat.featured ? <Star className="w-3.5 h-3.5 fill-current" /> : <StarOff className="w-3.5 h-3.5" />}
                {cat.featured ? t('مميز', 'Featured') : t('عادي', 'Normal')}
              </button>
              <div className="flex items-center gap-1.5">
                <button onClick={() => openEdit(cat)}
                  className="p-1.5 rounded-lg bg-[#8C532B]/20 text-[#8C532B] hover:bg-[#8C532B] hover:text-white transition cursor-pointer">
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(cat.id)}
                  className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-600 hover:text-white transition cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="col-span-full p-8 text-center text-[#A69B93] bg-[#1C1613] rounded-3xl border border-[#2A221E]">
            <Grid3X3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            {t('لا توجد أقسام', 'No categories yet')}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#110E0C] text-white border border-[#2A221E] rounded-3xl p-6 shadow-2xl z-50 space-y-4 text-xs">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-[#A69B93] hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-base text-white">
              {editingId ? t('تعديل القسم', 'Edit Category') : t('إضافة قسم جديد', 'Add New Category')}
            </h3>

            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('الاسم بالعربي', 'Arabic Name')}</label>
                  <input type="text" required value={form.name_ar} onChange={e => updateField('name_ar', e.target.value)}
                    className="w-full bg-[#1C1613] border border-[#2A221E] rounded-xl p-2.5 text-white" />
                </div>
                <div>
                  <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('الاسم بالإنجليزي', 'English Name')}</label>
                  <input type="text" required value={form.name_en} onChange={e => updateField('name_en', e.target.value)}
                    className="w-full bg-[#1C1613] border border-[#2A221E] rounded-xl p-2.5 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('الوصف بالعربي', 'Arabic Description')}</label>
                  <textarea rows={2} value={form.description_ar} onChange={e => updateField('description_ar', e.target.value)}
                    className="w-full bg-[#1C1613] border border-[#2A221E] rounded-xl p-2.5 text-white resize-none" />
                </div>
                <div>
                  <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('الوصف بالإنجليزي', 'English Description')}</label>
                  <textarea rows={2} value={form.description_en} onChange={e => updateField('description_en', e.target.value)}
                    className="w-full bg-[#1C1613] border border-[#2A221E] rounded-xl p-2.5 text-white resize-none" />
                </div>
              </div>

              <div>
                <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('الرابط المختصر', 'Slug')}</label>
                <input type="text" required value={form.slug} onChange={e => updateField('slug', e.target.value)}
                  placeholder="category-slug"
                  className="w-full bg-[#1C1613] border border-[#2A221E] rounded-xl p-2.5 text-white font-mono" />
              </div>

              <ImageUploader value={form.image} onChange={val => updateField('image', val)} label={t('رابط الصورة', 'Image URL')} />

              <div>
                <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('الأيقونة', 'Icon')}</label>
                <input type="text" value={form.icon} onChange={e => updateField('icon', e.target.value)}
                  placeholder="coffee"
                  className="w-full bg-[#1C1613] border border-[#2A221E] rounded-xl p-2.5 text-white" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('ترتيب العرض', 'Sort Order')}</label>
                  <input type="number" required value={form.sort_order} onChange={e => updateField('sort_order', Number(e.target.value))}
                    className="w-full bg-[#1C1613] border border-[#2A221E] rounded-xl p-2.5 text-white" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.featured} onChange={e => updateField('featured', e.target.checked)}
                      className="w-4 h-4 accent-[#D99B26]" />
                    <span className="text-[#D4C3B5] font-semibold">{t('قسم مميز', 'Featured Category')}</span>
                  </label>
                </div>
              </div>

              <button type="submit" disabled={saving}
                className="w-full bg-[#8C532B] hover:bg-[#A86434] text-white py-3 rounded-xl font-bold cursor-pointer transition flex items-center justify-center gap-2 disabled:opacity-50">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? t('حفظ التعديلات', 'Save Changes') : t('إضافة القسم', 'Add Category')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategoriesManager;
