import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  Building2, FolderKanban, Palette, Plus, Pencil, Trash2,
  Calendar, Users, ChevronRight, MoreHorizontal, Check, X,
  Upload, Image as ImageIcon, Globe, Link as LinkIcon,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { useTeam } from "../context/TeamContext";
import { usePermission } from "../context/PermissionContext";

// ─── Types ───────────────────────────────────────────────────────
interface Project {
  id: string;
  name: string;
  description: string;
  status: "planning" | "active" | "paused" | "completed";
  color: string;
  startDate?: string;
  endDate?: string;
  memberIds: string[];
  createdAt: string;
}

interface BrandAsset {
  id: string;
  type: "logo" | "color" | "font" | "guideline" | "template";
  name: string;
  value: string; // color hex, font name, or URL
  description?: string;
  createdAt: string;
}

const PROJECT_STATUS_CONFIG = {
  planning: { label: "기획 중", labelEn: "Planning", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  active: { label: "진행 중", labelEn: "Active", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  paused: { label: "일시 중지", labelEn: "Paused", color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200" },
  completed: { label: "완료", labelEn: "Completed", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
};

const PROJECT_COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981",
  "#06B6D4", "#F97316", "#EF4444", "#6366F1", "#14B8A6",
];

const BRAND_TYPE_CONFIG = {
  logo: { label: "로고", labelEn: "Logo", icon: <ImageIcon size={14} /> },
  color: { label: "브랜드 컬러", labelEn: "Brand Color", icon: <Palette size={14} /> },
  font: { label: "폰트", labelEn: "Font", icon: <span className="text-xs font-bold">Aa</span> },
  guideline: { label: "가이드라인", labelEn: "Guideline", icon: <Globe size={14} /> },
  template: { label: "템플릿", labelEn: "Template", icon: <FolderKanban size={14} /> },
};

const STORAGE_KEY_PROJECTS = "poten_management_projects";
const STORAGE_KEY_BRAND = "poten_management_brand";

function loadProjects(): Project[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY_PROJECTS);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}
function saveProjects(projects: Project[]) {
  localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
}
function loadBrandAssets(): BrandAsset[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY_BRAND);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}
function saveBrandAssets(assets: BrandAsset[]) {
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
        <div
          className="w-3 h-3 rounded-full mt-1.5 shrink-0"
          style={{ backgroundColor: project.color }}
        />
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

// ─── Project Edit Modal ──────────────────────────────────────────
function ProjectEditModal({
  project, ko, members, onSave, onClose,
}: {
  project: Project | null; ko: boolean;
  members: { id: string; name: string }[];
  onSave: (p: Project) => void; onClose: () => void;
}) {
  const isNew = !project;
  const [form, setForm] = useState<Project>(project || {
    id: `proj-${Date.now()}`,
    name: "",
    description: "",
    status: "planning",
    color: PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)],
    memberIds: [],
    createdAt: new Date().toISOString(),
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          {isNew ? (ko ? "프로젝트 추가" : "Add Project") : (ko ? "프로젝트 수정" : "Edit Project")}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">{ko ? "이름" : "Name"}</label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              placeholder={ko ? "프로젝트 이름" : "Project name"}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">{ko ? "설명" : "Description"}</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-none"
              placeholder={ko ? "간단한 설명" : "Brief description"}
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{ko ? "상태" : "Status"}</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value as Project["status"] })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none"
              >
                {Object.entries(PROJECT_STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{ko ? v.label : v.labelEn}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{ko ? "컬러" : "Color"}</label>
              <div className="flex gap-1.5 flex-wrap">
                {PROJECT_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    className={cn("w-6 h-6 rounded-full transition-all", form.color === c && "ring-2 ring-offset-2 ring-blue-400")}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{ko ? "시작일" : "Start"}</label>
              <input type="date" value={form.startDate || ""} onChange={e => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{ko ? "종료일" : "End"}</label>
              <input type="date" value={form.endDate || ""} onChange={e => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">{ko ? "멤버" : "Members"}</label>
            <div className="flex flex-wrap gap-1.5">
              {members.map(m => {
                const sel = form.memberIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => setForm({ ...form, memberIds: sel ? form.memberIds.filter(i => i !== m.id) : [...form.memberIds, m.id] })}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium transition-all border",
                      sel ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                    )}
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">
            {ko ? "취소" : "Cancel"}
          </button>
          <button
            onClick={() => { if (form.name.trim()) onSave(form); }}
            disabled={!form.name.trim()}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isNew ? (ko ? "추가" : "Add") : (ko ? "저장" : "Save")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Brand Asset Edit Modal ──────────────────────────────────────
function BrandEditModal({
  asset, ko, onSave, onClose,
}: {
  asset: BrandAsset | null; ko: boolean;
  onSave: (a: BrandAsset) => void; onClose: () => void;
}) {
  const isNew = !asset;
  const [form, setForm] = useState<BrandAsset>(asset || {
    id: `brand-${Date.now()}`,
    type: "color",
    name: "",
    value: "#3B82F6",
    description: "",
    createdAt: new Date().toISOString(),
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          {isNew ? (ko ? "브랜드 자산 추가" : "Add Brand Asset") : (ko ? "브랜드 자산 수정" : "Edit Brand Asset")}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">{ko ? "유형" : "Type"}</label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(BRAND_TYPE_CONFIG).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setForm({ ...form, type: k as BrandAsset["type"] })}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                    form.type === k ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-white text-gray-500 border-gray-200"
                  )}
                >
                  {v.icon} {ko ? v.label : v.labelEn}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">{ko ? "이름" : "Name"}</label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
              placeholder={ko ? "예: 메인 로고" : "e.g. Main Logo"}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">
              {form.type === "color" ? (ko ? "컬러 코드" : "Color Code") :
               form.type === "font" ? (ko ? "폰트 이름" : "Font Name") :
               (ko ? "URL 또는 값" : "URL or Value")}
            </label>
            <div className="flex items-center gap-2">
              {form.type === "color" && (
                <input type="color" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
              )}
              <input
                value={form.value}
                onChange={e => setForm({ ...form, value: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 font-mono"
                placeholder={form.type === "color" ? "#000000" : form.type === "font" ? "Pretendard" : "https://..."}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">{ko ? "설명 (선택)" : "Description (optional)"}</label>
            <input
              value={form.description || ""}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl">
            {ko ? "취소" : "Cancel"}
          </button>
          <button
            onClick={() => { if (form.name.trim()) onSave(form); }}
            disabled={!form.name.trim()}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
          >
            {isNew ? (ko ? "추가" : "Add") : (ko ? "저장" : "Save")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Management Page ────────────────────────────────────────
export function ManagementPage() {
  const { language } = useLanguage();
  const ko = language === "ko";
  const { members } = useTeam();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"projects" | "branding">("projects");
  const [projects, setProjects] = useState<Project[]>(loadProjects);
  const [brandAssets, setBrandAssets] = useState<BrandAsset[]>(loadBrandAssets);
  const [editProject, setEditProject] = useState<Project | null | "new">(null);
  const [editBrand, setEditBrand] = useState<BrandAsset | null | "new">(null);

  // Persist
  useEffect(() => { saveProjects(projects); }, [projects]);
  useEffect(() => { saveBrandAssets(brandAssets); }, [brandAssets]);

  const handleSaveProject = (p: Project) => {
    setProjects(prev => {
      const idx = prev.findIndex(x => x.id === p.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = p; return next; }
      return [...prev, p];
    });
    setEditProject(null);
  };

  const handleDeleteProject = (id: string) => {
    if (!confirm(ko ? "이 프로젝트를 삭제하시겠습니까?" : "Delete this project?")) return;
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const handleSaveBrand = (a: BrandAsset) => {
    setBrandAssets(prev => {
      const idx = prev.findIndex(x => x.id === a.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = a; return next; }
      return [...prev, a];
    });
    setEditBrand(null);
  };

  const handleDeleteBrand = (id: string) => {
    if (!confirm(ko ? "삭제하시겠습니까?" : "Delete?")) return;
    setBrandAssets(prev => prev.filter(a => a.id !== id));
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
              {ko ? "프로젝트와 브랜딩 자산을 관리합니다" : "Manage projects and brand assets"}
            </p>
          </div>
          <button
            onClick={() => activeTab === "projects" ? setEditProject("new") : setEditBrand("new")}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all"
          >
            <Plus size={16} />
            {activeTab === "projects"
              ? (ko ? "프로젝트 추가" : "Add Project")
              : (ko ? "브랜드 자산 추가" : "Add Brand Asset")}
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
                onClick={() => setEditProject("new")}
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
                  onClick={() => setEditProject(p)}
                  onDelete={() => handleDeleteProject(p.id)}
                />
              ))}
            </div>
          )
        ) : (
          brandAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Palette size={48} className="mb-3 text-gray-300" />
              <p className="text-sm font-medium">{ko ? "브랜드 자산이 없습니다" : "No brand assets yet"}</p>
              <button
                onClick={() => setEditBrand("new")}
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
                          onClick={() => setEditBrand(asset)}
                          className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 hover:border-gray-300 hover:shadow-sm cursor-pointer transition-all group"
                        >
                          {type === "color" && (
                            <div className="w-8 h-8 rounded-lg border border-gray-200 shrink-0" style={{ backgroundColor: asset.value }} />
                          )}
                          {type === "logo" && asset.value.startsWith("http") && (
                            <img src={asset.value} alt="" className="w-8 h-8 rounded-lg object-contain bg-gray-50 shrink-0" />
                          )}
                          {type !== "color" && !(type === "logo" && asset.value.startsWith("http")) && (
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
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
        )}
      </div>

      {/* Modals */}
      {editProject !== null && (
        <ProjectEditModal
          project={editProject === "new" ? null : editProject}
          ko={ko}
          members={members}
          onSave={handleSaveProject}
          onClose={() => setEditProject(null)}
        />
      )}
      {editBrand !== null && (
        <BrandEditModal
          asset={editBrand === "new" ? null : editBrand}
          ko={ko}
          onSave={handleSaveBrand}
          onClose={() => setEditBrand(null)}
        />
      )}
    </div>
  );
}
