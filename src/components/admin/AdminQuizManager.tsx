import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { QuizQuestion, QuizConfig } from '../../types';
import { Plus, Trash2, ArrowUp, ArrowDown, Save, AlertCircle, Check, Eye, Image as ImageIcon } from 'lucide-react';

// Fields an admin can score a product against in quiz rules.
// Each entry carries a user-friendly bilingual label so admins understand
// exactly which product attribute the rule matches.
const QUIZ_FIELDS: { value: string; label_ar: string; label_en: string }[] = [
  { value: 'name_ar', label_ar: 'الاسم (عربي)', label_en: 'Name (AR)' },
  { value: 'name_en', label_ar: 'الاسم (إنجليزي)', label_en: 'Name (EN)' },
  { value: 'subtitle_ar', label_ar: 'العنوان الفرعي (عربي)', label_en: 'Subtitle (AR)' },
  { value: 'subtitle_en', label_ar: 'العنوان الفرعي (إنجليزي)', label_en: 'Subtitle (EN)' },
  { value: 'description_ar', label_ar: 'الوصف (عربي)', label_en: 'Description (AR)' },
  { value: 'description_en', label_ar: 'الوصف (إنجليزي)', label_en: 'Description (EN)' },
  { value: 'tasting_notes_ar', label_ar: 'نكهات التذوق (عربي)', label_en: 'Tasting Notes (AR)' },
  { value: 'tasting_notes_en', label_ar: 'نكهات التذوق (إنجليزي)', label_en: 'Tasting Notes (EN)' },
  { value: 'process_ar', label_ar: 'طريقة المعالجة (عربي)', label_en: 'Process (AR)' },
  { value: 'process_en', label_ar: 'طريقة المعالجة (إنجليزي)', label_en: 'Process (EN)' },
  { value: 'roast_level_ar', label_ar: 'درجة التحميص (عربي)', label_en: 'Roast Level (AR)' },
  { value: 'roast_level_en', label_ar: 'درجة التحميص (إنجليزي)', label_en: 'Roast Level (EN)' },
  { value: 'origin_country_ar', label_ar: 'بلد المنشأ (عربي)', label_en: 'Origin Country (AR)' },
  { value: 'origin_country_en', label_ar: 'بلد المنشأ (إنجليزي)', label_en: 'Origin Country (EN)' },
  { value: 'region_ar', label_ar: 'المنطقة المزروعة (عربي)', label_en: 'Growing Region (AR)' },
  { value: 'region_en', label_ar: 'المنطقة المزروعة (إنجليزي)', label_en: 'Growing Region (EN)' },
  { value: 'variety', label_ar: 'نوع البن (Variety)', label_en: 'Coffee Variety' },
  { value: 'altitude', label_ar: 'الارتفاع (Altitude)', label_en: 'Altitude' },
  { value: 'category_slug', label_ar: 'الفئة (Category)', label_en: 'Category' },
  { value: 'subcategory_id', label_ar: 'الفئة الفرعية', label_en: 'Subcategory' },
  { value: 'sku', label_ar: 'رمز المنتج (SKU)', label_en: 'Product SKU' }
];

