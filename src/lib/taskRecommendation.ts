/**
 * ─── AI Task Recommendation Engine ─────────────────────────────────────────
 * 월별·주간 목표의 진행률·마감일·컨텍스트를 분석해
 * 달성에 필요한 업무를 자동으로 추천합니다.
 */

import { GoalItem, Task } from './mockData';
import { addDays, differenceInDays } from 'date-fns';

// ─── Types ──────────────────────────────────────────────────────────────────
export interface TaskRecommendation {
  id: string;
  title: string;
  titleKo: string;
  description: string;
  descriptionKo: string;
  priority: 'high' | 'medium' | 'low';
  suggestedDueDate: Date;
  suggestedAssigneeId?: string;
  goalId: string;
  goalTitle: string;
  goalTitleKo?: string;
  goalLevel: string;
  goalProgress: number;
  reason: string;        // EN
  reasonKo: string;      // KO
  score: number;         // 0–100 (높을수록 우선)
  tags: string[];
  estimatedImpact: number; // 목표 진행률 기대 상승치 (%)
}

// ─── Template Pool ─────────────────────────────────────────────────────────
// [goalId, keyword] → 업무 템플릿 목록
interface TemplateDef {
  title: string;
  titleKo: string;
  description: string;
  descriptionKo: string;
  priority: 'high' | 'medium' | 'low';
  assigneeId?: string;
  dueDaysFromNow: number;
  tags: string[];
  reason: string;
  reasonKo: string;
  baseScore: number;
  impact: number;
}

