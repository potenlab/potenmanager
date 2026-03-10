import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
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
  Zap,
  History,
  Maximize2,
  Minimize2,
  Square,
  Tag,
  Trash2,
  Copy,
  DollarSign,
  Upload,
  File as FileIcon,
  FolderKanban,
  Calculator,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Task, TaskCategory, Attachment } from "../../lib/mockData";
import { loadCards as loadMgmtCards, BoardType } from "./ManagementPage";
import { api } from "../../lib/api";
import { TASK_CATEGORY_CONFIG } from "../../lib/jobRoles";
import { useLanguage } from "../context/LanguageContext";
import { useTaskContext } from "../context/TaskContext";
import { usePermission } from "../context/PermissionContext";
import { NotionBlockEditor } from "../components/NotionBlockEditor";
import { DateTimeProperty } from "../components/detail/DateTimeProperty";
import { InlineText } from "../components/detail/InlineText";
import { InlineDropdown } from "../components/detail/InlineDropdown";
import { AutoProperties } from "../components/detail/AutoProperties";
import type { PropertyFieldConfig } from "../components/detail/PropertyConfig";
import { usePortalPosition } from "../hooks/usePortalPosition";
import { DetailPageShell } from "../components/detail/DetailPageShell";
import { AttachmentSection, getAttachmentIcon } from "../components/detail/AttachmentSection";
import { UrlPreviewSection } from "../components/detail/UrlPreviewCard";
import { EmojiPicker } from "../components/EmojiPicker";

type TaskStatus = "pending" | "in-progress" | "completed" | "routine";
type TaskPriority = "low" | "medium" | "high" | "delayed";

const STATUS_CONFIG: Record<TaskStatus, { label: string; labelKo: string; icon: React.ReactNode; color: string; bg: string }> = {
  pending: { label: "To Do", labelKo: "할 일", icon: <Circle size={14} />, color: "text-gray-500", bg: "bg-gray-100" },
  "in-progress": { label: "In Progress", labelKo: "진행 중", icon: <CircleDot size={14} />, color: "text-blue-600", bg: "bg-blue-50" },
  routine: { label: "Routine", labelKo: "루틴", icon: <Clock size={14} />, color: "text-purple-600", bg: "bg-purple-50" },
  completed: { label: "Done", labelKo: "완료", icon: <CheckCircle2 size={14} />, color: "text-emerald-600", bg: "bg-emerald-50" },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; labelKo: string; color: string; bg: string }> = {
  low: { label: "Low", labelKo: "낮음", color: "text-blue-600", bg: "bg-blue-50" },
  medium: { label: "Medium", labelKo: "보통", color: "text-green-600", bg: "bg-green-50" },
  high: { label: "High", labelKo: "높음", color: "text-red-600", bg: "bg-red-50" },
  delayed: { label: "Delayed", labelKo: "지연", color: "text-orange-600", bg: "bg-orange-50" },
};


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


