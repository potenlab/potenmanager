import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, Phone, ChevronRight, ChevronLeft, Check,
  Zap, Building2, UserPlus, Search, Sparkles,
  Megaphone, TrendingUp, Code2, Palette, Settings2,
  FileText, Users, MoreHorizontal, FolderPlus,
  LayoutTemplate, ArrowRight, Briefcase,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useGoalContext } from '../context/GoalContext';
import { useTaskContext } from '../context/TaskContext';
import { generateTemplateData } from '../../lib/templateData';
import { useInvite } from '../context/InviteContext';
import { api } from '../../lib/api';

// ─── Types ──────────────────────────────────────────────────
interface OnboardingData {
  displayName: string;
  phone: string;
  role: 'owner' | 'manager' | 'member';
  workspaceType: 'solo' | 'create-org' | 'join-org';
  orgName: string;
  inviteCode: string;
  workFields: string[];
  projectChoice: 'template' | 'blank' | 'skip';
  selectedTemplate: string;
  projectName: string;
}

const INITIAL_DATA: OnboardingData = {
  displayName: '',
  phone: '',
  role: 'owner',
  workFields: [],
  workspaceType: 'solo',
  orgName: '',
  inviteCode: '',
  projectChoice: 'skip',
  selectedTemplate: '',
  projectName: '',
};

const STEPS = [
  { id: 'profile', label: '프로필' },
  { id: 'workspace', label: '시작 방식' },
  { id: 'context', label: '업무 맥락' },
  { id: 'project', label: '첫 프로젝트' },
];

// ─── Work Fields ────────────────────────────────────────────
const WORK_FIELDS = [
  { id: 'marketing', label: '마케팅', labelEn: 'Marketing', icon: Megaphone, color: 'bg-pink-50 text-pink-600 border-pink-200' },
  { id: 'sales', label: '영업', labelEn: 'Sales', icon: TrendingUp, color: 'bg-green-50 text-green-600 border-green-200' },
  { id: 'product', label: '제품개발', labelEn: 'Product', icon: Code2, color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
  { id: 'design', label: '디자인', labelEn: 'Design', icon: Palette, color: 'bg-purple-50 text-purple-600 border-purple-200' },
  { id: 'operations', label: '운영관리', labelEn: 'Operations', icon: Settings2, color: 'bg-orange-50 text-orange-600 border-orange-200' },
  { id: 'content', label: '콘텐츠', labelEn: 'Content', icon: FileText, color: 'bg-sky-50 text-sky-600 border-sky-200' },
  { id: 'customer', label: '고객관리', labelEn: 'Customer', icon: Users, color: 'bg-teal-50 text-teal-600 border-teal-200' },
  { id: 'other', label: '기타', labelEn: 'Other', icon: MoreHorizontal, color: 'bg-gray-50 text-gray-600 border-gray-200' },
];

// ─── Project Templates ──────────────────────────────────────
function getTemplatesForFields(fields: string[]) {
  const templateMap: Record<string, { id: string; title: string; titleEn: string; desc: string; descEn: string; emoji: string }[]> = {
    marketing: [
      { id: 'content-calendar', title: '콘텐츠 캘린더', titleEn: 'Content Calendar', desc: '소셜 미디어 콘텐츠 기획 및 일정 관리', descEn: 'Plan and schedule social media content', emoji: '📅' },
      { id: 'campaign', title: '캠페인 관리', titleEn: 'Campaign Management', desc: '마케팅 캠페인 기획부터 실행까지', descEn: 'Plan and execute marketing campaigns', emoji: '📢' },
    ],
    sales: [
      { id: 'sales-pipeline', title: '영업 파이프라인', titleEn: 'Sales Pipeline', desc: '고객 발굴부터 계약까지 단계별 관리', descEn: 'Manage deals from lead to close', emoji: '💰' },
    ],
    product: [
      { id: 'sprint', title: '스프린트 보드', titleEn: 'Sprint Board', desc: '스프린트 단위 개발 태스크 관리', descEn: 'Manage dev tasks in sprints', emoji: '🚀' },
      { id: 'bug-tracker', title: '버그 트래커', titleEn: 'Bug Tracker', desc: '버그 리포트 및 수정 추적', descEn: 'Track bug reports and fixes', emoji: '🐛' },
    ],
    design: [
      { id: 'design-project', title: '디자인 프로젝트', titleEn: 'Design Project', desc: '디자인 요청부터 완료까지', descEn: 'Track design requests to completion', emoji: '🎨' },
    ],
    operations: [
      { id: 'weekly-ops', title: '주간 운영 관리', titleEn: 'Weekly Operations', desc: '주 단위 운영 업무 체크리스트', descEn: 'Weekly ops checklist', emoji: '📋' },
    ],
    content: [
      { id: 'editorial', title: '에디토리얼 플래너', titleEn: 'Editorial Planner', desc: '콘텐츠 기획 · 작성 · 발행 워크플로', descEn: 'Content creation workflow', emoji: '✍️' },
    ],
    customer: [
      { id: 'cs-board', title: 'CS 대응 보드', titleEn: 'CS Board', desc: '고객 문의 접수 및 처리 관리', descEn: 'Manage customer inquiries', emoji: '💬' },
    ],
    other: [
      { id: 'general', title: '일반 프로젝트', titleEn: 'General Project', desc: '범용 태스크 관리 템플릿', descEn: 'General task management', emoji: '📁' },
    ],
  };

  const templates: typeof templateMap['marketing'] = [];
  const seen = new Set<string>();
  fields.forEach(f => {
    (templateMap[f] || []).forEach(t => {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        templates.push(t);
      }
    });
  });
  if (templates.length === 0) {
    templates.push(...(templateMap.other || []));
  }
  return templates;
}

