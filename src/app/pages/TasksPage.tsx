import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useDrag, useDrop } from "react-dnd";
import {
  Plus,
  Search,
  MoreHorizontal,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  Circle,
  LayoutGrid,
  List as ListIcon,
  Sparkles,
  Trash2,
  X,
  Check,
  Zap,
  AlertTriangle,
  Banknote,
  TrendingUp,
  FileText,
  CalendarClock,
  Columns3,
  Columns4,
  DollarSign,
  PenTool,
  Video,
  Megaphone,
  Code,
  Palette,
  Lightbulb,
  Settings,
  BookOpen,
  Tag,
  ChevronDown,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Task, GoalItem, UrgentCategory, TaskCategory } from "../../lib/mockData";
import { useLanguage } from "../context/LanguageContext";
import { useTaskContext } from "../context/TaskContext";
import { useGoalContext } from "../context/GoalContext";
import { usePermission } from "../context/PermissionContext";
import { PermissionGate } from "../components/layout/PermissionGate";
import { differenceInDays, format } from "date-fns";
import { ko as koLocale } from "date-fns/locale";
import { TaskListView } from "../components/tasks/TaskListView";
import { TaskRecommendationPanel } from "../components/tasks/TaskRecommendationPanel";
import { useTrash } from "../context/TrashContext";

const DRAG_TYPE = "TASK_CARD";

interface DragItem {
  id: string;
  ids: string[];  // all selected task ids (includes id itself)
  status: Task['status'];
}

