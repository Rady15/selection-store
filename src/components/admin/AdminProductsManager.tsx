import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useCurrency } from '../../context/CurrencyContext';
import { Product } from '../../types';
import {
  Plus,
  Trash2,
  Edit,
  Search,
  Check,
  X,
  Package,
  Coffee,
  AlertTriangle
} from 'lucide-react';
import { ImageUploader } from './ImageUploader';

export const AdminProductsManager: React.FC = () => {
  const { language, t } = useLanguage();
  const { formatPrice } = useCurrency();

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slug, setSlug] = useState('');
  const [categorySlug, setCategorySlug] = useState('coffee-crops');
  const [price, setPrice] = useState(65);
  const [salePrice, setSalePrice] = useState<number | undefined>(undefined);
  const [stock, setStock] = useState(25);
  const [originCountryAr, setOriginCountryAr] = useState('إثيوبيا');
  const [processAr, setProcessAr] = useState('مجففة');
  const [tastingNotesAr, setTastingNotesAr] = useState('توت أزرق، ياسمين، شوكولاتة');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=800&q=80');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = () => {
    fetch('/api/products')
      .then(async res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => setProducts(data))
      .catch(err => console.error(err));
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setNameAr('');
    setNameEn('');
    setSlug('');
    setCategorySlug('coffee-crops');
    setPrice(65);
    setSalePrice(undefined);
    setStock(25);
    setOriginCountryAr('إثيوبيا');
    setProcessAr('مجففة');
    setTastingNotesAr('توت أزرق، ياسمين، شوكولاتة');
    setShowModal(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setNameAr(p.name_ar);
    setNameEn(p.name_en);
    setSlug(p.slug);
    setCategorySlug(p.category_slug);
    setPrice(p.price);
    setSalePrice(p.sale_price);
    setStock(p.stock);
    setOriginCountryAr(p.origin_country_ar);
    setProcessAr(p.process_ar);
    setTastingNotesAr(p.tasting_notes_ar.join('، '));
    setImageUrl(p.images[0] || '');
    setShowModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name_ar: nameAr,
      name_en: nameEn || nameAr,
      slug: slug || nameAr.toLowerCase().replace(/\s+/g, '-'),
      category_slug: categorySlug,
      subtitle_ar: 'محصول حظي بعناية ممتازة',
      subtitle_en: 'Micro-lot coffee bean',
      description_ar: 'محصول إثيوبي فاخر بدرجات تقييم عالية.',
      description_en: 'Specialty coffee micro-lot.',
      price: Number(price),
      sale_price: salePrice ? Number(salePrice) : undefined,
      stock: Number(stock),
      origin_country_ar: originCountryAr,
      origin_country_en: originCountryAr,
      process_ar: processAr,
      process_en: processAr,
      tasting_notes_ar: tastingNotesAr.split('،').map(s => s.trim()),
      tasting_notes_en: tastingNotesAr.split('،').map(s => s.trim()),
      images: [imageUrl],
      weight_options: [{ value: '250g', label_ar: '250 جرام', label_en: '250g', priceModifier: 0 }],
      grind_options: ['beans', 'v60', 'espresso']
    };

    try {
      if (editingProduct) {
        await fetch(`/api/admin/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      setShowModal(false);
      loadProducts();
    } catch (err) {
      alert('حدث خطأ في حفظ المنتج');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm(t('هل أنت تأكد من حذف هذا المنتج؟', 'Delete this product?'))) {
      await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      loadProducts();
    }
  };

  const filtered = products.filter(p =>
    p.name_ar.includes(search) || p.origin_country_ar.includes(search)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white font-serif">
            {t('إدارة المحاصيل والمنتجات', 'Manage Products & Micro-lots')}
          </h1>
          <p className="text-xs text-[#A69B93] mt-0.5">
            {t('إضافة تعديل أو حذف محاصيل القهوة والمعدات والأظرف المقطرة', 'Add, edit, or remove coffee crops, gear and drip bags')}
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="bg-[#8C532B] hover:bg-[#A86434] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-lg cursor-pointer flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>{t('إضافة محصول جديد', 'Add New Product')}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A69B93]" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('بحث عن اسم المحصول أو بلد المنشأ...', 'Search products...')}
          className="w-full bg-[#1C1613] border border-[#2A221E] rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#D99B26]"
        />
      </div>

      {/* Table */}
      <div className="bg-[#1C1613] border border-[#2A221E] rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-[#110E0C] text-[#A69B93] uppercase font-bold border-b border-[#2A221E]">
              <tr>
                <th className="p-4 text-start">{t('المنتج والمحصول', 'Product')}</th>
                <th className="p-4 text-start">{t('بلد المنشأ والمعالجة', 'Origin & Process')}</th>
                <th className="p-4 text-start">{t('السعر', 'Price')}</th>
                <th className="p-4 text-start">{t('المخزون', 'Stock')}</th>
                <th className="p-4 text-end">{t('الإجراءات', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A221E]/60 text-[#D4C3B5]">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-[#110E0C]/50 transition">
                  <td className="p-4 flex items-center gap-3">
                    <img src={p.images[0]} alt="" className="w-10 h-10 rounded-xl object-cover bg-[#110E0C]" />
                    <div>
                      <span className="font-bold text-white block text-sm">{language === 'ar' ? p.name_ar : p.name_en}</span>
                      <span className="text-[10px] text-[#A69B93]">{p.category_slug}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="font-bold text-[#D99B26] block">{p.origin_country_ar}</span>
                    <span className="text-[10px] text-[#A69B93]">{p.process_ar}</span>
                  </td>
                  <td className="p-4 font-bold text-white">
                    {formatPrice(p.sale_price ?? p.price)}
                  </td>
                  <td className="p-4">
                    {p.stock <= 5 ? (
                      <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-bold">
                        {p.stock} ({t('منخفض', 'Low')})
                      </span>
                    ) : (
                      <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">
                        {p.stock}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-end space-x-2 space-x-reverse">
                    <button
                      onClick={() => handleOpenEditModal(p)}
                      className="p-1.5 rounded-lg bg-[#2A221E] text-white hover:bg-[#8C532B] transition cursor-pointer inline-block"
                      title={t('تعديل', 'Edit')}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p.id)}
                      className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-600 hover:text-white transition cursor-pointer inline-block"
                      title={t('حذف', 'Delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-xl bg-[#110E0C] text-white border border-[#2A221E] rounded-3xl p-6 shadow-2xl z-50 max-h-[90vh] overflow-y-auto">
            
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1 text-[#A69B93] hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <h3 className="font-extrabold text-base text-white">
                {editingProduct ? t('تعديل محصول/منتج', 'Edit Product') : t('إضافة محصول جديد', 'Add New Product')}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('الاسم بالعربية', 'Arabic Name')}</label>
                  <input
                    type="text"
                    required
                    value={nameAr}
                    onChange={e => setNameAr(e.target.value)}
                    placeholder="شلشلي إثيوبي"
                    className="w-full bg-[#1C1613] border border-[#2A221E] rounded-xl p-2.5 text-white focus:outline-none focus:border-[#D99B26]"
                  />
                </div>

                <div>
                  <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('الاسم بالإنجليزية', 'English Name')}</label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={e => setNameEn(e.target.value)}
                    placeholder="Ethiopia Chelchele"
                    className="w-full bg-[#1C1613] border border-[#2A221E] rounded-xl p-2.5 text-white focus:outline-none focus:border-[#D99B26]"
                  />
                </div>

                <div>
                  <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('السعر (﷼)', 'Price (SAR)')}</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={e => setPrice(Number(e.target.value))}
                    className="w-full bg-[#1C1613] border border-[#2A221E] rounded-xl p-2.5 text-white focus:outline-none focus:border-[#D99B26]"
                  />
                </div>

                <div>
                  <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('سعر التخفيض (اختياري)', 'Sale Price (Optional)')}</label>
                  <input
                    type="number"
                    value={salePrice || ''}
                    onChange={e => setSalePrice(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-[#1C1613] border border-[#2A221E] rounded-xl p-2.5 text-white focus:outline-none focus:border-[#D99B26]"
                  />
                </div>

                <div>
                  <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('كمية المخزون', 'Stock Quantity')}</label>
                  <input
                    type="number"
                    required
                    value={stock}
                    onChange={e => setStock(Number(e.target.value))}
                    className="w-full bg-[#1C1613] border border-[#2A221E] rounded-xl p-2.5 text-white focus:outline-none focus:border-[#D99B26]"
                  />
                </div>

                <div>
                  <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('بلد المنشأ', 'Origin Country')}</label>
                  <input
                    type="text"
                    required
                    value={originCountryAr}
                    onChange={e => setOriginCountryAr(e.target.value)}
                    placeholder="إثيوبيا / كولومبيا / اليمن"
                    className="w-full bg-[#1C1613] border border-[#2A221E] rounded-xl p-2.5 text-white focus:outline-none focus:border-[#D99B26]"
                  />
                </div>

                <div>
                  <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('نوع المعالجة', 'Process')}</label>
                  <input
                    type="text"
                    required
                    value={processAr}
                    onChange={e => setProcessAr(e.target.value)}
                    placeholder="مجففة / مغسولة"
                    className="w-full bg-[#1C1613] border border-[#2A221E] rounded-xl p-2.5 text-white focus:outline-none focus:border-[#D99B26]"
                  />
                </div>

                <div>
                  <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('الإيحاءات (مفصولة بفاصلة)', 'Tasting Notes')}</label>
                  <input
                    type="text"
                    required
                    value={tastingNotesAr}
                    onChange={e => setTastingNotesAr(e.target.value)}
                    placeholder="توت أزرق، ياسمين، شوكولاتة"
                    className="w-full bg-[#1C1613] border border-[#2A221E] rounded-xl p-2.5 text-white focus:outline-none focus:border-[#D99B26]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <ImageUploader value={imageUrl} onChange={setImageUrl} label={t('رابط الصورة الرئيسية', 'Image URL')} required />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#8C532B] hover:bg-[#A86434] text-white py-3 rounded-xl text-xs font-bold transition shadow-lg cursor-pointer"
              >
                {t('حفظ المنتج', 'Save Product')}
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminProductsManager;
