import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../context/LanguageContext';
import { HeroSlide } from '../../types';
import { ChevronLeft, ChevronRight, ArrowLeft, ArrowRight } from 'lucide-react';

interface HeroSliderProps {
  slides: HeroSlide[];
  onNavigate: (path: string) => void;
}

export const HeroSlider: React.FC<HeroSliderProps> = ({ slides, onNavigate }) => {
  const { language } = useLanguage();
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    if (!slides || slides.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides]);

  if (!slides || slides.length === 0) return null;

  const currentSlide = slides[currentIdx] || slides[0];

  return (
    <div className="relative w-full min-h-[500px] sm:min-h-[600px] bg-[#110E0C] overflow-hidden flex items-center justify-center border-b border-[#2A221E]">

      {/* Background Desktop & Mobile Images with Gradient Overlay */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 z-0"
        >
          <picture>
            <source media="(max-width: 640px)" srcSet={currentSlide.image_mobile || currentSlide.image_desktop} />
            <img
              src={currentSlide.image_desktop}
              alt={currentSlide.title_ar}
              className="w-full h-full object-cover opacity-40"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-t from-[#110E0C] via-[#110E0C]/70 to-[#110E0C]/30" />
        </motion.div>
      </AnimatePresence>

      {/* Content Area */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-4 sm:space-y-5 py-12 sm:py-16">

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6 }}
            className="space-y-3 sm:space-y-4"
          >
            {/* Badge */}
            {currentSlide.badge_ar && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8C532B]/30 border border-[#D99B26]/50 text-[#D99B26] text-[11px] sm:text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                <span>{language === 'ar' ? currentSlide.badge_ar : currentSlide.badge_en}</span>
              </div>
            )}

            {/* Title with Wave Gradient Color Fill Effect */}
            <h1 className="text-2xl sm:text-5xl lg:text-6xl font-extrabold font-serif leading-tight max-w-4xl mx-auto animate-cup-fill px-2">
              {language === 'ar' ? currentSlide.title_ar : currentSlide.title_en}
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-lg text-[#D4C3B5] max-w-2xl mx-auto leading-relaxed px-2">
              {language === 'ar' ? currentSlide.subtitle_ar : currentSlide.subtitle_en}
            </p>

            {/* CTA Button */}
            <div className="pt-2 sm:pt-4">
              <button
                onClick={() => onNavigate(currentSlide.cta_link)}
                className="bg-[#8C532B] hover:bg-[#A86434] text-white px-6 sm:px-8 py-3 sm:py-4 rounded-2xl text-xs sm:text-base font-bold transition duration-300 shadow-2xl shadow-[#8C532B]/50 cursor-pointer inline-flex items-center gap-2 group transform active:scale-95"
              >
                <span>{language === 'ar' ? currentSlide.cta_text_ar : currentSlide.cta_text_en}</span>
                {language === 'ar' ? (
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition" />
                ) : (
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition" />
                )}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

      </div>

      {/* Slide Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={() => setCurrentIdx(prev => (prev === 0 ? slides.length - 1 : prev - 1))}
            className="absolute top-1/2 left-2 sm:left-4 -translate-y-1/2 p-2 sm:p-2.5 rounded-full bg-[#1C1613]/80 hover:bg-[#8C532B] text-white border border-[#2A221E] transition cursor-pointer z-20 backdrop-blur"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            onClick={() => setCurrentIdx(prev => (prev + 1) % slides.length)}
            className="absolute top-1/2 right-2 sm:right-4 -translate-y-1/2 p-2 sm:p-2.5 rounded-full bg-[#1C1613]/80 hover:bg-[#8C532B] text-white border border-[#2A221E] transition cursor-pointer z-20 backdrop-blur"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Indicators Dots */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIdx(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${currentIdx === idx ? 'w-8 bg-[#D99B26]' : 'w-2 bg-[#2A221E]'
                  }`}
              />
            ))}
          </div>
        </>
      )}

    </div>
  );
};

export default HeroSlider;
