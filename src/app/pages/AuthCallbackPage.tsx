import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Zap } from 'lucide-react';
import { supabase } from '../context/AuthContext';
import { api } from '../../lib/api';

/**
 * Google OAuth 리다이렉트 후 도착하는 콜백 페이지.
 * Supabase가 URL fragment에서 토큰을 자동으로 처리하고,
 * onAuthStateChange가 세션을 업데이트하면 온보딩 상태를 체크 후 적절한 페이지로 이동합니다.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      const pendingInvite = localStorage.getItem('poten_pending_invite');
      navigate(pendingInvite ? `/invite/${pendingInvite}` : '/dashboard', { replace: true });
    };

    // PKCE flow: exchange ?code= for session
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (data.session) go();
        else if (error) console.error('[AuthCallback] Code exchange failed:', error);
      });
    }

    // Implicit flow fallback: onAuthStateChange for #access_token
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) go();
    });

    // Poll fallback
    const poll = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) { clearInterval(poll); go(); }
    }, 500);

    // Timeout fallback
    const timeout = setTimeout(() => {
      if (!done) { done = true; navigate('/login', { replace: true }); }
    }, 8000);

    return () => { subscription.unsubscribe(); clearInterval(poll); clearTimeout(timeout); };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-[#F8F9FA]">
      <div className="w-12 h-12 bg-[#0079FF] rounded-2xl flex items-center justify-center shadow-lg">
        <Zap size={24} className="text-white" fill="currentColor" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="w-5 h-5 border-2 border-[#0079FF] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400 font-medium">로그인 처리 중...</p>
      </div>
    </div>
  );
}
