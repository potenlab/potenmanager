export type Language = "en" | "ko";

export const translations = {
  en: {
    // Sidebar
    dashboard: "Dashboard",
    calendar: "Calendar",
    goals_strategy: "Strategy",
    my_tasks: "My Tasks",
    team: "Team",
    team_members: "Team Members",
    invite_member: "Invite Member",
    ai_assistant: "AI Personal Assistant",
    
    // Dashboard
    strategic_alignment: "Strategic Alignment",
    view_full_map: "View Full Map",
    view_all: "View All",
    opportunity_feed: "Opportunity Feed",
    ai_match: "AI Match",
    view_details: "View Details",
    
    // Calendar
    month: "Month",
    week: "Week",
    "3week": "Today",
    today: "Today",
    manage_schedule: "Manage your schedule and deadlines.",
    
    // Goals
    search_goals: "Search goals, milestones, or tasks...",
    filter: "Filter",
    new_goal: "New Goal",
    annual_progress: "Annual Progress",
    q1_target: "Q1 Target",
    align_vision: "Align your daily work with your long-term vision.",
    no_goals: "No goals found",
    start_goal: "Start by creating your first annual goal.",
    progress: "Progress",
    completed: "Completed",
    
    // Levels
    level_year: "Year",
    level_quarter: "Quarter",
    level_month: "Month",
    level_week: "Week",
    level_day: "Day",
    level_urgent: "Urgent Mission",
    
    // Status
    status_ontrack: "On Track",
    status_atrisk: "At Risk",
    status_delayed: "Delayed",
    status_completed: "Completed",
    status_pending: "Pending",
    status_inprogress: "In Progress",
    
    // Mock Data Titles (Fallback if not in data)
    goal_year_title: "Achieve ₩1B ARR by EOY",
    goal_q1_title: "Q1: Launch MVP and get 100 paid users",
    goal_q2_title: "Q2: Expand to Enterprise Market",
    goal_mar_title: "March: Finalize Core Features",
    goal_w4_title: "Week 4: Polish UI/UX and fix bugs",
    task_t1_title: "Design Dashboard Hierarchy",
    task_t2_title: "Implement Calendar View",
    task_t3_title: "Integrate Opportunity Feed",
    opp_o1_title: "SaaS Dashboard Design Project",
    opp_o2_title: "Senior React Developer Needed",
    opp_o3_title: "Partnership Proposal",

    // Dashboard Tabs & Widgets
    tab_goal: "Goal Overview",
    tab_performance: "Performance",
    tab_team: "Team",
    tab_opportunity: "Opportunity Feed",

    // Project Performance
    project_performance: "Project Performance",
    completion_rate: "Completion Rate",
    completed_this_month: "Completed This Month",
    goal_progress: "Goal Progress",
    vs_last_month: "vs last month",
    this_quarter: "This Quarter",
    last_quarter: "Last Quarter",
    tasks_completed_ytd: "tasks completed this year",
    no_completed_tasks_yet: "No completed tasks yet",
    task_activity: "Task Activity",

    // Team Overview
    team_overview: "Team Overview",
    team_members_count: "Team Members",
    active_tasks: "Active Tasks",
    workload_distribution: "Workload Distribution",
    tasks_label: "tasks",
    assigned_label: "Assigned",
    completed_label: "Completed",
    no_team_data_yet: "No team data yet",

    // Opportunity Feed
    new_matches: "New Matches",
    run_openflow: "Run OpenFlow",
    add_opportunity: "Add Opportunity",
    no_opportunities: "No opportunities yet. Add your first one!",
    no_opportunities_short: "No opportunities yet",
    delete_opportunity: "Delete",
    opp_title: "Title",
    opp_source: "Source",
    opp_budget: "Budget",
    opp_description: "Description",
    opp_tags: "Tags (comma separated)",
    opp_match_score: "AI Match Score",
    cancel: "Cancel",
    save: "Save",

    // Task Time Filters
    new_task: "New Task",
    task_filter_today: "Today",
    task_filter_tomorrow: "Tomorrow",
    task_filter_yesterday: "Yesterday",
    task_filter_this_week: "This Week",
    task_filter_all: "All Tasks",
    task_no_tasks_period: "No tasks for this period.",
    task_past_summary: "past tasks",

    // Urgent Missions
    urgent_goals: "Urgent Missions",
    urgent_goals_desc: "Time-critical missions with hard deadlines",
    d_day: "D-Day",
    d_day_past: "Overdue",
    category_funding: "Funding",
    category_investment: "Investment",
    category_contract: "Contract",
    category_submission: "Submission",
    category_event: "Event",
    category_other: "Other",
    new_urgent_goal: "New Urgent Mission",
    urgent_active: "Active",
    urgent_completed: "Done",
    show_completed: "Show Completed",
    hide_completed: "Hide Completed",
    deadline: "Deadline",
  },
  ko: {
    // Sidebar
    dashboard: "대시보드",
    calendar: "캘린더",
    goals_strategy: "전략",
    my_tasks: "내 업무",
    team: "팀",
    team_members: "팀원",
    invite_member: "팀원 초대하기",
    ai_assistant: "AI 비서",
    
    // Dashboard
    strategic_alignment: "전략적 정렬",
    view_full_map: "전체 맵 보기",
    view_all: "모두 보기",
    opportunity_feed: "기회 피드",
    ai_match: "AI 적합도",
    view_details: "상세 보기",
    
    // Calendar
    month: "월간",
    week: "주간",
    "3week": "오늘",
    today: "오늘",
    manage_schedule: "일정 및 마감 기한을 관리하세요.",
    
    // Goals
    search_goals: "목표, 마일스톤, 업무 검색...",
    filter: "필터",
    new_goal: "새 목표",
    annual_progress: "연간 진행률",
    q1_target: "1분기 목표",
    align_vision: "일일 업무를 장기 비전과 연결하세요.",
    no_goals: "목표가 없습니다",
    start_goal: "첫 연간 목표를 생성하여 시작하세요.",
    progress: "진행률",
    completed: "완료됨",
    
    // Levels
    level_year: "연간 목표",
    level_quarter: "분기 목표",
    level_month: "월간 목표",
    level_week: "주간 목표",
    level_day: "일간 과제",
    level_urgent: "긴급 미션",
    
    // Status
    status_ontrack: "순항 중",
    status_atrisk: "위험",
    status_delayed: "지연됨",
    status_completed: "완료됨",
    status_pending: "대기 중",
    status_inprogress: "진행 중",

    // Mock Data Titles
    goal_year_title: "연말까지 ARR 10억원 달성",
    goal_q1_title: "1분기: MVP 출시 및 유료 고객 100명 확보",
    goal_q2_title: "2분기: 엔터프라이즈 시장 확장",
    goal_mar_title: "3월: 핵심 기능 확정 및 보안 감사",
    goal_w4_title: "4주차: UI/UX 폴리싱 및 버그 수정",
    task_t1_title: "대시보드 계층 구조 디자인",
    task_t2_title: "캘린더 뷰 구현",
    task_t3_title: "기회 피드 API 연동",
    opp_o1_title: "SaaS 대시보드 디자인 프로젝트",
    opp_o2_title: "시니어 React 개발자 구인",
    opp_o3_title: "포텐매니저 파트너십 제안",
    
    // Dashboard Tabs & Widgets
    tab_goal: "목표 개요",
    tab_performance: "성과",
    tab_team: "팀",
    tab_opportunity: "기회 피드",

    // Project Performance
    project_performance: "프로젝트 성과",
    completion_rate: "완료율",
    completed_this_month: "이번 달 완료",
    goal_progress: "목표 진행률",
    vs_last_month: "지난달 대비",
    this_quarter: "이번 분기",
    last_quarter: "지난 분기",
    tasks_completed_ytd: "올해 완료한 태스크",
    no_completed_tasks_yet: "아직 완료된 태스크가 없습니다",
    task_activity: "태스크 활동",

    // Team Overview
    team_overview: "팀 현황",
    team_members_count: "팀원",
    active_tasks: "활성 태스크",
    workload_distribution: "업무 분배",
    tasks_label: "개",
    assigned_label: "배정",
    completed_label: "완료",
    no_team_data_yet: "아직 팀 데이터가 없습니다",

    // Opportunity Feed
    new_matches: "새로운 매칭",
    run_openflow: "OpenFlow 실행",
    add_opportunity: "기회 추가",
    no_opportunities: "등록된 기회가 없습니다. 첫 기회를 추가해보세요!",
    no_opportunities_short: "등록된 기회 없음",
    delete_opportunity: "삭제",
    opp_title: "제목",
    opp_source: "출처",
    opp_budget: "예산",
    opp_description: "설명",
    opp_tags: "태그 (쉼표 구분)",
    opp_match_score: "AI 적합도",
    cancel: "취소",
    save: "저장",

    // Task Time Filters
    new_task: "새 업무",
    task_filter_today: "오늘",
    task_filter_tomorrow: "내일",
    task_filter_yesterday: "어제",
    task_filter_this_week: "이번 주",
    task_filter_all: "전체",
    task_no_tasks_period: "해당 기간에 업무가 없습니다.",
    task_past_summary: "개의 지난 업무",

    // Urgent Missions
    urgent_goals: "긴급 미션",
    urgent_goals_desc: "마감 기한이 정해진 시급한 미션",
    d_day: "D-Day",
    d_day_past: "마감 초과",
    category_funding: "지원사업",
    category_investment: "투자",
    category_contract: "계약",
    category_submission: "제출",
    category_event: "행사",
    category_other: "기타",
    new_urgent_goal: "긴급 미션 추가",
    urgent_active: "진행 중",
    urgent_completed: "완료",
    show_completed: "완료 보기",
    hide_completed: "완료 숨기기",
    deadline: "마감일",
  }
};