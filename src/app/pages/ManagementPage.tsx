import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  Building2, FolderKanban, Palette, Plus, Trash2,
  Calendar, Users, StickyNote, MoreVertical, Edit3, User, Loader2,
  Image as ImageIcon, Globe,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { useTeam } from "../context/TeamContext";
import { useInvite } from "../context/InviteContext";
import { usePermission } from "../context/PermissionContext";
import { api } from "../../lib/api";

// ─── Types (exported for detail pages) ───────────────────────────
export interface Project {
  id: string;
  name: string;
  description: string;
  status: "planning" | "active" | "paused" | "completed";
  color: string;
  startDate?: string;
  endDate?: string;
  memberIds: string[];
  createdAt: string;
  logoUrl?: string;
  client?: string;
  budget?: string;
  category?: "internal" | "outsource" | "contract" | "other";
  links?: { label: string; url: string }[];
}

export interface BrandAsset {
  id: string;
  type: "logo" | "color" | "font" | "guideline" | "template";
  name: string;
  value: string; // color hex, font name, or URL
  description?: string;
  createdAt: string;
  imageUrl?: string;
  guidelines?: string;
  attachments?: { name: string; url: string }[];
}

interface BoardItem {
  id: string;
  type: string;
  title: string;
  content: string;
  description?: string;
  attachments?: any[];
  pinned?: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt?: string;
}

