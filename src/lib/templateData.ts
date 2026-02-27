import { addDays } from 'date-fns';
import { GoalItem, Task } from './mockData';

/**
 * Template data generator
 * Generates actual GoalItem[] and Task[] for each onboarding template.
 * IDs are prefixed with "tpl-" to avoid collisions with existing data.
 */

function uid() {
  return 'tpl-' + Math.random().toString(36).substring(2, 10);
}

const now = new Date();

interface TemplateResult {
  goals: GoalItem[];
  tasks: Task[];
}

// ─── Content Calendar ────────────────────────────────────────
function contentCalendar(assigneeId: string): TemplateResult {
  const qId = uid(), m1Id = uid(), m2Id = uid();
  const w1Id = uid(), w2Id = uid();
  const t1 = uid(), t2 = uid(), t3 = uid(), t4 = uid(), t5 = uid();

  return {
    goals: [
      {
        id: qId,
        title: 'Q1 Content Strategy Execution',
        titleKo: '1분기 콘텐츠 전략 실행',
        level: 'Quarter',
        progress: 0,
        status: 'pending',
        children: [m1Id, m2Id],
        startDate: now,
        endDate: addDays(now, 90),
      },
      {
        id: m1Id,
        title: 'Monthly Content Plan',
        titleKo: '월간 콘텐츠 기획',
        level: 'Month',
        progress: 0,
        status: 'pending',
        parentId: qId,
        children: [w1Id],
        startDate: now,
        endDate: addDays(now, 30),
      },
      {
        id: m2Id,
        title: 'Monthly Performance Analysis',
        titleKo: '월간 성과 분석',
        level: 'Month',
        progress: 0,
        status: 'pending',
        parentId: qId,
        startDate: addDays(now, 30),
        endDate: addDays(now, 60),
      },
      {
        id: w1Id,
        title: 'Week 1: Content Production',
        titleKo: '1주차: 콘텐츠 제작',
        level: 'Week',
        progress: 0,
        status: 'pending',
        parentId: m1Id,
        children: [t1, t2, t3, t4, t5],
        startDate: now,
        endDate: addDays(now, 7),
      },
    ],
    tasks: [
      {
        id: t1, title: 'Define content themes for the month', titleKo: '월간 콘텐츠 주제 선정',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 1), assigneeId, priority: 'high',
        description: '타겟 고객과 트렌드를 분석하여 이번 달 콘텐츠 주제를 정합니다.',
      },
      {
        id: t2, title: 'Write blog post draft', titleKo: '블로그 포스트 초안 작성',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 3), assigneeId, priority: 'medium',
        description: '선정된 주제로 블로그 포스트 초안을 작성합니다.',
      },
      {
        id: t3, title: 'Design social media visuals', titleKo: 'SNS 비주얼 디자인',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 4), assigneeId, priority: 'medium',
        description: '인스타그램, 페이스북용 시각 콘텐츠를 제작합니다.',
      },
      {
        id: t4, title: 'Schedule posts for the week', titleKo: '주간 포스팅 스케줄링',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 5), assigneeId, priority: 'low',
        description: '예약 발행 설정 및 최적 시간대 배치를 합니다.',
      },
      {
        id: t5, title: 'Review analytics & engagement', titleKo: '분석 지표 및 인게이지먼트 리뷰',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 7), assigneeId, priority: 'low',
        description: '지난 주 콘텐츠 성과를 분석합니다.',
      },
    ],
  };
}

// ─── Campaign Management ─────────────────────────────────────
function campaignManagement(assigneeId: string): TemplateResult {
  const qId = uid(), m1Id = uid(), w1Id = uid();
  const t1 = uid(), t2 = uid(), t3 = uid(), t4 = uid();

  return {
    goals: [
      {
        id: qId, title: 'Campaign Launch & Growth', titleKo: '캠페인 런칭 및 성장',
        level: 'Quarter', progress: 0, status: 'pending',
        children: [m1Id], startDate: now, endDate: addDays(now, 90),
      },
      {
        id: m1Id, title: 'Campaign Setup & Launch', titleKo: '캠페인 기획 및 런칭',
        level: 'Month', progress: 0, status: 'pending', parentId: qId,
        children: [w1Id], startDate: now, endDate: addDays(now, 30),
      },
      {
        id: w1Id, title: 'Week 1: Campaign Prep', titleKo: '1주차: 캠페인 준비',
        level: 'Week', progress: 0, status: 'pending', parentId: m1Id,
        children: [t1, t2, t3, t4], startDate: now, endDate: addDays(now, 7),
      },
    ],
    tasks: [
      {
        id: t1, title: 'Define campaign objectives & KPIs', titleKo: '캠페인 목표 및 KPI 설정',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 1), assigneeId, priority: 'high',
        description: '캠페인의 핵심 목표와 측정 지표를 정의합니다.',
      },
      {
        id: t2, title: 'Create audience personas', titleKo: '타겟 고객 페르소나 작성',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 2), assigneeId, priority: 'high',
        description: '타겟 고객의 특성, 니즈, 행동 패턴을 정리합니다.',
      },
      {
        id: t3, title: 'Design campaign landing page', titleKo: '캠페인 랜딩 페이지 디자인',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 4), assigneeId, priority: 'medium',
        description: '전환율 높은 랜딩 페이지를 기획·디자인합니다.',
      },
      {
        id: t4, title: 'Set up ad channels & budget', titleKo: '광고 채널 및 예산 세팅',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 5), assigneeId, priority: 'medium',
        description: 'Google Ads, Meta 등 광고 채널별 예산을 배분합니다.',
      },
    ],
  };
}

// ─── Sales Pipeline ──────────────────────────────────────────
function salesPipeline(assigneeId: string): TemplateResult {
  const qId = uid(), m1Id = uid(), w1Id = uid();
  const t1 = uid(), t2 = uid(), t3 = uid(), t4 = uid();

  return {
    goals: [
      {
        id: qId, title: 'Q1 Sales Target Achievement', titleKo: '1분기 매출 목표 달성',
        level: 'Quarter', progress: 0, status: 'pending',
        children: [m1Id], startDate: now, endDate: addDays(now, 90),
      },
      {
        id: m1Id, title: 'Build Sales Pipeline', titleKo: '영업 파이프라인 구축',
        level: 'Month', progress: 0, status: 'pending', parentId: qId,
        children: [w1Id], startDate: now, endDate: addDays(now, 30),
      },
      {
        id: w1Id, title: 'Week 1: Lead Generation', titleKo: '1주차: 리드 발굴',
        level: 'Week', progress: 0, status: 'pending', parentId: m1Id,
        children: [t1, t2, t3, t4], startDate: now, endDate: addDays(now, 7),
      },
    ],
    tasks: [
      {
        id: t1, title: 'Research & list 30 prospects', titleKo: '잠재 고객 30곳 리서치',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 2), assigneeId, priority: 'high',
        description: '타겟 시장에서 잠재 고객 리스트를 작성합니다.',
      },
      {
        id: t2, title: 'Prepare outreach email templates', titleKo: '아웃리치 이메일 템플릿 준비',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 3), assigneeId, priority: 'medium',
        description: '콜드 이메일 및 팔로업 시나리오를 작성합니다.',
      },
      {
        id: t3, title: 'Set up CRM tracking', titleKo: 'CRM 추적 시스템 설정',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 4), assigneeId, priority: 'medium',
        description: '리드 상태 추적을 위한 CRM 파이프라인을 설정합니다.',
      },
      {
        id: t4, title: 'Schedule 5 discovery calls', titleKo: '디스커버리 콜 5건 예약',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 7), assigneeId, priority: 'high',
        description: '잠재 고객과의 미팅을 잡습니다.',
      },
    ],
  };
}