export const AdminQuizManager: React.FC = () => {
  const { t, language } = useLanguage();
  const [config, setConfig] = useState<QuizConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const dragItem = useRef<number | null>(null);

  useEffect(() => {
    fetch('/api/admin/quiz')
      .then(r => r.json())
      .then(data => {
        if (data.questions) {
          setConfig(data);
        } else {
          setConfig({ settings: { base_score: 70, results_count: 3, badge_ar: '', badge_en: '', title_ar: '', title_en: '', subtitle_ar: '', subtitle_en: '' }, questions: data });
        }
      })
      .catch(() => setMessage({ type: 'error', text: 'Failed to load quiz config' }));
  }, []);

  const validate = (): boolean => {
    const errs: string[] = [];
    if (!config) return false;
    if (config.questions.length === 0) errs.push('At least one question is required');
    config.questions.forEach((q, i) => {
      if (!q.title_ar.trim() || !q.title_en.trim()) errs.push(`Question ${i + 1}: Arabic and English titles required`);
      if (q.options.length === 0) errs.push(`Question ${i + 1}: At least one option required`);
      q.options.forEach((o, j) => {
        if (!o.label_ar.trim() || !o.label_en.trim()) errs.push(`Q${i + 1} Option ${j + 1}: Arabic and English labels required`);
      });
    });
    if (config.settings.results_count < 1) errs.push('Results count must be at least 1');
    if (config.settings.base_score < 0) errs.push('Base score must be 0 or more');
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !config) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/quiz', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!res.ok) throw new Error('Save failed');
      setMessage({ type: 'success', text: 'Saved successfully' });
      setTimeout(() => setMessage(null), 2000);
    } catch {
      setMessage({ type: 'error', text: 'Failed to save' });
    }
    setSaving(false);
  };

  const addQuestion = () => {
    if (!config) return;
    const nq: QuizQuestion = {
      id: `q-${Date.now()}`,
      title_ar: '',
      title_en: '',
      sort_order: config.questions.length + 1,
      is_enabled: true,
      options: []
    };
    setConfig({ ...config, questions: [...config.questions, nq] });
  };

  const removeQuestion = (qi: number) => {
    if (!config) return;
    setConfig({ ...config, questions: config.questions.filter((_, i) => i !== qi) });
  };

  const updateQuestion = (qi: number, field: string, value: any) => {
    if (!config) return;
    const qs = [...config.questions];
    (qs[qi] as any)[field] = value;
    setConfig({ ...config, questions: qs });
  };

  const moveQuestion = (qi: number, dir: -1 | 1) => {
    if (!config) return;
    const qs = [...config.questions];
    const target = qi + dir;
    if (target < 0 || target >= qs.length) return;
    [qs[qi], qs[target]] = [qs[target], qs[qi]];
    qs.forEach((q, i) => q.sort_order = i + 1);
    setConfig({ ...config, questions: qs });
  };

  const addOption = (qi: number) => {
    if (!config) return;
    const qs = [...config.questions];
    qs[qi].options.push({ id: `opt-${Date.now()}`, label_ar: '', label_en: '', icon: '', score_rules: [] });
    setConfig({ ...config, questions: qs });
  };

  const removeOption = (qi: number, oi: number) => {
    if (!config) return;
    const qs = [...config.questions];
    qs[qi].options = qs[qi].options.filter((_, i) => i !== oi);
    setConfig({ ...config, questions: qs });
  };

  const updateOption = (qi: number, oi: number, field: string, value: any) => {
    if (!config) return;
    const qs = [...config.questions];
    (qs[qi].options[oi] as any)[field] = value;
    setConfig({ ...config, questions: qs });
  };

  const moveOption = (qi: number, oi: number, dir: -1 | 1) => {
    if (!config) return;
    const qs = [...config.questions];
    const opts = [...qs[qi].options];
    const target = oi + dir;
    if (target < 0 || target >= opts.length) return;
    [opts[oi], opts[target]] = [opts[target], opts[oi]];
    qs[qi].options = opts;
    setConfig({ ...config, questions: qs });
  };

  const addRule = (qi: number, oi: number) => {
    if (!config) return;
    const qs = [...config.questions];
    qs[qi].options[oi].score_rules.push({ field: '', operator: 'includes', value: '', points: 15 });
    setConfig({ ...config, questions: qs });
  };

  const removeRule = (qi: number, oi: number, ri: number) => {
    if (!config) return;
    const qs = [...config.questions];
    qs[qi].options[oi].score_rules = qs[qi].options[oi].score_rules.filter((_, i) => i !== ri);
    setConfig({ ...config, questions: qs });
  };

  const updateRule = (qi: number, oi: number, ri: number, field: string, value: any) => {
    if (!config) return;
    const qs = [...config.questions];
    (qs[qi].options[oi].score_rules[ri] as any)[field] = value;
    setConfig({ ...config, questions: qs });
  };

  const updateSettings = (field: string, value: any) => {
    if (!config) return;
    setConfig({ ...config, settings: { ...config.settings, [field]: value } });
  };

  if (!config) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-white">
          {t('إدارة اختبار القهوة', 'Coffee Quiz Manager')}
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.open('/coffee-finder', '_blank')}
            className="bg-[#2A221E] hover:bg-[#3A322E] text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-[#3A322E]"
          >
            <Eye className="w-3.5 h-3.5" />
            {t('معاينة', 'Preview')}
          </button>
          <button
            onClick={addQuestion}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('إضافة سؤال', 'Add Question')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#D99B26] hover:bg-[#C88A1F] text-black px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? t('جاري الحفظ...', 'Saving...') : t('حفظ الكل', 'Save All')}
          </button>
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-2 text-xs font-bold p-3 rounded-xl ${message.type === 'success' ? 'bg-emerald-600/20 text-emerald-400' : 'bg-red-600/20 text-red-400'}`}>
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {errors.length > 0 && (
        <div className="flex flex-col gap-1 bg-red-600/20 border border-red-500/30 p-3 rounded-xl">
          {errors.map((e, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-red-400 font-bold">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {e}
            </div>
          ))}
        </div>
      )}

      {/* Settings Section */}
      <div className="p-5 rounded-3xl bg-[#1C1613] border border-[#2A221E] space-y-4">
        <h3 className="text-sm font-extrabold text-[#D99B26] border-b border-[#2A221E] pb-2">
          {t('إعدادات الاختبار', 'Quiz Settings')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-bold text-[#A69B93] block mb-1">{t('النتيجة الأساسية', 'Base Score')}</label>
            <input type="number" className="bg-[#0C0A09] border border-[#2A221E] rounded-lg px-3 py-2 text-xs text-white w-full"
              value={config.settings.base_score}
              onChange={e => updateSettings('base_score', parseInt(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[#A69B93] block mb-1">{t('عدد النتائج', 'Results Count')}</label>
            <input type="number" className="bg-[#0C0A09] border border-[#2A221E] rounded-lg px-3 py-2 text-xs text-white w-full"
              value={config.settings.results_count}
              onChange={e => updateSettings('results_count', parseInt(e.target.value) || 3)}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-[#A69B93] block mb-1">{t('الشارة (عربي)', 'Badge (AR)')}</label>
            <input className="bg-[#0C0A09] border border-[#2A221E] rounded-lg px-3 py-2 text-xs text-white w-full" dir="rtl"
              value={config.settings.badge_ar}
              onChange={e => updateSettings('badge_ar', e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[#A69B93] block mb-1">{t('الشارة (إنجليزي)', 'Badge (EN)')}</label>
            <input className="bg-[#0C0A09] border border-[#2A221E] rounded-lg px-3 py-2 text-xs text-white w-full"
              value={config.settings.badge_en}
              onChange={e => updateSettings('badge_en', e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[#A69B93] block mb-1">{t('العنوان (عربي)', 'Title (AR)')}</label>
            <input className="bg-[#0C0A09] border border-[#2A221E] rounded-lg px-3 py-2 text-xs text-white w-full" dir="rtl"
              value={config.settings.title_ar}
              onChange={e => updateSettings('title_ar', e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[#A69B93] block mb-1">{t('العنوان (إنجليزي)', 'Title (EN)')}</label>
            <input className="bg-[#0C0A09] border border-[#2A221E] rounded-lg px-3 py-2 text-xs text-white w-full"
              value={config.settings.title_en}
              onChange={e => updateSettings('title_en', e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold text-[#A69B93] block mb-1">{t('الوصف (عربي)', 'Subtitle (AR)')}</label>
            <input className="bg-[#0C0A09] border border-[#2A221E] rounded-lg px-3 py-2 text-xs text-white w-full" dir="rtl"
              value={config.settings.subtitle_ar}
              onChange={e => updateSettings('subtitle_ar', e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold text-[#A69B93] block mb-1">{t('الوصف (إنجليزي)', 'Subtitle (EN)')}</label>
            <input className="bg-[#0C0A09] border border-[#2A221E] rounded-lg px-3 py-2 text-xs text-white w-full"
              value={config.settings.subtitle_en}
              onChange={e => updateSettings('subtitle_en', e.target.value)}
            />
          </div>
        </div>
      </div>

      {config.questions.length === 0 && (
        <div className="p-8 rounded-3xl bg-[#1C1613] border border-[#2A221E] text-center text-[#A69B93] text-sm">
          {t('لا توجد أسئلة بعد. أضف سؤالاً للبدء.', 'No questions yet. Add a question to start.')}
        </div>
      )}

      {config.questions.map((q, qi) => (
        <div key={q.id} className="p-5 rounded-3xl bg-[#1C1613] border border-[#2A221E] space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveQuestion(qi, -1)} className="p-0.5 rounded hover:bg-[#2A221E] text-[#A69B93] hover:text-white transition cursor-pointer disabled:opacity-30" disabled={qi === 0}>
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button onClick={() => moveQuestion(qi, 1)} className="p-0.5 rounded hover:bg-[#2A221E] text-[#A69B93] hover:text-white transition cursor-pointer disabled:opacity-30" disabled={qi === config.questions.length - 1}>
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>
              <span className="text-[10px] font-bold text-[#D99B26] bg-[#2A221E] px-2 py-0.5 rounded flex-shrink-0">
                Q{qi + 1}
              </span>
              <input
                className="bg-[#0C0A09] border border-[#2A221E] rounded-lg px-3 py-1.5 text-xs text-white w-full max-w-[200px]"
                placeholder="العنوان بالعربية"
                value={q.title_ar}
                onChange={e => updateQuestion(qi, 'title_ar', e.target.value)}
                dir="rtl"
              />
              <input
                className="bg-[#0C0A09] border border-[#2A221E] rounded-lg px-3 py-1.5 text-xs text-white w-full max-w-[200px]"
                placeholder="Title (English)"
                value={q.title_en}
                onChange={e => updateQuestion(qi, 'title_en', e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-[10px] text-[#A69B93] cursor-pointer">
                <input
                  type="checkbox"
                  checked={q.is_enabled}
                  onChange={e => updateQuestion(qi, 'is_enabled', e.target.checked)}
                  className="accent-[#D99B26]"
                />
                {t('مفعل', 'Enabled')}
              </label>
              <button onClick={() => removeQuestion(qi)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#A69B93] uppercase tracking-wider">
                {t('الخيارات', 'Options')}
              </span>
              <button onClick={() => addOption(qi)} className="text-[10px] font-bold text-[#D99B26] hover:underline cursor-pointer">
                + {t('إضافة خيار', 'Add Option')}
              </button>
            </div>

            {q.options.map((o, oi) => (
              <div key={o.id} className="p-3 rounded-2xl bg-[#0C0A09] border border-[#2A221E] space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveOption(qi, oi, -1)} className="p-0.5 rounded hover:bg-[#1C1613] text-[#A69B93] hover:text-white transition cursor-pointer disabled:opacity-30" disabled={oi === 0}>
                      <ArrowUp className="w-2.5 h-2.5" />
                    </button>
                    <button onClick={() => moveOption(qi, oi, 1)} className="p-0.5 rounded hover:bg-[#1C1613] text-[#A69B93] hover:text-white transition cursor-pointer disabled:opacity-30" disabled={oi === q.options.length - 1}>
                      <ArrowDown className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <input
                    className="bg-[#1C1613] border border-[#2A221E] rounded-lg px-2 py-1 text-[11px] text-white w-10 text-center"
                    placeholder="icon"
                    value={o.icon}
                    onChange={e => updateOption(qi, oi, 'icon', e.target.value)}
                  />
                  <div className="relative flex-1 min-w-[100px]">
                    <input
                      className="bg-[#1C1613] border border-[#2A221E] rounded-lg px-2 py-1 text-[11px] text-white w-full pl-7"
                      placeholder={t('رابط الصورة (اختياري)', 'Image URL (optional)')}
                      value={o.image_url || ''}
                      onChange={e => updateOption(qi, oi, 'image_url', e.target.value)}
                    />
                    <ImageIcon className="w-3.5 h-3.5 text-[#A69B93] absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <input
                    className="bg-[#1C1613] border border-[#2A221E] rounded-lg px-2 py-1 text-[11px] text-white flex-1 min-w-[120px]"
                    placeholder="العربية"
                    value={o.label_ar}
                    onChange={e => updateOption(qi, oi, 'label_ar', e.target.value)}
                    dir="rtl"
                  />
                  <input
                    className="bg-[#1C1613] border border-[#2A221E] rounded-lg px-2 py-1 text-[11px] text-white flex-1 min-w-[120px]"
                    placeholder="English"
                    value={o.label_en}
                    onChange={e => updateOption(qi, oi, 'label_en', e.target.value)}
                  />
                  <button onClick={() => removeOption(qi, oi)} className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                <div className="pl-3 border-l-2 border-[#2A221E] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-[#A69B93] uppercase tracking-wider">
                      {t('قواعد التصحيح', 'Scoring Rules')}
                    </span>
                    <button onClick={() => addRule(qi, oi)} className="text-[9px] font-bold text-emerald-400 hover:underline cursor-pointer">
                      + {t('إضافة قاعدة', 'Add Rule')}
                    </button>
                  </div>
                  {o.score_rules.map((r, ri) => (
                    <div key={ri} className="flex items-center gap-1.5 flex-wrap">
                      <select
                        className="bg-[#1C1613] border border-[#2A221E] rounded-lg px-2 py-1 text-[10px] text-white"
                        value={r.field}
                        onChange={e => updateRule(qi, oi, ri, 'field', e.target.value)}
                      >
                        <option value="">{t('اختر حقل', 'Select field')}</option>
                        {QUIZ_FIELDS.map(f => (
                          <option key={f.value} value={f.value}>
                            {language === 'ar' ? f.label_ar : f.label_en} — {language === 'ar' ? f.label_en : f.label_ar}
                          </option>
                        ))}
                      </select>
                      <select
                        className="bg-[#1C1613] border border-[#2A221E] rounded-lg px-2 py-1 text-[10px] text-white"
                        value={r.operator}
                        onChange={e => updateRule(qi, oi, ri, 'operator', e.target.value)}
                      >
                        <option value="includes">includes</option>
                        <option value="equals">equals</option>
                      </select>
                      <input
                        className="bg-[#1C1613] border border-[#2A221E] rounded-lg px-2 py-1 text-[10px] text-white w-28"
                        placeholder={t('القيمة', 'Value')}
                        value={r.value}
                        onChange={e => updateRule(qi, oi, ri, 'value', e.target.value)}
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          className="bg-[#1C1613] border border-[#2A221E] rounded-lg px-2 py-1 text-[10px] text-white w-14"
                          value={r.points}
                          onChange={e => updateRule(qi, oi, ri, 'points', parseInt(e.target.value) || 0)}
                        />
                        <span className="text-[9px] text-[#A69B93]">{t('نقطة', 'pts')}</span>
                      </div>
                      <button onClick={() => removeRule(qi, oi, ri)} className="p-0.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer">
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                  {o.score_rules.length === 0 && (
                    <p className="text-[9px] text-[#A69B93] italic">
                      {t('لا توجد قواعد (لن يكسب هذا الخيار نقاطاً)', 'No rules (option gives no points)')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminQuizManager;