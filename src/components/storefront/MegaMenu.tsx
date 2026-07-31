import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Category } from '../../types';
import { Coffee, Package, Zap, Sliders, CupSoda, ArrowLeft, ArrowRight } from 'lucide-react';

interface MegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export const MegaMenu: React.FC<MegaMenuProps> = ({ isOpen, onClose, onNavigate }) => {
  const { language, t } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/categories')
        .then(res => res.json())
        .then(data => setCategories(data))
        .catch(err => console.error(err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const iconsMap: Record<string, any> = {
    Coffee,
    Package,
    Zap,
    Sliders,
    CupSoda
  };

  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 w-[90vw] max-w-6xl bg-[#1C1613] border border-[#2A221E] rounded-2xl shadow-2xl p-6 grid grid-cols-12 gap-6 z-50 text-[#F8F5F0] backdrop-blur-md">

      {/* Category List Columns */}
      <div className="col-span-8 grid grid-cols-2 gap-4">
        {categories.map(cat => {
          const IconComponent = iconsMap[cat.icon || 'Coffee'] || Coffee;
          return (
            <div
              key={cat.id}
              onClick={() => {
                onNavigate(`/products?category=${cat.slug}`);
                onClose();
              }}
              className="group p-4 rounded-xl bg-[#110E0C]/60 hover:bg-[#8C532B]/20 border border-[#2A221E] hover:border-[#D99B26]/50 transition cursor-pointer flex items-start gap-3.5"
            >
              <div className="p-2.5 rounded-lg bg-[#8C532B]/20 text-[#D99B26] group-hover:scale-110 transition">
                <IconComponent className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#F8F5F0] group-hover:text-[#D99B26] transition flex items-center gap-1.5">
                  <span>{language === 'ar' ? cat.name_ar : cat.name_en}</span>
                  {language === 'ar' ? (
                    <ArrowLeft className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0" />
                  )}
                </h4>
                <p className="text-xs text-[#A69B93] mt-1 line-clamp-2">
                  {language === 'ar' ? cat.description_ar : cat.description_en}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Featured Promo Card Banner */}
      <div className="col-span-4 rounded-xl overflow-hidden relative group border border-[#2A221E] min-h-[220px] flex flex-col justify-end p-5">
        <img
          src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80"
          alt="Featured Roastery Box"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#110E0C] via-[#110E0C]/60 to-transparent"></div>

        <div className="relative z-10">
          <span className="inline-flex items-center gap-1 bg-[#D99B26] text-black text-[10px] font-bold px-2 py-0.5 rounded-md mb-2">
            {t('عرض خاص', 'SPECIAL OFFER')}
          </span>
          <h5 className="font-bold text-base text-white">
            {t('صندوق اكتشاف المحاصيل المختصة', 'Discovery Crops Tasting Box')}
          </h5>
          <p className="text-xs text-[#D4C3B5] mt-1 mb-3">
            {t('4 محاصيل عالمية محمصة طازجة بخصم 15%', '4 World-class crops with 15% discount')}
          </p>
          <button
            onClick={() => {
              onNavigate('/products/specialty-crop-discovery-box');
              onClose();
            }}
            className="w-full bg-[#8C532B] hover:bg-[#A86434] text-white py-2 rounded-lg text-xs font-bold transition shadow cursor-pointer"
          >
            {t('اكتشف الصندوق الآن', 'Shop Box Now')}
          </button>
        </div>
      </div>

    </div>
  );
};

export default MegaMenu;
