import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
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
  ArrowRight,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Task } from "../../lib/mockData";
import { useLanguage } from "../context/LanguageContext";
import { useTaskContext } from "../context/TaskContext";
import { usePermission } from "../context/PermissionContext";
import { PermissionGate } from "../components/layout/PermissionGate";
import { format } from "date-fns";
import { TaskListView } from "../components/tasks/TaskListView";
import { TaskRecommendationPanel } from "../components/tasks/TaskRecommendationPanel";
import { useTrash } from "../context/TrashContext";

const DRAG_TYPE = "TASK_CARD";

interface DragItem {
  id: string;
  status: Task['status'];
}

// ─── Draggable Task Card (with selection) ───────────────────────────
function TaskCard({
  task, isSelecting, isSelected, onToggleSelect,
}: {
  task: Task;
  isSelecting: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { members } = usePermission();
  const assignee = members.find(m => m.id === task.assigneeId);
  const title = language === 'ko' ? task.titleKo || task.title : task.title;

  const [{ isDragging }, dragRef] = useDrag<DragItem, void, { isDragging: boolean }>({
    type: DRAG_TYPE,
    item: { id: task.id, status: task.status },
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

      <div className="flex justify-between items-start mb-2">
        <span className={cn(
          "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
          task.priority === 'high' ? "bg-red-50 text-red-600 border border-red-100" :
          task.priority === 'medium' ? "bg-amber-50 text-amber-600 border border-amber-100" :
          "bg-blue-50 text-blue-600 border border-blue-100"
        )}>
          {task.priority || 'low'}
        </span>
        <button
          onClick={(e) => e.stopPropagation()}
          className="text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
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
  onDrop: (taskId: string, newStatus: Task['status']) => void;
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
    drop: (item) => onDrop(item.id, status),
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
  onStatusChange, onAddTask, language,
  addingInColumn, onStartAdd, onCancelAdd,
  isSelecting, selectedIds, onToggleSelect,
}: {
  pendingTasks: Task[];
  inProgressTasks: Task[];
  completedTasks: Task[];
  onStatusChange: (taskId: string, newStatus: Task['status']) => void;
  onAddTask: (title: string, status: Task['status']) => void;
  language: string;
  addingInColumn: Task['status'] | null;
  onStartAdd: (status: Task['status']) => void;
  onCancelAdd: () => void;
  isSelecting: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:min-w-[1000px] h-full">
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
        <TaskColumn
          title={language === 'ko' ? "완료" : "Done"} count={completedTasks.length} tasks={completedTasks}
          icon={<CheckCircle2 size={16} className="text-emerald-600" />}
          onAddTask={onAddTask} status="completed" onDrop={onStatusChange}
          isAdding={addingInColumn === 'completed'} onStartAdd={() => onStartAdd('completed')} onCancelAdd={onCancelAdd}
          isSelecting={isSelecting} selectedIds={selectedIds} onToggleSelect={onToggleSelect}
        />
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────
export function TasksPage() {
  const { t, language } = useLanguage();
  const { tasks: allTasks, setTasks: setAllTasks, removeTask, getTask } = useTaskContext();
  const { moveToTrash } = useTrash();
  const { currentUser } = usePermission();
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [addingInColumn, setAddingInColumn] = useState<Task['status'] | null>(null);
  const [showRecommendPanel, setShowRecommendPanel] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isSelecting = selectedIds.size > 0;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // ESC to clear selection
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') clearSelection(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [clearSelection]);

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
    if (!searchQuery.trim()) return allTasks;
    const q = searchQuery.toLowerCase();
    return allTasks.filter(task => {
      const title = language === 'ko' ? (task.titleKo || task.title) : task.title;
      return title.toLowerCase().includes(q) || (task.description?.toLowerCase().includes(q));
    });
  }, [allTasks, searchQuery, language]);

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

  const handleStatusChange = useCallback((taskId: string, newStatus: Task['status']) => {
    setAllTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: newStatus, progress: newStatus === 'completed' ? 100 : newStatus === 'in-progress' ? 50 : 0 } : t
    ));
  }, []);

  return (
    <div className="h-full flex flex-col">
      <header className="mb-6 shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{t("my_tasks")}</h1>
            <p className="text-gray-500 text-xs sm:text-sm">
              {language === 'ko'
                ? `할 일 ${pendingTasks.length}개 · 진행 중 ${inProgressTasks.length}개 · 완료 ${completedTasks.length}개`
                : `${pendingTasks.length} to do · ${inProgressTasks.length} in progress · ${completedTasks.length} completed`}
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
          <div className="flex items-center gap-3">
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
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-x-auto pb-4">
        {viewMode === 'board' ? (
          <BoardView
            pendingTasks={pendingTasks} inProgressTasks={inProgressTasks} completedTasks={completedTasks}
            onStatusChange={handleStatusChange} onAddTask={handleAddTask} language={language}
            addingInColumn={addingInColumn} onStartAdd={setAddingInColumn} onCancelAdd={() => setAddingInColumn(null)}
            isSelecting={isSelecting} selectedIds={selectedIds} onToggleSelect={toggleSelect}
          />
        ) : (
          <div className="h-full">
            <TaskListView tasks={filteredTasks} onStatusChange={handleStatusChange} />
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
