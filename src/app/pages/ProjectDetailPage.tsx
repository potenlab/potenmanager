import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ChevronDown,
  Calendar, Users, Circle, Camera, UserCircle,
  Building2, DollarSign, FolderKanban, Link2, Plus, X,
  FileText, Lightbulb, Megaphone, Code2, Palette, Rocket, LayoutTemplate,
  Target, UsersRound,
} from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";
import { api } from "../../lib/api";
import { useRealtimeBroadcast } from "../../lib/realtimeSync";
import { useLanguage } from "../context/LanguageContext";
import { usePermission } from "../context/PermissionContext";
import { useInvite } from "../context/InviteContext";
import { usePortalPosition } from "../hooks/usePortalPosition";
import { NotionBlockEditor } from "../components/NotionBlockEditor";

import { InlineText } from "../components/detail/InlineText";
import { AutoProperties } from "../components/detail/AutoProperties";
import type { PropertyFieldConfig } from "../components/detail/PropertyConfig";
import { DetailPageShell } from "../components/detail/DetailPageShell";
import { useOrgPath } from "../hooks/useOrgPath";
import {
  Project, PROJECT_STATUS_CONFIG, PROJECT_COLORS, PROJECT_CATEGORY_CONFIG,
  loadProjects, saveProjects, loadCards, saveCards, loadColumns,
} from "./ManagementPage";

