import { addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns';

export type User = {
  id: string;
  name: string;
  avatar: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  color?: string;
  jobTitle?: string;
};

// ─── Member Color System ────────────────────────────────────────────
export const MEMBER_COLORS = [
  { id: 'mc1', hex: '#0079FF', label: 'Blue', labelKo: '파란색', bg: 'rgba(0,121,255,0.10)', text: '#0060CC' },
  { id: 'mc2', hex: '#7C3AED', label: 'Purple', labelKo: '보라색', bg: 'rgba(124,58,237,0.10)', text: '#6529C9' },
  { id: 'mc3', hex: '#E11D48', label: 'Rose', labelKo: '로즈', bg: 'rgba(225,29,72,0.10)', text: '#BE123C' },
  { id: 'mc4', hex: '#EA580C', label: 'Orange', labelKo: '주황색', bg: 'rgba(234,88,12,0.10)', text: '#C2410C' },
  { id: 'mc5', hex: '#D97706', label: 'Orange', labelKo: '오랜지', bg: 'rgba(217,119,6,0.10)', text: '#B45309' },
  { id: 'mc6', hex: '#059669', label: 'Emerald', labelKo: '에메랄드', bg: 'rgba(5,150,105,0.10)', text: '#047857' },
  { id: 'mc7', hex: '#0891B2', label: 'Cyan', labelKo: '시안', bg: 'rgba(8,145,178,0.10)', text: '#0E7490' },
  { id: 'mc8', hex: '#4F46E5', label: 'Indigo', labelKo: '인디고', bg: 'rgba(79,70,229,0.10)', text: '#4338CA' },
  { id: 'mc9', hex: '#DB2777', label: 'Pink', labelKo: '핑크', bg: 'rgba(219,39,119,0.10)', text: '#BE185D' },
  { id: 'mc10', hex: '#65A30D', label: 'Lime', labelKo: '라임', bg: 'rgba(101,163,13,0.10)', text: '#4D7C0F' },
];

// Mutable map: userId → color hex
const _userColorMap: Record<string, string> = {
  u1: '#0079FF',
  u2: '#059669',
  u3: '#7C3AED',
  u4: '#0891B2',
};

export function getUserColor(userId: string): string | null {
  return _userColorMap[userId] ?? null;
}

export function setUserColor(userId: string, hex: string | null) {
  if (hex === null) {
    delete _userColorMap[userId];
  } else {
    _userColorMap[userId] = hex;
  }
}

export function getColorOwner(hex: string): string | null {
  for (const [uid, c] of Object.entries(_userColorMap)) {
    if (c === hex) return uid;
  }
  return _specialColorMap[hex] ?? null;
}

export function getMemberColorConfig(hex: string) {
  return MEMBER_COLORS.find((c) => c.hex === hex) ?? null;
}

// ─── Special Color Owner System ─────────────────────────────────────
// 팀원이 아닌 "업무/카테고리" 단위로 색상을 점유할 수 있는 시스템
export type SpecialColorOwner = {
  id: string;
  name: string;
  nameKo: string;
  emoji: string;
};

const SPECIAL_COLOR_OWNERS: Record<string, SpecialColorOwner> = {
  special_urgent: {
    id: 'special_urgent',
    name: 'Urgent Mission',
    nameKo: '긴급미션',
    emoji: '🔥',
  },
};

// hex → specialOwnerId (기본: 주황색은 긴급미션 점유)
const _specialColorMap: Record<string, string> = {
  '#EA580C': 'special_urgent',
};

export function getSpecialColorOwner(hex: string): SpecialColorOwner | null {
  const id = _specialColorMap[hex];
  return id ? (SPECIAL_COLOR_OWNERS[id] ?? null) : null;
}

export function setSpecialColorOwner(hex: string, ownerId: string | null) {
  if (ownerId === null) {
    delete _specialColorMap[hex];
  } else {
    _specialColorMap[hex] = ownerId;
  }
}

export function getAllSpecialColorOwners(): Record<string, SpecialColorOwner> {
  return SPECIAL_COLOR_OWNERS;
}

export const currentUser: User = {
  id: 'u1',
  name: 'Lee Minjae',
  avatar: 'https://images.unsplash.com/photo-1559722530-0562aef6306a?w=100&h=100&fit=crop',
  role: 'owner',
  jobTitle: 'CEO',
};

export const teamMembers: User[] = [
  currentUser,
  {
    id: 'u2',
    name: 'Nam Daehyun',
    avatar: 'https://images.unsplash.com/photo-1726842172813-55c6e284f8b5?w=100&h=100&fit=crop',
    role: 'admin',
    jobTitle: 'CTO',
  },
  {
    id: 'u3',
    name: 'Seo Jimin',
    avatar: 'https://images.unsplash.com/photo-1597294718458-02c5f899fd97?w=100&h=100&fit=crop',
    role: 'member',
    jobTitle: 'Head of Design',
  },
  {
    id: 'u4',
    name: 'Ahn Seungju',
    avatar: 'https://images.unsplash.com/photo-1659353221237-6a1cfb73fd90?w=100&h=100&fit=crop',
    role: 'member',
    jobTitle: 'Marketing Lead',
  },
];

export type GoalLevel = 'Year' | 'Quarter' | 'Month' | 'Week' | 'Day' | 'Urgent';

export type UrgentCategory = 'funding' | 'investment' | 'contract' | 'submission' | 'event' | 'other';

export interface GoalItem {
  id: string;
  title: string;
  titleKo?: string;
  level: GoalLevel;
  progress: number; // 0-100
  status: 'pending' | 'in-progress' | 'completed';
  children?: string[]; // IDs of children
  parentId?: string;
  dueDate?: Date;
  startDate?: Date;
  endDate?: Date;
  assigneeId?: string;
  // Urgent goal fields
  urgentCategory?: UrgentCategory;
  deadline?: Date;
  isUrgent?: boolean;
}

const now = new Date();
const currentYear = now.getFullYear();

export const goals: GoalItem[] = [
  {
    id: 'g1',
    title: 'Achieve $1M ARR by EOY',
    titleKo: '연말까지 ARR $1M 달성',
    level: 'Year',
    progress: 45,
    status: 'in-progress',
    children: ['g2', 'g3'],
    startDate: new Date(currentYear, 0, 1),
    endDate: new Date(currentYear, 11, 31),
  },
  {
    id: 'g2',
    title: 'Q1: Launch MVP and get 100 paid users',
    titleKo: '1분기: MVP 출시 및 유료 고객 100명 확보',
    level: 'Quarter',
    progress: 80,
    status: 'in-progress',
    parentId: 'g1',
    children: ['g4'],
    startDate: new Date(currentYear, 0, 1),
    endDate: new Date(currentYear, 2, 31),
  },
  {
    id: 'g3',
    title: 'Q2: Expand to Enterprise Market',
    titleKo: '2분기: 엔터프라이즈 시장 확장',
    level: 'Quarter',
    progress: 0,
    status: 'pending',
    parentId: 'g1',
    startDate: new Date(currentYear, 3, 1),
    endDate: new Date(currentYear, 5, 30),
  },
  {
    id: 'g4',
    title: 'March: Finalize Core Features',
    titleKo: '3월: 핵심 기능 확정 및 보안 감사',
    level: 'Month',
    progress: 60,
    status: 'in-progress',
    parentId: 'g2',
    children: ['g5'],
    startDate: new Date(currentYear, 2, 1),
    endDate: new Date(currentYear, 2, 31),
  },
  {
    id: 'g5',
    title: 'Week 4: Polish UI/UX and fix bugs',
    titleKo: '4주차: UI/UX 폴리싱 및 버그 수정',
    level: 'Week',
    progress: 30,
    status: 'in-progress',
    parentId: 'g4',
    children: ['t1', 't2', 't3'],
    startDate: new Date(currentYear, 2, 22),
    endDate: new Date(currentYear, 2, 28),
  },
];

// ─── Urgent Goals ───────────────────────────────────────────────────
export const urgentGoals: GoalItem[] = [
  {
    id: 'ug1',
    title: 'TIPS Program Application',
    titleKo: 'TIPS 프로그램 지원서 제출',
    level: 'Urgent',
    progress: 65,
    status: 'in-progress',
    isUrgent: true,
    urgentCategory: 'funding',
    deadline: addDays(new Date(), 5),
    startDate: subDays(new Date(), 10),
    assigneeId: 'u1',
    children: ['ut1', 'ut2'],
  },
  {
    id: 'ug2',
    title: 'Seed Round Pitch Deck',
    titleKo: '시드 라운드 피치덱 완성',
    level: 'Urgent',
    progress: 40,
    status: 'in-progress',
    isUrgent: true,
    urgentCategory: 'investment',
    deadline: addDays(new Date(), 12),
    startDate: subDays(new Date(), 5),
    assigneeId: 'u1',
    children: ['ut3'],
  },
  {
    id: 'ug3',
    title: 'Enterprise Client Proposal Submission',
    titleKo: '엔터프라이즈 고객 제안서 마감',
    level: 'Urgent',
    progress: 20,
    status: 'in-progress',
    isUrgent: true,
    urgentCategory: 'contract',
    deadline: addDays(new Date(), 3),
    startDate: subDays(new Date(), 7),
    assigneeId: 'u2',
  },
  {
    id: 'ug4',
    title: 'K-Startup Grand Challenge Registration',
    titleKo: 'K-스타트업 그랜드 챌린지 등록',
    level: 'Urgent',
    progress: 100,
    status: 'completed',
    isUrgent: true,
    urgentCategory: 'submission',
    deadline: subDays(new Date(), 2),
    startDate: subDays(new Date(), 14),
    assigneeId: 'u1',
  },
];

export interface Task extends GoalItem {
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  assigneeIds?: string[]; // multi-assignee; first = main assignee (calendar color source)
  colorOverride?: string | null; // manual color override; if set, overrides assignee's auto color
}

// Helper: get the "main" assignee id for calendar color purposes.
// Uses assigneeIds[0] if present, otherwise falls back to legacy assigneeId.
export function getMainAssigneeId(task: Task | GoalItem): string | undefined {
  if ('assigneeIds' in task && (task as Task).assigneeIds?.length) {
    return (task as Task).assigneeIds![0];
  }
  return task.assigneeId;
}

// Helper: get all assignee ids (deduped, main first)
export function getAllAssigneeIds(task: Task | GoalItem): string[] {
  const ids: string[] = [];
  if ('assigneeIds' in task && (task as Task).assigneeIds?.length) {
    ids.push(...(task as Task).assigneeIds!);
  }
  if (task.assigneeId && !ids.includes(task.assigneeId)) {
    ids.unshift(task.assigneeId);
  }
  return ids;
}

// Helper: get the effective calendar color for a task.
// Priority: 1) colorOverride (manual) → 2) main assignee's member color (auto)
export function getTaskCalendarColor(task: Task): string | null {
  if (task.colorOverride) return task.colorOverride;
  const mainId = getMainAssigneeId(task);
  if (mainId) return getUserColor(mainId);
  return null;
}

// Urgent goal sub-tasks
export const urgentTasks: Task[] = [
  {
    id: 'ut1',
    title: 'Prepare business plan document',
    titleKo: '사업 계획서 작성',
    level: 'Day',
    progress: 100,
    status: 'completed',
    parentId: 'ug1',
    dueDate: addDays(new Date(), 2),
    assigneeId: 'u1',
    priority: 'high',
    description: 'Write a comprehensive business plan for the TIPS application.',
  },
  {
    id: 'ut2',
    title: 'Financial projection spreadsheet',
    titleKo: '재무 예측 스프레드시트 작성',
    level: 'Day',
    progress: 30,
    status: 'in-progress',
    parentId: 'ug1',
    dueDate: addDays(new Date(), 4),
    assigneeId: 'u1',
    priority: 'high',
    description: '3-year financial projection model for funding application.',
  },
  {
    id: 'ut3',
    title: 'Design investor pitch deck slides',
    titleKo: '투자 피치덱 슬라이드 디자인',
    level: 'Day',
    progress: 50,
    status: 'in-progress',
    parentId: 'ug2',
    dueDate: addDays(new Date(), 7),
    assigneeId: 'u3',
    priority: 'high',
    description: 'Design visually compelling pitch deck for seed round.',
  },
];

export const tasks: Task[] = [
  {
    id: 't1',
    title: 'Design Dashboard Hierarchy',
    titleKo: '대시보드 계층 구조 디자인',
    level: 'Day',
    progress: 100,
    status: 'completed',
    parentId: 'g5',
    dueDate: new Date(),
    assigneeId: 'u3',
    priority: 'high',
    description: 'Implement the 5-level hierarchy visualization.',
  },
  {
    id: 't2',
    title: 'Implement Calendar View',
    titleKo: '캘린더 뷰 구현',
    level: 'Day',
    progress: 50,
    status: 'in-progress',
    parentId: 'g5',
    dueDate: new Date(),
    assigneeId: 'u2',
    assigneeIds: ['u2', 'u3'],
    priority: 'medium',
    description: 'Create monthly and weekly calendar views.',
  },
  {
    id: 't3',
    title: 'Integrate Opportunity Feed',
    titleKo: '기회 피드 API 연동',
    level: 'Day',
    progress: 0,
    status: 'pending',
    parentId: 'g5',
    dueDate: addDays(new Date(), 1),
    assigneeId: 'u1',
    priority: 'low',
    description: 'Connect to external API for opportunity data.',
  },
  // Tomorrow's tasks
  {
    id: 't3b',
    title: 'Prepare client presentation',
    titleKo: '클라이언트 발표 자료 준비',
    level: 'Day',
    progress: 30,
    status: 'in-progress',
    parentId: 'g5',
    dueDate: addDays(new Date(), 1),
    assigneeId: 'u1',
    assigneeIds: ['u1', 'u2'],
    priority: 'high',
    description: 'Create slides and demo for quarterly client review meeting.',
  },
  {
    id: 't3c',
    title: 'Review pull requests',
    titleKo: 'PR 리뷰',
    level: 'Day',
    progress: 0,
    status: 'pending',
    parentId: 'g5',
    dueDate: addDays(new Date(), 1),
    assigneeId: 'u2',
    priority: 'medium',
    description: 'Review and approve pending pull requests from team members.',
  },
  // Yesterday's tasks
  {
    id: 't4',
    title: 'Write API documentation',
    titleKo: 'API 문서 작성',
    level: 'Day',
    progress: 100,
    status: 'completed',
    parentId: 'g5',
    dueDate: subDays(new Date(), 1),
    assigneeId: 'u2',
    priority: 'high',
    description: 'Document all REST API endpoints and request/response schemas.',
  },
  {
    id: 't5',
    title: 'Fix login page redirect bug',
    titleKo: '로그인 페이지 리다이렉트 버그 수정',
    level: 'Day',
    progress: 100,
    status: 'completed',
    parentId: 'g5',
    dueDate: subDays(new Date(), 1),
    assigneeId: 'u1',
    priority: 'high',
    description: 'Users are being redirected to a blank page after login.',
  },
  {
    id: 't6',
    title: 'Design team meeting',
    titleKo: '디자인팀 미팅',
    level: 'Day',
    progress: 100,
    status: 'completed',
    parentId: 'g5',
    dueDate: subDays(new Date(), 1),
    assigneeId: 'u3',
    priority: 'medium',
    description: 'Weekly design review and sprint planning.',
  },
  // 2 days ago tasks
  {
    id: 't7',
    title: 'Set up CI/CD pipeline',
    titleKo: 'CI/CD 파이프라인 구축',
    level: 'Day',
    progress: 100,
    status: 'completed',
    parentId: 'g5',
    dueDate: subDays(new Date(), 2),
    assigneeId: 'u2',
    priority: 'high',
    description: 'Configure GitHub Actions for automated testing and deployment.',
  },
  {
    id: 't8',
    title: 'User research interview',
    titleKo: '유저 리서치 인터뷰',
    level: 'Day',
    progress: 100,
    status: 'completed',
    parentId: 'g5',
    dueDate: subDays(new Date(), 2),
    assigneeId: 'u1',
    priority: 'medium',
    description: 'Interview 5 beta users about onboarding experience.',
  },
  // 3 days ago
  {
    id: 't9',
    title: 'Database schema optimization',
    titleKo: '데이터베이스 스키마 최적화',
    level: 'Day',
    progress: 100,
    status: 'completed',
    parentId: 'g5',
    dueDate: subDays(new Date(), 3),
    assigneeId: 'u2',
    priority: 'medium',
    description: 'Optimize query performance and add proper indexes.',
  },
  {
    id: 't10',
    title: 'Create onboarding flow mockup',
    titleKo: '온보딩 플로우 목업 제작',
    level: 'Day',
    progress: 100,
    status: 'completed',
    parentId: 'g5',
    dueDate: subDays(new Date(), 4),
    assigneeId: 'u3',
    priority: 'low',
    description: 'Design the first-time user onboarding experience.',
  },
  // Last week
  {
    id: 't11',
    title: 'Competitive analysis report',
    titleKo: '경쟁사 분석 보고서 작성',
    level: 'Day',
    progress: 100,
    status: 'completed',
    parentId: 'g4',
    dueDate: subDays(new Date(), 7),
    assigneeId: 'u1',
    priority: 'medium',
    description: 'Analyze top 5 competitors and summarize key findings.',
  },
  {
    id: 't12',
    title: 'Implement notification system',
    titleKo: '알림 시스템 구현',
    level: 'Day',
    progress: 100,
    status: 'completed',
    parentId: 'g4',
    dueDate: subDays(new Date(), 8),
    assigneeId: 'u2',
    priority: 'high',
    description: 'Build push notification and in-app notification system.',
  },
  // ─── Overdue / Unprocessed Tasks (past due, not completed) ───────────
  {
    id: 't13',
    title: 'Update onboarding copy & UX flow',
    titleKo: '온보딩 카피 및 UX 플로우 업데이트',
    level: 'Day',
    progress: 15,
    status: 'in-progress',
    parentId: 'g5',
    dueDate: subDays(new Date(), 3),
    assigneeId: 'u3',
    priority: 'high',
    description: 'Revise onboarding screens based on user feedback from beta testers.',
  },
  {
    id: 't14',
    title: 'Set up analytics dashboard (Mixpanel)',
    titleKo: 'Mixpanel 분석 대시보드 세팅',
    level: 'Day',
    progress: 0,
    status: 'pending',
    parentId: 'g5',
    dueDate: subDays(new Date(), 5),
    assigneeId: 'u4',
    priority: 'medium',
    description: 'Integrate Mixpanel and configure key funnel tracking events.',
  },
  {
    id: 't15',
    title: 'Cold outreach to 20 enterprise prospects',
    titleKo: '엔터프라이즈 잠재 고객 20명 콜드 아웃리치',
    level: 'Day',
    progress: 0,
    status: 'pending',
    parentId: 'g4',
    dueDate: subDays(new Date(), 2),
    assigneeId: 'u1',
    priority: 'high',
    description: 'Send personalized cold emails to 20 identified enterprise leads.',
  },
  {
    id: 't16',
    title: 'Refactor authentication module',
    titleKo: '인증 모듈 리팩토링',
    level: 'Day',
    progress: 40,
    status: 'in-progress',
    parentId: 'g5',
    dueDate: subDays(new Date(), 1),
    assigneeId: 'u2',
    priority: 'medium',
    description: 'Clean up auth code, add proper error handling and session refresh logic.',
  },
  {
    id: 't17',
    title: 'Prepare Q1 investor update report',
    titleKo: 'Q1 투자자 업데이트 리포트 작성',
    level: 'Day',
    progress: 0,
    status: 'pending',
    parentId: 'g2',
    dueDate: subDays(new Date(), 4),
    assigneeId: 'u1',
    priority: 'high',
    description: 'Write and send the quarterly investor update with key metrics and highlights.',
  },
];

export interface Opportunity {
  id: string;
  title: string;
  titleKo?: string;
  description: string;
  platform: 'Upwork' | 'LinkedIn' | 'Email';
  aiScore: number; // 0-100
  date: string;
}

export const opportunities: Opportunity[] = [
  {
    id: 'o1',
    title: 'SaaS Dashboard Design Project',
    titleKo: 'SaaS 대시보드 디자인 프로젝트',
    description: 'Looking for a UI/UX designer for a fintech dashboard.',
    platform: 'Upwork',
    aiScore: 92,
    date: '2h ago',
  },
  {
    id: 'o2',
    title: 'Senior React Developer Needed',
    titleKo: '시니어 React 개발자 구인',
    description: 'Build a scalable frontend architecture for an AI startup.',
    platform: 'LinkedIn',
    aiScore: 85,
    date: '5h ago',
  },
  {
    id: 'o3',
    title: 'Partnership Proposal',
    titleKo: '포텐매니저 파트너십 제안',
    description: 'Proposal for integration with your Poten Manager.',
    platform: 'Email',
    aiScore: 78,
    date: '1d ago',
  },
];