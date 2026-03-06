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
  Megaphone,
  Code,
  Palette,
  Lightbulb,
  Settings,
  BookOpen,
  Tag,
  ChevronDown,
  Pencil,
  StickyNote,
  GripHorizontal,
  Target,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Task, TaskCategory, getAllAssigneeIds } from "../../lib/mockData";
import { TASK_CATEGORY_CONFIG } from "../../lib/jobRoles";
import { useLanguage } from "../context/LanguageContext";
import { useTaskContext } from "../context/TaskContext";
import { useGoalContext } from "../context/GoalContext";
import { usePermission } from "../context/PermissionContext";
import { CalendarView } from "../components/dashboard/CalendarView";
import { PermissionGate } from "../components/layout/PermissionGate";
import { differenceInDays, format } from "date-fns";
import { TaskListView } from "../components/tasks/TaskListView";
import { useTrash } from "../context/TrashContext";
import { loadCards as loadMgmtCards } from "./ManagementPage";

const DRAG_TYPE = "TASK_CARD";

interface DragItem {
  id: string;
  ids: string[];  // all selected task ids (includes id itself)
  status: Task['status'];
}

// Track alt key globally for clone-on-drop
const altKeyRef = { current: false };
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => { if (e.key === 'Alt') altKeyRef.current = true; });
  window.addEventListener('keyup', (e) => { if (e.key === 'Alt') altKeyRef.current = false; });
}

// TASK_CATEGORY_CONFIG is now imported from ../../lib/jobRoles

// Cache for management card titles (refreshed on page load)
const _mgmtCardCache: Record<string, string> = {};
function getMgmtCardTitle(board: 'projects' | 'branding', cardId: string): string | null {
  const key = `${board}:${cardId}`;
  if (_mgmtCardCache[key] !== undefined) return _mgmtCardCache[key];
  const cards = loadMgmtCards(board);
  cards.forEach(c => { _mgmtCardCache[`${board}:${c.id}`] = c.title; });
  return _mgmtCardCache[key] || null;
}

function LinkedBoardBadge({ board, cardId, language }: { board: 'projects' | 'branding'; cardId: string; language: string }) {
  const cardTitle = getMgmtCardTitle(board, cardId);
  if (!cardTitle) return null;
  const ko = language === 'ko';
  const boardLabel = board === 'projects' ? (ko ? '프로젝트' : 'Project') : (ko ? '브랜딩' : 'Branding');
  return (
    <span className={cn(
      "text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex items-center gap-0.5 max-w-[140px]",
      board === 'projects' ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-pink-50 text-pink-600 border-pink-100"
    )}>
      <span className="truncate">{boardLabel} · {cardTitle}</span>
    </span>
  );
}