// 각 목표 레벨 × 테마별 업무 템플릿
const TEMPLATE_POOL: Record<string, TemplateDef[]> = {
  // ── Week level: UI/UX polish + bug fix (g5) ────────────────────────────
  'week_ui_ux': [
    {
      title: 'Mobile responsiveness QA sweep',
      titleKo: '모바일 반응형 QA 점검',
      description: 'Test all screens on iOS/Android breakpoints. Log UI glitches and assign fixes.',
      descriptionKo: 'iOS/Android 브레이크포인트에서 전체 화면을 테스트하고 UI 버그를 기록합니다.',
      priority: 'high',
      assigneeId: 'u3',
      dueDaysFromNow: 2,
      tags: ['QA', 'UI', 'Mobile'],
      reason: 'Week goal "Polish UI/UX" is only 30% done — systematic mobile QA will directly close that gap.',
      reasonKo: '주간 목표 "UI/UX 폴리싱"이 30%에 머물고 있어 모바일 QA가 즉각적인 진행률 향상에 직결됩니다.',
      baseScore: 92,
      impact: 18,
    },
    {
      title: 'Compile & prioritize bug backlog',
      titleKo: '버그 백로그 정리 및 우선순위 설정',
      description: 'Aggregate all open issues from Sentry, Notion, and Slack into a prioritised list.',
      descriptionKo: '센트리, 노션, 슬랙의 미해결 이슈를 통합 정리하고 우선순위를 매깁니다.',
      priority: 'high',
      assigneeId: 'u2',
      dueDaysFromNow: 1,
      tags: ['Bug Fix', 'Planning'],
      reason: 'Bugs are scattered across tools — consolidating them lets the team work the highest-impact fixes first.',
      reasonKo: '버그가 여러 툴에 분산돼 있어 통합 정리 후 팀이 임팩트 높은 수정을 먼저 처리할 수 있습니다.',
      baseScore: 88,
      impact: 14,
    },
    {
      title: 'Implement micro-interaction animations',
      titleKo: '마이크로 인터랙션 애니메이션 적용',
      description: 'Add subtle hover, click, and transition animations across key UI components.',
      descriptionKo: '주요 UI 컴포넌트에 호버·클릭·전환 애니메이션을 추가합니다.',
      priority: 'medium',
      assigneeId: 'u3',
      dueDaysFromNow: 3,
      tags: ['UI', 'Animation', 'UX'],
      reason: 'Micro-interactions elevate perceived quality, directly improving the "polish" metric of the week goal.',
      reasonKo: '마이크로 인터랙션이 체감 품질을 높여 주간 목표의 "폴리싱" 지표를 직접 개선합니다.',
      baseScore: 72,
      impact: 10,
    },
    {
      title: 'Run internal usability test (5 users)',
      titleKo: '내부 사용성 테스트 진행 (5명)',
      description: 'Recruit 5 internal testers, run 20-min sessions, and record UX pain points.',
      descriptionKo: '내부 테스터 5명을 섭외해 20분 세션을 진행하고 UX 페인포인트를 기록합니다.',
      priority: 'medium',
      assigneeId: 'u1',
      dueDaysFromNow: 4,
      tags: ['UX', 'Research', 'Testing'],
      reason: 'Qualitative feedback will surface hidden issues before the end-of-week deadline.',
      reasonKo: '주간 마감 전 숨겨진 문제를 발굴하기 위한 정성적 피드백을 수집합니다.',
      baseScore: 75,
      impact: 12,
    },
  ],

  // ── Month level: finalize core features (g4) ───────────────────────────
  'month_core_features': [
    {
      title: 'Feature freeze & release checklist',
      titleKo: '피처 프리즈 및 릴리즈 체크리스트 작성',
      description: 'Define freeze date, list remaining features, and create a signed-off release checklist.',
      descriptionKo: '피처 프리즈 날짜 확정, 잔여 기능 목록화, 승인된 릴리즈 체크리스트를 작성합니다.',
      priority: 'high',
      assigneeId: 'u2',
      dueDaysFromNow: 3,
      tags: ['Release', 'Planning', 'Core Feature'],
      reason: 'With 40% of the month goal remaining, a formal freeze checklist ensures nothing is left behind before March ends.',
      reasonKo: '월별 목표 40%가 남은 상황에서 공식 피처 프리즈 체크리스트가 3월 마감 전 누락을 방지합니다.',
      baseScore: 95,
      impact: 20,
    },
    {
      title: 'Write technical API documentation',
      titleKo: '기술 API 문서 작성',
      description: 'Document all REST endpoints, request/response schemas, and authentication flows.',
      descriptionKo: '모든 REST 엔드포인트, 요청/응답 스키마, 인증 플로우를 문서화합니다.',
      priority: 'high',
      assigneeId: 'u2',
      dueDaysFromNow: 5,
      tags: ['Documentation', 'API', 'Core Feature'],
      reason: 'Core feature finalization requires complete API docs for future integrations and enterprise clients.',
      reasonKo: '핵심 기능 확정에는 향후 연동 및 엔터프라이즈 고객을 위한 완전한 API 문서가 필요합니다.',
      baseScore: 85,
      impact: 15,
    },
    {
      title: 'Performance benchmark & optimization',
      titleKo: '성능 벤치마크 및 최적화',
      description: 'Run Lighthouse / k6 load tests. Target <2s LCP and <200ms API response time.',
      descriptionKo: 'Lighthouse/k6 부하 테스트를 실행합니다. LCP 2초 이하, API 응답 200ms 이하 목표.',
      priority: 'high',
      assigneeId: 'u2',
      dueDaysFromNow: 6,
      tags: ['Performance', 'Core Feature', 'Technical'],
      reason: 'Performance is a core finalization criterion — poor load times would block enterprise deals.',
      reasonKo: '성능은 핵심 기능 확정 기준이며, 느린 로딩 속도는 엔터프라이즈 계약을 저해합니다.',
      baseScore: 88,
      impact: 16,
    },
    {
      title: 'Setup staging environment for UAT',
      titleKo: 'UAT용 스테이징 환경 구성',
      description: 'Configure a production-mirrored staging env for user acceptance testing by beta users.',
      descriptionKo: '베타 사용자의 사용자 인수 테스트를 위한 운영 환경 미러 스테이징을 구성합니다.',
      priority: 'medium',
      assigneeId: 'u2',
      dueDaysFromNow: 4,
      tags: ['DevOps', 'Testing', 'Staging'],
      reason: 'UAT is the final gate before core feature release — staging must be ready in advance.',
      reasonKo: '사용자 인수 테스트는 핵심 기능 릴리즈 전 최종 관문이며, 스테이징이 미리 준비돼야 합니다.',
      baseScore: 80,
      impact: 12,
    },
  ],

  // ── Quarter level: Q1 – 100 paid users (g2) ────────────────────────────
  'quarter_growth': [
    {
      title: 'Activate 10 free trial users to paid',
      titleKo: '무료 체험 유저 10명 유료 전환',
      description: 'Identify top 10 engaged free-trial users. Offer 1:1 calls and limited-time upgrade discount.',
      descriptionKo: '가장 적극적인 무료 체험 유저 10명을 선별해 1:1 콜과 한정 업그레이드 할인을 제안합니다.',
      priority: 'high',
      assigneeId: 'u1',
      dueDaysFromNow: 5,
      tags: ['Growth', 'Conversion', 'Q1'],
      reason: 'Q1 goal is at 80% — converting active free users is the fastest path to the 100-paid-user target.',
      reasonKo: 'Q1 목표가 80%이며, 활성 무료 사용자 전환이 유료 고객 100명 달성의 가장 빠른 경로입니다.',
      baseScore: 90,
      impact: 20,
    },
    {
      title: 'Create referral program landing page',
      titleKo: '레퍼럴 프로그램 랜딩 페이지 제작',
      description: 'Design and launch a simple referral program with a "give 1 month free, get 1 month free" mechanic.',
      descriptionKo: '"1개월 무료 증정, 1개월 무료 혜택" 메커니즘의 레퍼럴 프로그램 랜딩 페이지를 제작합니다.',
      priority: 'medium',
      assigneeId: 'u4',
      dueDaysFromNow: 7,
      tags: ['Marketing', 'Growth', 'Referral'],
      reason: 'A referral loop amplifies paid user growth without additional ad spend — perfect for end-of-quarter push.',
      reasonKo: '레퍼럴 루프는 추가 광고비 없이 유료 사용자 성장을 증폭시켜 분기말 push에 최적입니다.',
      baseScore: 78,
      impact: 10,
    },
  ],

  // ── Urgent: TIPS 지원 (ug1) ────────────────────────────────────────────
  'urgent_tips': [
    {
      title: 'Finalize TIPS application executive summary',
      titleKo: 'TIPS 지원서 경영진 요약본 최종 작성',
      description: 'Write a 2-page executive summary covering problem, solution, market size, and traction.',
      descriptionKo: '문제, 솔루션, 시장 규모, 성과를 담은 2페이지 경영진 요약본을 작성합니다.',
      priority: 'high',
      assigneeId: 'u1',
      dueDaysFromNow: 2,
      tags: ['Funding', 'TIPS', 'Urgent'],
      reason: 'TIPS deadline is in 5 days and the application is only 65% done — executive summary is the critical missing piece.',
      reasonKo: 'TIPS 마감이 5일 남았고 65%만 완료됐습니다. 경영진 요약본이 핵심 미완성 항목입니다.',
      baseScore: 97,
      impact: 25,
    },
  ],
};