// ─── Urgent Category Config ────────────────────────────────────────
const CATEGORY_CONFIG: Record<UrgentCategory, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  funding: { icon: <Banknote size={14} />, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  investment: { icon: <TrendingUp size={14} />, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  contract: { icon: <FileText size={14} />, color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
  submission: { icon: <CalendarClock size={14} />, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  event: { icon: <CalendarIcon size={14} />, color: "text-pink-700", bg: "bg-pink-50", border: "border-pink-200" },
  other: { icon: <Zap size={14} />, color: "text-gray-700", bg: "bg-gray-50", border: "border-gray-200" },
};

// ─── Task Category Config ─────────────────────────────────────────
export const TASK_CATEGORY_CONFIG: Record<TaskCategory, {
  label: string; labelKo: string; icon: React.ReactNode; color: string; bg: string; border: string;
}> = {
  sales:           { label: "Sales",      labelKo: "영업",           icon: <DollarSign size={12} />, color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200" },
  content_writing: { label: "Content",    labelKo: "콘텐츠(글쓰기)", icon: <PenTool size={12} />,    color: "text-violet-700",  bg: "bg-violet-50",   border: "border-violet-200" },
  content_video:   { label: "Video",      labelKo: "콘텐츠(영상)",   icon: <Video size={12} />,      color: "text-pink-700",    bg: "bg-pink-50",     border: "border-pink-200" },
  marketing:       { label: "Marketing",  labelKo: "마케팅",         icon: <Megaphone size={12} />,  color: "text-orange-700",  bg: "bg-orange-50",   border: "border-orange-200" },
  development:     { label: "Dev",        labelKo: "개발",           icon: <Code size={12} />,       color: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-200" },
  design:          { label: "Design",     labelKo: "디자인",         icon: <Palette size={12} />,    color: "text-fuchsia-700", bg: "bg-fuchsia-50",  border: "border-fuchsia-200" },
  planning:        { label: "Planning",   labelKo: "기획",           icon: <Lightbulb size={12} />,  color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200" },
  operations:      { label: "Ops",        labelKo: "운영/관리",      icon: <Settings size={12} />,   color: "text-gray-700",    bg: "bg-gray-100",    border: "border-gray-200" },
  learning:        { label: "Learning",   labelKo: "학습",           icon: <BookOpen size={12} />,   color: "text-teal-700",    bg: "bg-teal-50",     border: "border-teal-200" },
};

// ─── D-Day Badge ────────────────────────────────────────────────────
function DDayBadge({ deadline, status }: { deadline: Date; status: string }) {
  const { t } = useLanguage();
  const now = new Date();
  const daysLeft = differenceInDays(deadline, now);

  if (status === 'completed') {
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
        <CheckCircle2 size={10} className="inline mr-0.5 -mt-0.5" />
        {t("status_completed" as any)}
      </span>
    );
  }
  if (daysLeft < 0) {
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-red-100 text-red-700 border border-red-200 animate-pulse">
        <AlertTriangle size={10} className="inline mr-0.5 -mt-0.5" />
        D+{Math.abs(daysLeft)}
      </span>
    );
  }
  if (daysLeft === 0) {
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-red-100 text-red-700 border border-red-200 animate-pulse">
        <Zap size={10} className="inline mr-0.5 -mt-0.5" />
        D-Day
      </span>
    );
  }
  if (daysLeft <= 3) {
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200">
        <Clock size={10} className="inline mr-0.5 -mt-0.5" />
        D-{daysLeft}
      </span>
    );
  }
  if (daysLeft <= 7) {
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
        D-{daysLeft}
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600 border border-gray-200">
      D-{daysLeft}
    </span>
  );
}

// ─── Urgent Goal Card (compact for column) ──────────────────────────
function UrgentGoalCard({ goal }: { goal: GoalItem }) {
  const { language, t } = useLanguage();
  const { members } = usePermission();
  const title = language === 'ko' ? goal.titleKo || goal.title : goal.title;
  const category = goal.urgentCategory || 'other';
  const catCfg = CATEGORY_CONFIG[category];
  const catLabel = t(`category_${category}` as any);
  const assignee = goal.assigneeId ? members.find(m => m.id === goal.assigneeId) : null;
  const daysLeft = goal.deadline ? differenceInDays(goal.deadline, new Date()) : null;
  const isOverdue = daysLeft !== null && daysLeft < 0 && goal.status !== 'completed';
  const isUrgentSoon = daysLeft !== null && daysLeft <= 3 && daysLeft >= 0 && goal.status !== 'completed';

  return (
    <Link
      to={`/organization/${goal.id}`}
      className={cn(
        "block bg-white rounded-xl border shadow-sm hover:shadow-md transition-all group relative",
        isOverdue ? "border-red-200 ring-1 ring-red-100" :
        isUrgentSoon ? "border-orange-200 ring-1 ring-orange-100" :
        goal.status === 'completed' ? "border-gray-200 opacity-70" :
        "border-gray-100"
      )}
    >
      <div className={cn(
        "h-1 w-full rounded-t-[10px]",
        isOverdue ? "bg-red-500" :
        isUrgentSoon ? "bg-gradient-to-r from-orange-400 to-red-400" :
        goal.status === 'completed' ? "bg-emerald-400" :
        "bg-gradient-to-r from-amber-400 to-orange-400"
      )} />

      <div className="p-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className={cn(
            "text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-wider flex items-center gap-0.5",
            catCfg.bg, catCfg.color, catCfg.border
          )}>
            {catCfg.icon}
            {catLabel}
          </span>
          {goal.deadline && <DDayBadge deadline={goal.deadline} status={goal.status} />}
        </div>

        <h4 className={cn(
          "font-medium text-sm mb-2 leading-snug group-hover:text-blue-600 transition-colors",
          goal.status === 'completed' && "line-through text-gray-400"
        )}>
          {title}
        </h4>

        <div className="mb-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] text-gray-500 font-medium">{t("progress" as any)}</span>
            <span className={cn(
              "text-[10px] font-bold",
              goal.progress === 100 ? "text-emerald-600" :
              goal.progress > 60 ? "text-blue-600" : "text-amber-600"
            )}>
              {goal.progress}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                goal.progress === 100 ? "bg-emerald-500" :
                isOverdue ? "bg-red-400" :
                isUrgentSoon ? "bg-orange-400" :
                goal.progress > 60 ? "bg-blue-500" : "bg-amber-500"
              )}
              style={{ width: `${goal.progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          {goal.deadline && (
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
              <CalendarIcon size={10} />
              {format(goal.deadline, language === 'ko' ? 'M월 d일' : 'MMM d', {
                locale: language === 'ko' ? koLocale : undefined,
              })}
            </span>
          )}
          {assignee && (
            <img
              src={assignee.avatar}
              alt={assignee.name}
              className="w-5 h-5 rounded-full border-2 border-white shadow-sm object-cover"
            />
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Urgent Column ──────────────────────────────────────────────────
function UrgentColumn({ goals }: { goals: GoalItem[] }) {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const ko = language === 'ko';

  const activeGoals = goals.filter(g => g.status !== 'completed');
  const sorted = [...activeGoals].sort((a, b) => {
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline.getTime() - b.deadline.getTime();
  });

  return (
    <div className="flex-1 flex flex-col rounded-2xl border border-orange-100 bg-orange-50/30 p-4 transition-all duration-200 h-full">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-orange-500" />
          <h3 className="font-semibold text-gray-700 text-sm">{ko ? "긴급 미션" : "Urgent"}</h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-200 text-orange-700">
            {sorted.length}
          </span>
        </div>
        <PermissionGate permission="goal.create">
          <button
            onClick={() => navigate("/organization/new?level=Urgent")}
            className="text-gray-400 hover:text-orange-600 p-1 rounded hover:bg-orange-50 transition-colors"
          >
            <Plus size={16} />
          </button>
        </PermissionGate>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-[60px]">
        {sorted.map(goal => (
          <UrgentGoalCard key={goal.id} goal={goal} />
        ))}
        {sorted.length === 0 && (
          <button
            onClick={() => navigate("/organization/new?level=Urgent")}
            className="w-full flex flex-col items-center justify-center py-8 text-gray-300 hover:text-orange-500 hover:bg-orange-50/50 rounded-xl transition-all cursor-pointer group"
          >
            <Zap size={20} className="mb-1.5 opacity-50 group-hover:opacity-100 transition-opacity" />
            <p className="text-xs font-medium">{ko ? '긴급 미션 추가' : 'Add urgent mission'}</p>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Draggable Task Card (with selection) ───────────────────────────
function TaskCard({
  task, isSelecting, isSelected, onToggleSelect, selectedIds,
}: {
  task: Task;
  isSelecting: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  selectedIds: Set<string>;
}) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { members } = usePermission();
  const assignee = members.find(m => m.id === task.assigneeId);
  const title = language === 'ko' ? task.titleKo || task.title : task.title;

  // When dragging a selected task, drag all selected tasks together
  const dragIds = isSelected ? Array.from(selectedIds) : [task.id];

  const [{ isDragging }, dragRef] = useDrag<DragItem, void, { isDragging: boolean }>({
    type: DRAG_TYPE,
    item: { id: task.id, ids: dragIds, status: task.status },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const handleClick = () => {
    if (isDragging) return;
    if (isSelecting) {
      onToggleSelect(task.id);
    } else {
      navigate(`/tasks/${task.id}`);
    }
  };

  return (
    <div
      ref={dragRef}
      data-task-card
      data-task-id={task.id}
      onClick={handleClick}
      className={cn(
        "bg-white p-4 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative",
        isDragging
          ? "opacity-40 border-blue-300 shadow-lg scale-[0.97] ring-2 ring-blue-200"
          : isSelected
            ? "border-blue-400 ring-2 ring-blue-100 bg-blue-50/30"
            : "border-gray-100"
      )}
    >
      {/* Multi-drag count badge */}
      {isDragging && dragIds.length > 1 && (
        <div className="absolute -top-2 -right-2 z-20 w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shadow-lg ring-2 ring-white">
          {dragIds.length}
        </div>
      )}

      {/* Selection checkbox */}
      <div className={cn(
        "absolute top-3 left-3 z-10 transition-all",
        isSelecting || isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      )}>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect(task.id); }}
          className={cn(
            "w-5 h-5 rounded border-2 flex items-center justify-center shadow-sm transition-all",
            isSelected ? "bg-blue-500 border-blue-500" : "border-gray-300 bg-white hover:border-blue-400"
          )}
        >
          {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
        </button>
      </div>

      <div className="flex items-start gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
            task.priority === 'high' ? "bg-red-50 text-red-600 border border-red-100" :
            task.priority === 'medium' ? "bg-amber-50 text-amber-600 border border-amber-100" :
            "bg-blue-50 text-blue-600 border border-blue-100"
          )}>
            {task.priority || 'low'}
          </span>
          {task.category && TASK_CATEGORY_CONFIG[task.category] && (() => {
            const catCfg = TASK_CATEGORY_CONFIG[task.category];
            return (
              <span className={cn(
                "text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex items-center gap-0.5",
                catCfg.bg, catCfg.color, catCfg.border
              )}>
                {catCfg.icon}
                {language === 'ko' ? catCfg.labelKo : catCfg.label}
              </span>
            );
          })()}
        </div>
        <button
          onClick={(e) => e.stopPropagation()}
          className="text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>

      <h4 className={cn(
        "font-medium text-sm mb-1 leading-snug",
        task.status === 'completed' ? "text-gray-400 line-through" : "text-gray-900"
      )}>{title}</h4>
      <p className="text-xs text-gray-500 line-clamp-2 mb-3">{task.description}</p>

      <div className="flex items-center justify-between border-t border-gray-50 pt-3 mt-2">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {task.dueDate && (
            <div className={cn(
              "flex items-center gap-1",
              task.dueDate < new Date() && task.status !== 'completed' ? "text-red-500" : "text-gray-400"
            )}>
              <CalendarIcon size={12} />
              <span>{format(new Date(task.dueDate), "MMM d")}</span>
            </div>
          )}
        </div>
        {assignee && (
          <img
            src={assignee.avatar}
            alt={assignee.name}
            title={assignee.name}
            className="w-6 h-6 rounded-full border border-white shadow-sm object-cover"
          />
        )}
      </div>
    </div>
  );
}

// ─── Droppable Task Column ──────────────────────────────────────────
function TaskColumn({
  title, count, tasks, icon, onAddTask, status, onDrop,
  isAdding, onStartAdd, onCancelAdd,
  isSelecting, selectedIds, onToggleSelect,
}: {
  title: string;
  count: number;
  tasks: Task[];
  icon: React.ReactNode;
  onAddTask: (title: string, status: Task['status']) => void;
  status: Task['status'];
  onDrop: (taskIds: string[], newStatus: Task['status']) => void;
  isAdding?: boolean;
  onStartAdd?: () => void;
  onCancelAdd?: () => void;
  isSelecting: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}) {
  const { language } = useLanguage();
  const [newTitle, setNewTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding && inputRef.current) inputRef.current.focus();
  }, [isAdding]);

  const handleSubmit = () => {
    if (newTitle.trim()) { onAddTask(newTitle.trim(), status); setNewTitle(''); }
  };
  const handleCancel = () => { setNewTitle(''); onCancelAdd?.(); };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
    else if (e.key === 'Escape') handleCancel();
  };

  const [{ isOver, canDrop }, dropRef] = useDrop<DragItem, void, { isOver: boolean; canDrop: boolean }>({
    accept: DRAG_TYPE,
    canDrop: (item) => item.status !== status,
    drop: (item) => onDrop(item.ids, status),
    collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
  });

  return (
    <div
      ref={dropRef}
      className={cn(
        "flex-1 flex flex-col rounded-2xl border p-4 transition-all duration-200 h-full",
        isOver && canDrop
          ? "bg-blue-50/80 border-blue-300 ring-2 ring-blue-200/50 shadow-lg"
          : canDrop ? "bg-gray-50/50 border-gray-200 border-dashed" : "bg-gray-50/50 border-gray-100"
      )}
    >
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>
          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors",
            isOver && canDrop ? "bg-blue-200 text-blue-700" : "bg-gray-200 text-gray-600"
          )}>{count}</span>
        </div>
        <PermissionGate permission="task.create">
          <button onClick={onStartAdd} className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors">
            <Plus size={16} />
          </button>
        </PermissionGate>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-[60px]">
        {isAdding && (
          <div className="bg-white rounded-xl border border-blue-200 shadow-sm ring-2 ring-blue-100 overflow-hidden">
            <input ref={inputRef} value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => { if (newTitle.trim()) handleSubmit(); else handleCancel(); }}
              placeholder={language === 'ko' ? '업무 제목을 입력하세요...' : 'Enter task title...'}
              className="w-full px-4 py-3 text-sm outline-none bg-transparent placeholder-gray-400 text-gray-900" />
            <div className="flex items-center px-3 py-2 bg-gray-50/80 border-t border-gray-100">
              <span className="text-[10px] text-gray-400">{language === 'ko' ? 'Enter로 추가 · Esc로 취소' : 'Enter to add · Esc to cancel'}</span>
            </div>
          </div>
        )}

        {tasks.length === 0 && isOver && canDrop && (
          <div className="border-2 border-dashed border-blue-300 rounded-xl p-6 text-center text-blue-500 text-xs font-medium animate-pulse">
            {language === 'ko' ? '여기에 놓으세요' : 'Drop here'}
          </div>
        )}
        {tasks.length === 0 && !isOver && !isAdding && (
          <button onClick={onStartAdd}
            className="w-full flex flex-col items-center justify-center py-8 text-gray-300 hover:text-blue-500 hover:bg-blue-50/50 rounded-xl transition-all cursor-pointer group">
            <Plus size={20} className="mb-1.5 opacity-50 group-hover:opacity-100 transition-opacity" />
            <p className="text-xs font-medium">{language === 'ko' ? '업무를 추가해보세요' : 'Add a task'}</p>
          </button>
        )}

        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            isSelecting={isSelecting}
            isSelected={selectedIds.has(task.id)}
            onToggleSelect={onToggleSelect}
            selectedIds={selectedIds}
          />
        ))}

        {!isAdding && tasks.length > 0 && (
          <PermissionGate permission="task.create">
            <button onClick={onStartAdd}
              className="w-full py-2.5 rounded-xl text-gray-400 text-sm hover:text-blue-600 hover:bg-gray-100/80 transition-all flex items-center gap-2 px-3">
              <Plus size={14} /> <span>{language === 'ko' ? '업무 추가' : 'Add Task'}</span>
            </button>
          </PermissionGate>
        )}
      </div>
    </div>
  );
}

// ─── Floating Selection Toolbar ─────────────────────────────────────
function SelectionToolbar({
  count, language, onMoveTo, onDelete, onClear,
}: {
  count: number;
  language: string;
  onMoveTo: (status: Task['status']) => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;
  const ko = language === 'ko';
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-3 animate-in slide-in-from-bottom-4">
      <span className="text-sm font-bold">{count}{ko ? '개 선택' : ' selected'}</span>
      <div className="w-px h-5 bg-gray-700" />
      <button onClick={() => onMoveTo('pending')} className="text-xs px-2.5 py-1 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1">
        <Circle size={12} /> {ko ? '할 일' : 'To Do'}
      </button>
      <button onClick={() => onMoveTo('in-progress')} className="text-xs px-2.5 py-1 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1">
        <Clock size={12} /> {ko ? '진행 중' : 'In Progress'}
      </button>
      <button onClick={() => onMoveTo('completed')} className="text-xs px-2.5 py-1 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1">
        <CheckCircle2 size={12} /> {ko ? '완료' : 'Done'}
      </button>
      <div className="w-px h-5 bg-gray-700" />
      <button onClick={onDelete} className="text-xs px-2.5 py-1 rounded-lg text-red-400 hover:bg-red-900/40 transition-colors flex items-center gap-1">
        <Trash2 size={12} /> {ko ? '삭제' : 'Delete'}
      </button>
      <button onClick={onClear} className="p-1 text-gray-400 hover:text-white rounded transition-colors ml-1">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Board View ─────────────────────────────────────────────────────
function BoardView({
  pendingTasks, inProgressTasks, completedTasks,
  urgentGoals, showCompleted,
  onStatusChange, onAddTask, language,
  addingInColumn, onStartAdd, onCancelAdd,
  isSelecting, selectedIds, onToggleSelect,
  onBulkSelect,
}: {
  pendingTasks: Task[];
  inProgressTasks: Task[];
  completedTasks: Task[];
  urgentGoals: GoalItem[];
  showCompleted: boolean;
  onStatusChange: (taskIds: string[], newStatus: Task['status']) => void;
  onAddTask: (title: string, status: Task['status']) => void;
  language: string;
  addingInColumn: Task['status'] | null;
  onStartAdd: (status: Task['status']) => void;
  onCancelAdd: () => void;
  isSelecting: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onBulkSelect: (ids: Set<string>) => void;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const rubberBandElRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);
  const currentSelRef = useRef<Set<string>>(new Set());
  const onBulkSelectRef = useRef(onBulkSelect);
  onBulkSelectRef.current = onBulkSelect;

  const handleBoardMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-task-card]') || target.closest('button') || target.closest('input') || target.closest('a')) return;
    if (e.button !== 0) return;
    e.preventDefault();
    startRef.current = { x: e.clientX, y: e.clientY };
    didDragRef.current = false;
  }, []);

  useEffect(() => {
    function setsEqual(a: Set<string>, b: Set<string>) {
      if (a.size !== b.size) return false;
      for (const x of a) if (!b.has(x)) return false;
      return true;
    }
    const handleMouseMove = (e: MouseEvent) => {
      if (!startRef.current) return;
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;
      if (!didDragRef.current && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      didDragRef.current = true;
      if (boardRef.current) boardRef.current.classList.add('select-none');
      const x1 = startRef.current.x, y1 = startRef.current.y;
      const x2 = e.clientX, y2 = e.clientY;
      const left = Math.min(x1, x2), top = Math.min(y1, y2);
      const right = Math.max(x1, x2), bottom = Math.max(y1, y2);
      if (rubberBandElRef.current) {
        const el = rubberBandElRef.current;
        el.style.display = 'block';
        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
        el.style.width = `${right - left}px`;
        el.style.height = `${bottom - top}px`;
      }
      if (!boardRef.current) return;
      const cards = boardRef.current.querySelectorAll('[data-task-card]');
      const ids = new Set<string>();
      cards.forEach(card => {
        const r = card.getBoundingClientRect();
        if (r.left < right && r.right > left && r.top < bottom && r.bottom > top) {
          const id = card.getAttribute('data-task-id');
          if (id) ids.add(id);
        }
      });
      if (!setsEqual(currentSelRef.current, ids)) {
        currentSelRef.current = ids;
        onBulkSelectRef.current(ids);
      }
    };
    const handleMouseUp = () => {
      if (startRef.current && !didDragRef.current) {
        onBulkSelectRef.current(new Set());
        currentSelRef.current = new Set();
      }
      startRef.current = null;
      didDragRef.current = false;
      if (rubberBandElRef.current) rubberBandElRef.current.style.display = 'none';
      if (boardRef.current) boardRef.current.classList.remove('select-none');
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div ref={boardRef} className="h-full flex flex-col" onMouseDown={handleBoardMouseDown}>
      <div className={cn(
        "flex flex-col md:flex-row gap-4 md:gap-6 h-full",
        showCompleted ? "md:min-w-[1200px]" : "md:min-w-[900px]"
      )}>
        <TaskColumn
          title={language === 'ko' ? "할 일" : "To Do"} count={pendingTasks.length} tasks={pendingTasks}
          icon={<Circle size={16} className="text-gray-500" />}
          onAddTask={onAddTask} status="pending" onDrop={onStatusChange}
          isAdding={addingInColumn === 'pending'} onStartAdd={() => onStartAdd('pending')} onCancelAdd={onCancelAdd}
          isSelecting={isSelecting} selectedIds={selectedIds} onToggleSelect={onToggleSelect}
        />
        <TaskColumn
          title={language === 'ko' ? "진행 중" : "In Progress"} count={inProgressTasks.length} tasks={inProgressTasks}
          icon={<Clock size={16} className="text-blue-600" />}
          onAddTask={onAddTask} status="in-progress" onDrop={onStatusChange}
          isAdding={addingInColumn === 'in-progress'} onStartAdd={() => onStartAdd('in-progress')} onCancelAdd={onCancelAdd}
          isSelecting={isSelecting} selectedIds={selectedIds} onToggleSelect={onToggleSelect}
        />
        <UrgentColumn goals={urgentGoals} />
        {showCompleted && (
          <TaskColumn
            title={language === 'ko' ? "완료" : "Done"} count={completedTasks.length} tasks={completedTasks}
            icon={<CheckCircle2 size={16} className="text-emerald-600" />}
            onAddTask={onAddTask} status="completed" onDrop={onStatusChange}
            isAdding={addingInColumn === 'completed'} onStartAdd={() => onStartAdd('completed')} onCancelAdd={onCancelAdd}
            isSelecting={isSelecting} selectedIds={selectedIds} onToggleSelect={onToggleSelect}
          />
        )}
      </div>
      <div
        ref={rubberBandElRef}
        className="fixed border-2 border-blue-400/50 bg-blue-400/10 rounded-lg pointer-events-none z-50"
        style={{ display: 'none' }}
      />
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────
export function TasksPage() {
  const { t, language } = useLanguage();
  const { tasks: allTasks, setTasks: setAllTasks, removeTask, getTask } = useTaskContext();
  const { urgentGoals } = useGoalContext();
  const { moveToTrash } = useTrash();
  const { currentUser } = usePermission();
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [columns, setColumns] = useState<3 | 4>(4);
  const [searchQuery, setSearchQuery] = useState('');
  const [addingInColumn, setAddingInColumn] = useState<Task['status'] | null>(null);
  const [showRecommendPanel, setShowRecommendPanel] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<TaskCategory | 'all'>('all');
  const [showCatFilter, setShowCatFilter] = useState(false);

  const activeUrgentCount = urgentGoals.filter(g => g.status !== 'completed').length;

  const isSelecting = selectedIds.size > 0;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // ESC to clear selection + close filter
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { clearSelection(); setShowCatFilter(false); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [clearSelection]);

  // Close category filter on outside click
  const catFilterRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showCatFilter) return;
    const handler = (e: MouseEvent) => {
      if (catFilterRef.current && !catFilterRef.current.contains(e.target as Node)) setShowCatFilter(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCatFilter]);

  const handleBulkMove = useCallback((newStatus: Task['status']) => {
    setAllTasks(prev => prev.map(t =>
      selectedIds.has(t.id)
        ? { ...t, status: newStatus, progress: newStatus === 'completed' ? 100 : newStatus === 'in-progress' ? 50 : 0 }
        : t
    ));
    clearSelection();
  }, [selectedIds, clearSelection]);

  const handleBulkDelete = useCallback(() => {
    selectedIds.forEach(id => {
      const task = getTask(id);
      if (task) {
        const title = task.titleKo || task.title;
        moveToTrash({ id: task.id, type: 'task', title, data: task, deletedAt: new Date().toISOString() });
      }
      removeTask(id);
    });
    clearSelection();
  }, [selectedIds, removeTask, getTask, moveToTrash, clearSelection]);

  const filteredTasks = useMemo(() => {
    let result = allTasks;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(task => {
        const title = language === 'ko' ? (task.titleKo || task.title) : task.title;
        return title.toLowerCase().includes(q) || (task.description?.toLowerCase().includes(q));
      });
    }
    if (filterCategory !== 'all') {
      result = result.filter(task => task.category === filterCategory);
    }
    return result;
  }, [allTasks, searchQuery, language, filterCategory]);

  const pendingTasks = filteredTasks.filter(task => task.status === 'pending');
  const inProgressTasks = filteredTasks.filter(task => task.status === 'in-progress');
  const completedTasks = filteredTasks.filter(task => task.status === 'completed');

  const handleAddTask = useCallback((title: string, status: Task['status']) => {
    const newTask: Task = {
      id: `t${Date.now()}`, title, titleKo: title, level: 'Day' as const,
      progress: status === 'completed' ? 100 : status === 'in-progress' ? 50 : 0,
      status, dueDate: new Date(), assigneeId: currentUser.id, assigneeIds: [currentUser.id], priority: 'medium',
    };
    setAllTasks(prev => [...prev, newTask]);
  }, [currentUser.id]);

  const handleStatusChange = useCallback((taskIds: string[], newStatus: Task['status']) => {
    const idSet = new Set(taskIds);
    setAllTasks(prev => prev.map(t =>
      idSet.has(t.id) ? { ...t, status: newStatus, progress: newStatus === 'completed' ? 100 : newStatus === 'in-progress' ? 50 : 0 } : t
    ));
    clearSelection();
  }, [clearSelection]);

  return (
    <div className="h-full flex flex-col">
      <header className="mb-6 shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{t("my_tasks")}</h1>
            <p className="text-gray-500 text-xs sm:text-sm">
              {language === 'ko'
                ? `할 일 ${pendingTasks.length}개 · 진행 중 ${inProgressTasks.length}개 · 긴급 ${activeUrgentCount}개 · 완료 ${completedTasks.length}개`
                : `${pendingTasks.length} to do · ${inProgressTasks.length} in progress · ${activeUrgentCount} urgent · ${completedTasks.length} completed`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PermissionGate permission="ai.recommend">
              <button onClick={() => setShowRecommendPanel(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm shadow-blue-200 group">
                <Sparkles size={15} className="group-hover:animate-pulse" />
                {language === 'ko' ? 'AI 업무 추천' : 'AI Recommend'}
              </button>
            </PermissionGate>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
          <div className="flex-1 sm:max-w-md">
            <div className="flex items-center w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all shadow-sm">
              <Search className="text-gray-400 mr-2 shrink-0" size={18} />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'ko' ? "업무 검색..." : "Search tasks..."}
                className="w-full text-sm outline-none bg-transparent placeholder-gray-400 text-gray-900" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Category Filter */}
            <div className="relative" ref={catFilterRef}>
              <button
                onClick={() => setShowCatFilter(!showCatFilter)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 bg-white border rounded-xl text-xs font-medium transition-all shadow-sm",
                  filterCategory !== 'all'
                    ? "border-blue-300 text-blue-700 ring-1 ring-blue-100"
                    : "border-gray-200 text-gray-500 hover:text-gray-700"
                )}
              >
                <Tag size={13} />
                {filterCategory === 'all'
                  ? (language === 'ko' ? '카테고리' : 'Category')
                  : (language === 'ko' ? TASK_CATEGORY_CONFIG[filterCategory].labelKo : TASK_CATEGORY_CONFIG[filterCategory].label)
                }
                <ChevronDown size={11} />
              </button>
              {showCatFilter && (
                <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 min-w-[180px] py-1 max-h-[320px] overflow-y-auto">
                  <button
                    onClick={() => { setFilterCategory('all'); setShowCatFilter(false); }}
                    className={cn("w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors",
                      filterCategory === 'all' && "bg-blue-50/50")}
                  >
                    <span className="text-gray-500">{language === 'ko' ? '전체' : 'All'}</span>
                    {filterCategory === 'all' && <Check size={12} className="ml-auto text-blue-600" />}
                  </button>
                  {(Object.entries(TASK_CATEGORY_CONFIG) as [TaskCategory, typeof TASK_CATEGORY_CONFIG[TaskCategory]][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => { setFilterCategory(key); setShowCatFilter(false); }}
                      className={cn("w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors",
                        filterCategory === key && "bg-blue-50/50")}
                    >
                      <span className={cn("flex items-center gap-1.5", cfg.color)}>
                        {cfg.icon} {language === 'ko' ? cfg.labelKo : cfg.label}
                      </span>
                      {filterCategory === key && <Check size={12} className="ml-auto text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button onClick={() => setViewMode('board')}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  viewMode === 'board' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900")}>
                <LayoutGrid size={14} /> Board
              </button>
              <button onClick={() => setViewMode('list')}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  viewMode === 'list' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900")}>
                <ListIcon size={14} /> List
              </button>
            </div>
            {viewMode === 'board' && (
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button onClick={() => setColumns(3)}
                  title={language === 'ko' ? '3단 (완료 숨기기)' : '3 columns (hide done)'}
                  className={cn("flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                    columns === 3 ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900")}>
                  <Columns3 size={14} /> 3
                </button>
                <button onClick={() => setColumns(4)}
                  title={language === 'ko' ? '4단 (완료 포함)' : '4 columns (with done)'}
                  className={cn("flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                    columns === 4 ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900")}>
                  <Columns4 size={14} /> 4
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-x-auto pb-4">
        {viewMode === 'board' ? (
          <BoardView
            pendingTasks={pendingTasks} inProgressTasks={inProgressTasks} completedTasks={completedTasks}
            urgentGoals={urgentGoals} showCompleted={columns === 4}
            onStatusChange={handleStatusChange} onAddTask={handleAddTask} language={language}
            addingInColumn={addingInColumn} onStartAdd={setAddingInColumn} onCancelAdd={() => setAddingInColumn(null)}
            isSelecting={isSelecting} selectedIds={selectedIds} onToggleSelect={toggleSelect}
            onBulkSelect={setSelectedIds}
          />
        ) : (
          <div className="h-full">
            <TaskListView tasks={filteredTasks} onStatusChange={(id, status) => handleStatusChange([id], status)} />
          </div>
        )}
      </div>

      {/* Selection Toolbar */}
      <SelectionToolbar
        count={selectedIds.size} language={language}
        onMoveTo={handleBulkMove} onDelete={handleBulkDelete} onClear={clearSelection}
      />

      <TaskRecommendationPanel isOpen={showRecommendPanel} onClose={() => setShowRecommendPanel(false)} />
    </div>
  );
}