// ─── Draggable Task Card (with selection) ───────────────────────────
function TaskCard({
  task, isSelecting, isSelected, onToggleSelect, selectedIds, onContextMenu,
}: {
  task: Task;
  isSelecting: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  selectedIds: Set<string>;
  onContextMenu?: (e: React.MouseEvent, id: string) => void;
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
      onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(e, task.id); }}
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
          {task.linkedBoard && task.linkedCardId && <LinkedBoardBadge board={task.linkedBoard} cardId={task.linkedCardId} language={language} />}
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
  isAdding, onStartAdd, onCancelAdd, urgentNote, hideAdd,
  isSelecting, selectedIds, onToggleSelect, onCardContextMenu,
}: {
  title: string;
  count: number;
  tasks: Task[];
  icon: React.ReactNode;
  onAddTask: (title: string, status: Task['status']) => void;
  status: Task['status'];
  onDrop: (taskIds: string[], newStatus: Task['status'], clone?: boolean) => void;
  isAdding?: boolean;
  onStartAdd?: () => void;
  onCancelAdd?: () => void;
  urgentNote?: boolean;
  hideAdd?: boolean;
  isSelecting: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onCardContextMenu?: (e: React.MouseEvent, id: string) => void;
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
    drop: (item) => onDrop(item.ids, status, altKeyRef.current),
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
        {!hideAdd && (
          <PermissionGate permission="task.create">
            <button onClick={onStartAdd} className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors">
              <Plus size={16} />
            </button>
          </PermissionGate>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-3 custom-scrollbar min-h-[60px]">
        {isAdding && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <input ref={inputRef} value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => { if (newTitle.trim()) handleSubmit(); else handleCancel(); }}
              placeholder={language === 'ko' ? '업무 제목을 입력하세요...' : 'Enter task title...'}
              className="w-full px-4 py-3 text-sm outline-none bg-transparent placeholder-gray-400 text-gray-900" />
            <div className="flex flex-col px-3 py-2 bg-gray-50/80 border-t border-gray-100 gap-1">
              <span className="text-[10px] text-gray-400">{language === 'ko' ? 'Enter로 추가 · Esc로 취소' : 'Enter to add · Esc to cancel'}</span>
              {urgentNote && (
                <span className="text-[10px] text-red-400 flex items-center gap-1">
                  <Zap size={10} />
                  {language === 'ko' ? '팀 전략에도 함께 등록됩니다' : 'Also added to team strategy'}
                </span>
              )}
            </div>
          </div>
        )}

        {tasks.length === 0 && isOver && canDrop && (
          <div className="border-2 border-dashed border-blue-300 rounded-xl p-6 text-center text-blue-500 text-xs font-medium animate-pulse">
            {language === 'ko' ? '여기에 놓으세요' : 'Drop here'}
          </div>
        )}
        {tasks.length === 0 && !isOver && !isAdding && !hideAdd && (
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
            onContextMenu={onCardContextMenu}
          />
        ))}

        {!isAdding && tasks.length > 0 && !hideAdd && (
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
  pendingTasks, inProgressTasks, urgentTasks, overdueTasks, completedTasks,
  columns,
  onStatusChange, onAddTask, language,
  addingInColumn, onStartAdd, onCancelAdd,
  isSelecting, selectedIds, onToggleSelect,
  onBulkSelect, onCardContextMenu,
}: {
  pendingTasks: Task[];
  inProgressTasks: Task[];
  urgentTasks: Task[];
  overdueTasks: Task[];
  completedTasks: Task[];
  columns: 3 | 4 | 5;
  onStatusChange: (taskIds: string[], newStatus: Task['status'], clone?: boolean) => void;
  onAddTask: (title: string, status: Task['status']) => void;
  language: string;
  addingInColumn: Task['status'] | 'urgent' | null;
  onStartAdd: (status: Task['status'] | 'urgent') => void;
  onCancelAdd: () => void;
  isSelecting: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onBulkSelect: (ids: Set<string>) => void;
  onCardContextMenu?: (e: React.MouseEvent, id: string) => void;
}) {
  const { currentUser } = usePermission();
  const isAdminOrOwner = currentUser.role === 'owner' || currentUser.role === 'admin';
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
      <div className="flex flex-col md:flex-row gap-4 md:gap-3 h-full">
        <TaskColumn
          title={language === 'ko' ? "할 일" : "To Do"} count={pendingTasks.length} tasks={pendingTasks}
          icon={<Circle size={16} className="text-gray-500" />}
          onAddTask={onAddTask} status="pending" onDrop={onStatusChange}
          isAdding={addingInColumn === 'pending'} onStartAdd={() => onStartAdd('pending')} onCancelAdd={onCancelAdd}
          isSelecting={isSelecting} selectedIds={selectedIds} onToggleSelect={onToggleSelect} onCardContextMenu={onCardContextMenu}
        />
        <TaskColumn
          title={language === 'ko' ? "진행 중" : "In Progress"} count={inProgressTasks.length} tasks={inProgressTasks}
          icon={<Clock size={16} className="text-blue-600" />}
          onAddTask={onAddTask} status="in-progress" onDrop={onStatusChange}
          isAdding={addingInColumn === 'in-progress'} onStartAdd={() => onStartAdd('in-progress')} onCancelAdd={onCancelAdd}
          isSelecting={isSelecting} selectedIds={selectedIds} onToggleSelect={onToggleSelect} onCardContextMenu={onCardContextMenu}
        />
        <TaskColumn
          title={language === 'ko' ? "긴급" : "Urgent"} count={urgentTasks.length} tasks={urgentTasks}
          icon={<Zap size={16} className="text-red-500" />}
          onAddTask={onAddTask} status="pending" onDrop={onStatusChange}
          isAdding={isAdminOrOwner && addingInColumn === 'urgent'}
          onStartAdd={isAdminOrOwner ? () => onStartAdd('urgent') : undefined}
          onCancelAdd={onCancelAdd}
          urgentNote={addingInColumn === 'urgent'}
          hideAdd={!isAdminOrOwner}
          isSelecting={isSelecting} selectedIds={selectedIds} onToggleSelect={onToggleSelect} onCardContextMenu={onCardContextMenu}
        />
        {columns >= 4 && (
          <TaskColumn
            title={language === 'ko' ? "지연" : "Overdue"} count={overdueTasks.length} tasks={overdueTasks}
            icon={<AlertTriangle size={16} className="text-amber-500" />}
            onAddTask={onAddTask} status="pending" onDrop={onStatusChange}
            isAdding={false} onStartAdd={() => {}} onCancelAdd={onCancelAdd}
            isSelecting={isSelecting} selectedIds={selectedIds} onToggleSelect={onToggleSelect} onCardContextMenu={onCardContextMenu}
          />
        )}
        {columns >= 5 && (
          <TaskColumn
            title={language === 'ko' ? "완료" : "Done"} count={completedTasks.length} tasks={completedTasks}
            icon={<CheckCircle2 size={16} className="text-emerald-600" />}
            onAddTask={onAddTask} status="completed" onDrop={onStatusChange}
            isAdding={addingInColumn === 'completed'} onStartAdd={() => onStartAdd('completed')} onCancelAdd={onCancelAdd}
            isSelecting={isSelecting} selectedIds={selectedIds} onToggleSelect={onToggleSelect} onCardContextMenu={onCardContextMenu}
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
  const { tasks: allTasks, updateTask, addTask: addTaskToContext, removeTask, getTask } = useTaskContext();
  const { goals } = useGoalContext();
  const { moveToTrash } = useTrash();
  const { currentUser } = usePermission();
  const [viewMode, setViewMode] = useState<'board' | 'list' | 'calendar'>('board');
  const [columns, setColumns] = useState<3 | 4 | 5>(5);
  const [searchQuery, setSearchQuery] = useState('');
  const [addingInColumn, setAddingInColumn] = useState<Task['status'] | 'urgent' | null>(null);
  const [showMemo, setShowMemo] = useState(false);
  const [showStrategy, setShowStrategy] = useState(false);
  const [memoContent, setMemoContent] = useState(() => {
    try { return localStorage.getItem('poten_my_memo') || ''; } catch { return ''; }
  });
  const [memoPos, setMemoPos] = useState({ x: typeof window !== 'undefined' ? Math.min(window.innerWidth - 340, window.innerWidth * 0.5) : 400, y: typeof window !== 'undefined' ? Math.min(window.innerHeight - 420, 300) : 200 });
  const memoDragRef = useRef<{ dragging: boolean; offsetX: number; offsetY: number }>({ dragging: false, offsetX: 0, offsetY: 0 });

  // Auto-save memo
  useEffect(() => {
    const t = setTimeout(() => { try { localStorage.setItem('poten_my_memo', memoContent); } catch {} }, 300);
    return () => clearTimeout(t);
  }, [memoContent]);

  // Memo drag handlers
  const handleMemoDragStart = useCallback((e: React.MouseEvent) => {
    memoDragRef.current = { dragging: true, offsetX: e.clientX - memoPos.x, offsetY: e.clientY - memoPos.y };
    const onMove = (ev: MouseEvent) => {
      if (!memoDragRef.current.dragging) return;
      setMemoPos({ x: ev.clientX - memoDragRef.current.offsetX, y: ev.clientY - memoDragRef.current.offsetY });
    };
    const onUp = () => { memoDragRef.current.dragging = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [memoPos]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<TaskCategory | 'all'>('all');
  const [showCatFilter, setShowCatFilter] = useState(false);

  const isSelecting = selectedIds.size > 0;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // ESC to clear selection, Delete to bulk-delete selected
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { clearSelection(); setShowCatFilter(false); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
        // Don't intercept if user is typing in an input/textarea
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
        e.preventDefault();
        selectedIds.forEach(id => {
          const task = getTask(id);
          if (task) {
            moveToTrash({ id: task.id, type: 'task', title: task.title, data: task, deletedAt: new Date().toISOString() });
            removeTask(id);
          }
        });
        clearSelection();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [clearSelection, selectedIds, getTask, removeTask, moveToTrash]);

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
    const progress = newStatus === 'completed' ? 100 : newStatus === 'in-progress' ? 50 : 0;
    selectedIds.forEach(id => updateTask(id, { status: newStatus, progress }));
    clearSelection();
  }, [selectedIds, clearSelection, updateTask]);

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

  // ── Right-click context menu ──
  const navigate = useNavigate();
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const handleCardContextMenu = useCallback((e: React.MouseEvent, id: string) => {
    setCtxMenu({ x: e.clientX, y: e.clientY, id });
  }, []);
  const closeCtxMenu = useCallback(() => setCtxMenu(null), []);

  // Show only current user's tasks in "내 업무"
  const myTaskFilter = useCallback((t: Task) => getAllAssigneeIds(t).includes(currentUser.id), [currentUser.id]);
  const myTasks = useMemo(() => {
    return allTasks.filter(myTaskFilter);
  }, [allTasks, myTaskFilter]);

  const filteredTasks = useMemo(() => {
    let result = myTasks;
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
  }, [myTasks, searchQuery, language, filterCategory]);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const showSeparateColumns = columns >= 4;

  // 긴급: priority가 high이고 완료가 아닌 태스크 (항상 분리)
  const urgentTasks = filteredTasks.filter(task => task.status !== 'completed' && task.priority === 'high');
  const urgentIds = new Set(urgentTasks.map(t => t.id));

  // 지연: 마감일이 지났고 완료가 아닌 태스크 (긴급에 이미 포함된 건 제외, 4단 이상)
  const overdueTasks = showSeparateColumns
    ? filteredTasks.filter(task => {
        if (task.status === 'completed') return false;
        if (urgentIds.has(task.id)) return false;
        if (!task.dueDate) return false;
        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);
        return due < now;
      })
    : [];
  const overdueIds = new Set(overdueTasks.map(t => t.id));

  // 할 일 / 진행 중: 긴급·지연 제외
  const pendingTasks = filteredTasks.filter(task => task.status === 'pending' && !urgentIds.has(task.id) && !overdueIds.has(task.id));
  const inProgressTasks = filteredTasks.filter(task => task.status === 'in-progress' && !urgentIds.has(task.id) && !overdueIds.has(task.id));
  const completedTasks = filteredTasks.filter(task => task.status === 'completed');

  const handleAddTask = useCallback((title: string, status: Task['status']) => {
    const isUrgent = addingInColumn === 'urgent';
    const newTask: Task = {
      id: `t${Date.now()}`, title, titleKo: title, level: 'Day' as const,
      progress: status === 'completed' ? 100 : status === 'in-progress' ? 50 : 0,
      status, dueDate: new Date(), assigneeId: currentUser.id, assigneeIds: [currentUser.id],
      priority: isUrgent ? 'high' : 'medium',
    };
    addTaskToContext(newTask);
  }, [currentUser.id, addTaskToContext, addingInColumn]);

  const handleStatusChange = useCallback((taskIds: string[], newStatus: Task['status'], clone?: boolean) => {
    const progress = newStatus === 'completed' ? 100 : newStatus === 'in-progress' ? 50 : 0;
    if (clone) {
      // Alt+drag: duplicate tasks with new status
      taskIds.forEach(id => {
        const original = getTask(id);
        if (!original) return;
        const newId = `t${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
        const cloned: Task = {
          ...original,
          id: newId,
          status: newStatus,
          progress,
          title: original.title,
          titleKo: original.titleKo ? `${original.titleKo}` : undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        addTaskToContext(cloned);
      });
    } else {
      taskIds.forEach(id => updateTask(id, { status: newStatus, progress }));
    }
    clearSelection();
  }, [clearSelection, updateTask, getTask, addTaskToContext]);

  return (
    <div className="h-full flex flex-col">
      <header className="mb-6 shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{t("my_tasks")}</h1>
            <p className="text-gray-500 text-xs sm:text-sm">
              {language === 'ko'
                ? `할 일 ${pendingTasks.length} · 진행 중 ${inProgressTasks.length} · 긴급 ${urgentTasks.length} · 지연 ${overdueTasks.length} · 완료 ${completedTasks.length}`
                : `${pendingTasks.length} to do · ${inProgressTasks.length} in progress · ${urgentTasks.length} urgent · ${overdueTasks.length} overdue · ${completedTasks.length} done`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowStrategy(!showStrategy)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm border",
                showStrategy
                  ? "bg-purple-50 text-purple-700 border-purple-200 shadow-purple-100"
                  : "bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50/50"
              )}>
              <Target size={15} />
              {language === 'ko' ? '내 전략' : 'My Strategy'}
            </button>
            <button onClick={() => setShowMemo(!showMemo)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm border",
                showMemo
                  ? "bg-amber-50 text-amber-700 border-amber-200 shadow-amber-100"
                  : "bg-white text-gray-600 border-gray-200 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50/50"
              )}>
              <StickyNote size={15} />
              {language === 'ko' ? '내 메모장' : 'My Memo'}
            </button>
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
              <button onClick={() => setViewMode('calendar')}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  viewMode === 'calendar' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900")}>
                <CalendarIcon size={14} /> {language === 'ko' ? '캘린더' : 'Calendar'}
              </button>
            </div>
            {viewMode === 'board' && (
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button onClick={() => setColumns(3)}
                  title={language === 'ko' ? '3단 (할 일·진행 중·긴급)' : '3 columns (Todo·Progress·Urgent)'}
                  className={cn("flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                    columns === 3 ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900")}>
                  <Columns3 size={14} /> 3
                </button>
                <button onClick={() => setColumns(4)}
                  title={language === 'ko' ? '4단 (긴급·지연 포함)' : '4 columns'}
                  className={cn("flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                    columns === 4 ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900")}>
                  <Columns4 size={14} /> 4
                </button>
                <button onClick={() => setColumns(5)}
                  title={language === 'ko' ? '5단 (완료 포함)' : '5 columns (with done)'}
                  className={cn("flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                    columns === 5 ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900")}>
                  <Columns4 size={14} /> 5
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-x-auto pb-4">
        {viewMode === 'board' ? (
          <BoardView
            pendingTasks={pendingTasks} inProgressTasks={inProgressTasks} urgentTasks={urgentTasks} overdueTasks={overdueTasks} completedTasks={completedTasks}
            columns={columns}
            onStatusChange={handleStatusChange} onAddTask={handleAddTask} language={language}
            addingInColumn={addingInColumn} onStartAdd={setAddingInColumn} onCancelAdd={() => setAddingInColumn(null)}
            isSelecting={isSelecting} selectedIds={selectedIds} onToggleSelect={toggleSelect}
            onBulkSelect={setSelectedIds} onCardContextMenu={handleCardContextMenu}
          />
        ) : viewMode === 'calendar' ? (
          <CalendarView taskFilter={myTaskFilter} />
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


      {/* Sticky Memo */}
      {showMemo && (
        <div
          className="fixed z-[60] w-[320px] bg-amber-50 border border-amber-200 rounded-2xl shadow-2xl shadow-amber-200/40 flex flex-col overflow-hidden"
          style={{ left: memoPos.x, top: memoPos.y, height: 400 }}
        >
          {/* Header - draggable */}
          <div
            onMouseDown={handleMemoDragStart}
            className="flex items-center justify-between px-4 py-2.5 bg-amber-100/80 border-b border-amber-200 cursor-grab active:cursor-grabbing select-none"
          >
            <div className="flex items-center gap-2">
              <GripHorizontal size={14} className="text-amber-400" />
              <StickyNote size={14} className="text-amber-600" />
              <span className="text-xs font-bold text-amber-800">
                {language === 'ko' ? '내 메모장' : 'My Memo'}
              </span>
            </div>
            <button onClick={() => setShowMemo(false)} className="p-1 rounded-lg text-amber-400 hover:text-amber-700 hover:bg-amber-200/60 transition-colors">
              <X size={14} />
            </button>
          </div>
          {/* Content */}
          <textarea
            value={memoContent}
            onChange={(e) => setMemoContent(e.target.value)}
            placeholder={language === 'ko' ? '메모를 입력하세요...\n\n- 할 일 정리\n- 아이디어 메모\n- 빠른 메모' : 'Type your memo...\n\n- Quick notes\n- Ideas\n- Reminders'}
            className="flex-1 w-full p-4 text-sm text-gray-800 bg-transparent outline-none resize-none placeholder-amber-300 leading-relaxed"
            autoFocus
          />
          {/* Footer */}
          <div className="px-4 py-2 border-t border-amber-200/60 bg-amber-100/40 flex items-center justify-between">
            <span className="text-[10px] text-amber-400 font-medium">
              {memoContent.length > 0
                ? (language === 'ko' ? `${memoContent.length}자 · 자동 저장됨` : `${memoContent.length} chars · Auto-saved`)
                : ''}
            </span>
            <button
              onClick={() => { setMemoContent(''); localStorage.removeItem('poten_my_memo'); }}
              className="text-[10px] text-amber-400 hover:text-red-500 font-medium transition-colors"
            >
              {language === 'ko' ? '전체 삭제' : 'Clear'}
            </button>
          </div>
        </div>
      )}

      {/* Strategy Panel */}
      {showStrategy && (
        <div
          className="fixed z-[60] w-[340px] bg-white border border-purple-200 rounded-2xl shadow-2xl shadow-purple-200/30 flex flex-col overflow-hidden"
          style={{ right: 24, top: 120, maxHeight: 'calc(100vh - 160px)' }}
        >
          <div className="flex items-center justify-between px-4 py-2.5 bg-purple-50 border-b border-purple-100">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-purple-600" />
              <span className="text-xs font-bold text-purple-800">
                {language === 'ko' ? '내 전략' : 'My Strategy'}
              </span>
            </div>
            <button onClick={() => setShowStrategy(false)} className="p-1 rounded-lg text-purple-400 hover:text-purple-700 hover:bg-purple-100 transition-colors">
              <X size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {goals.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">
                {language === 'ko' ? '등록된 전략 목표가 없습니다' : 'No strategy goals yet'}
              </p>
            ) : (
              (['Year', 'Quarter', 'Month', 'Week'] as const).map(level => {
                const levelGoals = goals.filter(g => g.level === level);
                if (levelGoals.length === 0) return null;
                const levelLabel = language === 'ko'
                  ? { Year: '연간', Quarter: '분기', Month: '월간', Week: '주간' }[level]
                  : level;
                return (
                  <div key={level}>
                    <h4 className="text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-1.5 px-1">{levelLabel}</h4>
                    <div className="space-y-1.5">
                      {levelGoals.map(g => (
                        <div key={g.id} className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-gray-50 hover:bg-purple-50/50 transition-colors">
                          <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                            g.status === 'completed' ? 'bg-emerald-500' : g.status === 'in-progress' ? 'bg-blue-500' : 'bg-gray-300'
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">
                              {language === 'ko' ? (g.titleKo || g.title) : g.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-400 rounded-full transition-all" style={{ width: `${g.progress}%` }} />
                              </div>
                              <span className="text-[9px] text-gray-400 font-medium">{g.progress}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="px-4 py-2 border-t border-purple-100 bg-purple-50/40">
            <button
              onClick={() => { setShowStrategy(false); navigate('/dashboard'); }}
              className="w-full text-[10px] text-purple-500 hover:text-purple-700 font-medium transition-colors text-center"
            >
              {language === 'ko' ? '대시보드에서 전체 보기 →' : 'View all in Dashboard →'}
            </button>
          </div>
        </div>
      )}

      {/* Right-click context menu */}
      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-[70]" onClick={closeCtxMenu} onContextMenu={(e) => { e.preventDefault(); closeCtxMenu(); }} />
          <div
            className="fixed z-[71] bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-100"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
            <button
              onClick={() => { navigate(`/tasks/${ctxMenu.id}`); closeCtxMenu(); }}
              className="w-full px-3 py-2 text-xs text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
              <Pencil size={13} /> {language === 'ko' ? '수정' : 'Edit'}
            </button>
            <div className="mx-2 my-0.5 border-t border-gray-100" />
            <button
              onClick={() => {
                const task = getTask(ctxMenu.id);
                if (task) {
                  const title = task.titleKo || task.title;
                  moveToTrash({ id: task.id, type: 'task', title, data: task, deletedAt: new Date().toISOString() });
                }
                removeTask(ctxMenu.id);
                closeCtxMenu();
              }}
              className="w-full px-3 py-2 text-xs text-left text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
            >
              <Trash2 size={13} /> {language === 'ko' ? '삭제' : 'Delete'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
