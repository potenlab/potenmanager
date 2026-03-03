import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  User as UserIcon,
  Timer,
  MessageSquare,
  Plus,
  ChevronDown,
  Flag,
  Loader2,
  X,
  Check,
  Pencil,
  Palette,
  CircleDot,
  Sparkles,
  Zap,
  History,
  AlertTriangle,
  Layout,
  Maximize2,
  Minimize2,
  Square,
  CheckSquare,
  Tag,
  Layers,
  AlignLeft,
  Link2,
  ExternalLink,
  RefreshCw,
  FileText,
  Globe,
  BookOpen,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Task, TaskCategory } from "../../lib/mockData";
import { TASK_CATEGORY_CONFIG } from "./TasksPage";
import { useLanguage } from "../context/LanguageContext";
import { useTaskContext } from "../context/TaskContext";
import { usePermission } from "../context/PermissionContext";
import { useLibrary, LibraryItem } from "../context/LibraryContext";
import { api } from "../../lib/api";
import { NotionBlockEditor } from "../components/NotionBlockEditor";
import { NotionDateRangePicker } from "../components/NotionDateRangePicker";
import { createPortal } from "react-dom";

type TaskStatus = "pending" | "in-progress" | "completed";
type TaskPriority = "low" | "medium" | "high";

const STATUS_CONFIG: Record<TaskStatus, { label: string; labelKo: string; icon: React.ReactNode; color: string; bg: string }> = {
  pending: { label: "To Do", labelKo: "할 일", icon: <Circle size={14} />, color: "text-gray-500", bg: "bg-gray-100" },
  "in-progress": { label: "In Progress", labelKo: "진행 중", icon: <CircleDot size={14} />, color: "text-blue-600", bg: "bg-blue-50" },
  completed: { label: "Done", labelKo: "완료", icon: <CheckCircle2 size={14} />, color: "text-emerald-600", bg: "bg-emerald-50" },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; labelKo: string; color: string; bg: string }> = {
  low: { label: "Low", labelKo: "낮음", color: "text-blue-600", bg: "bg-blue-50" },
  medium: { label: "Medium", labelKo: "보통", color: "text-amber-600", bg: "bg-amber-50" },
  high: { label: "High", labelKo: "높음", color: "text-red-600", bg: "bg-red-50" },
};

// ─── Inline Editable Text ───────────────────────────────────────────
function InlineText({
  value,
  onChange,
  placeholder,
  className,
  as = "p",
  readOnly = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  as?: "h1" | "p" | "span";
  readOnly?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (ref.current && !isFocused) {
      ref.current.textContent = value;
    }
  }, [value, isFocused]);

  const handleBlur = () => {
    setIsFocused(false);
    const newVal = ref.current?.textContent?.trim() || "";
    if (newVal !== value) onChange(newVal);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && as !== "p") {
      e.preventDefault();
      ref.current?.blur();
    }
  };

  return (
    <div
      ref={ref}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      onFocus={() => !readOnly && setIsFocused(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      data-placeholder={placeholder}
      className={cn(
        "outline-none rounded-lg transition-colors relative",
        "empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300 empty:before:pointer-events-none",
        !readOnly && "focus:bg-gray-50 focus:ring-2 focus:ring-blue-100 px-1 -mx-1",
        !readOnly && "hover:bg-gray-50/50",
        readOnly && "cursor-default",
        className
      )}
    />
  );
}

// ─── Portal Position Helper ──────────────────────────────────────────
function usePortalPosition(open: boolean, triggerRef: React.RefObject<HTMLElement | null>) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useEffect(() => {
    if (!open || !triggerRef.current) { setPos(null); return; }
    const rect = triggerRef.current.getBoundingClientRect();
    let top = rect.bottom + 4;
    let left = rect.left;
    if (left + 240 > window.innerWidth - 16) left = window.innerWidth - 256;
    if (top + 300 > window.innerHeight - 16) top = rect.top - 304;
    setPos({ top, left });
  }, [open]);
  return pos;
}

