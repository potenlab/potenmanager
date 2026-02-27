import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Zap, FlaskConical, ChevronDown, ChevronUp } from 'lucide-react';
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
  const { user, isLoading, signInWithGoogle } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const ko = language === 'ko';
  const [showDevTools, setShowDevTools] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      const localDone = localStorage.getItem('poten_onboarding_complete');
      if (localDone) {
        navigate('/dashboard', { replace: true });
        return;
      }
      // Check KV Store for cross-device sync
      const userId = user.id || 'u1';
      api.getOnboarding(userId).then(result => {
        if (result.exists && result.data?.completedAt) {
          localStorage.setItem('poten_onboarding_complete', 'true');
          localStorage.setItem('poten_onboarding_data', JSON.stringify(result.data));
          console.log('[Login] Onboarding data restored from KV Store');
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/onboarding', { replace: true });
        }
      }).catch(() => {
        navigate('/onboarding', { replace: true });
      });
    }
  }, [user, isLoading, navigate]);

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
                {ko ? '시작하기' : 'Get Started'}
              </h2>
              <p className="text-sm text-gray-500">
                {ko ? 'Google 계정으로 간편하게 로그인하세요.' : 'Sign in quickly with your Google account.'}
              </p>
            </div>

            <div className="space-y-3">
              {/* Google OAuth — Primary CTA */}
              <button
                onClick={signInWithGoogle}
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white border-2 border-gray-200 rounded-2xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm"
              >
                <GoogleLogo />
                {ko ? 'Google로 계속하기' : 'Continue with Google'}
              </button>
            </div>

            {/* ── Dev Tools (collapsible) ─────────────────────────── */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowDevTools(v => !v)}
                className="w-full flex items-center justify-center gap-1.5 text-[11px] text-gray-300 hover:text-gray-500 transition-colors"
              >
                <FlaskConical size={11} />
                {ko ? '개발자 도구' : 'Developer Tools'}
                {showDevTools ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>

              {showDevTools && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 space-y-2 overflow-hidden"
                >
                  <button
                    onClick={enterDevMode}
                    className="w-full flex items-center justify-center px-4 py-2.5 bg-gray-800 rounded-xl text-xs font-semibold text-white hover:bg-gray-700 transition-all"
                  >
                    <Zap size={13} className="mr-1.5" fill="currentColor" />
                    {ko ? '개발 모드로 입장' : 'Enter Dev Mode'}
                  </button>
                  <button
                    onClick={() => {
                      localStorage.setItem('poten_dev_mode', 'true');
                      localStorage.removeItem('poten_onboarding_complete');
                      navigate('/onboarding', { replace: true });
                    }}
                    className="w-full flex items-center justify-center px-4 py-2 rounded-xl text-[11px] font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-50 border border-dashed border-gray-200 transition-all"
                  >
                    {ko ? '온보딩 다시 보기' : 'Replay Onboarding'}
                  </button>
                  <p className="text-[10px] text-gray-300 text-center leading-relaxed">
                    {ko
                      ? 'OAuth 리다이렉트가 불가한 환경에서 인증을 우회합니다.'
                      : 'Bypasses auth in environments where OAuth redirect is unavailable.'}
                  </p>
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