// SubtaskResult type (used by TaskDetailPage for AI callback)
interface SubtaskResult { title: string; titleEn: string; estimatedMinutes: number; priority: string; checked: boolean; }

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
  const [dateStart, setDateStart] = useState<Date | null>(
    task
      ? (task.startDate ? new Date(task.startDate) : task.dueDate ? new Date(task.dueDate) : null)
      : new Date()
  );
  const [dateEnd, setDateEnd] = useState<Date | null>(
    task
      ? (task.endDate ? new Date(task.endDate) : (task.startDate && task.dueDate ? new Date(task.dueDate) : null))
      : null
  );
  const [estTime, setEstTime] = useState(task?.estimatedTime || 0);
  const [category, setCategory] = useState<TaskCategory | undefined>(
    task?.category && TASK_CATEGORY_CONFIG[task.category] ? task.category : undefined
  );
  const [linkedBoard, setLinkedBoard] = useState<BoardType | undefined>(task?.linkedBoard);
  const [linkedCardId, setLinkedCardId] = useState<string | undefined>(task?.linkedCardId);
  const [emoji, setEmoji] = useState<string | undefined>(task?.emoji);
  const [attachments, setAttachments] = useState<Attachment[]>(task?.attachments || []);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileDrop = useCallback(async (files: FileList) => {
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const ko = language === "ko";
    const toUpload = Array.from(files).filter((file) => {
      if (file.size > MAX_SIZE) {
        alert(ko ? `${file.name}: 5MB 이하 파일만 첨부 가능합니다` : `${file.name}: Max 5MB`);
        return false;
      }
      return true;
    });
    if (toUpload.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of toUpload) {
        const result = await api.uploadFile(file);
        const att: Attachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          url: result.url,
          title: file.name,
          fileName: result.fileName,
          fileSize: result.fileSize,
          addedAt: new Date().toISOString(),
          type: 'file',
        };
        setAttachments((prev) => [...prev, att]);
      }
    } catch (e) {
      console.error("File upload error:", e);
      alert(ko ? "파일 업로드에 실패했습니다" : "File upload failed");
    } finally {
      setIsUploading(false);
    }
  }, [language]);

  // Sync to context on change
  useEffect(() => {
    if (!isNew && taskId) {
      updateTask(taskId, {
        title, titleKo: title, description, status, priority, assigneeIds,
        startDate: dateStart ?? undefined, endDate: dateEnd ?? undefined,
        dueDate: dateEnd ?? dateStart ?? undefined,
        estimatedTime: estTime, category, attachments,
        linkedBoard, linkedCardId, emoji,
      });
    }
  }, [title, description, status, priority, assigneeIds, dateStart, dateEnd, estTime, category, attachments, linkedBoard, linkedCardId, emoji]);

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
    <DetailPageShell
      shareType="task"
      itemId={task?.id || ""}
      currentUserId={currentUser.id}
      backPath="/tasks"
      backLabel={language === "ko" ? "내 업무" : "My Tasks"}
      breadcrumbs={[{ label: title || (language === "ko" ? "새 업무" : "New Task") }]}
      onDelete={canDelete ? handleDelete : undefined}
      collapsible={true}
      defaultExpanded={true}
      titlePrefix={
        <EmojiPicker value={emoji} onChange={setEmoji} size="lg" />
      }
      title={
        <div>
          <InlineText
            value={title} onChange={setTitle} readOnly={!canEdit}
            placeholder={language === "ko" ? "태스크 제목" : "Task Title"}
            className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight tracking-tight focus:ring-0 focus:bg-transparent hover:bg-transparent border-b-2 border-transparent focus:border-gray-200 rounded-none pb-0.5"
            as="h1"
          />
        </div>
      }
      properties={
        <AutoProperties fields={[
          {
            key: "status",
            type: "dropdown",
            icon: <Clock size={14} />,
            label: language === "ko" ? "상태" : "Status",
            value: status,
            options: ["pending", "in-progress", "routine", "completed"],
            onChange: setStatus,
            disabled: !canEdit,
            renderValue: (v: string) => {
              const cfg = STATUS_CONFIG[v as TaskStatus];
              return <span className={cn("flex items-center gap-1.5 font-bold", cfg.color)}>{cfg.icon} {language === "ko" ? cfg.labelKo : cfg.label}</span>;
            },
            renderOption: (o: string) => {
              const cfg = STATUS_CONFIG[o as TaskStatus];
              return <span className={cn("flex items-center gap-2", cfg.color)}>{cfg.icon} {language === "ko" ? cfg.labelKo : cfg.label}</span>;
            },
          },
          {
            key: "priority",
            type: "dropdown",
            icon: <Flag size={14} />,
            label: language === "ko" ? "우선순위" : "Priority",
            value: priority,
            options: ["low", "medium", "high", "delayed"],
            onChange: setPriority,
            disabled: !canEdit,
            renderValue: (v: string) => <span className={cn("px-2 py-0.5 rounded-md font-bold", PRIORITY_CONFIG[v as TaskPriority].bg, PRIORITY_CONFIG[v as TaskPriority].color)}>{language === "ko" ? PRIORITY_CONFIG[v as TaskPriority].labelKo : PRIORITY_CONFIG[v as TaskPriority].label}</span>,
            renderOption: (o: string) => <span className={PRIORITY_CONFIG[o as TaskPriority].color}>{language === "ko" ? PRIORITY_CONFIG[o as TaskPriority].labelKo : PRIORITY_CONFIG[o as TaskPriority].label}</span>,
          },
          {
            key: "category",
            type: "dropdown",
            icon: <Tag size={14} />,
            label: language === "ko" ? "카테고리" : "Category",
            value: category || '',
            options: ['', ...Object.keys(TASK_CATEGORY_CONFIG)],
            onChange: (v: string) => setCategory(v ? v as TaskCategory : undefined),
            disabled: !canEdit,
            renderValue: (v: string) => {
              if (!v || !TASK_CATEGORY_CONFIG[v as TaskCategory]) return <span className="text-sm text-gray-400">{language === "ko" ? "미설정" : "Not set"}</span>;
              const cfg = TASK_CATEGORY_CONFIG[v as TaskCategory];
              return <span className={cn("flex items-center gap-1.5 font-bold text-sm", cfg.color)}>{cfg.icon} {language === "ko" ? cfg.labelKo : cfg.label}</span>;
            },
            renderOption: (o: string) => {
              if (!o || !TASK_CATEGORY_CONFIG[o as TaskCategory]) return <span className="text-gray-400">{language === "ko" ? "없음" : "None"}</span>;
              const cfg = TASK_CATEGORY_CONFIG[o as TaskCategory];
              return <span className={cn("flex items-center gap-2", cfg.color)}>{cfg.icon} {language === "ko" ? cfg.labelKo : cfg.label}</span>;
            },
          },
          {
            key: "linkedBoard",
            type: "custom",
            icon: <FolderKanban size={14} />,
            label: language === "ko" ? "업무 유형" : "Linked Board",
            render: () => (
              <LinkedBoardPicker
                linkedBoard={linkedBoard}
                linkedCardId={linkedCardId}
                onChange={(board, cardId) => { setLinkedBoard(board); setLinkedCardId(cardId); }}
                language={language}
                disabled={!canEdit}
              />
            ),
          },
          {
            key: "assignees",
            type: "custom",
            icon: <UserIcon size={14} />,
            label: language === "ko" ? "참여자" : "Participants",
            render: () => <MultiAssigneePicker selectedIds={assigneeIds} onChange={setAssigneeIds} language={language} disabled={!canEdit} />,
          },
          {
            key: "datetime",
            type: "custom",
            icon: <Calendar size={14} />,
            label: language === "ko" ? "일시" : "Date & Time",
            render: () => (
              <DateTimeProperty
                startDate={dateStart}
                endDate={dateEnd}
                onDateChange={(s, e) => { setDateStart(s); setDateEnd(e); }}
                language={language}
                defaultShowTime={false}
              />
            ),
          },
          {
            key: "estTime",
            type: "custom",
            icon: <Timer size={14} />,
            label: language === "ko" ? "예상 시간" : "Est. Time",
            render: () => <EstimatedTimeEditor language={language} value={estTime} onChange={setEstTime} disabled={!canEdit} />,
          },
        ] as PropertyFieldConfig[]} />
      }
      collapsedPreview={
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
      }
    >
      {/* Sub-tasks with checkboxes */}
      {!isNew && <SubTaskSection taskId={taskId!} language={language} canEdit={canEdit} />}

      {/* Category-specific Helpers */}
      {!isNew && canEdit && category && (
        <CategoryHelpers category={category} language={language} onInsertToDescription={(text) => {
          setDescription((prev) => prev ? `${prev}\n\n${text}` : text);
        }} />
      )}

      {/* Description / Editor + Drop zone */}
      <div
        className={cn(
          "min-h-[200px] border-t border-gray-100 pt-5 relative transition-colors",
          isDragOver && "bg-blue-50/50 ring-2 ring-blue-200 ring-dashed rounded-xl"
        )}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.types.includes("Files")) setIsDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
        onDrop={(e) => {
          e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
          if (e.dataTransfer.files.length > 0) handleFileDrop(e.dataTransfer.files);
        }}
      >
        {(isDragOver || isUploading) && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-xl shadow-lg">
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {isUploading
                ? (language === "ko" ? "업로드 중..." : "Uploading...")
                : (language === "ko" ? "파일을 놓아주세요 (최대 5MB)" : "Drop files here (max 5MB)")}
            </div>
          </div>
        )}
        <NotionBlockEditor
          initialContent={description}
          onChange={setDescription}
          readOnly={!canEdit}
          placeholder={language === "ko" ? "/ 를 입력하여 블록 유형 선택..." : "Type / to select block type..."}
          language={language}
          parentType="task"
          parentId={taskId}
        />

        {/* URL previews auto-detected from content */}
        <UrlPreviewSection content={description} language={language} />

        {/* Inline attached files */}
        {attachments.length > 0 && (
          <div className="mt-4 space-y-1">
            {attachments.map((att) => {
              const isFile = att.type === 'file';
              const { icon, color, bg } = isFile
                ? { icon: <FileIcon size={14} />, color: 'text-gray-600', bg: 'bg-gray-100' }
                : getAttachmentIcon(att.type);
              const sizeStr = att.fileSize ? (att.fileSize < 1024 ? `${att.fileSize}B` : att.fileSize < 1048576 ? `${(att.fileSize / 1024).toFixed(0)}KB` : `${(att.fileSize / 1048576).toFixed(1)}MB`) : '';
              return (
                <div key={att.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors group">
                  <div className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0", bg)}>
                    <span className={color}>{icon}</span>
                  </div>
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={att.fileName}
                    className="flex-1 text-[13px] text-gray-600 hover:text-blue-600 truncate transition-colors"
                  >
                    {att.title}
                  </a>
                  {sizeStr && <span className="text-[10px] text-gray-300 shrink-0">{sizeStr}</span>}
                  {canEdit && (
                    <button
                      onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ActivityLogSection — 필요 시 주석 해제하여 사용 */}
      {/* {!isNew && <ActivityLogSection taskId={taskId!} language={language} />} */}
    </DetailPageShell>
  );
}

// ─── Linked Board Picker ────────────────────────────────────────────
function LinkedBoardPicker({
  linkedBoard, linkedCardId, onChange, language, disabled,
}: {
  linkedBoard?: BoardType;
  linkedCardId?: string;
  onChange: (board?: BoardType, cardId?: string) => void;
  language: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const ko = language === 'ko';

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t)) return;
      if (popupRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const projectCards = useMemo(() => loadMgmtCards('projects'), [open]);
  const brandingCards = useMemo(() => loadMgmtCards('branding'), [open]);

  const selectedCard = linkedBoard && linkedCardId
    ? (linkedBoard === 'projects' ? projectCards : brandingCards).find(c => c.id === linkedCardId)
    : null;

  const boardLabel = (b: BoardType) => b === 'projects' ? (ko ? '프로젝트' : 'Project') : (ko ? '브랜딩' : 'Branding');

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const pos = usePortalPosition(open, triggerRef);

  return (
    <div ref={ref}>
      <button
        ref={triggerRef}
        onClick={() => !disabled && setOpen(!open)}
        className={cn(
          "text-sm transition-colors flex items-center gap-1.5 px-2 py-1 rounded-md",
          disabled ? "cursor-default" : "hover:bg-gray-100 cursor-pointer",
          selectedCard ? "text-gray-800 font-medium" : "text-gray-400"
        )}
      >
        {selectedCard ? (
          <>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-bold",
              linkedBoard === 'projects' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'
            )}>
              {boardLabel(linkedBoard!)}
            </span>
            {selectedCard.title}
          </>
        ) : (
          <span>{ko ? '미설정' : 'Not set'}</span>
        )}
        {!disabled && <ChevronDown size={12} className="text-gray-400" />}
      </button>

      {open && pos && createPortal(
        <div ref={popupRef} className="fixed bg-white border border-gray-200 rounded-xl shadow-xl z-[9999] min-w-[240px] max-h-[320px] overflow-y-auto py-1"
          style={{ top: pos.top, left: pos.left }}>
          {/* Clear option */}
          <button
            onClick={() => { onChange(undefined, undefined); setOpen(false); }}
            className="w-full px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 text-left"
          >
            {ko ? '없음' : 'None'}
          </button>
          <div className="mx-2 my-1 border-t border-gray-100" />

          {/* Projects section */}
          <div className="px-3 py-1">
            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">
              {ko ? '프로젝트' : 'Projects'}
            </span>
          </div>
          {projectCards.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-gray-300">{ko ? '카드 없음' : 'No cards'}</div>
          ) : projectCards.map(card => (
            <button key={card.id}
              onClick={() => { onChange('projects', card.id); setOpen(false); }}
              className={cn("w-full px-3 py-2 text-xs text-left hover:bg-blue-50 flex items-center gap-2 transition-colors",
                linkedBoard === 'projects' && linkedCardId === card.id && "bg-blue-50 text-blue-700"
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
              <span className="truncate">{card.title}</span>
              {linkedBoard === 'projects' && linkedCardId === card.id && <Check size={12} className="ml-auto text-blue-600 shrink-0" />}
            </button>
          ))}

          <div className="mx-2 my-1 border-t border-gray-100" />

          {/* Branding section */}
          <div className="px-3 py-1">
            <span className="text-[10px] font-bold text-pink-500 uppercase tracking-wider">
              {ko ? '브랜딩' : 'Branding'}
            </span>
          </div>
          {brandingCards.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-gray-300">{ko ? '카드 없음' : 'No cards'}</div>
          ) : brandingCards.map(card => (
            <button key={card.id}
              onClick={() => { onChange('branding', card.id); setOpen(false); }}
              className={cn("w-full px-3 py-2 text-xs text-left hover:bg-pink-50 flex items-center gap-2 transition-colors",
                linkedBoard === 'branding' && linkedCardId === card.id && "bg-pink-50 text-pink-700"
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-pink-400 shrink-0" />
              <span className="truncate">{card.title}</span>
              {linkedBoard === 'branding' && linkedCardId === card.id && <Check size={12} className="ml-auto text-pink-600 shrink-0" />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Category-specific Helpers ──────────────────────────────────────
function CategoryHelpers({ category, language, onInsertToDescription }: {
  category: TaskCategory;
  language: string;
  onInsertToDescription: (text: string) => void;
}) {
  const ko = language === "ko";

  // Only show for categories that have helpers
  if (category === "sales") {
    return <QuoteCalculator language={language} onInsertToDescription={onInsertToDescription} />;
  }

  // Future: add helpers for other categories here
  return null;
}

// ─── Quote Calculator (견적산출) ────────────────────────────────────
interface QuoteLineItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

function QuoteCalculator({ language, onInsertToDescription }: {
  language: string;
  onInsertToDescription: (text: string) => void;
}) {
  const ko = language === "ko";
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<QuoteLineItem[]>([
    { id: "q1", name: "", quantity: 1, unitPrice: 0 },
  ]);
  const [includeVat, setIncludeVat] = useState(true);
  const [discount, setDiscount] = useState(0);
  const [copied, setCopied] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountAmount = Math.round(subtotal * (discount / 100));
  const afterDiscount = subtotal - discountAmount;
  const vatAmount = includeVat ? Math.round(afterDiscount * 0.1) : 0;
  const total = afterDiscount + vatAmount;

  const addItem = () => {
    setItems((prev) => [...prev, {
      id: `q${Date.now()}`,
      name: "",
      quantity: 1,
      unitPrice: 0,
    }]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.length > 1 ? prev.filter((item) => item.id !== id) : prev);
  };

  const updateItem = (id: string, field: keyof QuoteLineItem, value: string | number) => {
    setItems((prev) => prev.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const formatNumber = (n: number) => n.toLocaleString(ko ? "ko-KR" : "en-US");

  const generateQuoteText = () => {
    const lines: string[] = [];
    lines.push(ko ? "--- 견적서 ---" : "--- Quote ---");
    lines.push("");
    items.forEach((item, i) => {
      if (!item.name && item.unitPrice === 0) return;
      const itemName = item.name || `${ko ? "항목" : "Item"} ${i + 1}`;
      const itemTotal = item.quantity * item.unitPrice;
      lines.push(`${i + 1}. ${itemName}  |  ${item.quantity} x ${formatNumber(item.unitPrice)}${ko ? "원" : ""}  =  ${formatNumber(itemTotal)}${ko ? "원" : ""}`);
    });
    lines.push("");
    lines.push(`${ko ? "소계" : "Subtotal"}: ${formatNumber(subtotal)}${ko ? "원" : ""}`);
    if (discount > 0) {
      lines.push(`${ko ? "할인" : "Discount"} (${discount}%): -${formatNumber(discountAmount)}${ko ? "원" : ""}`);
    }
    if (includeVat) {
      lines.push(`${ko ? "부가세" : "VAT"} (10%): ${formatNumber(vatAmount)}${ko ? "원" : ""}`);
    }
    lines.push(`${ko ? "합계" : "Total"}: ${formatNumber(total)}${ko ? "원" : ""}`);
    return lines.join("\n");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateQuoteText());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleInsert = () => {
    onInsertToDescription(generateQuoteText());
  };

  return (
    <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50/80 to-teal-50/40 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-2 hover:bg-emerald-50/50 transition-colors"
      >
        <div className="flex items-center gap-1.5 text-emerald-600">
          <Calculator size={15} />
          <span className="text-xs font-bold">{ko ? "견적산출" : "Quote Calculator"}</span>
        </div>
        <span className="text-[10px] text-emerald-400 ml-1">
          {ko ? "영업 도우미" : "Sales Helper"}
        </span>
        <ChevronDown size={14} className={cn("ml-auto text-emerald-400 transition-transform duration-200", expanded && "rotate-180")} />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-emerald-100/60 space-y-3">
              {/* Column headers */}
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
                <span className="flex-1">{ko ? "항목명" : "Item"}</span>
                <span className="w-16 text-center">{ko ? "수량" : "Qty"}</span>
                <span className="w-28 text-center">{ko ? "단가" : "Unit Price"}</span>
                <span className="w-24 text-right">{ko ? "금액" : "Amount"}</span>
                <span className="w-7" />
              </div>

              {/* Line items */}
              {items.map((item, idx) => {
                const lineTotal = item.quantity * item.unitPrice;
                return (
                  <div key={item.id} className="flex items-center gap-2">
                    <input
                      value={item.name}
                      onChange={(e) => updateItem(item.id, "name", e.target.value)}
                      placeholder={`${ko ? "항목" : "Item"} ${idx + 1}`}
                      className="flex-1 text-sm bg-white/70 border border-gray-200/60 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 placeholder:text-gray-300"
                    />
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 text-sm text-center bg-white/70 border border-gray-200/60 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400"
                    />
                    <input
                      type="number"
                      min={0}
                      value={item.unitPrice || ""}
                      onChange={(e) => updateItem(item.id, "unitPrice", Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="0"
                      className="w-28 text-sm text-right bg-white/70 border border-gray-200/60 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 placeholder:text-gray-300"
                    />
                    <span className="w-24 text-sm text-right font-medium text-gray-700 tabular-nums">
                      {formatNumber(lineTotal)}
                    </span>
                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={items.length <= 1}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}

              {/* Add item button */}
              <button
                onClick={addItem}
                className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 px-1 py-1"
              >
                <Plus size={13} />
                {ko ? "항목 추가" : "Add Item"}
              </button>

              {/* Options: VAT & Discount */}
              <div className="flex items-center gap-4 pt-2 border-t border-emerald-100/60">
                <label className="flex items-center gap-2 cursor-pointer">
                  <button
                    onClick={() => setIncludeVat(!includeVat)}
                    className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
                      includeVat ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300"
                    )}
                  >
                    {includeVat && <Check size={10} />}
                  </button>
                  <span className="text-xs text-gray-600">{ko ? "부가세 (10%)" : "VAT (10%)"}</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">{ko ? "할인" : "Discount"}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={discount || ""}
                    onChange={(e) => setDiscount(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    placeholder="0"
                    className="w-14 text-xs text-center bg-white/70 border border-gray-200/60 rounded-md px-1.5 py-1 outline-none focus:ring-1 focus:ring-emerald-200 placeholder:text-gray-300"
                  />
                  <span className="text-xs text-gray-400">%</span>
                </div>
              </div>

              {/* Totals */}
              <div className="bg-white/60 rounded-xl border border-gray-100 p-3 space-y-1.5">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{ko ? "소계" : "Subtotal"}</span>
                  <span className="tabular-nums">{formatNumber(subtotal)}{ko ? "원" : ""}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-xs text-red-500">
                    <span>{ko ? "할인" : "Discount"} ({discount}%)</span>
                    <span className="tabular-nums">-{formatNumber(discountAmount)}{ko ? "원" : ""}</span>
                  </div>
                )}
                {includeVat && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{ko ? "부가세" : "VAT"} (10%)</span>
                    <span className="tabular-nums">{formatNumber(vatAmount)}{ko ? "원" : ""}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-1.5 border-t border-gray-100">
                  <span>{ko ? "합계" : "Total"}</span>
                  <span className="tabular-nums text-emerald-600">{formatNumber(total)}{ko ? "원" : ""}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white/80 border border-gray-200/60 rounded-lg hover:bg-white transition-colors"
                >
                  {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  {copied ? (ko ? "복사됨" : "Copied") : (ko ? "복사" : "Copy")}
                </button>
                <button
                  onClick={handleInsert}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <DollarSign size={12} />
                  {ko ? "설명에 삽입" : "Insert to Description"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