export const PROJECT_STATUS_CONFIG = {
  planning: { label: "기획 중", labelEn: "Planning", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  active: { label: "진행 중", labelEn: "Active", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  paused: { label: "일시 중지", labelEn: "Paused", color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200" },
  completed: { label: "완료", labelEn: "Completed", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
};

export const PROJECT_CATEGORY_CONFIG = {
  internal: { label: "내부 프로젝트", labelEn: "Internal" },
  outsource: { label: "외주", labelEn: "Outsource" },
  contract: { label: "수주", labelEn: "Contract" },
  other: { label: "기타", labelEn: "Other" },
};

export const PROJECT_COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981",
  "#06B6D4", "#F97316", "#EF4444", "#6366F1", "#14B8A6",
];

export const BRAND_TYPE_CONFIG = {
  logo: { label: "로고", labelEn: "Logo", icon: <ImageIcon size={14} /> },
  color: { label: "브랜드 컬러", labelEn: "Brand Color", icon: <Palette size={14} /> },
  font: { label: "폰트", labelEn: "Font", icon: <span className="text-xs font-bold">Aa</span> },
  guideline: { label: "가이드라인", labelEn: "Guideline", icon: <Globe size={14} /> },
  template: { label: "템플릿", labelEn: "Template", icon: <FolderKanban size={14} /> },
};

export const STORAGE_KEY_PROJECTS = "poten_management_projects";
export const STORAGE_KEY_BRAND = "poten_management_brand";

export function loadProjects(): Project[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY_PROJECTS);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}
export function saveProjects(projects: Project[]) {
  localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
}
export function loadBrandAssets(): BrandAsset[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY_BRAND);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}
export function saveBrandAssets(assets: BrandAsset[]) {
  localStorage.setItem(STORAGE_KEY_BRAND, JSON.stringify(assets));
}

// ─── Project Card ────────────────────────────────────────────────
function ProjectCard({
  project, ko, members, onClick, onDelete,
}: {
  project: Project; ko: boolean;
  members: { id: string; name: string; avatar?: string }[];
  onClick: () => void; onDelete: () => void;
}) {
  const status = PROJECT_STATUS_CONFIG[project.status];
  const assignees = project.memberIds.map(id => members.find(m => m.id === id)).filter(Boolean);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 hover:border-gray-300 hover:shadow-md p-5 cursor-pointer transition-all group"
    >
      <div className="flex items-start gap-3 mb-3">
        {project.logoUrl ? (
          <img src={project.logoUrl} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0 border border-gray-100" />
        ) : (
          <div
            className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center"
            style={{ backgroundColor: project.color + "20" }}
          >
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-xs text-gray-500 line-clamp-2 mt-1">{project.description}</p>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", status.color, status.bg)}>
          {ko ? status.label : status.labelEn}
        </span>
        {project.startDate && (
          <span className="text-[10px] text-gray-400 flex items-center gap-1">
            <Calendar size={10} />
            {project.startDate}{project.endDate ? ` ~ ${project.endDate}` : ""}
          </span>
        )}
        {assignees.length > 0 && (
          <div className="flex -space-x-1.5 ml-auto">
            {assignees.slice(0, 3).map((m) => (
              <div key={m!.id} className="w-5 h-5 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[8px] font-bold text-gray-600 overflow-hidden">
                {m!.avatar ? <img src={m!.avatar} className="w-full h-full object-cover" /> : m!.name[0]}
              </div>
            ))}
            {assignees.length > 3 && (
              <div className="w-5 h-5 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-gray-400">
                +{assignees.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Team Board Tab ──────────────────────────────────────────────
function TeamBoardTab({ ko }: { ko: boolean }) {
  const navigate = useNavigate();
  const { currentUser } = usePermission();
  const { org } = useInvite();
  const orgId = org?.id || "";

  const [items, setItems] = useState<BoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const userRole = currentUser.role as string;
  const isManager = userRole === "owner" || userRole === "admin";

  useEffect(() => {
    if (isAdding && inputRef.current) inputRef.current.focus();
  }, [isAdding]);

  useEffect(() => {
    if (!orgId) return;
    api.getTeamBoardItems(orgId).then(data => {
      setItems(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [orgId]);

  const handleAdd = useCallback(async () => {
    if (!newTitle.trim()) return;
    const item = {
      type: "memo",
      title: newTitle.trim(),
      content: "",
      createdBy: currentUser.id,
      createdByName: currentUser.name,
    };
    try {
      const created = await api.createTeamBoardItem(orgId, item);
      setItems(prev => [created, ...prev]);
      setNewTitle("");
    } catch {}
  }, [newTitle, orgId, currentUser]);

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
    else if (e.key === "Escape") { setNewTitle(""); setIsAdding(false); }
  };

  const handleUpdate = useCallback(async (id: string) => {
    if (!editTitle.trim()) return;
    try {
      const updated = await api.updateTeamBoardItem(orgId, id, { title: editTitle.trim(), content: editContent.trim() });
      setItems(prev => prev.map(i => i.id === id ? updated : i));
      setEditingId(null);
    } catch {}
  }, [orgId, editTitle, editContent]);

  const handleDelete = useCallback(async (item: BoardItem) => {
    if (item.createdBy !== currentUser.id && isManager) {
      if (!window.confirm(ko ? `${item.createdByName}님이 작성한 항목을 삭제하시겠습니까?` : `Delete ${item.createdByName}'s item?`)) return;
    }
    try {
      await api.deleteTeamBoardItem(orgId, item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch {}
  }, [orgId, currentUser.id, isManager, ko]);

  const startEdit = (item: BoardItem) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditContent(item.content);
    setMenuId(null);
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-gray-400" /></div>;
  }

  return (
    <div>
      {/* Inline add */}
      {isAdding && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm ring-2 ring-blue-100 overflow-hidden mb-3">
          <input ref={inputRef} value={newTitle} onChange={e => setNewTitle(e.target.value)}
            onKeyDown={handleAddKeyDown}
            onBlur={() => { if (newTitle.trim()) handleAdd(); else { setNewTitle(""); setIsAdding(false); } }}
            placeholder={ko ? "제목을 입력하세요..." : "Enter title..."}
            className="w-full px-4 py-3 text-sm outline-none bg-transparent placeholder-gray-400 text-gray-900" />
          <div className="flex items-center px-3 py-2 bg-gray-50/80 border-t border-gray-100">
            <span className="text-[10px] text-gray-400">{ko ? "Enter로 추가 · Esc로 취소" : "Enter to add · Esc to cancel"}</span>
          </div>
        </div>
      )}

      {items.length === 0 && !isAdding ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <StickyNote size={48} className="mb-3 text-gray-300" />
          <p className="text-sm font-medium">{ko ? "팀 보드가 비어있습니다" : "No board items yet"}</p>
          <button onClick={() => setIsAdding(true)} className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-semibold">
            + {ko ? "첫 항목 추가하기" : "Add your first item"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map(item => {
            const canEditItem = item.createdBy === currentUser.id;
            const canDeleteItem = canEditItem || isManager;
            const isEditing = editingId === item.id;

            return isEditing ? (
              <div key={item.id} className="bg-white rounded-xl border border-blue-200 shadow-sm ring-2 ring-blue-100 p-3 space-y-2">
                <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleUpdate(item.id); } else if (e.key === "Escape") setEditingId(null); }}
                  className="w-full text-sm font-medium bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-300" autoFocus />
                <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={3}
                  onKeyDown={e => { if (e.key === "Escape") setEditingId(null); }}
                  placeholder={ko ? "내용 (선택사항)" : "Content (optional)"}
                  className="w-full text-xs bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-300 resize-none" />
                <div className="flex gap-2">
                  <button onClick={() => handleUpdate(item.id)} className="flex-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors">
                    {ko ? "저장" : "Save"}
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-xs px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100">
                    {ko ? "취소" : "Cancel"}
                  </button>
                </div>
              </div>
            ) : (
              <div key={item.id} onClick={() => navigate(`/board/${item.id}`)}
                className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-300 transition-all group relative cursor-pointer">
                <div className="flex items-start gap-2 mb-1">
                  <h4 className="font-medium text-sm text-gray-900 leading-snug flex-1 min-w-0">{item.title}</h4>
                  {(canEditItem || canDeleteItem) && (
                    <div className="relative shrink-0">
                      <button onClick={e => { e.stopPropagation(); setMenuId(menuId === item.id ? null : item.id); }}
                        className="text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity p-0.5">
                        <MoreVertical size={14} />
                      </button>
                      {menuId === item.id && (
                        <div className="absolute right-0 top-6 z-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-24">
                          {canEditItem && (
                            <button onClick={e => { e.stopPropagation(); startEdit(item); }} className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1.5">
                              <Edit3 size={10} /> {ko ? "수정" : "Edit"}
                            </button>
                          )}
                          {canDeleteItem && (
                            <button onClick={e => { e.stopPropagation(); setMenuId(null); handleDelete(item); }} className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-1.5">
                              <Trash2 size={10} /> {ko ? "삭제" : "Delete"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {item.content && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{item.content}</p>
                )}
                <div className="flex items-center justify-between border-t border-gray-50 pt-3 mt-2">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <User size={11} />
                    <span>{item.createdByName}</span>
                  </div>
                  {item.createdAt && (
                    <span className="text-xs text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString(ko ? "ko-KR" : "en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Bottom add button */}
          {!isAdding && items.length > 0 && (
            <button onClick={() => setIsAdding(true)}
              className="flex items-center justify-center gap-2 py-8 rounded-xl text-gray-400 text-sm hover:text-blue-600 hover:bg-gray-50 border-2 border-dashed border-gray-200 hover:border-blue-300 transition-all">
              <Plus size={16} /> <span>{ko ? "항목 추가" : "Add Item"}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Management Page ────────────────────────────────────────
export function ManagementPage() {
  const { language } = useLanguage();
  const ko = language === "ko";
  const { members } = useTeam();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"projects" | "branding" | "board">("projects");
  const [projects, setProjects] = useState<Project[]>(loadProjects);
  const [brandAssets, setBrandAssets] = useState<BrandAsset[]>(loadBrandAssets);

  // Re-read from localStorage when navigating back from detail pages
  useEffect(() => {
    setProjects(loadProjects());
    setBrandAssets(loadBrandAssets());
  }, []);

  const handleDeleteProject = (id: string) => {
    if (!confirm(ko ? "이 프로젝트를 삭제하시겠습니까?" : "Delete this project?")) return;
    setProjects(prev => {
      const next = prev.filter(p => p.id !== id);
      saveProjects(next);
      return next;
    });
  };

  const handleDeleteBrand = (id: string) => {
    if (!confirm(ko ? "삭제하시겠습니까?" : "Delete?")) return;
    setBrandAssets(prev => {
      const next = prev.filter(a => a.id !== id);
      saveBrandAssets(next);
      return next;
    });
  };

  const handleAddClick = () => {
    if (activeTab === "projects") navigate("/management/projects/new");
    else if (activeTab === "branding") navigate("/management/branding/new");
    else navigate("/board/new");
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="mb-4 shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
              <Building2 className="inline-block mr-2 -mt-0.5" size={22} />
              {ko ? "관리" : "Management"}
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm">
              {ko ? "프로젝트, 브랜딩, 팀 보드를 관리합니다" : "Manage projects, branding, and team board"}
            </p>
          </div>
          <button
            onClick={handleAddClick}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all"
          >
            <Plus size={16} />
            {activeTab === "projects"
              ? (ko ? "프로젝트 추가" : "Add Project")
              : activeTab === "branding"
              ? (ko ? "브랜드 자산 추가" : "Add Brand Asset")
              : (ko ? "보드 항목 추가" : "Add Board Item")}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("projects")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border",
              activeTab === "projects"
                ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                : "bg-white text-gray-500 border-gray-100 hover:border-gray-300"
            )}
          >
            <FolderKanban size={15} />
            {ko ? "프로젝트" : "Projects"}
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-bold", activeTab === "projects" ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-500")}>
              {projects.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("branding")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border",
              activeTab === "branding"
                ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                : "bg-white text-gray-500 border-gray-100 hover:border-gray-300"
            )}
          >
            <Palette size={15} />
            {ko ? "브랜딩" : "Branding"}
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-bold", activeTab === "branding" ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-500")}>
              {brandAssets.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("board")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border",
              activeTab === "board"
                ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                : "bg-white text-gray-500 border-gray-100 hover:border-gray-300"
            )}
          >
            <StickyNote size={15} />
            {ko ? "팀 보드" : "Team Board"}
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-4">
        {activeTab === "projects" ? (
          projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <FolderKanban size={48} className="mb-3 text-gray-300" />
              <p className="text-sm font-medium">{ko ? "프로젝트가 없습니다" : "No projects yet"}</p>
              <button
                onClick={() => navigate("/management/projects/new")}
                className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-semibold"
              >
                + {ko ? "첫 프로젝트 만들기" : "Create your first project"}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {projects.map(p => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  ko={ko}
                  members={members}
                  onClick={() => navigate(`/management/projects/${p.id}`)}
                  onDelete={() => handleDeleteProject(p.id)}
                />
              ))}
            </div>
          )
        ) : activeTab === "branding" ? (
          brandAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Palette size={48} className="mb-3 text-gray-300" />
              <p className="text-sm font-medium">{ko ? "브랜드 자산이 없습니다" : "No brand assets yet"}</p>
              <button
                onClick={() => navigate("/management/branding/new")}
                className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-semibold"
              >
                + {ko ? "첫 자산 등록하기" : "Add your first asset"}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Group by type */}
              {(Object.keys(BRAND_TYPE_CONFIG) as BrandAsset["type"][]).map(type => {
                const items = brandAssets.filter(a => a.type === type);
                if (items.length === 0) return null;
                const cfg = BRAND_TYPE_CONFIG[type];
                return (
                  <div key={type}>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
                      {cfg.icon} {ko ? cfg.label : cfg.labelEn} ({items.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
                      {items.map(asset => (
                        <div
                          key={asset.id}
                          onClick={() => navigate(`/management/branding/${asset.id}`)}
                          className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 hover:border-gray-300 hover:shadow-sm cursor-pointer transition-all group"
                        >
                          {asset.imageUrl ? (
                            <img src={asset.imageUrl} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0 border border-gray-100" />
                          ) : type === "color" ? (
                            <div className="w-9 h-9 rounded-xl border border-gray-200 shrink-0" style={{ backgroundColor: asset.value }} />
                          ) : type === "logo" && asset.value.startsWith("http") ? (
                            <img src={asset.value} alt="" className="w-9 h-9 rounded-xl object-contain bg-gray-50 shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                              {cfg.icon}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{asset.name}</p>
                            <p className="text-[11px] text-gray-400 truncate font-mono">{asset.value}</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteBrand(asset.id); }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <TeamBoardTab ko={ko} />
        )}
      </div>

    </div>
  );
}