// ─── Sprint Board ────────────────────────────────────────────
function sprintBoard(assigneeId: string): TemplateResult {
  const qId = uid(), m1Id = uid(), w1Id = uid();
  const t1 = uid(), t2 = uid(), t3 = uid(), t4 = uid(), t5 = uid();

  return {
    goals: [
      {
        id: qId, title: 'Product MVP Development', titleKo: '제품 MVP 개발',
        level: 'Quarter', progress: 0, status: 'pending',
        children: [m1Id], startDate: now, endDate: addDays(now, 90),
      },
      {
        id: m1Id, title: 'Sprint 1: Core Feature Set', titleKo: '스프린트 1: 핵심 기능 구현',
        level: 'Month', progress: 0, status: 'pending', parentId: qId,
        children: [w1Id], startDate: now, endDate: addDays(now, 14),
      },
      {
        id: w1Id, title: 'Week 1: Foundation Setup', titleKo: '1주차: 기반 작업',
        level: 'Week', progress: 0, status: 'pending', parentId: m1Id,
        children: [t1, t2, t3, t4, t5], startDate: now, endDate: addDays(now, 7),
      },
    ],
    tasks: [
      {
        id: t1, title: 'Set up project boilerplate', titleKo: '프로젝트 보일러플레이트 셋업',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 1), assigneeId, priority: 'high',
        description: '프로젝트 구조, 린터, CI/CD를 설정합니다.',
      },
      {
        id: t2, title: 'Design database schema', titleKo: '데이터베이스 스키마 설계',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 2), assigneeId, priority: 'high',
        description: '핵심 엔티티와 관계를 정의합니다.',
      },
      {
        id: t3, title: 'Implement user auth flow', titleKo: '사용자 인증 플로우 구현',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 3), assigneeId, priority: 'high',
        description: '회원가입, 로그인, 토큰 관리를 구현합니다.',
      },
      {
        id: t4, title: 'Build CRUD API endpoints', titleKo: 'CRUD API 엔드포인트 구현',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 5), assigneeId, priority: 'medium',
        description: '핵심 리소스의 REST API를 구현합니다.',
      },
      {
        id: t5, title: 'Write unit tests for core logic', titleKo: '핵심 로직 유닛 테스트 작성',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 7), assigneeId, priority: 'medium',
        description: '비즈니스 로직의 테스트 커버리지를 확보합니다.',
      },
    ],
  };
}

// ─── Bug Tracker ─────────────────────────────────────────────
function bugTracker(assigneeId: string): TemplateResult {
  const mId = uid(), w1Id = uid();
  const t1 = uid(), t2 = uid(), t3 = uid();

  return {
    goals: [
      {
        id: mId, title: 'Bug-Free Release Preparation', titleKo: '버그 프리 릴리즈 준비',
        level: 'Month', progress: 0, status: 'pending',
        children: [w1Id], startDate: now, endDate: addDays(now, 30),
      },
      {
        id: w1Id, title: 'Week 1: Critical Bug Triage', titleKo: '1주차: 크리티컬 버그 분류',
        level: 'Week', progress: 0, status: 'pending', parentId: mId,
        children: [t1, t2, t3], startDate: now, endDate: addDays(now, 7),
      },
    ],
    tasks: [
      {
        id: t1, title: 'Audit existing bug reports', titleKo: '기존 버그 리포트 감사',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 1), assigneeId, priority: 'high',
        description: '모든 미해결 버그를 심각도별로 분류합니다.',
      },
      {
        id: t2, title: 'Fix top 3 critical bugs', titleKo: '상위 3개 크리티컬 버그 수정',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 4), assigneeId, priority: 'high',
        description: '가장 심각한 버그 3건을 우선 수정합니다.',
      },
      {
        id: t3, title: 'Set up automated error tracking', titleKo: '자동 에러 트래킹 설정',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 5), assigneeId, priority: 'medium',
        description: 'Sentry 등 에러 모니터링 도구를 연동합니다.',
      },
    ],
  };
}

// ─── Design Project ──────────────────────────────────────────
function designProject(assigneeId: string): TemplateResult {
  const mId = uid(), w1Id = uid();
  const t1 = uid(), t2 = uid(), t3 = uid(), t4 = uid();

  return {
    goals: [
      {
        id: mId, title: 'Design System & Brand Refresh', titleKo: '디자인 시스템 및 브랜드 리뉴얼',
        level: 'Month', progress: 0, status: 'pending',
        children: [w1Id], startDate: now, endDate: addDays(now, 30),
      },
      {
        id: w1Id, title: 'Week 1: Research & Moodboard', titleKo: '1주차: 리서치 및 무드보드',
        level: 'Week', progress: 0, status: 'pending', parentId: mId,
        children: [t1, t2, t3, t4], startDate: now, endDate: addDays(now, 7),
      },
    ],
    tasks: [
      {
        id: t1, title: 'Competitor design analysis', titleKo: '경쟁사 디자인 분석',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 1), assigneeId, priority: 'high',
        description: '주요 경쟁사 UI/UX를 벤치마킹합니다.',
      },
      {
        id: t2, title: 'Create moodboard & color palette', titleKo: '무드보드 및 컬러 팔레트 작성',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 3), assigneeId, priority: 'medium',
        description: '브랜드 톤앤매너를 정의하는 무드보드를 만듭니다.',
      },
      {
        id: t3, title: 'Define typography & spacing system', titleKo: '타이포그래피 및 스페이싱 시스템 정의',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 5), assigneeId, priority: 'medium',
        description: '일관된 서체 및 여백 가이드를 설정합니다.',
      },
      {
        id: t4, title: 'Draft key screen wireframes', titleKo: '핵심 화면 와이어프레임 초안',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 7), assigneeId, priority: 'low',
        description: '주요 화면의 Lo-fi 와이어프레임을 그립니다.',
      },
    ],
  };
}

