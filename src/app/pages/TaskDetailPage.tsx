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
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Task, TaskCategory } from "../../lib/mockData";
import { TASK_CATEGORY_CONFIG } from "./TasksPage";
import { useLanguage } from "../context/LanguageContext";
import { useTaskContext } from "../context/TaskContext";
import { usePermission } from "../context/PermissionContext";
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

// ─── Main Task Detail Page ────────────────────────────────────────────
export function TaskDetailPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const { getTask, updateTask, removeTask } = useTaskContext();
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
  const [category, setCategory] = useState<TaskCategory | undefined>(task?.category);

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

            {/* Properties — one per row, notion style */}
            <div className="bg-gray-50/50 rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
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
                    if (!v) return <span className="text-sm text-gray-400">{language === "ko" ? "미설정" : "Not set"}</span>;
                    const cfg = TASK_CATEGORY_CONFIG[v as TaskCategory];
                    return <span className={cn("flex items-center gap-1.5 font-bold text-sm", cfg.color)}>{cfg.icon} {language === "ko" ? cfg.labelKo : cfg.label}</span>;
                  }}
                  renderOption={(o) => {
                    if (!o) return <span className="text-gray-400">{language === "ko" ? "없음" : "None"}</span>;
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

            {/* Sub-tasks with checkboxes */}
            {!isNew && <SubTaskSection taskId={taskId!} language={language} canEdit={canEdit} />}

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