// ─── Roles ──────────────────────────────────────────────────
const ROLES = [
  { id: 'owner' as const, label: '대표', labelEn: 'Owner', desc: '모든 권한 보유', descEn: 'Full access' },
  { id: 'manager' as const, label: '매니저', labelEn: 'Manager', desc: '팀 관리 권한', descEn: 'Team management' },
  { id: 'member' as const, label: '팀원', labelEn: 'Member', desc: '업무 실행 권한', descEn: 'Task execution' },
];

// ═══════════════════════════════════════════════════════════
// OnboardingPage
// ═══════════════════════════════════════════════════════════
export function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const { addGoal } = useGoalContext();
  const { addTask } = useTaskContext();
  const { createOrg, joinViaCode } = useInvite();
  const ko = language === 'ko';

  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [direction, setDirection] = useState(1);
  const [showWelcome, setShowWelcome] = useState(false);
  const [templateApplied, setTemplateApplied] = useState(false);
  const templateAppliedRef = useRef(false);

  // Pre-fill from Google profile
  useEffect(() => {
    if (user) {
      setData(d => ({
        ...d,
        displayName: user.user_metadata?.full_name || user.user_metadata?.name || d.displayName,
      }));
    }
  }, [user]);

  const update = (partial: Partial<OnboardingData>) => setData(d => ({ ...d, ...partial }));

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return data.displayName.trim().length > 0;
      case 1:
        if (data.workspaceType === 'create-org') return data.orgName.trim().length > 0;
        if (data.workspaceType === 'join-org') return data.inviteCode.trim().length > 0;
        return true;
      case 2: return data.workFields.length > 0;
      case 3: return true;
      default: return true;
    }
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setDirection(1);
      setStep(s => s + 1);
    } else {
      completeOnboarding();
    }
  };

  const prev = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(s => s - 1);
    }
  };

  const completeOnboarding = async () => {
    // Save onboarding data
    localStorage.setItem('poten_onboarding_complete', 'true');
    localStorage.setItem('poten_onboarding_data', JSON.stringify(data));

    // Persist to KV Store (server, cross-device sync) - fire & forget
    const userId = user?.id || 'u1';
    api.saveOnboarding(userId, { ...data, completedAt: new Date().toISOString() })
      .then(() => console.log('[Onboarding] Data persisted to KV Store'))
      .catch(err => console.error('[Onboarding] KV Store persistence failed (localStorage still saved):', err));

    // Handle org creation or invite join
    if (data.workspaceType === 'create-org' && data.orgName.trim()) {
      createOrg(data.orgName.trim()).then(org => {
        if (org) console.log(`[Onboarding] Created org: ${org.name} (${org.id})`);
      }).catch(err => console.error('[Onboarding] Org creation failed:', err));
    } else if (data.workspaceType === 'join-org' && data.inviteCode.trim()) {
      joinViaCode(data.inviteCode.trim()).then(result => {
        if (result.success) console.log('[Onboarding] Join request submitted successfully');
        else console.error('[Onboarding] Join failed:', result.error);
      }).catch(err => console.error('[Onboarding] Join via invite failed:', err));
    }

    // Generate template data if a template was selected
    if (data.projectChoice === 'template' && data.selectedTemplate && !templateAppliedRef.current) {
      templateAppliedRef.current = true;
      const templateResult = generateTemplateData(data.selectedTemplate, 'u1');
      if (templateResult) {
        templateResult.goals.forEach(goal => addGoal(goal));
        templateResult.tasks.forEach(task => addTask(task));
        setTemplateApplied(true);
        console.log(`[Onboarding] Template "${data.selectedTemplate}" applied: ${templateResult.goals.length} goals, ${templateResult.tasks.length} tasks created.`);
      }
    }

    setShowWelcome(true);
  };

  const enterDashboard = () => {
    navigate('/dashboard', { replace: true });
  };

  // ── AI Welcome Screen ──────────────────────────────────
  if (showWelcome) {
    const fieldLabels = data.workFields
      .map(f => WORK_FIELDS.find(wf => wf.id === f))
      .filter(Boolean)
      .map(wf => ko ? wf!.label : wf!.labelEn);

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[520px] text-center"
        >
          {/* AI Avatar */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            className="mx-auto w-20 h-20 bg-gradient-to-br from-[#0079FF] to-[#4DA3FF] rounded-3xl flex items-center justify-center mb-8 shadow-lg shadow-blue-200"
          >
            <Sparkles size={36} className="text-white" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-3xl p-8 shadow-card border border-gray-100"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              {data.displayName}{ko ? '님, 환영합니다!' : ', Welcome!'}
            </h2>
            <p className="text-gray-500 text-[15px] leading-relaxed mb-6">
              {fieldLabels.length > 0 ? (
                ko
                  ? <><strong className="text-gray-700">{fieldLabels.join(' · ')}</strong> 업무를 주로 하시는군요. 태스크 관리할 때 우선순위 추천이나 일정 배분을 도와드릴게요.</>
                  : <>You mainly work on <strong className="text-gray-700">{fieldLabels.join(', ')}</strong>. I'll help with priority recommendations and schedule planning.</>
              ) : (
                ko
                  ? '포텐매니저가 업무 관리를 도와드릴게요.'
                  : 'Poten Manager will help you manage your tasks.'
              )}
            </p>

            {templateApplied && data.projectName && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-100"
              >
                <p className="text-sm text-blue-700 font-medium flex items-center gap-2">
                  <Check size={16} className="text-blue-500" />
                  {ko
                    ? <><strong>'{data.projectName}'</strong> 템플릿이 적용되었어요! 목표와 태스크가 자동으로 생성되었습니다.</>
                    : <><strong>'{data.projectName}'</strong> template applied! Goals and tasks have been created.</>
                  }
                </p>
              </motion.div>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={enterDashboard}
                className="w-full py-3.5 bg-[#0079FF] text-white rounded-2xl font-semibold text-sm hover:bg-[#006AE0] transition-colors flex items-center justify-center gap-2"
              >
                {ko ? '대시보드로 이동' : 'Go to Dashboard'}
                <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-xs text-gray-400 mt-6"
          >
            {ko ? '설정은 언제든 마이페이지에서 변경할 수 있어요' : 'You can change settings anytime in My Page'}
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // ── Step Content ────────────────────────────────────────
  const stepVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <div className="min-h-screen flex bg-[#F8F9FA]">
      {/* Left Branding (desktop) */}
      <div className="hidden lg:flex flex-col justify-between w-[400px] bg-[#0079FF] p-12 relative overflow-hidden shrink-0">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full bg-white/5" />
          <div className="absolute -bottom-24 -left-24 w-[320px] h-[320px] rounded-full bg-white/5" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Zap size={20} className="text-white" fill="currentColor" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight">Poten Manager</p>
              <p className="text-white/60 text-xs">by 더포텐셜</p>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-white leading-snug mb-4">
            {ko ? '몇 가지만\n알려주세요' : 'Tell us a\nfew things'}
          </h2>
          <p className="text-white/70 text-sm leading-relaxed">
            {ko
              ? '포텐매니저가 더 잘 도와드릴 수 있도록\n간단한 정보를 입력해주세요.'
              : 'Help us personalize your experience\nwith a few quick details.'}
          </p>
        </div>

        {/* Step indicators */}
        <div className="relative z-10 space-y-3">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                i < step ? "bg-white text-[#0079FF]" :
                i === step ? "bg-white/20 text-white ring-2 ring-white" :
                "bg-white/10 text-white/40"
              )}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span className={cn(
                "text-sm font-medium transition-colors",
                i <= step ? "text-white" : "text-white/40"
              )}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <div className="lg:hidden px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-[#0079FF] rounded-xl flex items-center justify-center">
              <Zap size={18} className="text-white" fill="currentColor" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Poten Manager</p>
              <p className="text-xs text-gray-400">by 더포텐셜</p>
            </div>
          </div>
          {/* Mobile progress bar */}
          <div className="flex gap-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex-1 h-1.5 rounded-full overflow-hidden bg-gray-200">
                <div
                  className="h-full bg-[#0079FF] rounded-full transition-all duration-500"
                  style={{ width: i < step ? '100%' : i === step ? '50%' : '0%' }}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {step + 1} / {STEPS.length} — {STEPS[step].label}
          </p>
        </div>

        {/* Step content area */}
        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="w-full max-w-[520px]">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                {step === 0 && <StepProfile data={data} update={update} ko={ko} user={user} />}
                {step === 1 && <StepWorkspace data={data} update={update} ko={ko} />}
                {step === 2 && <StepContext data={data} update={update} ko={ko} />}
                {step === 3 && <StepProject data={data} update={update} ko={ko} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom navigation */}
        <div className="px-6 py-6 border-t border-gray-100 bg-white/60 backdrop-blur-sm">
          <div className="max-w-[520px] mx-auto flex items-center justify-between">
            <button
              onClick={prev}
              disabled={step === 0}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                step === 0
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <ChevronLeft size={16} />
              {ko ? '이전' : 'Back'}
            </button>

            <div className="flex items-center gap-2">
              {step === STEPS.length - 1 && data.projectChoice === 'skip' && (
                <button
                  onClick={completeOnboarding}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-all"
                >
                  {ko ? '건너뛰기' : 'Skip'}
                </button>
              )}
              <button
                onClick={next}
                disabled={!canProceed()}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all",
                  canProceed()
                    ? "bg-[#0079FF] text-white hover:bg-[#006AE0] shadow-sm"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
              >
                {step === STEPS.length - 1 ? (ko ? '완료' : 'Finish') : (ko ? '다음' : 'Next')}
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Step Components
// ═══════════════════════════════════════════════════════════

interface StepProps {
  data: OnboardingData;
  update: (partial: Partial<OnboardingData>) => void;
  ko: boolean;
  user?: any;
}

// ── Step 1: Profile ─────────────────────────────────────
function StepProfile({ data, update, ko, user }: StepProps) {
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {ko ? '프로필을 확인해주세요' : 'Confirm your profile'}
        </h2>
        <p className="text-sm text-gray-500">
          {ko ? 'Google 계정에서 가져온 정보입니다. 필요하면 수정할 수 있어요.' : 'Info from your Google account. You can edit if needed.'}
        </p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 border-2 border-gray-200 overflow-hidden flex items-center justify-center">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <User size={28} className="text-gray-400" />
          )}
        </div>
        <div className="text-sm text-gray-500">
          {ko ? 'Google 프로필 사진이 사용됩니다' : 'Your Google profile picture will be used'}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {ko ? '이름' : 'Name'} <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={data.displayName}
          onChange={e => update({ displayName: e.target.value })}
          placeholder={ko ? '이름을 입력하세요' : 'Enter your name'}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0079FF]/20 focus:border-[#0079FF] transition-all"
        />
      </div>

      {/* Phone (optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          <span className="flex items-center gap-1.5">
            <Phone size={14} />
            {ko ? '연락처' : 'Phone'}
            <span className="text-xs text-gray-400 font-normal">({ko ? '선택' : 'optional'})</span>
          </span>
        </label>
        <input
          type="tel"
          value={data.phone}
          onChange={e => update({ phone: e.target.value })}
          placeholder="010-0000-0000"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0079FF]/20 focus:border-[#0079FF] transition-all"
        />
      </div>

      {/* Role */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {ko ? '역할' : 'Role'} <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {ROLES.map(role => (
            <button
              key={role.id}
              onClick={() => update({ role: role.id })}
              className={cn(
                "flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-center transition-all",
                data.role === role.id
                  ? "border-[#0079FF] bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              <span className={cn(
                "text-sm font-semibold",
                data.role === role.id ? "text-[#0079FF]" : "text-gray-700"
              )}>
                {ko ? role.label : role.labelEn}
              </span>
              <span className="text-[11px] text-gray-400">{ko ? role.desc : role.descEn}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Workspace ───────────────────────────────────
function StepWorkspace({ data, update, ko }: StepProps) {
  const options = [
    {
      id: 'solo' as const,
      icon: User,
      title: ko ? '혼자 사용합니다' : 'Solo',
      desc: ko ? '나만의 워크스페이스를 시작해요' : 'Start your personal workspace',
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    },
    {
      id: 'create-org' as const,
      icon: Building2,
      title: ko ? '조직을 새로 등록합니다' : 'Create organization',
      desc: ko ? '팀원을 초대하고 함께 사용해요' : 'Invite team members to collaborate',
      color: 'bg-blue-50 text-blue-600 border-blue-200',
    },
    {
      id: 'join-org' as const,
      icon: UserPlus,
      title: ko ? '기존 조직에 합류합니다' : 'Join organization',
      desc: ko ? '초대 코드로 팀에 합류해요' : 'Join a team with an invite code',
      color: 'bg-violet-50 text-violet-600 border-violet-200',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {ko ? '어떻게 시작할까요?' : 'How will you get started?'}
        </h2>
        <p className="text-sm text-gray-500">
          {ko ? '나중에 설정에서 언제든 변경할 수 있어요.' : 'You can change this later in settings.'}
        </p>
      </div>

      <div className="space-y-3">
        {options.map(opt => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              onClick={() => update({ workspaceType: opt.id, orgName: opt.id !== 'create-org' ? '' : data.orgName, inviteCode: opt.id !== 'join-org' ? '' : data.inviteCode })}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all",
                data.workspaceType === opt.id
                  ? "border-[#0079FF] bg-blue-50/50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border shrink-0", opt.color)}>
                <Icon size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-semibold text-sm",
                  data.workspaceType === opt.id ? "text-[#0079FF]" : "text-gray-800"
                )}>
                  {opt.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
              </div>
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                data.workspaceType === opt.id
                  ? "border-[#0079FF] bg-[#0079FF]"
                  : "border-gray-300"
              )}>
                {data.workspaceType === opt.id && <Check size={12} className="text-white" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Conditional inputs */}
      <AnimatePresence mode="wait">
        {data.workspaceType === 'create-org' && (
          <motion.div
            key="create-org"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Building2 size={14} />
                {ko ? '조직명' : 'Organization name'} <span className="text-red-400">*</span>
              </span>
            </label>
            <input
              type="text"
              value={data.orgName}
              onChange={e => update({ orgName: e.target.value })}
              placeholder={ko ? '조직 이름을 입력하세요' : 'Enter organization name'}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0079FF]/20 focus:border-[#0079FF] transition-all"
            />
          </motion.div>
        )}

        {data.workspaceType === 'join-org' && (
          <motion.div
            key="join-org"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Search size={14} />
                {ko ? '초대 코드' : 'Invite code'} <span className="text-red-400">*</span>
              </span>
            </label>
            <input
              type="text"
              value={data.inviteCode}
              onChange={e => update({ inviteCode: e.target.value })}
              placeholder={ko ? '초대 코드를 입력하세요' : 'Enter invite code'}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0079FF]/20 focus:border-[#0079FF] transition-all"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              {ko ? '조직 관리자에게 초대 코드를 받으세요.' : 'Get the invite code from your organization admin.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Step 3: Work Context ────────────────────────────────
function StepContext({ data, update, ko }: StepProps) {
  const toggleField = (id: string) => {
    const fields = data.workFields.includes(id)
      ? data.workFields.filter(f => f !== id)
      : data.workFields.length < 3
        ? [...data.workFields, id]
        : data.workFields;
    update({ workFields: fields });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {ko ? '주요 업무 분야를 알려주세요' : 'What do you mainly work on?'}
        </h2>
        <p className="text-sm text-gray-500">
          {ko
            ? 'AI가 더 잘 도와드릴 수 있어요. 최대 3개까지 선택할 수 있습니다.'
            : 'This helps the AI assist you better. Select up to 3.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {WORK_FIELDS.map(field => {
          const Icon = field.icon;
          const selected = data.workFields.includes(field.id);
          const disabled = !selected && data.workFields.length >= 3;

          return (
            <button
              key={field.id}
              onClick={() => !disabled && toggleField(field.id)}
              disabled={disabled}
              className={cn(
                "flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all",
                selected
                  ? "border-[#0079FF] bg-blue-50/50"
                  : disabled
                    ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                    : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center border shrink-0",
                selected ? "bg-[#0079FF] text-white border-[#0079FF]" : field.color
              )}>
                <Icon size={18} />
              </div>
              <div>
                <p className={cn(
                  "font-semibold text-sm",
                  selected ? "text-[#0079FF]" : "text-gray-700"
                )}>
                  {ko ? field.label : field.labelEn}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {data.workFields.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-xs text-gray-400"
        >
          <Check size={14} className="text-[#0079FF]" />
          <span>
            {data.workFields.length}{ko ? '개 선택됨' : ' selected'}
            {data.workFields.length < 3 && (ko ? ` (${3 - data.workFields.length}개 더 선택 가능)` : ` (${3 - data.workFields.length} more available)`)}
          </span>
        </motion.div>
      )}
    </div>
  );
}

// ── Step 4: First Project ───────────────────────────────
function StepProject({ data, update, ko }: StepProps) {
  const templates = getTemplatesForFields(data.workFields);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {ko ? '첫 프로젝트를 만들어볼까요?' : 'Create your first project?'}
        </h2>
        <p className="text-sm text-gray-500">
          {ko
            ? '업무 분야에 맞는 템플릿을 추천해드려요. 건너뛰어도 괜찮아요!'
            : 'We recommend templates based on your work. You can also skip!'}
        </p>
      </div>

      {/* Template list */}
      <div className="space-y-2">
        {templates.map(tpl => (
          <button
            key={tpl.id}
            onClick={() => update({
              projectChoice: 'template',
              selectedTemplate: tpl.id,
              projectName: ko ? tpl.title : tpl.titleEn,
            })}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all",
              data.selectedTemplate === tpl.id
                ? "border-[#0079FF] bg-blue-50/50"
                : "border-gray-200 bg-white hover:border-gray-300"
            )}
          >
            <span className="text-2xl shrink-0">{tpl.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "font-semibold text-sm",
                data.selectedTemplate === tpl.id ? "text-[#0079FF]" : "text-gray-800"
              )}>
                {ko ? tpl.title : tpl.titleEn}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{ko ? tpl.desc : tpl.descEn}</p>
            </div>
            {data.selectedTemplate === tpl.id && (
              <div className="w-5 h-5 rounded-full bg-[#0079FF] flex items-center justify-center shrink-0">
                <Check size={12} className="text-white" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Or create blank */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-[#F8F9FA] px-3 text-gray-400">{ko ? '또는' : 'or'}</span>
        </div>
      </div>

      <button
        onClick={() => update({
          projectChoice: 'blank',
          selectedTemplate: '',
          projectName: '',
        })}
        className={cn(
          "w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all",
          data.projectChoice === 'blank' && !data.selectedTemplate
            ? "border-[#0079FF] bg-blue-50/50"
            : "border-gray-200 border-dashed bg-white hover:border-gray-300"
        )}
      >
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          data.projectChoice === 'blank' && !data.selectedTemplate
            ? "bg-[#0079FF] text-white"
            : "bg-gray-100 text-gray-400"
        )}>
          <FolderPlus size={20} />
        </div>
        <div>
          <p className={cn(
            "font-semibold text-sm",
            data.projectChoice === 'blank' && !data.selectedTemplate ? "text-[#0079FF]" : "text-gray-700"
          )}>
            {ko ? '빈 프로젝트로 시작' : 'Start with blank project'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {ko ? '직접 처음부터 구성해요' : 'Build from scratch'}
          </p>
        </div>
      </button>

      {/* Project name input for blank */}
      {data.projectChoice === 'blank' && !data.selectedTemplate && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.2 }}
        >
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {ko ? '프로젝트명' : 'Project name'}
          </label>
          <input
            type="text"
            value={data.projectName}
            onChange={e => update({ projectName: e.target.value })}
            placeholder={ko ? '프로젝트 이름을 입력하세요' : 'Enter project name'}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0079FF]/20 focus:border-[#0079FF] transition-all"
          />
        </motion.div>
      )}
    </div>
  );
}