// ─── Member Picker (same style as task detail) ─────────────────────
function ProjectMemberPicker({
  selectedIds, onChange, language,
}: {
  selectedIds: string[]; onChange: (ids: string[]) => void; language: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const pos = usePortalPosition(open, triggerRef);
  const { members, currentUser } = usePermission();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node) || popupRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const ko = language === "ko";
  const selectedMembers = selectedIds.map((id) => members.find((m) => m.id === id)).filter(Boolean) as typeof members;
  const toggleMember = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((sid) => sid !== id) : [...selectedIds, id]);
  };
  const getDisplayName = (m: typeof members[0]) => m.id === currentUser.id ? `${m.name}(${ko ? "나" : "me"})` : m.name;

  return (
    <>
      <button ref={triggerRef} onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors text-sm">
        {selectedMembers.length === 0 ? (
          <span className="text-sm text-gray-400">{ko ? "멤버 추가" : "Add members"}</span>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1.5">
              {selectedMembers.slice(0, 3).map((m) => (
                <img key={m.id} src={m.avatar} alt="" className="w-5 h-5 rounded-full ring-2 ring-white object-cover" />
              ))}
              {selectedMembers.length > 3 && (
                <div className="w-5 h-5 rounded-full bg-gray-100 ring-2 ring-white flex items-center justify-center text-[8px] font-bold text-gray-500">
                  +{selectedMembers.length - 3}
                </div>
              )}
            </div>
            <span className="font-medium text-gray-700">
              {selectedMembers.length === 1 ? getDisplayName(selectedMembers[0]) : `${getDisplayName(selectedMembers[0])} +${selectedMembers.length - 1}`}
            </span>
          </div>
        )}
        <ChevronDown size={12} className="text-gray-400" />
      </button>
      {open && pos && createPortal(
        <div ref={popupRef} className="fixed bg-white border border-gray-200 rounded-xl shadow-lg z-[9999] min-w-[200px] py-1"
          style={{ top: pos.top, left: pos.left }}>
          {members.map((m) => {
            const isSelected = selectedIds.includes(m.id);
            return (
              <button key={m.id} onClick={() => toggleMember(m.id)}
                className={cn("w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors", isSelected && "bg-blue-50/50")}>
                <img src={m.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                <span className="font-medium text-gray-700 flex-1 text-left">{getDisplayName(m)}</span>
                {isSelected && <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center"><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5L4.5 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}

// ─── Project Templates ──────────────────────────────────────────────
interface ProjectTemplate {
  id: string;
  icon: React.ReactNode;
  label: string;
  labelEn: string;
  desc: string;
  descEn: string;
  content: string;
}

const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "brief",
    icon: <FileText size={20} className="text-blue-500" />,
    label: "프로젝트 기획서",
    labelEn: "Project Brief",
    desc: "목표, 범위, 일정, 예산 등 기본 기획",
    descEn: "Goals, scope, timeline, budget overview",
    content: `## 프로젝트 개요
- 프로젝트 목적:
- 핵심 목표:
- 대상 사용자:
---
## 범위 (Scope)
### 포함
-
### 제외
-
---
## 일정 계획
- 킥오프:
- 마일스톤 1:
- 마일스톤 2:
- 최종 납품:
---
## 예산
- 총 예산:
- 인건비:
- 기타 비용:
---
## 리스크 & 대응
- 리스크 1:
- 대응 방안:
---
## 성공 기준
- `,
  },
  {
    id: "kickoff",
    icon: <Rocket size={20} className="text-orange-500" />,
    label: "킥오프 회의록",
    labelEn: "Kickoff Meeting",
    desc: "킥오프 미팅 어젠다 및 회의 내용 정리",
    descEn: "Kickoff meeting agenda and notes",
    content: `## 킥오프 미팅
- 일시:
- 참석자:
- 장소:
---
## 어젠다
1. 프로젝트 소개 & 배경
1. 목표 및 기대효과
1. 역할 분담
1. 일정 확인
1. 커뮤니케이션 방법
1. Q&A
---
## 역할 분담
- PM:
- 디자인:
- 개발:
- QA:
---
## 커뮤니케이션
- 주간 회의:
- 메신저:
- 공유 폴더:
---
## 회의 내용
-
---
## Action Items
- [ ]
- [ ]
- [ ] `,
  },
  {
    id: "dev",
    icon: <Code2 size={20} className="text-green-500" />,
    label: "개발 프로젝트",
    labelEn: "Development Project",
    desc: "기술 스택, 아키텍처, 개발 단계 관리",
    descEn: "Tech stack, architecture, development phases",
    content: `## 기술 스택
- Frontend:
- Backend:
- DB:
- 배포:
---
## 아키텍처
-
---
## API 설계
### 엔드포인트
-
---
## 개발 단계
### Phase 1 — 기본 기능
- [ ]
- [ ]
### Phase 2 — 확장 기능
- [ ]
- [ ]
### Phase 3 — 최적화 & QA
- [ ]
- [ ]
---
## 테스트 계획
- 단위 테스트:
- 통합 테스트:
- QA 체크리스트:
---
## 배포 계획
- 스테이징:
- 프로덕션:
- 롤백 전략:`,
  },
  {
    id: "design",
    icon: <Palette size={20} className="text-purple-500" />,
    label: "디자인 프로젝트",
    labelEn: "Design Project",
    desc: "디자인 가이드, 에셋 관리, 피드백 트래킹",
    descEn: "Design guide, assets, feedback tracking",
    content: `## 디자인 개요
- 프로젝트 목적:
- 디자인 방향:
- 레퍼런스:
---
## 브랜드 가이드
- 메인 컬러:
- 서브 컬러:
- 폰트:
- 톤앤매너:
---
## 디자인 에셋
### 로고
-
### 아이콘
-
### 이미지
-
---
## 작업 흐름
1. 리서치 & 벤치마킹
1. 와이어프레임
1. 시안 제작
1. 피드백 반영
1. 최종 전달
---
## 피드백 기록
### 1차 피드백
-
### 2차 피드백
-
---
## 산출물 체크리스트
- [ ] 디자인 시안
- [ ] 스타일 가이드
- [ ] 에셋 전달`,
  },
  {
    id: "marketing",
    icon: <Megaphone size={20} className="text-pink-500" />,
    label: "마케팅 캠페인",
    labelEn: "Marketing Campaign",
    desc: "캠페인 전략, 채널, KPI, 콘텐츠 계획",
    descEn: "Campaign strategy, channels, KPIs, content plan",
    content: `## 캠페인 개요
- 캠페인명:
- 목적:
- 기간:
- 타겟:
---
## 전략
- 핵심 메시지:
- 차별점:
- CTA:
---
## 채널 계획
### 온라인
- SNS:
- 블로그:
- 이메일:
- 광고:
### 오프라인
-
---
## 콘텐츠 일정
- Week 1:
- Week 2:
- Week 3:
- Week 4:
---
## KPI & 성과 지표
- 도달:
- 클릭:
- 전환:
- ROI:
---
## 예산 배분
- 콘텐츠 제작:
- 광고비:
- 기타:`,
  },
  {
    id: "idea",
    icon: <Lightbulb size={20} className="text-yellow-500" />,
    label: "아이디어 & 리서치",
    labelEn: "Idea & Research",
    desc: "아이디어 정리, 시장 조사, 경쟁사 분석",
    descEn: "Idea notes, market research, competitive analysis",
    content: `## 아이디어 요약
- 한 줄 설명:
- 해결하려는 문제:
- 제안 솔루션:
---
## 시장 조사
- 시장 규모:
- 트렌드:
- 기회 요인:
---
## 경쟁사 분석
### 경쟁사 A
- 강점:
- 약점:
### 경쟁사 B
- 강점:
- 약점:
---
## 차별화 전략
-
---
## 타당성 검토
- 기술적 가능성:
- 시간/비용:
- 리스크:
---
## 다음 단계
- [ ]
- [ ]
- [ ] `,
  },
];

function ProjectTemplatePicker({ onSelect, language }: { onSelect: (content: string) => void; language: string }) {
  const ko = language === "ko";
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <LayoutTemplate size={16} className="text-gray-400" />
        <span className="text-sm font-semibold text-gray-500">{ko ? "템플릿으로 시작하기" : "Start with a template"}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {PROJECT_TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.content)}
            className="flex items-start gap-3 p-3 rounded-xl border border-gray-150 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-left group"
          >
            <div className="mt-0.5 shrink-0">{t.icon}</div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">
                {ko ? t.label : t.labelEn}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-snug line-clamp-2">
                {ko ? t.desc : t.descEn}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const p = useOrgPath();
  const { language } = useLanguage();
  const ko = language === "ko";
  const { currentUser, members } = usePermission();
  const { org } = useInvite();

  const isNew = projectId === "new" || !projectId;

  const [projects, setProjects] = useState<Project[]>(() => {
    const existing = loadProjects();
    // If navigating to a kanban card that doesn't exist in legacy storage, auto-create
    if (!isNew && projectId && !existing.find(p => p.id === projectId)) {
      const kanbanCard = loadCards("projects").find(c => c.id === projectId);
      if (kanbanCard) {
        const newProj: Project = {
          id: kanbanCard.id,
          name: kanbanCard.title || "",
          description: kanbanCard.description || "",
          status: "planning",
          color: kanbanCard.color || PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)],
          memberIds: [],
          createdAt: kanbanCard.createdAt || new Date().toISOString(),
          createdBy: currentUser?.id,
        };
        const next = [...existing, newProj];
        saveProjects(next);
        if (localStorage.getItem('poten_demo_mode') !== 'true') {
          api.createProject(newProj).catch(() => {});
        }
        return next;
      }
    }
    return existing;
  });
  const [localId, setLocalId] = useState<string | null>(null);
  const currentId = isNew ? localId : projectId;

  // ── Realtime sync for project detail ──
  const rtChannel = org?.id && currentId ? `project-${currentId}-${org.id}` : null;
  const broadcast = useRealtimeBroadcast(rtChannel, currentUser.id, {
    "project-update": (payload: any) => {
      if (payload?.updates && payload?.projectId) {
        setProjects(prev => {
          const next = prev.map(p => p.id === payload.projectId ? { ...p, ...payload.updates } : p);
          saveProjects(next);
          return next;
        });
        // Sync notes if description changed
        if (payload.updates.description !== undefined) {
          setNotes(payload.updates.description);
        }
      }
    },
  });

  // Sync projects from server on mount
  useEffect(() => {
    if (localStorage.getItem('poten_demo_mode') === 'true') return;
    setProjects(loadProjects());
  }, []);

  // Create new project on mount if "new"
  useEffect(() => {
    if (isNew && !localId) {
      const id = `proj-${Date.now()}`;
      const newProj: Project = {
        id,
        name: "",
        description: "",
        status: "planning",
        color: PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)],
        memberIds: [],
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.id,
      };
      setProjects((prev) => {
        const next = [...prev, newProj];
        saveProjects(next);
        return next;
      });
      setLocalId(id);
      // Save to server
      if (localStorage.getItem('poten_demo_mode') !== 'true') {
        api.createProject(newProj).catch(() => {});
      }
      navigate(p(`/projects/${id}`), { replace: true });
    }
  }, [isNew, localId]);

  const project = projects.find((p) => p.id === currentId) || null;

  const [notes, setNotes] = useState(project?.description || "");
  const [editorKey, setEditorKey] = useState(0);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      alert(ko ? "500KB 이하 이미지만 가능합니다" : "Max 500KB image allowed");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => handleUpdate({ logoUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  // Sync notes when project loads
  useEffect(() => {
    if (project) setNotes(project.description || "");
  }, [project?.id]);

  const handleUpdate = useCallback(
    (updates: Partial<Project>) => {
      if (!currentId) return;
      setProjects((prev) => {
        const next = prev.map((p) =>
          p.id === currentId ? { ...p, ...updates } : p
        );
        saveProjects(next);
        return next;
      });
      // Broadcast to other clients
      broadcast("project-update", { projectId: currentId, updates });
      // Sync to server
      if (localStorage.getItem('poten_demo_mode') !== 'true') {
        api.updateProject(currentId, updates).catch(() => {});
      }
      // Sync fields to kanban card (localStorage + server)
      if (updates.logoUrl !== undefined || updates.name !== undefined || updates.description !== undefined || updates.endDate !== undefined) {
        const allCards = loadCards("projects");
        const card = allCards.find(c => c.id === currentId);
        if (card) {
          if (updates.logoUrl !== undefined) card.logoUrl = updates.logoUrl || undefined;
          if (updates.name !== undefined) card.title = updates.name;
          if (updates.description !== undefined) card.description = updates.description;
          if (updates.endDate !== undefined) card.dueDate = updates.endDate || undefined;
          saveCards("projects", allCards);
          // Also sync kanban card to server
          if (localStorage.getItem('poten_demo_mode') !== 'true') {
            api.updateKanbanCard("projects", card.id, card).catch(() => {});
          }
        }
      }
    },
    [currentId]
  );

  const handleDelete = () => {
    if (!project) return;
    if (!confirm(ko ? "이 프로젝트를 삭제하시겠습니까?" : "Delete this project?")) return;
    const next = projects.filter((p) => p.id !== project.id);
    saveProjects(next);
    if (localStorage.getItem('poten_demo_mode') !== 'true') {
      api.deleteProject(project.id).catch(() => {});
    }
    navigate(p("/projects"));
  };

  if (!project) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-3xl">🔒</div>
        <div>
          <p className="text-lg font-semibold text-gray-800">{ko ? "접근 권한이 없습니다" : "No Access"}</p>
          <p className="text-sm text-gray-500 mt-1">{ko ? "이 프로젝트를 볼 권한이 없거나 존재하지 않아요." : "You don't have permission to view this project."}</p>
        </div>
        <button
          onClick={() => navigate(p("/dashboard"))}
          className="px-5 py-2 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-600 transition-colors"
        >
          {ko ? "홈으로 이동" : "Go to Home"}
        </button>
      </div>
    );
  }

  const statusCfg = PROJECT_STATUS_CONFIG[project.status];
  const statusLabel = statusCfg ? (ko ? statusCfg.label : statusCfg.labelEn) : (project.status || "");

  return (
    <DetailPageShell
      shareType="project"
      itemId={project.id}
      currentUserId={currentUser.id}
      backPath="/projects"
      backLabel={ko ? "프로젝트" : "Projects"}
      breadcrumbs={[{ label: project.name || (ko ? "새 프로젝트" : "New Project") }]}
      onDelete={handleDelete}
      collapsible={true}
      defaultExpanded={true}
      title={
        <div className="flex items-start gap-4">
          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          <button
            onClick={() => logoInputRef.current?.click()}
            className="w-16 h-16 rounded-2xl overflow-hidden relative group border-2 border-dashed border-gray-200 shrink-0 hover:border-blue-300 transition-colors"
          >
            {project.logoUrl ? (
              <img src={project.logoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: project.color + "20" }}>
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: project.color }} />
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all">
              <Camera size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <InlineText
              value={project.name}
              onChange={(v) => handleUpdate({ name: v })}
              placeholder={ko ? "프로젝트 이름을 입력하세요" : "Enter project name"}
              className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight tracking-tight focus:ring-0 focus:bg-transparent hover:bg-transparent border-b-2 border-transparent focus:border-gray-200 rounded-none pb-0.5"
              as="h1"
            />
            {project.client && (
              <p className="text-sm text-gray-400 mt-1">{project.client}</p>
            )}
          </div>
        </div>
      }
      properties={
        <AutoProperties fields={[
          {
            key: "status",
            type: "custom",
            icon: <Circle size={14} />,
            label: ko ? "상태" : "Status",
            render: () => (
              <div className="flex flex-wrap gap-1.5">
                {(() => {
                  const cols = loadColumns("projects");
                  return cols.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => handleUpdate({ status: col.name as any })}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border",
                        (project.status as any) === col.name
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                      )}
                    >
                      {col.name}
                    </button>
                  ));
                })()}
              </div>
            ),
          },
          {
            key: "period",
            type: "custom",
            icon: <Calendar size={14} />,
            label: ko ? "기간" : "Period",
            render: () => (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={project.startDate || ""}
                  onChange={(e) => handleUpdate({ startDate: e.target.value || undefined })}
                  className="text-sm px-2 py-1 rounded-md border border-transparent hover:border-gray-200 bg-transparent outline-none focus:ring-2 focus:ring-blue-100 text-gray-700"
                />
                <span className="text-gray-300 text-xs">~</span>
                <input
                  type="date"
                  value={project.endDate || ""}
                  onChange={(e) => handleUpdate({ endDate: e.target.value || undefined })}
                  className="text-sm px-2 py-1 rounded-md border border-transparent hover:border-gray-200 bg-transparent outline-none focus:ring-2 focus:ring-blue-100 text-gray-700"
                />
              </div>
            ),
          },
          {
            key: "members",
            type: "custom",
            icon: <Users size={14} />,
            label: ko ? "멤버" : "Members",
            render: () => (
              <ProjectMemberPicker
                selectedIds={project.memberIds}
                onChange={(ids) => handleUpdate({ memberIds: ids })}
                language={language}
              />
            ),
          },
          // --- 외부 프로젝트 전용 ---
          ...(project.category === "external" ? [
            {
              key: "client",
              type: "text" as const,
              icon: <Building2 size={14} />,
              label: ko ? "클라이언트" : "Client",
              value: project.client || "",
              onChange: (v: string) => handleUpdate({ client: v }),
              placeholder: ko ? "고객사/클라이언트명" : "Client name",
            },
            {
              key: "budget",
              type: "text" as const,
              icon: <DollarSign size={14} />,
              label: ko ? "예산" : "Budget",
              value: project.budget || "",
              onChange: (v: string) => handleUpdate({ budget: v }),
              placeholder: ko ? "예: 2,000만원" : "e.g. $20,000",
            },
          ] : []),
          // --- 내부 프로젝트 전용 (internal 또는 미설정) ---
          ...((project.category === "internal" || !project.category) ? [
            {
              key: "goal",
              type: "text" as const,
              icon: <Target size={14} />,
              label: ko ? "목표/KPI" : "Goal/KPI",
              value: project.goal || "",
              onChange: (v: string) => handleUpdate({ goal: v }),
              placeholder: ko ? "예: MAU 10만 달성" : "e.g. Reach 100k MAU",
            },
            {
              key: "team",
              type: "text" as const,
              icon: <UsersRound size={14} />,
              label: ko ? "담당팀" : "Team",
              value: project.team || "",
              onChange: (v: string) => handleUpdate({ team: v }),
              placeholder: ko ? "예: 프로덕트팀" : "e.g. Product team",
            },
          ] : []),
        ] as PropertyFieldConfig[]} />
      }
      secondaryProperties={
        <AutoProperties fields={[
          {
            key: "createdBy",
            type: "custom",
            icon: <UserCircle size={14} />,
            label: ko ? "생성자" : "Created by",
            render: () => {
              const creator = members.find(m => m.id === project.createdBy);
              return (
                <div className="flex items-center gap-2">
                  {creator?.avatar ? (
                    <img src={creator.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-500">
                      {creator?.name?.[0] || "?"}
                    </div>
                  )}
                  <span className="text-sm text-gray-700">
                    {creator ? (creator.id === currentUser?.id ? `${creator.name}(${ko ? "나" : "me"})` : creator.name) : (ko ? "미지정" : "Unknown")}
                  </span>
                </div>
              );
            },
          },
          {
            key: "links",
            type: "custom",
            icon: <Link2 size={14} />,
            label: ko ? "관련 링크" : "Links",
            render: () => (
              <div className="space-y-2">
                {(project.links || []).map((link, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={link.label}
                      onChange={(e) => {
                        const links = [...(project.links || [])];
                        links[i] = { ...links[i], label: e.target.value };
                        handleUpdate({ links });
                      }}
                      className="text-xs px-2 py-1 rounded-md border border-gray-200 bg-transparent outline-none focus:ring-2 focus:ring-blue-100 text-gray-700 w-24"
                      placeholder={ko ? "라벨" : "Label"}
                    />
                    <input
                      value={link.url}
                      onChange={(e) => {
                        const links = [...(project.links || [])];
                        links[i] = { ...links[i], url: e.target.value };
                        handleUpdate({ links });
                      }}
                      className="flex-1 text-xs px-2 py-1 rounded-md border border-gray-200 bg-transparent outline-none focus:ring-2 focus:ring-blue-100 text-gray-700 font-mono"
                      placeholder="https://..."
                    />
                    <button
                      onClick={() => {
                        const links = (project.links || []).filter((_, j) => j !== i);
                        handleUpdate({ links });
                      }}
                      className="p-1 text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => handleUpdate({ links: [...(project.links || []), { label: "", url: "" }] })}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition-colors"
                >
                  <Plus size={12} />
                  {ko ? "링크 추가" : "Add link"}
                </button>
              </div>
            ),
          },
        ] as PropertyFieldConfig[]} />
      }
    >
      {/* Content — NotionBlockEditor */}
      <div className="min-h-[200px] border-t border-gray-100 pt-5">
        {!notes?.trim() && (
          <ProjectTemplatePicker
            language={language}
            onSelect={(content) => {
              setNotes(content);
              handleUpdate({ description: content });
              setEditorKey((k) => k + 1);
            }}
          />
        )}
        <NotionBlockEditor
          key={editorKey}
          initialContent={notes}
          onChange={(v) => handleUpdate({ description: v || "" })}
          placeholder={ko ? "프로젝트에 대한 노트를 작성하세요..." : "Write notes about this project..."}
          parentType="project"
          parentId={currentId}
        />

      </div>

    </DetailPageShell>
  );
}
