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

  const resolveDestination = async (userId: string) => {
    // 대기 중인 초대 코드 확인
    const pendingInvite = localStorage.getItem('poten_pending_invite');
    if (pendingInvite) {
      return `/invite/${pendingInvite}`;
    }
    // 바로 tasks 페이지로 이동 (온보딩은 나중에)
    return '/tasks';
  };

  useEffect(() => {
    // Supabase가 URL의 access_token을 자동으로 처리함
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const dest = await resolveDestination(session.user.id);
        navigate(dest, { replace: true });
      } else {
        // 세션이 없으면 잠시 후 다시 시도 (토큰 처리 지연 대응)
        const timer = setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            const dest = await resolveDestination(retrySession.user.id);
            navigate(dest, { replace: true });
          } else {
            navigate('/login', { replace: true });
          }
        }, 1000);
        return () => clearTimeout(timer);
      }
    });
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
