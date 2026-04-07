import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  FolderKanban, Palette, Plus, Trash2,
  Calendar as CalendarIcon, MoreHorizontal, X, Check,
  Image as ImageIcon, Globe, Search, Edit3,
  ChevronDown, Upload,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { format } from "date-fns";
import { useOrgPath } from "../hooks/useOrgPath";

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
  value: string;
  description?: string;
  createdAt: string;
  imageUrl?: string;
  guidelines?: string;
  attachments?: { name: string; url: string }[];
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

// Platform SVG icons with brand colors
const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#E4405F",
  youtube: "#FF0000",
  tiktok: "#000000",
  thread: "#000000",
  website: "#3B82F6",
  blog: "#10B981",
  tistory: "#FF5A4A",
  other: "#9CA3AF",
};

const PlatformSvg = {
  instagram: (s = 14, color = PLATFORM_COLORS.instagram) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{ color }}><rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor"/></svg>,
  youtube: (s = 14, color = PLATFORM_COLORS.youtube) => <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.9 31.9 0 0 0 0 12a31.9 31.9 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.3-1.9.5-3.8.5-5.8s-.2-3.9-.5-5.8zM9.5 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>,
  tiktok: (s = 14, color = PLATFORM_COLORS.tiktok) => <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><path d="M19.3 6.5a4.5 4.5 0 0 1-3.3-1.4A4.5 4.5 0 0 1 14.8 2h-3.3v13.5a2.8 2.8 0 1 1-2-2.7V9.4a6.2 6.2 0 1 0 5.3 6.1V9.8a7.8 7.8 0 0 0 4.5 1.4V7.9a4.5 4.5 0 0 1-1-.4v0z"/></svg>,
  thread: (s = 14, color = PLATFORM_COLORS.thread) => <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><path d="M17.4 10.5c-.1 0-.2-.1-.3-.1a5.3 5.3 0 0 0-2.4-2.8 5.8 5.8 0 0 0-3.2-.8c-2.2 0-3.7 1-4.6 2.1l1.6 1.2c.6-.8 1.6-1.4 3-1.4a3.5 3.5 0 0 1 2 .5 3.1 3.1 0 0 1 1.3 1.5 5 5 0 0 0-2.3-.4c-2.7 0-4.8 1.5-4.8 3.8 0 2.2 1.9 3.6 4.1 3.6a4.4 4.4 0 0 0 3.4-1.5 5 5 0 0 0 .8-1.7c.3 1.1.4 2.4.4 2.4h2.2s-.2-1.8-.6-3.2c.3-1.1.3-2.2.1-3.2zM12.5 15.7c-1.1 0-2-.5-2-1.5s.9-1.6 2.3-1.6a6 6 0 0 1 1.7.2 3.3 3.3 0 0 1-2 2.9z"/></svg>,
  website: (s = 14, color = PLATFORM_COLORS.website) => <Globe size={s} style={{ color }} />,
  blog: (s = 14, color = PLATFORM_COLORS.blog) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M7 8h10M7 12h6"/></svg>,
  tistory: (s = 14, color = PLATFORM_COLORS.tistory) => <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="12" r="2.5"/><circle cx="19" cy="12" r="2.5"/><circle cx="12" cy="19" r="2.5"/></svg>,
};

