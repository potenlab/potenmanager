import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Trash2, ChevronDown, LayoutGrid, ChevronRight,
  Calendar, Users, Circle, Palette, Camera,
  Building2, DollarSign, FolderKanban, Link2, Plus, X,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { useTeam } from "../context/TeamContext";
import { NotionBlockEditor } from "../components/NotionBlockEditor";
import { UrlPreviewSection } from "../components/detail/UrlPreviewCard";
import { InlineText } from "../components/detail/InlineText";
import { PropertyItem } from "../components/detail/PropertyItem";
import {
  Project, PROJECT_STATUS_CONFIG, PROJECT_COLORS, PROJECT_CATEGORY_CONFIG,
  loadProjects, saveProjects,
} from "./ManagementPage";

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const ko = language === "ko";
  const { members } = useTeam();

  const isNew = projectId === "new" || !projectId;

  const [projects, setProjects] = useState<Project[]>(loadProjects);
  const [localId, setLocalId] = useState<string | null>(null);

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
      };
      setProjects((prev) => {
        const next = [...prev, newProj];
        saveProjects(next);
        return next;
      });
      setLocalId(id);
      navigate(`/management/projects/${id}`, { replace: true });
    }
  }, [isNew, localId]);

  const currentId = isNew ? localId : projectId;
  const project = projects.find((p) => p.id === currentId) || null;

  const [propsExpanded, setPropsExpanded] = useState(true);
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
    },
    [currentId]
  );

  const handleDelete = () => {
    if (!project) return;
    if (!confirm(ko ? "이 프로젝트를 삭제하시겠습니까?" : "Delete this project?")) return;
    const next = projects.filter((p) => p.id !== project.id);
    saveProjects(next);
    navigate("/management/projects");
  };

  if (!project) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const status = PROJECT_STATUS_CONFIG[project.status];

  return (
    <div className="h-full overflow-y-auto bg-white scrollbar-hide">
      <div className="max-w-6xl mx-auto py-4 sm:py-7 px-4 sm:px-8 pb-64">
        <div className="max-w-3xl">
          <div className="space-y-6">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center justify-between">
              <nav className="flex items-center gap-1 text-sm">
                <button
                  onClick={() => navigate("/management/projects")}
                  className="text-gray-400 hover:text-blue-600 transition-colors font-medium"
                >
                  {ko ? "프로젝트" : "Projects"}
                </button>
                <ChevronRight size={14} className="text-gray-300 shrink-0" />
                <span className="text-gray-700 font-semibold truncate max-w-[200px]">
                  {project.name || (ko ? "새 프로젝트" : "New Project")}
                </span>
              </nav>
              <button
                onClick={handleDelete}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>

            {/* Logo + Title */}
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

            {/* Properties */}
            <div className="bg-gray-50/50 rounded-2xl border border-gray-100 overflow-hidden">
              <button
                onClick={() => setPropsExpanded((p) => !p)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-100/50 transition-colors"
              >
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <LayoutGrid size={12} />
                  {ko ? "속성" : "Properties"}
                </span>
                <div className="flex items-center gap-2">
                  {!propsExpanded && (
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", status.bg, status.color)}>
                      {ko ? status.label : status.labelEn}
                    </span>
                  )}
                  <ChevronDown size={14} className={cn("text-gray-400 transition-transform duration-200", propsExpanded && "rotate-180")} />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {propsExpanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="divide-y divide-gray-100 border-t border-gray-100">
                      {/* Status */}
                      <PropertyItem icon={<Circle size={14} />} label={ko ? "상태" : "Status"}>
                        <select
                          value={project.status}
                          onChange={(e) => handleUpdate({ status: e.target.value as Project["status"] })}
                          className="text-sm px-2 py-1 rounded-md border border-transparent hover:border-gray-200 bg-transparent outline-none focus:ring-2 focus:ring-blue-100 text-gray-700 font-medium"
                        >
                          {Object.entries(PROJECT_STATUS_CONFIG).map(([k, v]) => (
                            <option key={k} value={k}>{ko ? v.label : v.labelEn}</option>
                          ))}
                        </select>
                      </PropertyItem>

                      {/* Color */}
                      <PropertyItem icon={<Palette size={14} />} label={ko ? "컬러" : "Color"}>
                        <div className="flex gap-1.5 flex-wrap">
                          {PROJECT_COLORS.map((c) => (
                            <button
                              key={c}
                              onClick={() => handleUpdate({ color: c })}
                              className={cn(
                                "w-6 h-6 rounded-full transition-all",
                                project.color === c && "ring-2 ring-offset-2 ring-blue-400"
                              )}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </PropertyItem>

                      {/* Start Date */}
                      <PropertyItem icon={<Calendar size={14} />} label={ko ? "시작일" : "Start Date"}>
                        <input
                          type="date"
                          value={project.startDate || ""}
                          onChange={(e) => handleUpdate({ startDate: e.target.value || undefined })}
                          className="text-sm px-2 py-1 rounded-md border border-transparent hover:border-gray-200 bg-transparent outline-none focus:ring-2 focus:ring-blue-100 text-gray-700"
                        />
                      </PropertyItem>

                      {/* End Date */}
                      <PropertyItem icon={<Calendar size={14} />} label={ko ? "종료일" : "End Date"}>
                        <input
                          type="date"
                          value={project.endDate || ""}
                          onChange={(e) => handleUpdate({ endDate: e.target.value || undefined })}
                          className="text-sm px-2 py-1 rounded-md border border-transparent hover:border-gray-200 bg-transparent outline-none focus:ring-2 focus:ring-blue-100 text-gray-700"
                        />
                      </PropertyItem>

                      {/* Members */}
                      <PropertyItem icon={<Users size={14} />} label={ko ? "멤버" : "Members"}>
                        <div className="flex flex-wrap gap-1.5">
                          {members.map((m) => {
                            const sel = project.memberIds.includes(m.id);
                            return (
                              <button
                                key={m.id}
                                onClick={() =>
                                  handleUpdate({
                                    memberIds: sel
                                      ? project.memberIds.filter((i) => i !== m.id)
                                      : [...project.memberIds, m.id],
                                  })
                                }
                                className={cn(
                                  "px-2.5 py-1 rounded-lg text-xs font-medium transition-all border",
                                  sel
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                                )}
                              >
                                {m.name}
                              </button>
                            );
                          })}
                        </div>
                      </PropertyItem>

                      {/* Category */}
                      <PropertyItem icon={<FolderKanban size={14} />} label={ko ? "카테고리" : "Category"}>
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
                      </PropertyItem>

                      {/* Client */}
                      <PropertyItem icon={<Building2 size={14} />} label={ko ? "클라이언트" : "Client"}>
                        <input
                          value={project.client || ""}
                          onChange={(e) => handleUpdate({ client: e.target.value })}
                          className="text-sm px-2 py-1 rounded-md border border-transparent hover:border-gray-200 bg-transparent outline-none focus:ring-2 focus:ring-blue-100 text-gray-700"
                          placeholder={ko ? "고객사/클라이언트명" : "Client name"}
                        />
                      </PropertyItem>

                      {/* Budget */}
                      <PropertyItem icon={<DollarSign size={14} />} label={ko ? "예산" : "Budget"}>
                        <input
                          value={project.budget || ""}
                          onChange={(e) => handleUpdate({ budget: e.target.value })}
                          className="text-sm px-2 py-1 rounded-md border border-transparent hover:border-gray-200 bg-transparent outline-none focus:ring-2 focus:ring-blue-100 text-gray-700"
                          placeholder={ko ? "예: 2,000만원" : "e.g. $20,000"}
                        />
                      </PropertyItem>

                      {/* Links */}
                      <PropertyItem icon={<Link2 size={14} />} label={ko ? "관련 링크" : "Links"}>
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
                      </PropertyItem>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

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
          </div>
        </div>
      </div>
    </div>
  );
}
