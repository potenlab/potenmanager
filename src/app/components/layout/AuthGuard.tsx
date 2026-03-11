import { Outlet, Navigate, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { Zap } from 'lucide-react';

/**
 * AuthGuard — 인증이 필요한 라우트를 보호합니다.
 *
 * - Supabase 세션이 있으면 자식 라우트 렌더링
 * - 세션이 없으면 /login으로 리다이렉트
 * - 개발 모드(localStorage의 poten_dev_mode)에서는 인증 우회
 */
export function AuthGuard() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // 개발 모드 우회: Figma Make 환경에서 OAuth 리다이렉트 불가 시 활성화
  const isDevMode = localStorage.getItem('poten_dev_mode') === 'true';

  // 로딩 중
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#F8F9FA]">
        <div className="w-12 h-12 bg-[#0079FF] rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
          <Zap size={24} className="text-white" fill="currentColor" />
        </div>
        <div className="w-5 h-5 border-2 border-[#0079FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 인증됨 또는 개발 모드
  if (user || isDevMode) {
    return <Outlet />;
  }

  // 미인증 → 로그인 페이지 (원래 URL을 redirect 파라미터로 전달)
  const redirectTo = location.pathname + location.search;
  return <Navigate to={`/login?redirect=${encodeURIComponent(redirectTo)}`} replace />;
}