// ─── Recommendation Engine ─────────────────────────────────────────────────

function getActiveGoalsByLevel(allGoals: GoalItem[], level: string): GoalItem[] {
  return allGoals.filter(
    (g) => g.level === level && g.status !== 'completed'
  );
}

function getDaysUntilEnd(goal: GoalItem): number {
  const end = goal.endDate ?? goal.deadline;
  if (!end) return 30;
  return Math.max(0, differenceInDays(end, new Date()));
}

function urgencyBonus(daysLeft: number): number {
  if (daysLeft <= 3) return 35;
  if (daysLeft <= 7) return 25;
  if (daysLeft <= 14) return 15;
  if (daysLeft <= 30) return 5;
  return 0;
}

function progressBonus(progress: number): number {
  // 진행률이 낮을수록 높은 점수 (더 급함)
  if (progress < 30) return 25;
  if (progress < 50) return 18;
  if (progress < 70) return 10;
  return 3;
}

// 이미 유사한 업무가 존재하는지 키워드로 검크
function isDuplicate(template: TemplateDef, existingTasks: Task[]): boolean {
  const titleWords = template.titleKo.split(/[\s,]+/).filter((w) => w.length > 1);
  return existingTasks.some((t) => {
    const tTitle = (t.titleKo || t.title).toLowerCase();
    const matchCount = titleWords.filter((w) => tTitle.includes(w.toLowerCase())).length;
    return matchCount >= 2;
  });
}