export const BRAND_TYPE_CONFIG: Record<string, { label: string; labelEn: string; icon: React.ReactNode }> = {
  instagram: { label: "Instagram", labelEn: "Instagram", icon: PlatformSvg.instagram() },
  youtube: { label: "YouTube", labelEn: "YouTube", icon: PlatformSvg.youtube() },
  tiktok: { label: "TikTok", labelEn: "TikTok", icon: PlatformSvg.tiktok() },
  thread: { label: "Threads", labelEn: "Threads", icon: PlatformSvg.thread() },
  website: { label: "홈페이지", labelEn: "Website", icon: PlatformSvg.website() },
  blog: { label: "블로그", labelEn: "Blog", icon: PlatformSvg.blog() },
  tistory: { label: "티스토리", labelEn: "Tistory", icon: PlatformSvg.tistory() },
  other: { label: "기타", labelEn: "Other", icon: <Globe size={14} className="text-gray-400" /> },
  // Legacy keys for backward compatibility
  logo: { label: "로고", labelEn: "Logo", icon: <ImageIcon size={14} /> },
  color: { label: "컬러", labelEn: "Color", icon: <Palette size={14} /> },
  font: { label: "폰트", labelEn: "Font", icon: <span className="text-xs font-bold">Aa</span> },
  guideline: { label: "가이드라인", labelEn: "Guideline", icon: <Globe size={14} /> },
  template: { label: "템플릿", labelEn: "Template", icon: <FolderKanban size={14} /> },
};

// Render platform icon (built-in or custom uploaded)
function PlatformIcon({ id, size = 14 }: { id: string; size?: number }) {
  // Built-in platform with colored SVG
  const svgFn = PlatformSvg[id as keyof typeof PlatformSvg];
  if (svgFn) return <>{svgFn(size)}</>;
  const config = BRAND_TYPE_CONFIG[id];
  if (config) return <>{config.icon}</>;
  // Custom platform — check for uploaded icon
  const iconUrl = getCustomPlatformIcon(id);
  if (iconUrl) return <img src={iconUrl} alt="" className="rounded" style={{ width: size, height: size, objectFit: "contain" }} />;
  return null;
}

// ─── Custom Channel Platforms ───────────────────────────────────
const STORAGE_KEY_CUSTOM_PLATFORMS = "poten_custom_channel_platforms";

export const DEFAULT_PLATFORMS = ["instagram", "youtube", "tiktok", "thread", "website", "blog", "tistory"] as const;

export interface CustomPlatform { name: string; icon?: string; }

export function loadCustomPlatforms(): CustomPlatform[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY_CUSTOM_PLATFORMS);
    if (!s) return [];
    const parsed = JSON.parse(s);
    // Backward compat: old format was string[]
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "string") {
      return parsed.map((name: string) => ({ name }));
    }
    return parsed;
  } catch { return []; }
}
export function saveCustomPlatforms(platforms: CustomPlatform[]) {
  localStorage.setItem(STORAGE_KEY_CUSTOM_PLATFORMS, JSON.stringify(platforms));
}

export function getAllPlatforms(): string[] {
  return [...DEFAULT_PLATFORMS, ...loadCustomPlatforms().map(p => p.name), "other"];
}

export function getCustomPlatformIcon(id: string): string | undefined {
  const platforms = loadCustomPlatforms();
  return platforms.find(p => p.name === id)?.icon;
}

export function getPlatformLabel(id: string): string {
  const config = BRAND_TYPE_CONFIG[id as keyof typeof BRAND_TYPE_CONFIG];
  if (config) return config.label;
  return id; // custom platform — name is the id
}

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

// Keep kanban exports for backward compatibility (used by detail pages)
export interface KanbanCard {
  id: string;
  columnId: string;
  title: string;
  description?: string;
  color?: string;
  priority?: "high" | "medium" | "low";
  dueDate?: string;
  order: number;
  createdAt: string;
}
export type BoardType = "projects" | "branding";
export function loadColumns(board: BoardType) {
  try {
    const s = localStorage.getItem(`poten_mgmt_${board}_columns`);
    if (s) return JSON.parse(s);
  } catch {}
  return board === "projects"
    ? [{ id: "col-planning", name: "기획", order: 0 }, { id: "col-progress", name: "진행 중", order: 1 }, { id: "col-done", name: "완료", order: 2 }]
    : [{ id: "col-design", name: "디자인", order: 0 }, { id: "col-review", name: "검토", order: 1 }, { id: "col-approved", name: "승인", order: 2 }];
}
export function loadCards(board: BoardType): KanbanCard[] {
  try { const s = localStorage.getItem(`poten_mgmt_${board}_cards`); if (s) return JSON.parse(s); } catch {} return [];
}
export function saveCards(board: BoardType, cards: KanbanCard[]) {
  localStorage.setItem(`poten_mgmt_${board}_cards`, JSON.stringify(cards));
}