// ─── Dropdown Select (Portal) ───────────────────────────────────────
function InlineDropdown<T extends string>({
  value,
  options,
  onChange,
  renderOption,
  renderValue,
  disabled = false,
}: {
  value: T;
  options: T[];
  onChange: (v: T) => void;
  renderOption: (opt: T) => React.ReactNode;
  renderValue: (val: T) => React.ReactNode;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const pos = usePortalPosition(open, triggerRef);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popupRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => !disabled && setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors text-sm",
          disabled ? "cursor-default opacity-70" : "hover:bg-gray-100"
        )}
      >
        {renderValue(value)}
        {!disabled && <ChevronDown size={12} className="text-gray-400" />}
      </button>
      {open && pos && createPortal(
        <div
          ref={popupRef}
          className="fixed bg-white border border-gray-200 rounded-xl shadow-lg z-[9999] min-w-[160px] py-1"
          style={{ top: pos.top, left: pos.left }}
        >
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors",
                opt === value && "bg-blue-50/50"
              )}
            >
              {renderOption(opt)}
              {opt === value && <Check size={14} className="ml-auto text-blue-600" />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

// ─── Multi-Assignee Picker ──────────────────────────────────────────
function MultiAssigneePicker({
  selectedIds,
  onChange,
  language,
  disabled = false,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  language: string;
  disabled?: boolean;
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

  const selectedMembers = selectedIds
    .map((id) => members.find((m) => m.id === id))
    .filter(Boolean) as typeof members;

  const toggleMember = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const getDisplayName = (member: typeof members[0]) => {
    if (member.id === currentUser.id) {
      return `${member.name}(${language === "ko" ? "나" : "me"})`;
    }
    return member.name;
  };

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => !disabled && setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors text-sm",
          disabled ? "cursor-default opacity-70" : "hover:bg-gray-100"
        )}
      >
        {selectedMembers.length === 0 ? (
          <span className="text-sm text-gray-400">{language === "ko" ? "나" : "Me"}</span>
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
        {!disabled && <ChevronDown size={12} className="text-gray-400" />}
      </button>

      {open && pos && createPortal(
        <div
          ref={popupRef}
          className="fixed bg-white border border-gray-200 rounded-xl shadow-lg z-[9999] min-w-[200px] py-1"
          style={{ top: pos.top, left: pos.left }}
        >
          {members.map((m) => {
            const isSelected = selectedIds.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => toggleMember(m.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors",
                  isSelected && "bg-blue-50/50"
                )}
              >
                <img src={m.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                <span className="flex-1 text-left">{getDisplayName(m)}</span>
                {isSelected && <Check size={14} className="text-blue-600" />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}

// ─── Estimated Time Editor ──────────────────────────────────────────
function EstimatedTimeEditor({ language, value, onChange, disabled = false }: { language: string; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState(value);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const pos = usePortalPosition(open, triggerRef);

  useEffect(() => { if (open) setTemp(value); }, [open, value]);

  const display = value > 0 ? `${Math.floor(value / 60)}h ${value % 60}m` : (language === "ko" ? "미설정" : "Not set");

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => !disabled && setOpen(!open)}
        className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors text-sm", disabled ? "cursor-default opacity-70" : "hover:bg-gray-100")}
      >
        <span className={cn("font-medium", value === 0 ? "text-gray-400" : "text-gray-700")}>{display}</span>
        {!disabled && <Pencil size={11} className="text-gray-300" />}
      </button>

      {open && pos && createPortal(
        <div ref={popupRef} className="fixed bg-white border border-gray-200 rounded-xl shadow-xl z-[9999] w-[240px] p-4" style={{ top: pos.top, left: pos.left }}>
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-3">{language === "ko" ? "예상 시간 설정" : "Set Est. Time"}</p>
          <div className="flex items-center justify-between mb-4">
            <input 
              type="number" value={Math.floor(temp / 60)} 
              onChange={(e) => setTemp(Math.max(0, parseInt(e.target.value || "0") * 60 + (temp % 60)))}
              className="w-16 p-2 border rounded-lg text-center"
            />
            <span className="text-gray-400">h</span>
            <input 
              type="number" value={temp % 60} 
              onChange={(e) => setTemp(Math.max(0, Math.floor(temp / 60) * 60 + (parseInt(e.target.value || "0") % 60)))}
              className="w-16 p-2 border rounded-lg text-center"
            />
            <span className="text-gray-400">m</span>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs text-gray-500">{language === "ko" ? "취소" : "Cancel"}</button>
            <button onClick={() => { onChange(temp); setOpen(false); }} className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg font-bold">OK</button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ─── Activity Log Component ──────────────────────────────────────────
function ActivityLogSection({ taskId, language }: { taskId: string; language: string }) {
  const { getTaskLogs } = useTaskContext();
  const logs = getTaskLogs(taskId);

  if (logs.length === 0) return null;

  return (
    <div className="mt-12 pt-8 border-t border-gray-100">
      <div className="flex items-center gap-2 mb-6 text-gray-400">
        <History size={16} />
        <h3 className="text-sm font-bold text-gray-900">{language === "ko" ? "활동 기록" : "Activity Log"}</h3>
      </div>
      <div className="relative space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-gray-100">
        {logs.slice(0, 5).map((log) => (
          <div key={log.id} className="relative pl-8">
            <div className="absolute left-0 top-1 w-[22px] h-[22px] rounded-full bg-white border border-gray-100 flex items-center justify-center z-10">
              <div className={cn("w-2 h-2 rounded-full", log.action === "status_changed" ? "bg-emerald-500" : "bg-blue-500")} />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 text-[10px] text-gray-400">
                <span className="font-bold text-gray-900">{log.actorName}</span>
                <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <p className="text-xs text-gray-600">{language === "ko" ? log.detailsKo : log.details}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sub-task Section ───────────────────────────────────────────────
function SubTaskSection({ taskId, language, canEdit }: { taskId: string; language: string; canEdit: boolean }) {
  const { tasks, getTask, updateTask } = useTaskContext();
  const navigate = useNavigate();
  
  // Find sub-tasks: tasks whose parentId matches this taskId
  const subTasks = tasks.filter((t) => t.parentId === taskId);
  // Also check if current task has children IDs and find those
  const parentTask = getTask(taskId);
  const childIds = parentTask?.children || [];
  const childTasks = childIds
    .map((id) => getTask(id))
    .filter((t): t is Task => !!t);
  
  // Merge both lists (deduplicate)
  const allSubTasks = [...subTasks];
  childTasks.forEach((ct) => {
    if (!allSubTasks.find((st) => st.id === ct.id)) {
      allSubTasks.push(ct);
    }
  });

  if (allSubTasks.length === 0) return null;

  const completedCount = allSubTasks.filter((t) => t.status === "completed").length;

  const handleToggle = (subTaskId: string) => {
    const sub = getTask(subTaskId);
    if (!sub) return;
    const newStatus = sub.status === "completed" ? "pending" : "completed";
    updateTask(subTaskId, { 
      status: newStatus,
      progress: newStatus === "completed" ? 100 : 0,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <CheckSquare size={14} className="text-gray-400" />
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
          {language === "ko" ? "하위 작업" : "Sub-tasks"}
        </span>
        <span className="text-[11px] text-gray-300 ml-auto">
          {completedCount}/{allSubTasks.length}
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-[#0079FF] rounded-full transition-all duration-300"
          style={{ width: `${allSubTasks.length > 0 ? (completedCount / allSubTasks.length) * 100 : 0}%` }}
        />
      </div>

      <div className="space-y-0.5">
        {allSubTasks.map((sub) => {
          const isCompleted = sub.status === "completed";
          const subTitle = language === "ko" ? (sub.titleKo || sub.title) : sub.title;
          return (
            <div 
              key={sub.id} 
              className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <button
                onClick={() => canEdit && handleToggle(sub.id)}
                className={cn(
                  "shrink-0 w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-all",
                  isCompleted 
                    ? "bg-[#0079FF] border-[#0079FF]" 
                    : "border-gray-300 hover:border-gray-400",
                  !canEdit && "cursor-default"
                )}
              >
                {isCompleted && <Check size={12} className="text-white" strokeWidth={3} />}
              </button>
              <button
                onClick={() => navigate(`/tasks/${sub.id}`)}
                className={cn(
                  "flex-1 text-left text-sm transition-colors",
                  isCompleted ? "text-gray-400 line-through" : "text-gray-700 hover:text-gray-900"
                )}
              >
                {subTitle}
              </button>
              {sub.priority && (
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded",
                  PRIORITY_CONFIG[sub.priority as TaskPriority]?.bg,
                  PRIORITY_CONFIG[sub.priority as TaskPriority]?.color
                )}>
                  {language === "ko" ? PRIORITY_CONFIG[sub.priority as TaskPriority]?.labelKo : PRIORITY_CONFIG[sub.priority as TaskPriority]?.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── AI Assistance Bar ────────────────────────────────────────────────
type AIFeature = "decompose" | "describe" | "recommend" | "resources" | null;

interface SubtaskResult { title: string; titleEn: string; estimatedMinutes: number; priority: string; checked: boolean; }
interface RecommendResult { priority: string; category: string; reasoning: string; }
interface ExternalResource { title: string; description: string; type: string; suggestedUrl?: string; }

function TaskAIBar({
  taskTitle, taskDescription, taskCategory, taskPriority, taskId, language, canEdit,
  onAddSubtasks, onApplyDescription, onApplyPriority, onApplyCategory,
}: {
  taskTitle: string; taskDescription: string; taskCategory?: TaskCategory; taskPriority: string;
  taskId: string; language: string; canEdit: boolean;
  onAddSubtasks: (subtasks: SubtaskResult[]) => void;
  onApplyDescription: (desc: string) => void;
  onApplyPriority: (p: string) => void;
  onApplyCategory: (c: string) => void;
}) {
  const { items } = useLibrary();
  const [activeFeature, setActiveFeature] = useState<AIFeature>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Feature results
  const [subtasks, setSubtasks] = useState<SubtaskResult[] | null>(null);
  const [generatedDesc, setGeneratedDesc] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<RecommendResult | null>(null);
  const [libraryMatches, setLibraryMatches] = useState<LibraryItem[]>([]);
  const [externalResources, setExternalResources] = useState<ExternalResource[]>([]);
  const [externalSearchEnabled, setExternalSearchEnabled] = useState(false);
  const [externalLoading, setExternalLoading] = useState(false);

  const ko = language === "ko";

  const handleFeatureClick = async (feature: AIFeature) => {
    if (feature === activeFeature) { setActiveFeature(null); return; }
    setActiveFeature(feature);
    setError(null);

    if (feature === "resources") {
      // Client-side library search
      const keywords = taskTitle.toLowerCase().split(/[\s,./·\-_]+/).filter(w => w.length > 1);
      const matches = items.filter(item => {
        const text = `${item.title} ${item.description || ""} ${(item.tags || []).join(" ")}`.toLowerCase();
        return keywords.some(kw => text.includes(kw));
      }).slice(0, 8);
      setLibraryMatches(matches);
      setExternalResources([]);
      return;
    }

    setIsLoading(true);
    try {
      if (feature === "decompose") {
        const res = await api.aiDecomposeTask({ taskTitle, taskDescription: taskDescription || undefined, taskCategory });
        setSubtasks((res.subtasks || []).map(s => ({ ...s, checked: true })));
      } else if (feature === "describe") {
        const res = await api.aiDescribeTask({ taskTitle, taskCategory, taskPriority, existingDescription: taskDescription || undefined });
        setGeneratedDesc(res.description);
      } else if (feature === "recommend") {
        const res = await api.aiRecommendTask({ taskTitle, taskDescription: taskDescription || undefined, availableCategories: Object.keys(TASK_CATEGORY_CONFIG) });
        setRecommendation(res);
      }
    } catch (e: any) {
      setError(e.message || "AI request failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExternalSearch = async () => {
    setExternalLoading(true);
    try {
      const res = await api.aiSearchExternal({ query: taskTitle, language });
      setExternalResources(res.resources || []);
    } catch { /* ignore */ } finally {
      setExternalLoading(false);
    }
  };

  useEffect(() => {
    if (externalSearchEnabled && activeFeature === "resources") handleExternalSearch();
  }, [externalSearchEnabled]);

  const toggleSubtask = (idx: number) => {
    setSubtasks(prev => prev?.map((s, i) => i === idx ? { ...s, checked: !s.checked } : s) || null);
  };

  if (!canEdit || !taskTitle.trim()) return null;

  const features: { key: AIFeature; label: string; labelKo: string; icon: React.ReactNode }[] = [
    { key: "decompose", label: "Decompose", labelKo: "업무 분해", icon: <Layers size={14} /> },
    { key: "describe", label: "Description", labelKo: "설명 작성", icon: <AlignLeft size={14} /> },
    { key: "recommend", label: "Recommend", labelKo: "추천", icon: <Flag size={14} /> },
    { key: "resources", label: "Resources", labelKo: "관련 자료", icon: <Link2 size={14} /> },
  ];

  return (
    <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/40 overflow-hidden">
      {/* Header bar */}
      <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-blue-600">
          <Sparkles size={15} />
          <span className="text-xs font-bold">{ko ? "AI 어시스턴트" : "AI Assistant"}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {features.map(f => (
            <button
              key={f.key}
              onClick={() => handleFeatureClick(f.key)}
              disabled={isLoading && activeFeature !== f.key}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                activeFeature === f.key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white/80 text-gray-600 hover:bg-white hover:text-blue-600 border border-gray-200/60",
                isLoading && activeFeature !== f.key && "opacity-50 cursor-not-allowed"
              )}
            >
              {f.icon}
              {ko ? f.labelKo : f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Result panel */}
      <AnimatePresence>
        {activeFeature && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-blue-100/60">
              {isLoading ? (
                <div className="flex items-center gap-2 py-6 justify-center text-blue-500">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm font-medium">{ko ? "AI가 분석 중..." : "AI is analyzing..."}</span>
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 py-4 text-red-500">
                  <AlertTriangle size={16} />
                  <span className="text-sm">{error}</span>
                  <button onClick={() => handleFeatureClick(activeFeature)} className="ml-auto text-xs text-blue-600 hover:underline">
                    {ko ? "재시도" : "Retry"}
                  </button>
                </div>
              ) : (
                <>
                  {/* ── Decompose Results ── */}
                  {activeFeature === "decompose" && subtasks && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-gray-500 mb-2">
                        {ko ? `${subtasks.length}개의 하위 작업을 생성했습니다. 추가할 항목을 선택하세요.` : `Generated ${subtasks.length} subtasks. Select items to add.`}
                      </p>
                      {subtasks.map((s, i) => (
                        <div key={i} className="flex items-center gap-3 bg-white/70 rounded-lg px-3 py-2">
                          <button onClick={() => toggleSubtask(i)} className={cn(
                            "shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
                            s.checked ? "bg-blue-600 border-blue-600" : "border-gray-300"
                          )}>
                            {s.checked && <Check size={10} className="text-white" strokeWidth={3} />}
                          </button>
                          <span className="flex-1 text-sm text-gray-700">{ko ? s.title : s.titleEn}</span>
                          <span className="text-[10px] text-gray-400">{s.estimatedMinutes}min</span>
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded",
                            s.priority === "high" ? "bg-red-50 text-red-600" :
                            s.priority === "medium" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                          )}>
                            {s.priority}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => handleFeatureClick("decompose")} className="px-3 py-1.5 text-xs text-gray-500 hover:bg-white rounded-lg">
                          <RefreshCw size={12} className="inline mr-1" />{ko ? "재생성" : "Regenerate"}
                        </button>
                        <button
                          onClick={() => { onAddSubtasks(subtasks.filter(s => s.checked)); setActiveFeature(null); }}
                          disabled={!subtasks.some(s => s.checked)}
                          className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {ko ? "추가하기" : "Add"} ({subtasks.filter(s => s.checked).length})
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Description Results ── */}
                  {activeFeature === "describe" && generatedDesc && (
                    <div className="space-y-3">
                      {taskDescription && (
                        <p className="text-[11px] text-amber-600 bg-amber-50 px-2 py-1 rounded">
                          {ko ? "⚠ 기존 설명을 대체합니다" : "⚠ Will replace existing description"}
                        </p>
                      )}
                      <div className="bg-white/70 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-[200px] overflow-y-auto leading-relaxed">
                        {generatedDesc}
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleFeatureClick("describe")} className="px-3 py-1.5 text-xs text-gray-500 hover:bg-white rounded-lg">
                          <RefreshCw size={12} className="inline mr-1" />{ko ? "재생성" : "Regenerate"}
                        </button>
                        <button
                          onClick={() => { onApplyDescription(generatedDesc); setActiveFeature(null); }}
                          className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          {ko ? "적용하기" : "Apply"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Recommendation Results ── */}
                  {activeFeature === "recommend" && recommendation && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Priority badge */}
                        <div className="bg-white/70 rounded-lg px-3 py-2 flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 uppercase font-bold">{ko ? "우선순위" : "Priority"}</span>
                          <span className={cn(
                            "text-xs font-bold px-2 py-0.5 rounded-md",
                            recommendation.priority === "high" ? "bg-red-50 text-red-600" :
                            recommendation.priority === "medium" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                          )}>
                            {PRIORITY_CONFIG[recommendation.priority as TaskPriority]
                              ? (ko ? PRIORITY_CONFIG[recommendation.priority as TaskPriority].labelKo : PRIORITY_CONFIG[recommendation.priority as TaskPriority].label)
                              : recommendation.priority}
                          </span>
                        </div>
                        {/* Category badge */}
                        {recommendation.category && TASK_CATEGORY_CONFIG[recommendation.category as TaskCategory] && (
                          <div className="bg-white/70 rounded-lg px-3 py-2 flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 uppercase font-bold">{ko ? "카테고리" : "Category"}</span>
                            <span className={cn(
                              "text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1",
                              TASK_CATEGORY_CONFIG[recommendation.category as TaskCategory].bg,
                              TASK_CATEGORY_CONFIG[recommendation.category as TaskCategory].color
                            )}>
                              {TASK_CATEGORY_CONFIG[recommendation.category as TaskCategory].icon}
                              {ko ? TASK_CATEGORY_CONFIG[recommendation.category as TaskCategory].labelKo : TASK_CATEGORY_CONFIG[recommendation.category as TaskCategory].label}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 bg-white/50 rounded-lg px-3 py-2 leading-relaxed">{recommendation.reasoning}</p>
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            onApplyPriority(recommendation.priority);
                            if (recommendation.category) onApplyCategory(recommendation.category);
                            setActiveFeature(null);
                          }}
                          className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          {ko ? "적용하기" : "Apply"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Resources Results ── */}
                  {activeFeature === "resources" && (
                    <div className="space-y-3">
                      {/* Library matches */}
                      <div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
                          <BookOpen size={12} /> {ko ? "내 아카이브" : "My Archive"} ({libraryMatches.length})
                        </p>
                        {libraryMatches.length === 0 ? (
                          <p className="text-xs text-gray-400 italic px-1">{ko ? "매칭되는 자료가 없습니다" : "No matching resources"}</p>
                        ) : (
                          <div className="space-y-1">
                            {libraryMatches.map(item => (
                              <a
                                key={item.id}
                                href={item.type === "url" ? item.url : `/library/${item.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-white/70 rounded-lg px-3 py-2 hover:bg-white transition-colors group"
                              >
                                {item.type === "url" ? <Globe size={14} className="text-blue-500 shrink-0" /> : <FileText size={14} className="text-violet-500 shrink-0" />}
                                <span className="flex-1 text-sm text-gray-700 truncate">{item.title}</span>
                                {item.tags && item.tags.length > 0 && (
                                  <span className="text-[10px] text-gray-400 truncate max-w-[100px]">{item.tags.slice(0, 2).join(", ")}</span>
                                )}
                                <ExternalLink size={12} className="text-gray-300 group-hover:text-blue-500 shrink-0" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* External search toggle */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => setExternalSearchEnabled(!externalSearchEnabled)}
                          className={cn(
                            "relative w-9 h-5 rounded-full transition-colors",
                            externalSearchEnabled ? "bg-blue-600" : "bg-gray-300"
                          )}
                        >
                          <div className={cn(
                            "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                            externalSearchEnabled ? "translate-x-4" : "translate-x-0.5"
                          )} />
                        </button>
                        <span className="text-xs text-gray-500">{ko ? "외부 검색 포함" : "Include external search"}</span>
                        {externalLoading && <Loader2 size={14} className="animate-spin text-blue-500" />}
                      </div>

                      {/* External results */}
                      {externalSearchEnabled && externalResources.length > 0 && (
                        <div>
                          <p className="text-[11px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
                            <Globe size={12} /> {ko ? "외부 추천 자료" : "External Resources"} ({externalResources.length})
                          </p>
                          <div className="space-y-1">
                            {externalResources.map((r, i) => (
                              <div key={i} className="bg-white/70 rounded-lg px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase",
                                    r.type === "tool" ? "bg-emerald-50 text-emerald-600" :
                                    r.type === "template" ? "bg-purple-50 text-purple-600" :
                                    r.type === "reference" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                                  )}>{r.type}</span>
                                  {r.suggestedUrl ? (
                                    <a href={r.suggestedUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline truncate">{r.title}</a>
                                  ) : (
                                    <span className="text-sm font-medium text-gray-700 truncate">{r.title}</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Task Detail Page ────────────────────────────────────────────
export function TaskDetailPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const { getTask, addTask, updateTask, removeTask } = useTaskContext();
  const { can, currentUser } = usePermission();

  const isNew = taskId === "new";
  const task = isNew ? null : getTask(taskId || "");

  // Permission Checks
  const isMyTask = task?.assigneeIds?.includes(currentUser.id) || isNew;
  const canEdit = can("task.editAny") || (isMyTask && can("task.editOwn"));
  const canDelete = can("task.deleteAny") || (isMyTask && can("task.deleteOwn"));

  // Form State
  const [title, setTitle] = useState(task ? (language === "ko" ? task.titleKo || task.title : task.title) : "");
  const [description, setDescription] = useState(task?.description || "");
  const [status, setStatus] = useState<TaskStatus>((task?.status as TaskStatus) || "pending");
  const [priority, setPriority] = useState<TaskPriority>((task?.priority as TaskPriority) || "medium");
  const [assigneeIds, setAssigneeIds] = useState(task?.assigneeIds || [currentUser.id]);
  const [dateStart, setDateStart] = useState<Date | null>(task?.startDate ? new Date(task.startDate) : new Date());
  const [dateEnd, setDateEnd] = useState<Date | null>(task?.endDate ? new Date(task.endDate) : null);
  const [estTime, setEstTime] = useState(task?.estimatedTime || 0);
  const [category, setCategory] = useState<TaskCategory | undefined>(
    task?.category && TASK_CATEGORY_CONFIG[task.category] ? task.category : undefined
  );
  const [propsExpanded, setPropsExpanded] = useState(true);

  // Sync to context on change
  useEffect(() => {
    if (!isNew && taskId) {
      updateTask(taskId, {
        title, titleKo: title, description, status, priority, assigneeIds,
        startDate: dateStart ?? undefined, endDate: dateEnd ?? undefined,
        estimatedTime: estTime, category,
      });
    }
  }, [title, description, status, priority, assigneeIds, dateStart, dateEnd, estTime, category]);

  const handleDelete = () => {
    if (confirm(language === "ko" ? "정말 삭제하시겠습니까?" : "Are you sure you want to delete?")) {
      removeTask(taskId!);
      navigate(-1);
    }
  };

  // AI: add subtasks
  const handleAddSubtasks = useCallback((subtasks: SubtaskResult[]) => {
    const newIds: string[] = [];
    for (const s of subtasks) {
      const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      newIds.push(id);
      addTask({
        id,
        title: s.titleEn,
        titleKo: s.title,
        status: "pending",
        progress: 0,
        priority: s.priority as any,
        parentId: taskId!,
        estimatedTime: s.estimatedMinutes,
        assigneeIds: [currentUser.id],
      } as Task);
    }
    // Update parent's children array
    const current = getTask(taskId!)?.children || [];
    updateTask(taskId!, { children: [...current, ...newIds] });
  }, [taskId, addTask, updateTask, getTask, currentUser.id]);

  return (
    <div className="h-full overflow-y-auto bg-white scrollbar-hide">
      <div className="max-w-6xl mx-auto py-4 sm:py-7 px-4 sm:px-8 pb-32">
        
        {/* Navigation & Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors text-sm group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            {language === "ko" ? "돌아가기" : "Back"}
          </button>
          <div className="flex items-center gap-2">
            {canDelete && (
              <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div className="max-w-3xl">
          
          {/* Title & Description */}
          <div className="space-y-6">
            <div>
              <InlineText 
                value={title} onChange={setTitle} readOnly={!canEdit}
                placeholder={language === "ko" ? "태스크 제목" : "Task Title"}
                className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight tracking-tight focus:ring-0 focus:bg-transparent hover:bg-transparent border-b-2 border-transparent focus:border-gray-200 rounded-none pb-0.5"
                as="h1"
              />
            </div>

            {/* Properties — collapsible, notion style */}
            <div className="bg-gray-50/50 rounded-2xl border border-gray-100 overflow-hidden">
              <button
                onClick={() => setPropsExpanded(p => !p)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-100/50 transition-colors"
              >
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Layout size={12} />
                  {language === 'ko' ? '속성' : 'Properties'}
                </span>
                <div className="flex items-center gap-2">
                  {!propsExpanded && (
                    <div className="flex items-center gap-1.5">
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", STATUS_CONFIG[status].bg, STATUS_CONFIG[status].color)}>
                        {language === 'ko' ? STATUS_CONFIG[status].labelKo : STATUS_CONFIG[status].label}
                      </span>
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", PRIORITY_CONFIG[priority].bg, PRIORITY_CONFIG[priority].color)}>
                        {language === 'ko' ? PRIORITY_CONFIG[priority].labelKo : PRIORITY_CONFIG[priority].label}
                      </span>
                      {category && TASK_CATEGORY_CONFIG[category] && (
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5", TASK_CATEGORY_CONFIG[category].bg, TASK_CATEGORY_CONFIG[category].color)}>
                          {TASK_CATEGORY_CONFIG[category].icon}
                          {language === 'ko' ? TASK_CATEGORY_CONFIG[category].labelKo : TASK_CATEGORY_CONFIG[category].label}
                        </span>
                      )}
                    </div>
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
              <PropertyItem icon={<Clock size={14} />} label={language === "ko" ? "상태" : "Status"}>
                <InlineDropdown 
                  value={status} options={["pending", "in-progress", "completed"] as TaskStatus[]}
                  onChange={setStatus} disabled={!canEdit}
                  renderValue={(v) => {
                    const cfg = STATUS_CONFIG[v];
                    return <span className={cn("flex items-center gap-1.5 font-bold", cfg.color)}>{cfg.icon} {language === "ko" ? cfg.labelKo : cfg.label}</span>;
                  }}
                  renderOption={(o) => <span className={cn("flex items-center gap-2", STATUS_CONFIG[o].color)}>{STATUS_CONFIG[o].icon} {language === "ko" ? STATUS_CONFIG[o].labelKo : STATUS_CONFIG[o].label}</span>}
                />
              </PropertyItem>

              <PropertyItem icon={<Flag size={14} />} label={language === "ko" ? "우선순위" : "Priority"}>
                <InlineDropdown 
                  value={priority} options={["low", "medium", "high"] as TaskPriority[]}
                  onChange={setPriority} disabled={!canEdit}
                  renderValue={(v) => <span className={cn("px-2 py-0.5 rounded-md font-bold", PRIORITY_CONFIG[v].bg, PRIORITY_CONFIG[v].color)}>{language === "ko" ? PRIORITY_CONFIG[v].labelKo : PRIORITY_CONFIG[v].label}</span>}
                  renderOption={(o) => <span className={PRIORITY_CONFIG[o].color}>{language === "ko" ? PRIORITY_CONFIG[o].labelKo : PRIORITY_CONFIG[o].label}</span>}
                />
              </PropertyItem>

              <PropertyItem icon={<Tag size={14} />} label={language === "ko" ? "카테고리" : "Category"}>
                <InlineDropdown
                  value={category || ''}
                  options={['', ...Object.keys(TASK_CATEGORY_CONFIG)] as string[]}
                  onChange={(v) => setCategory(v ? v as TaskCategory : undefined)}
                  disabled={!canEdit}
                  renderValue={(v) => {
                    if (!v || !TASK_CATEGORY_CONFIG[v as TaskCategory]) return <span className="text-sm text-gray-400">{language === "ko" ? "미설정" : "Not set"}</span>;
                    const cfg = TASK_CATEGORY_CONFIG[v as TaskCategory];
                    return <span className={cn("flex items-center gap-1.5 font-bold text-sm", cfg.color)}>{cfg.icon} {language === "ko" ? cfg.labelKo : cfg.label}</span>;
                  }}
                  renderOption={(o) => {
                    if (!o || !TASK_CATEGORY_CONFIG[o as TaskCategory]) return <span className="text-gray-400">{language === "ko" ? "없음" : "None"}</span>;
                    const cfg = TASK_CATEGORY_CONFIG[o as TaskCategory];
                    return <span className={cn("flex items-center gap-2", cfg.color)}>{cfg.icon} {language === "ko" ? cfg.labelKo : cfg.label}</span>;
                  }}
                />
              </PropertyItem>

              <PropertyItem icon={<UserIcon size={14} />} label={language === "ko" ? "참여자" : "Participants"}>
                <MultiAssigneePicker selectedIds={assigneeIds} onChange={setAssigneeIds} language={language} disabled={!canEdit} />
              </PropertyItem>

              <PropertyItem icon={<Calendar size={14} />} label={language === "ko" ? "마감기한" : "Deadline"}>
                <NotionDateRangePicker startDate={dateStart} endDate={dateEnd} onChange={(s, e) => { setDateStart(s); setDateEnd(e); }} language={language} />
              </PropertyItem>

              <PropertyItem icon={<Timer size={14} />} label={language === "ko" ? "예상 시간" : "Est. Time"}>
                <EstimatedTimeEditor language={language} value={estTime} onChange={setEstTime} disabled={!canEdit} />
              </PropertyItem>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sub-tasks with checkboxes */}
            {!isNew && <SubTaskSection taskId={taskId!} language={language} canEdit={canEdit} />}

            {/* AI Assistance Bar */}
            {!isNew && canEdit && (
              <TaskAIBar
                taskTitle={title}
                taskDescription={description}
                taskCategory={category}
                taskPriority={priority}
                taskId={taskId!}
                language={language}
                canEdit={canEdit}
                onAddSubtasks={handleAddSubtasks}
                onApplyDescription={setDescription}
                onApplyPriority={(p) => setPriority(p as TaskPriority)}
                onApplyCategory={(c) => setCategory(c as TaskCategory)}
              />
            )}

            {/* Description / Editor — no header label */}
            <div className="min-h-[200px] border-t border-gray-100 pt-5">
              <NotionBlockEditor 
                initialContent={description} 
                onChange={setDescription} 
                readOnly={!canEdit}
                placeholder={language === "ko" ? "내용을 입력하세요..." : "Type something..."}
              />
            </div>

            {/* ActivityLogSection — 필요 시 주석 해제하여 사용 */}
            {/* {!isNew && <ActivityLogSection taskId={taskId!} language={language} />} */}
          </div>

          {/* Right Column: removed - AI assistant and meta info not needed on detail page */}
        </div>
      </div>
    </div>
  );
}

function PropertyItem({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50/80 transition-colors group">
      <div className="flex items-center gap-2 w-[110px] shrink-0 text-gray-400 font-medium text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}