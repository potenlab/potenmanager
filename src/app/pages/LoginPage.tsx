import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { Zap, FlaskConical, ChevronDown, ChevronUp, Play, Megaphone, Film, Rocket, ShoppingBag, Coffee, User, Code2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../../lib/api';

// Google G Logo SVG
function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
  );
}

export function LoginPage() {
  const { user, isLoading, signInWithGoogle, signInWithEmail, signUp } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const ko = language === 'ko';
  const [showDevTools, setShowDevTools] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [showDemoSelect, setShowDemoSelect] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);

  const DEMO_INDUSTRIES = [
    { id: 'freelancer', labelKo: '개인 프리랜서', labelEn: 'Freelancer', icon: User, color: 'from-blue-500 to-cyan-500' },
    { id: 'dev_agency', labelKo: '에이전시 (개발)', labelEn: 'Dev Agency', icon: Code2, color: 'from-violet-500 to-purple-500' },
    { id: 'marketing_agency', labelKo: '에이전시 (마케팅)', labelEn: 'Marketing Agency', icon: Megaphone, color: 'from-pink-500 to-rose-500' },
    { id: 'production', labelKo: '에이전시 (프로덕션)', labelEn: 'Production', icon: Film, color: 'from-amber-500 to-orange-500' },
    { id: 'startup', labelKo: '스타트업', labelEn: 'Startup', icon: Rocket, color: 'from-emerald-500 to-teal-500' },
  ];

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    localStorage.removeItem('poten_demo_mode');

    if (isSignUp) {
      const result = await signUp(email, password);
      if (result.error) {
        setError(result.error);
      } else if (result.needsConfirmation) {
        setMessage(ko ? '확인 이메일을 보냈습니다. 이메일을 확인해주세요.' : 'Confirmation email sent. Please check your inbox.');
      }
    } else {
      const result = await signInWithEmail(email, password);
      if (result.error) {
        setError(ko ? '이메일 또는 비밀번호가 올바르지 않습니다.' : 'Invalid email or password.');
      }
    }
    setSubmitting(false);
  };

  const handleDemoLogin = async (industry?: string) => {
    setError('');
    setMessage('');
    setDemoLoading(true);
    setSelectedIndustry(industry || null);
    try {
      // Clear all poten/pm localStorage
      const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('poten_') || k.startsWith('pm_'));
      keysToRemove.forEach(k => localStorage.removeItem(k));

      // Call demo setup Edge Function
      const res = await fetch('https://slereezbgubofcrqnkip.supabase.co/functions/v1/pm-demo/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsZXJlZXpiZ3Vib2ZjcnFua2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5ODcyNzIsImV4cCI6MjA3NzU2MzI3Mn0.KhELTC5FTGtsC5YeZ-OvEn7q6J1fanYUuVj95-xH0Wc' },
        body: JSON.stringify({ industry: industry || 'startup' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Demo setup failed');

      // Sign in with the created demo account
      if (data.orgId) {
        localStorage.setItem('pm_active_org_id', data.orgId);
        localStorage.setItem('poten_active_org_id', data.orgId);
      }
      localStorage.setItem('poten_demo_mode', 'true');

      const result = await signInWithEmail(data.email, data.password);
      if (result.error) {
        setError(ko ? '데모 계정 로그인에 실패했습니다.' : 'Demo login failed.');
      }
    } catch {
      setError(ko ? '데모 계정 설정에 실패했습니다.' : 'Demo setup failed.');
    }
    setDemoLoading(false);
    setSelectedIndustry(null);
  };

  useEffect(() => {
    if (!isLoading && user) {
      const localDone = localStorage.getItem('poten_onboarding_complete');
      if (localDone) {
        navigate(redirectTo, { replace: true });
        return;
      }
      // Check KV Store for cross-device sync
      const userId = user.id || 'u1';
      api.getOnboarding(userId).then(result => {
        if (result.exists && result.data?.completedAt) {
          localStorage.setItem('poten_onboarding_complete', 'true');
          localStorage.setItem('poten_onboarding_data', JSON.stringify(result.data));
          navigate(redirectTo, { replace: true });
        } else {
          navigate('/onboarding', { replace: true });
        }
      }).catch(() => {
        navigate('/onboarding', { replace: true });
      });
    }
  }, [user, isLoading, navigate, redirectTo]);

  /** Dev mode 진입: localStorage flag 설정 후 온보딩 체크 */
  const enterDevMode = () => {
    localStorage.setItem('poten_dev_mode', 'true');
    const localDone = localStorage.getItem('poten_onboarding_complete');
    if (localDone) {
      navigate('/dashboard', { replace: true });
    } else {
      api.getOnboarding('u1').then(result => {
        if (result.exists && result.data?.completedAt) {
          localStorage.setItem('poten_onboarding_complete', 'true');
          localStorage.setItem('poten_onboarding_data', JSON.stringify(result.data));
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/onboarding', { replace: true });
        }
      }).catch(() => {
        navigate('/onboarding', { replace: true });
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="w-6 h-6 border-2 border-[#0079FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#F8F9FA]">
      {/* Left — Branding Panel */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] bg-[#0079FF] p-14 relative overflow-hidden shrink-0">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-white/5" />
          <div className="absolute -bottom-24 -left-24 w-[380px] h-[380px] rounded-full bg-white/5" />
          <div className="absolute top-1/2 -right-16 w-[240px] h-[240px] rounded-full bg-white/5" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Zap size={22} className="text-white" fill="currentColor" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight">Poten Manager</p>
              <p className="text-white/60 text-xs">by The Potential</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            {ko ? (
              <>AI가 돕는<br />스마트한<br />업무 관리</>
            ) : (
              <>Smart Task<br />Management<br />with AI</>
            )}
          </h1>
          <p className="text-white/70 text-sm leading-relaxed max-w-[320px]">
            {ko
              ? '1인 기업과 소규모 팀을 위한 올인원 태스크 매니저. 목표 설정부터 실행까지 AI가 함께합니다.'
              : 'All-in-one task manager for solopreneurs and small teams. AI assists from goal setting to execution.'}
          </p>

          <div className="flex gap-6 text-white/50 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              {ko ? '실시간 동기화' : 'Real-time sync'}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              {ko ? 'AI 추천' : 'AI Recommendations'}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              {ko ? '팀 협업' : 'Team Collaboration'}
            </div>
          </div>
        </div>

        <div className="relative z-10 text-white/30 text-xs">
          2026 The Potential. All rights reserved.
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[400px]"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-[#0079FF] rounded-xl flex items-center justify-center">
              <Zap size={20} className="text-white" fill="currentColor" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg">Poten Manager</p>
              <p className="text-gray-400 text-xs">by The Potential</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-card border border-gray-100">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {isSignUp ? (ko ? '회원가입' : 'Sign Up') : (ko ? '로그인' : 'Sign In')}
              </h2>
              <p className="text-sm text-gray-500">
                {isSignUp
                  ? (ko ? '이메일과 비밀번호로 계정을 만드세요.' : 'Create an account with email and password.')
                  : (ko ? '계정에 로그인하세요.' : 'Sign in to your account.')}
              </p>
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3 mb-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={ko ? '이메일 주소' : 'Email address'}
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={ko ? '비밀번호 (6자 이상)' : 'Password (min 6 characters)'}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              {error && (
                <p className="text-xs text-red-500 px-1">{error}</p>
              )}
              {message && (
                <p className="text-xs text-green-600 px-1">{message}</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-5 py-3.5 bg-[#0079FF] text-white rounded-2xl text-sm font-semibold hover:bg-blue-700 transition-all duration-200 shadow-sm disabled:opacity-50"
              >
                {submitting
                  ? (ko ? '처리 중...' : 'Processing...')
                  : isSignUp
                    ? (ko ? '회원가입' : 'Sign Up')
                    : (ko ? '로그인' : 'Sign In')}
              </button>
            </form>

            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}
              className="w-full text-center text-xs text-gray-500 hover:text-blue-600 transition-colors mb-5"
            >
              {isSignUp
                ? (ko ? '이미 계정이 있나요? 로그인' : 'Already have an account? Sign In')
                : (ko ? '계정이 없나요? 회원가입' : "Don't have an account? Sign Up")}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">{ko ? '또는' : 'or'}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="space-y-3">
              {/* Google OAuth */}
              <button
                onClick={signInWithGoogle}
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white border-2 border-gray-200 rounded-2xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm"
              >
                <GoogleLogo />
                {ko ? 'Google로 계속하기' : 'Continue with Google'}
              </button>

              {/* Demo Account — Industry Selection */}
              {!showDemoSelect ? (
                <button
                  onClick={() => setShowDemoSelect(true)}
                  disabled={demoLoading}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl text-sm font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-sm disabled:opacity-50"
                >
                  <Play size={16} fill="currentColor" />
                  {ko ? '데모 계정으로 체험하기' : 'Try with Demo Account'}
                </button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="overflow-hidden"
                >
                  <p className="text-xs font-semibold text-gray-500 mb-2 text-center">
                    {ko ? '업종을 선택하세요' : 'Select your industry'}
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {DEMO_INDUSTRIES.map((ind) => {
                      const Icon = ind.icon;
                      const isLoading = demoLoading && selectedIndustry === ind.id;
                      return (
                        <button
                          key={ind.id}
                          onClick={() => handleDemoLogin(ind.id)}
                          disabled={demoLoading}
                          className={`w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r ${ind.color} text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-sm disabled:opacity-50`}
                        >
                          {isLoading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                          ) : (
                            <Icon size={16} className="shrink-0" />
                          )}
                          {isLoading
                            ? (ko ? '데모 준비 중...' : 'Setting up...')
                            : (ko ? ind.labelKo : ind.labelEn)}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setShowDemoSelect(false)}
                    className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors py-1"
                  >
                    {ko ? '닫기' : 'Close'}
                  </button>
                </motion.div>
              )}
            </div>

          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            {ko
              ? '로그인하면 서비스 이용약관 및 개인정보처리방침에 동의하게 됩니다.'
              : 'By signing in, you agree to our Terms of Service and Privacy Policy.'}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