// ─── Status Pill ────────────────────────────────────────────────
type ProjectStatus = Project["status"];
const STATUSES: { id: ProjectStatus; labelKo: string; labelEn: string; color: string }[] = [
  { id: "planning", labelKo: "기획 중", labelEn: "Planning", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "active", labelKo: "진행 중", labelEn: "Active", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "paused", labelKo: "일시 중지", labelEn: "Paused", color: "bg-gray-100 text-gray-600 border-gray-200" },
  { id: "completed", labelKo: "완료", labelEn: "Completed", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
];

function StatusPill({ currentStatus, onChange, ko }: { currentStatus: string; onChange: (s: ProjectStatus) => void; ko: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = STATUSES.find(s => s.id === currentStatus) || STATUSES[0];

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className={cn("text-[11px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 transition-colors", current.color)}>
        {ko ? current.labelKo : current.labelEn} <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute top-8 left-0 z-30 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-32">
          {STATUSES.map(s => (
            <button key={s.id} onClick={() => { onChange(s.id); setOpen(false); }}
              className={cn("w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2",
                s.id === currentStatus ? "font-bold" : "")}>
              <span className={cn("w-2 h-2 rounded-full", s.color.split(" ")[0])} />
              {ko ? s.labelKo : s.labelEn}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Add Project Dialog ─────────────────────────────────────────
function AddProjectDialog({ open, onClose, onSave, project, ko }: {
  open: boolean; onClose: () => void; onSave: (p: Partial<Project>) => void; project?: Project | null; ko: boolean;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("planning");
  const [client, setClient] = useState("");
  const [budget, setBudget] = useState("");
  const [category, setCategory] = useState<Project["category"]>("internal");

  useEffect(() => {
    if (!open) return;
    setName(project?.name || "");
    setDescription(project?.description || "");
    setStatus(project?.status || "planning");
    setClient(project?.client || "");
    setBudget(project?.budget || "");
    setCategory(project?.category || "internal");
  }, [open, project]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-lg font-bold">{project ? (ko ? "프로젝트 수정" : "Edit Project") : (ko ? "프로젝트 추가" : "Add Project")}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{ko ? "프로젝트명 *" : "Project Name *"}</label>
            <input value={name} onChange={e => setName(e.target.value)} autoFocus placeholder={ko ? "예: 쇼핑몰 앱 개발" : "e.g. App Dev"}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{ko ? "설명" : "Description"}</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder={ko ? "프로젝트 설명..." : "Description..."}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{ko ? "상태" : "Status"}</label>
              <select value={status} onChange={e => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100">
                {STATUSES.map(s => <option key={s.id} value={s.id}>{ko ? s.labelKo : s.labelEn}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{ko ? "분류" : "Category"}</label>
              <select value={category} onChange={e => setCategory(e.target.value as Project["category"])}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100">
                {Object.entries(PROJECT_CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{ko ? v.label : v.labelEn}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{ko ? "클라이언트" : "Client"}</label>
              <input value={client} onChange={e => setClient(e.target.value)} placeholder={ko ? "클라이언트명" : "Client name"}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{ko ? "예산" : "Budget"}</label>
              <input value={budget} onChange={e => setBudget(e.target.value)} placeholder={ko ? "예: 5,000,000원" : "e.g. $5,000"}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>
        </div>
        <div className="px-6 pb-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">{ko ? "취소" : "Cancel"}</button>
          <button onClick={() => { if (!name.trim()) return; onSave({ name: name.trim(), description: description.trim(), status, client: client.trim() || undefined, budget: budget.trim() || undefined, category }); onClose(); }}
            className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">{project ? (ko ? "저장" : "Save") : (ko ? "추가" : "Add")}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Management Page ────────────────────────────────────────
export function ManagementPage() {
  const { language } = useLanguage();
  const ko = language === "ko";
  const navigate = useNavigate();
  const location = useLocation();
  const p = useOrgPath();
  const board: BoardType = location.pathname.includes("/branding") ? "branding" : "projects";

  const [projects, setProjects] = useState<Project[]>(() => loadProjects());
  const [brandAssets, setBrandAssets] = useState<BrandAsset[]>(() => loadBrandAssets());
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number; type: "project" | "brand" } | null>(null);

  // Channel state (must be before any early return to satisfy React hook rules)
  const [customPlatforms, setCustomPlatforms] = useState<CustomPlatform[]>(() => loadCustomPlatforms());
  const [addingPlatform, setAddingPlatform] = useState(false);
  const [newPlatformName, setNewPlatformName] = useState("");
  const [newPlatformIcon, setNewPlatformIcon] = useState("");
  const platformInputRef = useRef<HTMLInputElement>(null);
  const platformIconRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (addingPlatform && platformInputRef.current) platformInputRef.current.focus(); }, [addingPlatform]);

  // Persist
  const persistProjects = useCallback((ps: Project[]) => { setProjects(ps); saveProjects(ps); }, []);
  const persistBrand = useCallback((bs: BrandAsset[]) => { setBrandAssets(bs); saveBrandAssets(bs); }, []);

  // Close menus on outside click
  useEffect(() => {
    if (!menuOpenId && !contextMenu) return;
    const h = () => { setMenuOpenId(null); setContextMenu(null); };
    document.addEventListener("click", h); return () => document.removeEventListener("click", h);
  }, [menuOpenId, contextMenu]);

  // ── Project operations ──
  const handleAddProject = (data: Partial<Project>) => {
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name: data.name || "",
      description: data.description || "",
      status: data.status || "planning",
      color: PROJECT_COLORS[projects.length % PROJECT_COLORS.length],
      memberIds: [],
      createdAt: new Date().toISOString(),
      client: data.client,
      budget: data.budget,
      category: data.category,
    };
    persistProjects([newProject, ...projects]);
  };

  const handleEditProject = (data: Partial<Project>) => {
    if (!editingProject) return;
    persistProjects(projects.map(p => p.id === editingProject.id ? { ...p, ...data } : p));
    setEditingProject(null);
  };

  const handleDeleteProject = (id: string) => {
    if (!confirm(ko ? "삭제하시겠습니까?" : "Delete this project?")) return;
    persistProjects(projects.filter(p => p.id !== id));
  };

  const handleStatusChange = (id: string, status: ProjectStatus) => {
    persistProjects(projects.map(p => p.id === id ? { ...p, status } : p));
  };

  // ── Brand operations ──
  const handleAddBrand = () => {
    const newAsset: BrandAsset = {
      id: `brand-${Date.now()}`,
      type: "instagram",
      name: ko ? "새 채널" : "New Channel",
      value: "",
      createdAt: new Date().toISOString(),
    };
    const updated = [newAsset, ...brandAssets];
    setBrandAssets(updated);
    saveBrandAssets(updated);
    navigate(p(`/branding/${newAsset.id}`));
  };

  const handleDeleteBrand = (id: string) => {
    if (!confirm(ko ? "삭제하시겠습니까?" : "Delete this asset?")) return;
    persistBrand(brandAssets.filter(b => b.id !== id));
  };

  // ── Filtered data ──
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter(p => p.name.toLowerCase().includes(q) || p.client?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
  }, [projects, searchQuery]);

  const filteredBrand = useMemo(() => {
    if (!searchQuery.trim()) return brandAssets;
    const q = searchQuery.toLowerCase();
    return brandAssets.filter(b => b.name.toLowerCase().includes(q) || b.description?.toLowerCase().includes(q));
  }, [brandAssets, searchQuery]);

  // ── Projects View ──
  if (board === "projects") {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FolderKanban size={22} className="text-blue-600" />
              {ko ? "프로젝트" : "Projects"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {ko ? `전체 ${projects.length}개 · 진행 중 ${projects.filter(p => p.status === "active").length}개` : `Total ${projects.length} · Active ${projects.filter(p => p.status === "active").length}`}
            </p>
          </div>
          <button onClick={() => { setEditingProject(null); setDialogOpen(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
            <Plus size={16} /> {ko ? "프로젝트 추가" : "Add Project"}
          </button>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {STATUSES.map(status => (
            <div key={status.id} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <p className="text-lg font-bold text-gray-900">{projects.filter(p => p.status === status.id).length}</p>
              <p className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-block mt-1", status.color)}>{ko ? status.labelKo : status.labelEn}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={ko ? "프로젝트 검색..." : "Search projects..."}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
        </div>

        {/* Table */}
        {filteredProjects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <FolderKanban size={28} className="text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900 mb-1">{ko ? "아직 프로젝트가 없습니다" : "No projects yet"}</h3>
            <button onClick={() => { setEditingProject(null); setDialogOpen(true); }}
              className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">
              <Plus size={14} className="inline mr-1" />{ko ? "프로젝트 추가" : "Add Project"}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200">
            <table className="w-full text-left table-fixed">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-[4%]">No.</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-[25%]">{ko ? "프로젝트명" : "Project"}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-[12%]">{ko ? "상태" : "Status"}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-[12%] hidden md:table-cell">{ko ? "분류" : "Category"}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-[15%] hidden sm:table-cell">{ko ? "클라이언트" : "Client"}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-[12%] hidden md:table-cell">{ko ? "예산" : "Budget"}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-[10%] hidden lg:table-cell">{ko ? "생성일" : "Created"}</th>
                  <th className="px-4 py-3 w-[4%]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProjects.map((project, idx) => (
                  <tr key={project.id} onClick={() => navigate(p(`/projects/${project.id}`))}
                    onContextMenu={e => { e.preventDefault(); setContextMenu({ id: project.id, x: e.clientX, y: e.clientY, type: "project" }); }}
                    className="hover:bg-blue-50/30 transition-colors group cursor-pointer">
                    <td className="px-4 py-3.5 text-xs text-gray-400 font-mono">{idx + 1}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{project.name}</p>
                          {project.description && <p className="text-xs text-gray-400 truncate">{project.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <StatusPill currentStatus={project.status} onChange={(s) => handleStatusChange(project.id, s)} ko={ko} />
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      {project.category && (
                        <span className="text-xs text-gray-500">{ko ? PROJECT_CATEGORY_CONFIG[project.category]?.label : PROJECT_CATEGORY_CONFIG[project.category]?.labelEn}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell text-sm text-gray-600 truncate">{project.client || "-"}</td>
                    <td className="px-4 py-3.5 hidden md:table-cell text-sm text-gray-600">{project.budget || "-"}</td>
                    <td className="px-4 py-3.5 hidden lg:table-cell text-xs text-gray-400">
                      {project.createdAt ? format(new Date(project.createdAt), "MMM d") : "-"}
                    </td>
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <div className="relative">
                        <button onClick={() => setMenuOpenId(menuOpenId === project.id ? null : project.id)}
                          className="p-1 text-gray-300 hover:text-gray-600 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all">
                          <MoreHorizontal size={16} />
                        </button>
                        {menuOpenId === project.id && (
                          <div className="absolute right-0 top-8 z-30 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-28">
                            <button onClick={() => { setEditingProject(project); setDialogOpen(true); setMenuOpenId(null); }}
                              className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1.5">
                              <Edit3 size={10} /> {ko ? "수정" : "Edit"}
                            </button>
                            <button onClick={() => { handleDeleteProject(project.id); setMenuOpenId(null); }}
                              className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-1.5">
                              <Trash2 size={10} /> {ko ? "삭제" : "Delete"}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <AddProjectDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditingProject(null); }}
          onSave={editingProject ? handleEditProject : handleAddProject} project={editingProject} ko={ko} />

        {/* Right-click context menu */}
        {contextMenu && contextMenu.type === "project" && (() => {
          const proj = projects.find(p2 => p2.id === contextMenu.id);
          if (!proj) return null;
          return (
            <div className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-32"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={e => e.stopPropagation()}>
              <button onClick={() => { setEditingProject(proj); setDialogOpen(true); setContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1.5">
                <Edit3 size={10} /> {ko ? "수정" : "Edit"}
              </button>
              <button onClick={() => { handleDeleteProject(proj.id); setContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-1.5">
                <Trash2 size={10} /> {ko ? "삭제" : "Delete"}
              </button>
            </div>
          );
        })()}
      </div>
    );
  }

  // ── Channel Management View ──
  const allPlatforms = [...DEFAULT_PLATFORMS, ...customPlatforms.map(p => p.name), "other"];

  const handleAddPlatform = () => {
    const name = newPlatformName.trim();
    if (!name || allPlatforms.includes(name)) { setAddingPlatform(false); setNewPlatformName(""); setNewPlatformIcon(""); return; }
    const updated = [...customPlatforms, { name, icon: newPlatformIcon || undefined }];
    setCustomPlatforms(updated);
    saveCustomPlatforms(updated);
    setNewPlatformName("");
    setNewPlatformIcon("");
    setAddingPlatform(false);
  };

  const handlePlatformIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024) { alert(ko ? "아이콘은 200KB 이하만 가능합니다" : "Icon must be under 200KB"); return; }
    const reader = new FileReader();
    reader.onload = () => setNewPlatformIcon(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemovePlatform = (name: string) => {
    const updated = customPlatforms.filter(p => p.name !== name);
    setCustomPlatforms(updated);
    saveCustomPlatforms(updated);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Palette size={22} className="text-purple-600" />
            {ko ? "채널관리" : "Channels"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {ko ? `운영 중 ${brandAssets.length}개 채널` : `${brandAssets.length} channels`}
          </p>
        </div>
        <button onClick={handleAddBrand}
          className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors">
          <Plus size={16} /> {ko ? "채널 추가" : "Add Channel"}
        </button>
      </div>

      {/* Channel Summary */}
      <div className="flex flex-wrap gap-2 mb-6">
        {allPlatforms.map(key => (
          <div key={key} className="bg-white rounded-xl border border-gray-200 px-3 py-2.5 min-w-[80px] relative group flex flex-col items-center">
            <p className="text-lg font-bold text-gray-900">{brandAssets.filter(b => b.type === key).length}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <PlatformIcon id={key} size={14} />
              <p className="text-[10px] font-medium text-gray-500">{getPlatformLabel(key)}</p>
            </div>
            {customPlatforms.some(p => p.name === key) && (
              <button onClick={() => handleRemovePlatform(key)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={8} />
              </button>
            )}
          </div>
        ))}
        {addingPlatform ? (
          <div className="bg-white rounded-xl border border-purple-300 p-3 min-w-[120px] flex flex-col items-center gap-2">
            <input type="file" ref={platformIconRef} accept="image/*" className="hidden" onChange={handlePlatformIconUpload} />
            <button onClick={() => platformIconRef.current?.click()}
              className="w-10 h-10 rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-400 flex items-center justify-center text-gray-400 hover:text-purple-500 transition-colors overflow-hidden">
              {newPlatformIcon ? (
                <img src={newPlatformIcon} alt="" className="w-full h-full object-contain" />
              ) : (
                <Upload size={14} />
              )}
            </button>
            <input ref={platformInputRef} value={newPlatformName} onChange={e => setNewPlatformName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleAddPlatform(); if (e.key === "Escape") { setAddingPlatform(false); setNewPlatformName(""); setNewPlatformIcon(""); } }}
              placeholder={ko ? "플랫폼명" : "Name"}
              className="w-full text-xs text-center outline-none bg-transparent" />
          </div>
        ) : (
          <button onClick={() => setAddingPlatform(true)}
            className="bg-white rounded-xl border-2 border-dashed border-gray-200 hover:border-purple-300 p-3 min-w-[80px] text-gray-400 hover:text-purple-500 transition-colors flex flex-col items-center justify-center">
            <Plus size={16} />
            <p className="text-[10px] font-medium mt-1">{ko ? "추가" : "Add"}</p>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={ko ? "채널 검색..." : "Search channels..."}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-purple-100" />
      </div>

      {/* Table */}
      {filteredBrand.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Palette size={28} className="text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">{ko ? "아직 채널이 없습니다" : "No channels yet"}</h3>
          <button onClick={handleAddBrand}
            className="mt-3 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700">
            <Plus size={14} className="inline mr-1" />{ko ? "채널 추가" : "Add Channel"}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200">
          <table className="w-full text-left table-fixed">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-[4%]">No.</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-[30%]">{ko ? "채널명" : "Channel"}</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-[15%]">{ko ? "플랫폼" : "Platform"}</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-[25%] hidden sm:table-cell">{ko ? "설명" : "Description"}</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-[12%] hidden md:table-cell">{ko ? "생성일" : "Created"}</th>
                <th className="px-4 py-3 w-[4%]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBrand.map((asset, idx) => {
                const typeConfig = BRAND_TYPE_CONFIG[asset.type] || BRAND_TYPE_CONFIG.other;
                return (
                  <tr key={asset.id} onClick={() => navigate(p(`/branding/${asset.id}`))}
                    onContextMenu={e => { e.preventDefault(); setContextMenu({ id: asset.id, x: e.clientX, y: e.clientY, type: "brand" }); }}
                    className="hover:bg-purple-50/30 transition-colors group cursor-pointer">
                    <td className="px-4 py-3.5 text-xs text-gray-400 font-mono">{idx + 1}</td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-medium text-gray-900 truncate">{asset.name}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-gray-500 flex items-center gap-1.5">
                        <PlatformIcon id={asset.type} size={14} /> {ko ? (typeConfig?.label || asset.type) : (typeConfig?.labelEn || asset.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell text-xs text-gray-500 truncate">{asset.description || "-"}</td>
                    <td className="px-4 py-3.5 hidden md:table-cell text-xs text-gray-400">
                      {asset.createdAt ? format(new Date(asset.createdAt), "MMM d") : "-"}
                    </td>
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <div className="relative">
                        <button onClick={() => setMenuOpenId(menuOpenId === asset.id ? null : asset.id)}
                          className="p-1 text-gray-300 hover:text-gray-600 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all">
                          <MoreHorizontal size={16} />
                        </button>
                        {menuOpenId === asset.id && (
                          <div className="absolute right-0 top-8 z-30 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-28">
                            <button onClick={() => { navigate(p(`/branding/${asset.id}`)); setMenuOpenId(null); }}
                              className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1.5">
                              <Edit3 size={10} /> {ko ? "수정" : "Edit"}
                            </button>
                            <button onClick={() => { handleDeleteBrand(asset.id); setMenuOpenId(null); }}
                              className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-1.5">
                              <Trash2 size={10} /> {ko ? "삭제" : "Delete"}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Right-click context menu for channels */}
      {contextMenu && contextMenu.type === "brand" && (() => {
        const asset = brandAssets.find(a => a.id === contextMenu.id);
        if (!asset) return null;
        return (
          <div className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-32"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => { navigate(p(`/branding/${asset.id}`)); setContextMenu(null); }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1.5">
              <Edit3 size={10} /> {ko ? "수정" : "Edit"}
            </button>
            <button onClick={() => { handleDeleteBrand(asset.id); setContextMenu(null); }}
              className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-1.5">
              <Trash2 size={10} /> {ko ? "삭제" : "Delete"}
            </button>
          </div>
        );
      })()}
    </div>
  );
}
