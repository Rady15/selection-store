import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import { useCart } from '../context/CartContext';
import { Product, QuizQuestion, QuizSettings } from '../types';
import ProductCard from '../components/storefront/ProductCard';
import { Loader2, RotateCcw } from 'lucide-react';

interface CoffeeFinderPageProps {
  onNavigate: (path: string) => void;
}

export const CoffeeFinderPage: React.FC<CoffeeFinderPageProps> = ({ onNavigate }) => {
  const { language, t } = useLanguage();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [settings, setSettings] = useState<QuizSettings | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [matchedProducts, setMatchedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/admin/quiz').then(r => r.json())
    ])
      .then(([products, quiz]) => {
        setAllProducts(products);
        const qs = quiz.questions || quiz;
        const s = quiz.settings || { base_score: 70, results_count: 3, badge_ar: '', badge_en: '', title_ar: '', title_en: '', subtitle_ar: '', subtitle_en: '' };
        setSettings(s);
        const enabled = qs.filter((q: QuizQuestion) => q.is_enabled).sort((a: QuizQuestion, b: QuizQuestion) => a.sort_order - b.sort_order);
        setQuestions(enabled);
        if (enabled.length > 0) setStep(1);
        setLoading(false);
      })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  const getFieldValue = (product: Product, field: string): string | string[] => {
    return (product as any)[field] ?? '';
  };

  const evaluateRule = (product: Product, field: string, operator: string, value: string): boolean => {
    if (!value) return false;
    const fieldVal = getFieldValue(product, field);
    if (Array.isArray(fieldVal)) {
      if (operator === 'includes') return fieldVal.some(v => v.toLowerCase().includes(value.toLowerCase()));
      if (operator === 'equals') return fieldVal.some(v => v.toLowerCase() === value.toLowerCase());
    } else if (typeof fieldVal === 'string') {
      if (operator === 'includes') return fieldVal.toLowerCase().includes(value.toLowerCase());
      if (operator === 'equals') return fieldVal.toLowerCase() === value.toLowerCase();
    }
    return false;
  };

  const calculateScores = (ans: Record<string, string>) => {
    const baseScore = settings?.base_score ?? 70;
    return allProducts.map(product => {
      let score = baseScore;

      for (const q of questions) {
        const answerId = ans[q.id];
        if (!answerId) continue;
        const option = q.options.find(o => o.id === answerId);
        if (!option || option.score_rules.length === 0) continue;

        let maxPoints = 0;
        for (const rule of option.score_rules) {
          if (evaluateRule(product, rule.field, rule.operator, rule.value)) {
            if (rule.points > maxPoints) maxPoints = rule.points;
          }
        }
        score += maxPoints;
      }

      return { product, score };
    });
  };

  const selectAnswer = (qId: string, optId: string) => {
    const newAnswers = { ...answers, [qId]: optId };
    setAnswers(newAnswers);

    const currentIdx = questions.findIndex(q => q.id === qId);
    if (currentIdx < questions.length - 1) {
      setStep(currentIdx + 2);
    } else {
      const scored = calculateScores(newAnswers);
      scored.sort((a, b) => b.score - a.score);
      setMatchedProducts(scored.map(s => s.product));
      setStep(questions.length + 1);
    }
  };

  const resetQuiz = () => {
    setStep(1);
    setAnswers({});
    setMatchedProducts([]);
  };

  if (loading) {
    return (
      <div className="bg-[#110E0C] text-[#F8F5F0] min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#D99B26]" />
      </div>
    );
  }

  const currentQuestion = questions[step - 1];

  return (
    <div className="bg-[#110E0C] text-[#F8F5F0] min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">

        {/* Header Title */}
        <div className="text-center space-y-3">
          {settings && (
            <span className="inline-flex items-center gap-1.5 bg-[#8C532B]/30 border border-[#D99B26]/50 text-[#D99B26] text-xs font-bold px-3.5 py-1 rounded-full uppercase">
              {language === 'ar' ? settings.badge_ar : settings.badge_en}
            </span>
          )}

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white font-serif">
            {language === 'ar' ? settings?.title_ar : settings?.title_en}
          </h1>

          {settings && (
            <p className="text-xs sm:text-sm text-[#D4C3B5] max-w-lg mx-auto">
              {language === 'ar' ? settings.subtitle_ar : settings.subtitle_en}
            </p>
          )}
        </div>

        {questions.length > 0 && (
          <>
            {/* Progress Bar */}
            <div className="flex items-center justify-between max-w-md mx-auto text-xs font-bold text-[#A69B93]">
              {questions.map((q, i) => (
                <span key={q.id} className={step >= i + 1 ? 'text-[#D99B26]' : ''}>
                  {i + 1}. {language === 'ar' ? q.title_ar.replace(/^.*?: /, '') : q.title_en.replace(/^.*?: /, '')}
                </span>
              ))}
            </div>

            <div className="w-full bg-[#1C1613] h-2 rounded-full overflow-hidden border border-[#2A221E] max-w-md mx-auto">
              <div
                className="bg-[#D99B26] h-full transition-all duration-300"
                style={{ width: `${(step / (questions.length + 1)) * 100}%` }}
              />
            </div>
          </>
        )}

        {/* Questions */}
        {currentQuestion && (
          <div className="p-8 rounded-3xl bg-[#1C1613] border border-[#2A221E] space-y-6 animate-fade-in" key={currentQuestion.id}>
            <h3 className="font-extrabold text-lg text-white text-center">
              {language === 'ar' ? currentQuestion.title_ar : currentQuestion.title_en}
            </h3>

            <div className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))` }}
            >
              {currentQuestion.options.map(item => (
                <button
                  key={item.id}
                  onClick={() => selectAnswer(currentQuestion.id, item.id)}
                  className={`p-5 rounded-2xl border text-center sm:text-start transition cursor-pointer flex items-center gap-4 ${answers[currentQuestion.id] === item.id
                      ? 'bg-[#8C532B] text-white border-[#D99B26]'
                      : 'bg-[#110E0C] text-[#D4C3B5] border-[#2A221E] hover:border-[#8C532B]'
                    }`}
                >
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="w-8 h-8 object-contain flex-shrink-0 rounded" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : item.icon ? (
                    <span className="text-2xl flex-shrink-0">{item.icon}</span>
                  ) : null}
                  <span className="font-bold text-sm">
                    {language === 'ar' ? item.label_ar : item.label_en}
                  </span>
                </button>
              ))}
            </div>

            {step > 1 && (
              <div className="flex justify-between">
                <button
                  onClick={() => setStep(step - 1)}
                  className="text-xs text-[#A69B93] hover:underline cursor-pointer"
                >
                  ← {t('السابق', 'Back')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {step === questions.length + 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-6 rounded-3xl bg-[#1C1613] border border-[#D99B26]/50 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-lg text-[#D99B26]">
                  🎉 {t('المحصول المثالي المطابق لذوقك 100%', 'Your Perfect Crop Matches!')}
                </h3>
                <p className="text-xs text-[#A69B93] mt-1">
                  {t('استناداً على معايير اختيارك تم ترتيب النتائج الأكثر ملاءمة لك.', 'Here are the top specialty micro-lots matching your brew profile.')}
                </p>
              </div>

              <button
                onClick={resetQuiz}
                className="bg-[#2A221E] hover:bg-[#8C532B] text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('إعادة الاختبار', 'Retake Quiz')}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {matchedProducts.slice(0, settings?.results_count || 3).map(prod => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CoffeeFinderPage;