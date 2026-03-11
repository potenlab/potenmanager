import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ChevronDown,
  Calendar, Users, Circle, Camera, UserCircle,
  Building2, DollarSign, FolderKanban, Link2, Plus, X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";
import { api } from "../../lib/api";
import { useLanguage } from "../context/LanguageContext";
import { usePermission } from "../context/PermissionContext";
import { usePortalPosition } from "../hooks/usePortalPosition";
import { NotionBlockEditor } from "../components/NotionBlockEditor";
import { UrlPreviewSection } from "../components/detail/UrlPreviewCard";
import { InlineText } from "../components/detail/InlineText";
import { AutoProperties } from "../components/detail/AutoProperties";
import type { PropertyFieldConfig } from "../components/detail/PropertyConfig";
import { AIStrategyPanel } from "../components/AIStrategyPanel";
import { DetailPageShell } from "../components/detail/DetailPageShell";
import {
  Project, PROJECT_STATUS_CONFIG, PROJECT_COLORS, PROJECT_CATEGORY_CONFIG,
  loadProjects, saveProjects, syncProjectsFromServer, loadCards, saveCards, loadColumns,
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

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const ko = language === "ko";
  const { currentUser, members } = usePermission();

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

  // Sync projects from server on mount
  useEffect(() => {
    if (localStorage.getItem('poten_demo_mode') === 'true') return;
    syncProjectsFromServer().then((merged) => {
      setProjects(merged);
    });
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
      navigate(`/projects/${id}`, { replace: true });
    }
  }, [isNew, localId]);

  const currentId = isNew ? localId : projectId;
  const project = projects.find((p) => p.id === currentId) || null;

  const [notes, setNotes] = useState(project?.description || "");
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
      // Sync to server
      if (localStorage.getItem('poten_demo_mode') !== 'true') {
        api.updateProject(currentId, updates).catch(() => {});
      }
      // Sync fields to kanban card
      if (updates.logoUrl !== undefined || updates.name !== undefined || updates.description !== undefined || updates.endDate !== undefined) {
        const allCards = loadCards("projects");
        const card = allCards.find(c => c.id === currentId);
        if (card) {
          if (updates.logoUrl !== undefined) card.logoUrl = updates.logoUrl || undefined;
          if (updates.name !== undefined) card.title = updates.name;
          if (updates.description !== undefined) card.description = updates.description;
          if (updates.endDate !== undefined) card.dueDate = updates.endDate || undefined;
          saveCards("projects", allCards);
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
    navigate("/projects");
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
          onClick={() => navigate("/dashboard")}
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
            key: "category",
            type: "custom",
            icon: <FolderKanban size={14} />,
            label: ko ? "카테고리" : "Category",
            render: () => (
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(PROJECT_CATEGORY_CONFIG) as Project["category"][]).map((k) => {
                  if (!k) return null;
                  const cfg = PROJECT_CATEGORY_CONFIG[k];
                  return (
                    <button
                      key={k}
                      onClick={() => handleUpdate({ category: k })}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border",
                        project.category === k
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                      )}
                    >
                      {ko ? cfg.label : cfg.labelEn}
                    </button>
                  );
                })}
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
            key: "createdBy",
            type: "custom",
            icon: <UserCircle size={14} />,
            label: ko ? "생성자" : "Created by",
            render: () => {
              const creator = members.find(m => m.id === project.createdBy);
              return (
                <span className="text-sm text-gray-700">
                  {creator ? (creator.id === currentUser?.id ? `${creator.name}(${ko ? "나" : "me"})` : creator.name) : (ko ? "미지정" : "Unknown")}
                </span>
              );
            },
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
          {
            key: "client",
            type: "text",
            icon: <Building2 size={14} />,
            label: ko ? "클라이언트" : "Client",
            value: project.client || "",
            onChange: (v) => handleUpdate({ client: v }),
            placeholder: ko ? "고객사/클라이언트명" : "Client name",
          },
          {
            key: "budget",
            type: "text",
            icon: <DollarSign size={14} />,
            label: ko ? "예산" : "Budget",
            value: project.budget || "",
            onChange: (v) => handleUpdate({ budget: v }),
            placeholder: ko ? "예: 2,000만원" : "e.g. $20,000",
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
      collapsible={true}
      collapsedPreview={
        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", statusCfg ? cn(statusCfg.bg, statusCfg.color) : "bg-gray-100 text-gray-600")}>
          {statusLabel}
        </span>
      }
    >
      {/* Content — NotionBlockEditor */}
      <div className="min-h-[200px] border-t border-gray-100 pt-5">
        <NotionBlockEditor
          initialContent={notes}
          onChange={(v) => handleUpdate({ description: v || "" })}
          placeholder={ko ? "프로젝트에 대한 노트를 작성하세요..." : "Write notes about this project..."}
          parentType="project"
          parentId={currentId}
        />

        <UrlPreviewSection content={notes} language={language} />
      </div>

      {/* AI Strategy */}
      <AIStrategyPanel
        name={project.name}
        description={project.description}
        type="project"
        context={{
          startDate: project.startDate,
          endDate: project.endDate,
          status: project.status,
          client: project.client,
          category: project.category,
          budget: project.budget,
        }}
      />
    </DetailPageShell>
  );
}
