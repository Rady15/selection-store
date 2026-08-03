import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { X, User, Lock, Phone, Mail, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  message?: string;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onNavigate, message, onSuccess }) => {
  const { language, t } = useLanguage();
  const { login, register, googleLogin } = useAuth();
  const isRtl = language === 'ar';

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setPhone('');
    setError('');
  };

  const finishAuth = () => {
    resetForm();
    if (onSuccess) {
      onSuccess();
    } else {
      onClose();
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    setError('');
    setSubmitting(true);
    const result = await googleLogin(credential);
    if (result.success) {
      if (!onSuccess) onNavigate('/account');
      finishAuth();
    } else {
      setError(result.error || t('فشل تسجيل الدخول بجوجل', 'Google login failed'));
    }
    setSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (mode === 'login') {
      if (!email || !password) {
        setError(t('يرجى ملء جميع الحقول', 'Please fill in all fields'));
        setSubmitting(false);
        return;
      }
      const result = await login(email, password);
      if (result.success) {
        finishAuth();
      } else {
        setError(result.error || t('خطأ في تسجيل الدخول', 'Login failed'));
      }
    } else {
      if (!name || !email || !phone || !password) {
        setError(t('يرجى ملء جميع الحقول', 'Please fill in all fields'));
        setSubmitting(false);
        return;
      }
      if (password.length < 6) {
        setError(t('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'Password must be at least 6 characters'));
        setSubmitting(false);
        return;
      }
      const result = await register(name, email, phone, password);
      if (result.success) {
        finishAuth();
      } else {
        setError(result.error || t('خطأ في إنشاء الحساب', 'Registration failed'));
      }
    }

    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#110E0C] text-white border border-[#2A221E] rounded-3xl p-6 shadow-2xl z-50 space-y-5 animate-fade-in">

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-[#A69B93] hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-[#8C532B]/20 text-[#D99B26] flex items-center justify-center mx-auto mb-2">
          </div>
          <h3 className="font-extrabold text-xl text-white font-serif">
            {mode === 'login' ? t('تسجيل الدخول إلى حسابك', 'Login to Your Account') : t('إنشاء حساب سليكشن جديد', 'Register New Account')}
          </h3>
          <p className="text-xs text-[#A69B93]">
            {mode === 'login'
              ? t('أدخل بياناتك للوصول إلى حسابك وطلباتك', 'Enter your credentials to access your account')
              : t('احصل على 50 نقطة ولاء مجاناً واستمتع بتتبع طلباتك', 'Get 50 bonus loyalty points upon sign up')}
          </p>
        </div>

        {message && (
          <div className="flex items-center gap-2 bg-[#8C532B]/15 border border-[#D99B26]/40 rounded-xl p-3 text-[#D99B26] text-xs">
            <Lock className="w-4 h-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {mode === 'register' && (
            <div>
              <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('الاسم الكامل', 'Full Name')}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A69B93]" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t('محمد العتيبي', 'Mohammed Al-Otaibi')}
                  className="w-full bg-[#1C1613] border border-[#2A221E] rounded-xl p-3 pl-10 text-white focus:outline-none focus:border-[#D99B26] transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('البريد الإلكتروني', 'Email')}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A69B93]" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-[#1C1613] border border-[#2A221E] rounded-xl p-3 pl-10 text-white focus:outline-none focus:border-[#D99B26] transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('كلمة المرور', 'Password')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A69B93]" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'register' ? t('6 أحرف على الأقل', 'Min 6 characters') : t('أدخل كلمة المرور', 'Enter your password')}
                className="w-full bg-[#1C1613] border border-[#2A221E] rounded-xl p-3 pl-10 text-white focus:outline-none focus:border-[#D99B26] transition"
                minLength={6}
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-[#D4C3B5] mb-1 font-semibold">{t('رقم الجوال', 'Phone')}</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A69B93]" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+966 5X XXX XXXX"
                  className="w-full bg-[#1C1613] border border-[#2A221E] rounded-xl p-3 pl-10 text-white focus:outline-none focus:border-[#D99B26] transition"
                />
              </div>
            </div>
          )}

          {mode === 'login' && (
            <div className="text-left">
              <button type="button" className="text-[#D99B26] text-[11px] hover:underline cursor-pointer">
                {t('نسيت كلمة المرور؟', 'Forgot password?')}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#8C532B] hover:bg-[#A86434] disabled:opacity-50 text-white py-3.5 rounded-xl text-xs font-bold transition shadow-lg cursor-pointer"
          >
            {submitting
              ? t('جاري المعالجة...', 'Processing...')
              : mode === 'login'
                ? t('تسجيل الدخول', 'Login')
                : t('إنشاء الحساب', 'Create Account')}
          </button>
        </form>

        <div className="flex items-center gap-3 text-xs text-[#A69B93]">
          <div className="flex-1 h-px bg-[#2A221E]" />
          <span>{t('أو', 'OR')}</span>
          <div className="flex-1 h-px bg-[#2A221E]" />
        </div>

        <GoogleLogin
          onSuccess={(credentialResponse) => {
            if (credentialResponse.credential) {
              handleGoogleCredential(credentialResponse.credential);
            }
          }}
          onError={() => {
            setError(t('تعذر فتح نافذة تسجيل الدخول بجوجل، يرجى المحاولة مرة أخرى', 'Could not open Google sign-in, please try again'));
          }}
          theme="filled_black"
          shape="rectangular"
          size="large"
          text="continue_with"
          width={400}
          useOneTap={false}
        />

        {mode === 'login' && (
          <div className="text-center text-xs text-[#A69B93]">
            <span>{t('للتجربة كمدير: ', 'Demo admin: ')}</span>
            <button
              type="button"
              onClick={() => { setEmail('admin@selection.sa'); setPassword('admin123'); }}
              className="text-[#D99B26] font-bold hover:underline cursor-pointer"
            >
              admin@selection.sa
            </button>
          </div>
        )}

        <div className="text-center pt-2 border-t border-[#2A221E] text-xs">
          {mode === 'login' ? (
            <p className="text-[#A69B93]">
              {t('ليس لديك حساب؟', "Don't have an account?")}{' '}
              <button
                onClick={() => { setMode('register'); setError(''); }}
                className="text-[#D99B26] font-bold hover:underline cursor-pointer"
              >
                {t('سجل الآن', 'Register Now')}
              </button>
            </p>
          ) : (
            <p className="text-[#A69B93]">
              {t('لديك حساب بالفعل؟', 'Already have an account?')}{' '}
              <button
                onClick={() => { setMode('login'); setError(''); }}
                className="text-[#D99B26] font-bold hover:underline cursor-pointer"
              >
                {t('تسجيل الدخول', 'Login')}
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
};

export default AuthModal;