// ─── Weekly Operations ───────────────────────────────────────
function weeklyOps(assigneeId: string): TemplateResult {
  const mId = uid(), w1Id = uid();
  const t1 = uid(), t2 = uid(), t3 = uid(), t4 = uid();

  return {
    goals: [
      {
        id: mId, title: 'Monthly Operations Excellence', titleKo: '월간 운영 관리 체계화',
        level: 'Month', progress: 0, status: 'pending',
        children: [w1Id], startDate: now, endDate: addDays(now, 30),
      },
      {
        id: w1Id, title: 'Week 1: Ops Baseline Setup', titleKo: '1주차: 운영 기반 설정',
        level: 'Week', progress: 0, status: 'pending', parentId: mId,
        children: [t1, t2, t3, t4], startDate: now, endDate: addDays(now, 7),
      },
    ],
    tasks: [
      {
        id: t1, title: 'Define weekly standup agenda', titleKo: '주간 스탠드업 안건 정의',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 1), assigneeId, priority: 'high',
        description: '매주 진행할 스탠드업 미팅 구조를 설계합니다.',
      },
      {
        id: t2, title: 'Set up team dashboard metrics', titleKo: '팀 대시보드 지표 설정',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 3), assigneeId, priority: 'medium',
        description: '핵심 운영 지표를 정의하고 대시보드를 구성합니다.',
      },
      {
        id: t3, title: 'Document SOPs for recurring tasks', titleKo: '반복 업무 SOP 문서화',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 5), assigneeId, priority: 'medium',
        description: '반복되는 운영 업무의 표준 절차를 문서화합니다.',
      },
      {
        id: t4, title: 'Review & optimize current workflows', titleKo: '현행 워크플로 리뷰 및 최적화',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 7), assigneeId, priority: 'low',
        description: '비효율적인 프로세스를 식별하고 개선합니다.',
      },
    ],
  };
}

// ─── Editorial Planner ───────────────────────────────────────
function editorialPlanner(assigneeId: string): TemplateResult {
  const mId = uid(), w1Id = uid();
  const t1 = uid(), t2 = uid(), t3 = uid();

  return {
    goals: [
      {
        id: mId, title: 'Editorial Content Pipeline', titleKo: '에디토리얼 콘텐츠 파이프라인',
        level: 'Month', progress: 0, status: 'pending',
        children: [w1Id], startDate: now, endDate: addDays(now, 30),
      },
      {
        id: w1Id, title: 'Week 1: Content Pipeline Setup', titleKo: '1주차: 콘텐츠 파이프라인 셋업',
        level: 'Week', progress: 0, status: 'pending', parentId: mId,
        children: [t1, t2, t3], startDate: now, endDate: addDays(now, 7),
      },
    ],
    tasks: [
      {
        id: t1, title: 'Plan editorial calendar for the month', titleKo: '월간 에디토리얼 캘린더 기획',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 2), assigneeId, priority: 'high',
        description: '이번 달 발행할 콘텐츠의 주제와 일정을 계획합니다.',
      },
      {
        id: t2, title: 'Assign writers & reviewers', titleKo: '작성자 및 리뷰어 배정',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 3), assigneeId, priority: 'medium',
        description: '각 콘텐츠의 담당자와 리뷰어를 지정합니다.',
      },
      {
        id: t3, title: 'Set up content style guide', titleKo: '콘텐츠 스타일 가이드 작성',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 5), assigneeId, priority: 'medium',
        description: '일관된 톤앤보이스와 포맷 가이드를 정리합니다.',
      },
    ],
  };
}