export function generateRecommendations(allGoals: GoalItem[], allExistingTasks: Task[]): TaskRecommendation[] {
  const recommendations: TaskRecommendation[] = [];
  let recId = 0;

  // ── 1. Week 목표 분석 ──────────────────────────────────────────────
  const weekGoals = getActiveGoalsByLevel(allGoals, 'Week');
  weekGoals.forEach((goal) => {
    const daysLeft = getDaysUntilEnd(goal);
    const templates = TEMPLATE_POOL['week_ui_ux'] ?? [];

    templates.forEach((tmpl) => {
      if (isDuplicate(tmpl, allExistingTasks)) return;
      const score = Math.min(
        100,
        tmpl.baseScore + urgencyBonus(daysLeft) + progressBonus(goal.progress)
      );
      recommendations.push({
        id: `rec_${++recId}`,
        title: tmpl.title,
        titleKo: tmpl.titleKo,
        description: tmpl.description,
        descriptionKo: tmpl.descriptionKo,
        priority: tmpl.priority,
        suggestedDueDate: addDays(new Date(), tmpl.dueDaysFromNow),
        suggestedAssigneeId: tmpl.assigneeId,
        goalId: goal.id,
        goalTitle: goal.title,
        goalTitleKo: goal.titleKo,
        goalLevel: goal.level,
        goalProgress: goal.progress,
        reason: tmpl.reason,
        reasonKo: tmpl.reasonKo,
        score,
        tags: tmpl.tags,
        estimatedImpact: tmpl.impact,
      });
    });
  });

  // ── 2. Month 목표 분석 ─────────────────────────────────────────────
  const monthGoals = getActiveGoalsByLevel(allGoals, 'Month');
  monthGoals.forEach((goal) => {
    const daysLeft = getDaysUntilEnd(goal);
    const templates = TEMPLATE_POOL['month_core_features'] ?? [];

    templates.forEach((tmpl) => {
      if (isDuplicate(tmpl, allExistingTasks)) return;
      const score = Math.min(
        100,
        tmpl.baseScore + urgencyBonus(daysLeft) + progressBonus(goal.progress)
      );
      recommendations.push({
        id: `rec_${++recId}`,
        title: tmpl.title,
        titleKo: tmpl.titleKo,
        description: tmpl.description,
        descriptionKo: tmpl.descriptionKo,
        priority: tmpl.priority,
        suggestedDueDate: addDays(new Date(), tmpl.dueDaysFromNow),
        suggestedAssigneeId: tmpl.assigneeId,
        goalId: goal.id,
        goalTitle: goal.title,
        goalTitleKo: goal.titleKo,
        goalLevel: goal.level,
        goalProgress: goal.progress,
        reason: tmpl.reason,
        reasonKo: tmpl.reasonKo,
        score,
        tags: tmpl.tags,
        estimatedImpact: tmpl.impact,
      });
    });
  });

  // ── 3. Quarter 목표 분석 ───────────────────────────────────────────
  const quarterGoals = getActiveGoalsByLevel(allGoals, 'Quarter');
  quarterGoals.forEach((goal) => {
    const daysLeft = getDaysUntilEnd(goal);
    const templates = TEMPLATE_POOL['quarter_growth'] ?? [];

    templates.forEach((tmpl) => {
      if (isDuplicate(tmpl, allExistingTasks)) return;
      const score = Math.min(
        100,
        tmpl.baseScore + urgencyBonus(daysLeft) + progressBonus(goal.progress)
      );
      recommendations.push({
        id: `rec_${++recId}`,
        title: tmpl.title,
        titleKo: tmpl.titleKo,
        description: tmpl.description,
        descriptionKo: tmpl.descriptionKo,
        priority: tmpl.priority,
        suggestedDueDate: addDays(new Date(), tmpl.dueDaysFromNow),
        suggestedAssigneeId: tmpl.assigneeId,
        goalId: goal.id,
        goalTitle: goal.title,
        goalTitleKo: goal.titleKo,
        goalLevel: goal.level,
        goalProgress: goal.progress,
        reason: tmpl.reason,
        reasonKo: tmpl.reasonKo,
        score,
        tags: tmpl.tags,
        estimatedImpact: tmpl.impact,
      });
    });
  });

  // ── 4. Urgent 목표 분석 ────────────────────────────────────────────
  const urgentGoalList = getActiveGoalsByLevel(allGoals, 'Urgent');
  urgentGoalList.forEach((goal) => {
    const daysLeft = getDaysUntilEnd(goal);
    const templates = TEMPLATE_POOL['urgent_tips'] ?? [];

    templates.forEach((tmpl) => {
      if (isDuplicate(tmpl, allExistingTasks)) return;
      const score = Math.min(
        100,
        tmpl.baseScore + urgencyBonus(daysLeft) + progressBonus(goal.progress)
      );
      recommendations.push({
        id: `rec_${++recId}`,
        title: tmpl.title,
        titleKo: tmpl.titleKo,
        description: tmpl.description,
        descriptionKo: tmpl.descriptionKo,
        priority: tmpl.priority,
        suggestedDueDate: addDays(new Date(), tmpl.dueDaysFromNow),
        suggestedAssigneeId: tmpl.assigneeId,
        goalId: goal.id,
        goalTitle: goal.title,
        goalTitleKo: goal.titleKo,
        goalLevel: goal.level,
        goalProgress: goal.progress,
        reason: tmpl.reason,
        reasonKo: tmpl.reasonKo,
        score,
        tags: tmpl.tags,
        estimatedImpact: tmpl.impact,
      });
    });
  });

  // 점수 내림차순 정렬
  return recommendations.sort((a, b) => b.score - a.score);
}

// ─── Goal Context Summary ──────────────────────────────────────────────────
export interface GoalContext {
  id: string;
  title: string;
  titleKo?: string;
  level: string;
  progress: number;
  daysLeft: number;
  status: string;
}

export function getGoalContextSummary(allGoals: GoalItem[]): GoalContext[] {
  const levels = ['Urgent', 'Week', 'Month', 'Quarter'];
  return allGoals
    .filter((g) => levels.includes(g.level) && g.status !== 'completed')
    .map((g) => ({
      id: g.id,
      title: g.title,
      titleKo: g.titleKo,
      level: g.level,
      progress: g.progress,
      daysLeft: getDaysUntilEnd(g),
      status: g.status,
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft);
}
