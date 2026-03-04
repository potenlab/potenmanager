import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  Zap,
  Building2,
  UserPlus,
  Shield,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth, supabase } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../../lib/api';
import { notificationBus } from '../../lib/notificationEvents';

// Google G Logo SVG (same as LoginPage)
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

interface InviteInfo {
  code: string;
  orgId: string;
  orgName: string;
  createdBy: string;
  createdByName: string;
  role: string;
  expiresAt?: string;
  valid: boolean;
}

type PageState = 'loading' | 'valid' | 'invalid' | 'expired' | 'used' | 'joining' | 'success' | 'error';

export function InviteAcceptPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const ko = language === 'ko';

  const [state, setState] = useState<PageState>('loading');
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const autoJoinTriggered = useRef(false);

  // Lookup invite code on mount
  useEffect(() => {
    if (!code) {
      setState('invalid');
      return;
    }

    api.lookupInvite(code).then((result: any) => {
      if (result.valid) {
        setInvite(result);
        setState('valid');
      } else if (result.expired) {
        setState('expired');
      } else if (result.used) {
        setState('used');
      } else {
        setState('invalid');
      }
    }).catch(() => {
      setState('invalid');
    });
  }, [code]);

  // Auto-join after OAuth redirect (user returned from login with pending invite)
  useEffect(() => {
    if (autoJoinTriggered.current) return;
    if (state !== 'valid' || !user || !code || !invite) return;
    if (authLoading) return;

    const pendingInvite = localStorage.getItem('poten_pending_invite');
    if (pendingInvite && pendingInvite === code) {
      autoJoinTriggered.current = true;
      handleJoin();
    }
  }, [state, user, code, invite, authLoading]);

  // Handle Google login for unauthenticated users
  const handleLoginAndJoin = async () => {
    if (!code) return;
    localStorage.setItem('poten_pending_invite', code);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  // Handle direct join for authenticated users
  const handleJoin = async () => {
    if (!code || !user) return;
    setState('joining');

    try {
      const result = await api.directJoin(code, {
        userId: user.id,
        userName: user.user_metadata?.full_name || user.email || '',
        avatar: user.user_metadata?.avatar_url || '',
        email: user.email || '',
      });

      if (result.success) {
        setState('success');
        localStorage.removeItem('poten_pending_invite');

        // Emit join notification
        notificationBus.emit({
          type: 'team.member_joined',
          data: {
            memberId: user.id,
            memberName: user.user_metadata?.full_name || user.email || '',
          },
        });

        // Redirect after short delay
        setTimeout(() => {
          const onboardingDone = localStorage.getItem('poten_onboarding_complete');
          if (onboardingDone) {
            navigate('/dashboard', { replace: true });
          } else {
            navigate('/onboarding', { replace: true });
          }
        }, 1500);
      } else {
        setState('error');
        setErrorMsg(result.error || (ko ? '참여에 실패했습니다.' : 'Failed to join.'));
      }
    } catch (err: any) {
      setState('error');
      setErrorMsg(err.message || (ko ? '오류가 발생했습니다.' : 'An error occurred.'));
    }
  };

  const formatRole = (role: string) => {
    if (role === 'admin') return ko ? '관리자' : 'Admin';
    if (role === 'viewer') return ko ? '뷰어' : 'Viewer';
    return ko ? '멤버' : 'Member';
  };

  const formatExpiry = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(ko ? 'ko-KR' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // ── Loading state ──────────────────────────────────
  if (state === 'loading' || authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-[#F8F9FA]">
        <div className="w-12 h-12 bg-[#0079FF] rounded-2xl flex items-center justify-center shadow-lg">
          <Zap size={24} className="text-white" fill="currentColor" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-5 h-5 border-2 border-[#0079FF] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">
            {ko ? '초대 정보 확인 중...' : 'Verifying invite...'}
          </p>
        </div>
      </div>
    );
  }

  // ── Error states (invalid / expired / used) ────────
  if (state === 'invalid' || state === 'expired' || state === 'used') {
    const config = {
      invalid: {
        icon: <AlertCircle size={32} />,
        color: 'text-red-500 bg-red-100',
        title: ko ? '유효하지 않은 초대 코드' : 'Invalid Invite Code',
        desc: ko ? '이 초대 코드는 존재하지 않습니다. 코드를 다시 확인해주세요.' : 'This invite code does not exist. Please check and try again.',
      },
      expired: {
        icon: <Clock size={32} />,
        color: 'text-amber-500 bg-amber-100',
        title: ko ? '만료된 초대 코드' : 'Invite Code Expired',
        desc: ko ? '이 초대 코드의 유효기간이 만료되었습니다. 관리자에게 새 코드를 요청해주세요.' : 'This invite code has expired. Please ask the admin for a new one.',
      },
      used: {
        icon: <CheckCircle2 size={32} />,
        color: 'text-gray-500 bg-gray-100',
        title: ko ? '이미 사용된 초대 코드' : 'Invite Code Already Used',
        desc: ko ? '이 초대 코드는 이미 사용되었습니다.' : 'This invite code has already been used.',
      },
    }[state];

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[420px] bg-white rounded-3xl p-8 shadow-card border border-gray-100 text-center"
        >
          <div className={`w-16 h-16 ${config.color} rounded-full flex items-center justify-center mx-auto mb-5`}>
            {config.icon}
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{config.title}</h2>
          <p className="text-sm text-gray-500 mb-6">{config.desc}</p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="w-full px-5 py-3 bg-[#0079FF] text-white rounded-2xl text-sm font-medium hover:bg-[#006AE0] transition-colors"
          >
            {ko ? '로그인 페이지로 이동' : 'Go to Login'}
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Success state ──────────────────────────────────
  if (state === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-[420px] bg-white rounded-3xl p-8 shadow-card border border-gray-100 text-center"
        >
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {ko ? '팀에 참여했습니다!' : 'You\'ve Joined the Team!'}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {ko
              ? `${invite?.orgName}에 성공적으로 참여했습니다. 잠시 후 이동합니다...`
              : `Successfully joined ${invite?.orgName}. Redirecting...`}
          </p>
          <div className="w-5 h-5 border-2 border-[#0079FF] border-t-transparent rounded-full animate-spin mx-auto" />
        </motion.div>
      </div>
    );
  }

  // ── Valid invite — main UI ─────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[420px]"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 bg-[#0079FF] rounded-xl flex items-center justify-center">
            <Zap size={20} className="text-white" fill="currentColor" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg leading-tight">Poten Manager</p>
            <p className="text-gray-400 text-xs">by The Potential</p>
          </div>
        </div>

        {/* Invite Card */}
        <div className="bg-white rounded-3xl p-8 shadow-card border border-gray-100">
          {/* Org Info */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 size={28} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {invite?.orgName}
            </h2>
            <p className="text-sm text-gray-500">
              {ko ? '팀에 초대되었습니다' : 'You\'ve been invited to join'}
            </p>
          </div>

          {/* Invite Details */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-2">
                <UserPlus size={14} className="text-gray-400" />
                {ko ? '초대한 사람' : 'Invited by'}
              </span>
              <span className="font-medium text-gray-900">{invite?.createdByName || '-'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-2">
                <Shield size={14} className="text-gray-400" />
                {ko ? '부여 역할' : 'Role'}
              </span>
              <span className="font-medium text-gray-900">{formatRole(invite?.role || 'member')}</span>
            </div>
            {invite?.expiresAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-2">
                  <Clock size={14} className="text-gray-400" />
                  {ko ? '만료일' : 'Expires'}
                </span>
                <span className="font-medium text-gray-900">{formatExpiry(invite.expiresAt)}</span>
              </div>
            )}
          </div>

          {/* Action Button */}
          {state === 'error' && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-xl mb-4">
              <AlertCircle size={16} /> {errorMsg}
            </div>
          )}

          {user ? (
            // Logged in — show join button
            <button
              onClick={handleJoin}
              disabled={state === 'joining'}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-[#0079FF] text-white rounded-2xl text-sm font-medium hover:bg-[#006AE0] transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {state === 'joining' ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {ko ? '참여 중...' : 'Joining...'}
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  {ko ? '팀에 참여하기' : 'Join Team'}
                </>
              )}
            </button>
          ) : (
            // Not logged in — show Google login button
            <div className="space-y-3">
              <button
                onClick={handleLoginAndJoin}
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white border-2 border-gray-200 rounded-2xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
              >
                <GoogleLogo />
                {ko ? 'Google로 로그인하여 참여하기' : 'Sign in with Google to Join'}
              </button>
              <p className="text-xs text-gray-400 text-center">
                {ko
                  ? '로그인 후 자동으로 팀에 참여됩니다.'
                  : 'You\'ll automatically join the team after signing in.'}
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          {ko
            ? '로그인하면 서비스 이용약관 및 개인정보처리방침에 동의하게 됩니다.'
            : 'By signing in, you agree to our Terms of Service and Privacy Policy.'}
        </p>
      </motion.div>
    </div>
  );
}