// ─── CS Board ────────────────────────────────────────────────
function csBoard(assigneeId: string): TemplateResult {
  const mId = uid(), w1Id = uid();
  const t1 = uid(), t2 = uid(), t3 = uid();

  return {
    goals: [
      {
        id: mId, title: 'Customer Support Optimization', titleKo: '고객 지원 체계 최적화',
        level: 'Month', progress: 0, status: 'pending',
        children: [w1Id], startDate: now, endDate: addDays(now, 30),
      },
      {
        id: w1Id, title: 'Week 1: CS Foundation', titleKo: '1주차: CS 기반 구축',
        level: 'Week', progress: 0, status: 'pending', parentId: mId,
        children: [t1, t2, t3], startDate: now, endDate: addDays(now, 7),
      },
    ],
    tasks: [
      {
        id: t1, title: 'Categorize common customer issues', titleKo: '주요 고객 문의 유형 분류',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 2), assigneeId, priority: 'high',
        description: '반복되는 문의 유형을 카테고리화합니다.',
      },
      {
        id: t2, title: 'Create FAQ & response templates', titleKo: 'FAQ 및 응답 템플릿 작성',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 4), assigneeId, priority: 'medium',
        description: '자주 묻는 질문과 표준 답변 템플릿을 만듭니다.',
      },
      {
        id: t3, title: 'Set up ticket escalation workflow', titleKo: '티켓 에스컬레이션 워크플로 설정',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 5), assigneeId, priority: 'medium',
        description: '복잡한 문의의 에스컬레이션 프로세스를 정의합니다.',
      },
    ],
  };
}

// ─── General Project ─────────────────────────────────────────
function generalProject(assigneeId: string): TemplateResult {
  const mId = uid(), w1Id = uid();
  const t1 = uid(), t2 = uid(), t3 = uid();

  return {
    goals: [
      {
        id: mId, title: 'Project Kickoff', titleKo: '프로젝트 킥오프',
        level: 'Month', progress: 0, status: 'pending',
        children: [w1Id], startDate: now, endDate: addDays(now, 30),
      },
      {
        id: w1Id, title: 'Week 1: Planning & Setup', titleKo: '1주차: 기획 및 셋업',
        level: 'Week', progress: 0, status: 'pending', parentId: mId,
        children: [t1, t2, t3], startDate: now, endDate: addDays(now, 7),
      },
    ],
    tasks: [
      {
        id: t1, title: 'Define project scope & milestones', titleKo: '프로젝트 범위 및 마일스톤 정의',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 2), assigneeId, priority: 'high',
        description: '프로젝트의 목표, 범위, 주요 마일스톤을 설정합니다.',
      },
      {
        id: t2, title: 'Assign team roles & responsibilities', titleKo: '팀 역할 및 책임 배정',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 3), assigneeId, priority: 'medium',
        description: '팀원별 역할과 담당 업무를 정리합니다.',
      },
      {
        id: t3, title: 'Create initial task backlog', titleKo: '초기 태스크 백로그 작성',
        level: 'Day', progress: 0, status: 'pending', parentId: w1Id,
        dueDate: addDays(now, 5), assigneeId, priority: 'medium',
        description: '프로젝트에 필요한 주요 태스크를 나열합니다.',
      },
    ],
  };
}

// ─── Template ID → Generator Map ─────────────────────────────
const TEMPLATE_GENERATORS: Record<string, (assigneeId: string) => TemplateResult> = {
  'content-calendar': contentCalendar,
  'campaign': campaignManagement,
  'sales-pipeline': salesPipeline,
  'sprint': sprintBoard,
  'bug-tracker': bugTracker,
  'design-project': designProject,
  'weekly-ops': weeklyOps,
  'editorial': editorialPlanner,
  'cs-board': csBoard,
  'general': generalProject,
};

/**
 * Generate goals and tasks for a given template ID.
 * Returns null if the template ID is not recognized.
 */
export function generateTemplateData(templateId: string, assigneeId: string = 'u1'): TemplateResult | null {
  const generator = TEMPLATE_GENERATORS[templateId];
  if (!generator) return null;
  return generator(assigneeId);
}
