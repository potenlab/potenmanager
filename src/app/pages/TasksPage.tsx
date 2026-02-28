import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { useDrag, useDrop } from "react-dnd";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  Circle, 
  LayoutGrid,
  List as ListIcon,
  History,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Task } from "../../lib/mockData";
import { useLanguage } from "../context/LanguageContext";
import { useTaskContext } from "../context/TaskContext";
import { usePermission } from "../context/PermissionContext";
import { PermissionGate } from "../components/layout/PermissionGate";
import { format, isToday, isTomorrow, isYesterday, startOfWeek, isWithinInterval, isBefore, startOfDay, addDays } from "date-fns";
import { ko } from "date-fns/locale";
import { TaskListView } from "../components/tasks/TaskListView";
import { TaskRecommendationPanel } from "../components/tasks/TaskRecommendationPanel";

const DRAG_TYPE = "TASK_CARD";

type TimeFilter = 'today' | 'tomorrow' | 'yesterday' | 'this_week' | 'all';

interface DragItem {
  id: string;
  status: Task['status'];
}

// ─── Draggable Task Card ────────────────────────────────────────────
function TaskCard({ task, onStatusChange }: { task: Task; onStatusChange?: (taskId: string, newStatus: Task['status']) => void }) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { members } = usePermission();
  const assignee = members.find(m => m.id === task.assigneeId);
  const title = language === 'ko' ? task.titleKo || task.title : task.title;

  const [{ isDragging }, dragRef] = useDrag<DragItem, void, { isDragging: boolean }>({
    type: DRAG_TYPE,
    item: { id: task.id, status: task.status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={dragRef}
      onClick={() => !isDragging && navigate(`/tasks/${task.id}`)}
      className={cn(
        "bg-white p-4 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group",
        isDragging
          ? "opacity-40 border-blue-300 shadow-lg scale-[0.97] ring-2 ring-blue-200"
          : "border-gray-100"
      )}
    >
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
  title, count, tasks, color, icon, onAddTask, compact = false, status, onDrop, onStatusChange,
  isAdding, onStartAdd, onCancelAdd
}: { 
  title: string; 
  count: number; 
  tasks: Task[]; 
  color: string; 
  icon: React.ReactNode; 
  onAddTask: (title: string, status: Task['status']) => void;
  compact?: boolean;
  status: Task['status'];
  onDrop: (taskId: string, newStatus: Task['status']) => void;
  onStatusChange?: (taskId: string, newStatus: Task['status']) => void;
  isAdding?: boolean;
  onStartAdd?: () => void;
  onCancelAdd?: () => void;
}) {
  const { language } = useLanguage();
  const [newTitle, setNewTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const handleSubmit = () => {
    if (newTitle.trim()) {
      onAddTask(newTitle.trim(), status);
      setNewTitle('');
      // Keep input open for rapid entry
    }
  };

  const handleCancel = () => {
    setNewTitle('');
    onCancelAdd?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const [{ isOver, canDrop }, dropRef] = useDrop<DragItem, void, { isOver: boolean; canDrop: boolean }>({
    accept: DRAG_TYPE,
    canDrop: (item) => item.status !== status,
    drop: (item) => {
      onDrop(item.id, status);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  return (
    <div 
      ref={dropRef}
      className={cn(
        "flex-1 flex flex-col rounded-2xl border p-4 transition-all duration-200",
        compact ? "max-h-[300px]" : "h-full",
        isOver && canDrop
          ? "bg-blue-50/80 border-blue-300 ring-2 ring-blue-200/50 shadow-lg"
          : canDrop
            ? "bg-gray-50/50 border-gray-200 border-dashed"
            : "bg-gray-50/50 border-gray-100"
      )}
    >
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors",
            isOver && canDrop ? "bg-blue-200 text-blue-700" : "bg-gray-200 text-gray-600"
          )}>{count}</span>
        </div>
        {!compact && (
          <PermissionGate permission="task.create">
            <button 
              onClick={onStartAdd}
              className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
            >
              <Plus size={16} />
            </button>
          </PermissionGate>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-[60px]">
        {/* Inline add input at top */}
        {isAdding && (
          <div className="bg-white rounded-xl border border-blue-200 shadow-sm ring-2 ring-blue-100 overflow-hidden">
            <input
              ref={inputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (newTitle.trim()) handleSubmit();
                else handleCancel();
              }}
              placeholder={language === 'ko' ? '업무 제목을 입력하세요...' : 'Enter task title...'}
              className="w-full px-4 py-3 text-sm outline-none bg-transparent placeholder-gray-400 text-gray-900"
            />
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50/80 border-t border-gray-100">
              <span className="text-[10px] text-gray-400">
                {language === 'ko' ? 'Enter로 추가 · Esc로 취소' : 'Enter to add · Esc to cancel'}
              </span>
            </div>
          </div>
        )}

        {/* Drop placeholder when empty and hovering */}
        {tasks.length === 0 && isOver && canDrop && (
          <div className="border-2 border-dashed border-blue-300 rounded-xl p-6 text-center text-blue-500 text-xs font-medium animate-pulse">
            {language === 'ko' ? '여기에 놓으세요' : 'Drop here'}
          </div>
        )}

        {tasks.length === 0 && !isOver && !isAdding && (
          <button
            onClick={onStartAdd}
            className="w-full flex flex-col items-center justify-center py-8 text-gray-300 hover:text-blue-500 hover:bg-blue-50/50 rounded-xl transition-all cursor-pointer group"
          >
            <Plus size={20} className="mb-1.5 opacity-50 group-hover:opacity-100 transition-opacity" />
            <p className="text-xs font-medium">{language === 'ko' ? '업무를 추가해보세요' : 'Add a task'}</p>
          </button>
        )}

        {tasks.map(task => (
          <TaskCard key={task.id} task={task} onStatusChange={onStatusChange} />
        ))}

        {!compact && !isAdding && (
          <PermissionGate permission="task.create">
            <button 
              onClick={onStartAdd}
              className="w-full py-2.5 rounded-xl text-gray-400 text-sm hover:text-blue-600 hover:bg-gray-100/80 transition-all flex items-center gap-2 px-3"
            >
              <Plus size={14} />
              <span>{language === 'ko' ? '업무 추가' : 'Add Task'}</span>
            </button>
          </PermissionGate>
        )}
      </div>
    </div>
  );
}

// ─── Board View ─────────────────────────────────────────────────────
function BoardView({ 
  pendingTasks, inProgressTasks, completedTasks, 
  onStatusChange, onAddTask, language,
  addingInColumn, onStartAdd, onCancelAdd
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
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:min-w-[1000px] h-full">
        <TaskColumn 
          title={language === 'ko' ? "할 일" : "To Do"} 
          count={pendingTasks.length} 
          tasks={pendingTasks} 
          color="bg-gray-100"
          icon={<Circle size={16} className="text-gray-500" />}
          onAddTask={onAddTask}
          status="pending"
          onDrop={onStatusChange}
          onStatusChange={onStatusChange}
          isAdding={addingInColumn === 'pending'}
          onStartAdd={() => onStartAdd('pending')}
          onCancelAdd={onCancelAdd}
        />
        <TaskColumn 
          title={language === 'ko' ? "진행 중" : "In Progress"} 
          count={inProgressTasks.length} 
          tasks={inProgressTasks} 
          color="bg-blue-50"
          icon={<Clock size={16} className="text-blue-600" />}
          onAddTask={onAddTask}
          status="in-progress"
          onDrop={onStatusChange}
          onStatusChange={onStatusChange}
          isAdding={addingInColumn === 'in-progress'}
          onStartAdd={() => onStartAdd('in-progress')}
          onCancelAdd={onCancelAdd}
        />
        <TaskColumn 
          title={language === 'ko' ? "완료" : "Done"} 
          count={completedTasks.length} 
          tasks={completedTasks} 
          color="bg-emerald-50"
          icon={<CheckCircle2 size={16} className="text-emerald-600" />}
          onAddTask={onAddTask}
          status="completed"
          onDrop={onStatusChange}
          onStatusChange={onStatusChange}
          isAdding={addingInColumn === 'completed'}
          onStartAdd={() => onStartAdd('completed')}
          onCancelAdd={onCancelAdd}
        />
      </div>
    </div>
  );
}

// ─── Grouped Board View ─────────────────────────────────────────────
function GroupedBoardView({
  groupedTasks,
  expandedGroups,
  toggleGroup,
  onStatusChange,
  onAddTask,
  language,
  addingInColumn,
  onStartAdd,
  onCancelAdd
}: {
  groupedTasks: { label: string; dateKey: string; tasks: Task[]; isToday: boolean }[];
  expandedGroups: Record<string, boolean>;
  toggleGroup: (dateKey: string) => void;
  onStatusChange: (taskId: string, newStatus: Task['status']) => void;
  onAddTask: (title: string, status: Task['status']) => void;
  language: string;
  addingInColumn: Task['status'] | null;
  onStartAdd: (status: Task['status']) => void;
  onCancelAdd: () => void;
}) {
  return (
    <div className="space-y-6">
      {groupedTasks.map(group => {
        const isExpanded = expandedGroups[group.dateKey] !== false;
        const groupPending = group.tasks.filter(t => t.status === 'pending');
        const groupInProgress = group.tasks.filter(t => t.status === 'in-progress');
        const groupCompleted = group.tasks.filter(t => t.status === 'completed');

        return (
          <div key={group.dateKey} className="space-y-3">
            <button
              onClick={() => toggleGroup(group.dateKey)}
              className="flex items-center gap-2 group/header w-full text-left"
            >
              <div className={cn(
                "flex items-center justify-center w-5 h-5 rounded transition-colors",
                "text-gray-400 group-hover/header:text-gray-600"
              )}>
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </div>
              <span className={cn(
                "text-sm font-semibold",
                group.isToday ? "text-blue-600" : "text-gray-700"
              )}>
                {group.label}
              </span>
              <span className="text-[11px] text-gray-400 font-medium">
                {group.tasks.length} {language === 'ko' ? '개' : group.tasks.length === 1 ? 'task' : 'tasks'}
              </span>
              {!group.isToday && (
                <div className="flex-1 border-t border-gray-100 ml-2" />
              )}
              {group.isToday && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                  {language === 'ko' ? '현재' : 'CURRENT'}
                </span>
              )}
            </button>

            {isExpanded && (
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:min-w-[1000px] pl-0 md:pl-7">
                <TaskColumn 
                  title={language === 'ko' ? "할 일" : "To Do"} 
                  count={groupPending.length} 
                  tasks={groupPending} 
                  color="bg-gray-100"
                  icon={<Circle size={16} className="text-gray-500" />}
                  onAddTask={onAddTask}
                  compact={!group.isToday}
                  status="pending"
                  onDrop={onStatusChange}
                  onStatusChange={onStatusChange}
                  isAdding={group.isToday && addingInColumn === 'pending'}
                  onStartAdd={() => onStartAdd('pending')}
                  onCancelAdd={onCancelAdd}
                />
                <TaskColumn 
                  title={language === 'ko' ? "진행 중" : "In Progress"} 
                  count={groupInProgress.length} 
                  tasks={groupInProgress} 
                  color="bg-blue-50"
                  icon={<Clock size={16} className="text-blue-600" />}
                  onAddTask={onAddTask}
                  compact={!group.isToday}
                  status="in-progress"
                  onDrop={onStatusChange}
                  onStatusChange={onStatusChange}
                  isAdding={group.isToday && addingInColumn === 'in-progress'}
                  onStartAdd={() => onStartAdd('in-progress')}
                  onCancelAdd={onCancelAdd}
                />
                <TaskColumn 
                  title={language === 'ko' ? "완료" : "Done"} 
                  count={groupCompleted.length} 
                  tasks={groupCompleted} 
                  color="bg-emerald-50"
                  icon={<CheckCircle2 size={16} className="text-emerald-600" />}
                  onAddTask={onAddTask}
                  compact={!group.isToday}
                  status="completed"
                  onDrop={onStatusChange}
                  onStatusChange={onStatusChange}
                  isAdding={group.isToday && addingInColumn === 'completed'}
                  onStartAdd={() => onStartAdd('completed')}
                  onCancelAdd={onCancelAdd}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────
export function TasksPage() {
  const { t, language } = useLanguage();
  const { tasks: allTasks, setTasks: setAllTasks } = useTaskContext();
  const { currentUser } = usePermission();
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [addingInColumn, setAddingInColumn] = useState<Task['status'] | null>(null);
  const [showRecommendPanel, setShowRecommendPanel] = useState(false);

  const filteredTasks = useMemo(() => {
    let filtered = allTasks;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(task => {
        const title = language === 'ko' ? (task.titleKo || task.title) : task.title;
        return title.toLowerCase().includes(q) || 
               (task.description?.toLowerCase().includes(q));
      });
    }

    const now = new Date();
    switch (timeFilter) {
      case 'today':
        filtered = filtered.filter(task => task.dueDate && isToday(new Date(task.dueDate)));
        break;
      case 'tomorrow':
        filtered = filtered.filter(task => task.dueDate && isTomorrow(new Date(task.dueDate)));
        break;
      case 'yesterday':
        filtered = filtered.filter(task => task.dueDate && isYesterday(new Date(task.dueDate)));
        break;
      case 'this_week': {
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        filtered = filtered.filter(task => {
          if (!task.dueDate) return false;
          const d = new Date(task.dueDate);
          return isWithinInterval(d, { start: weekStart, end: now }) || isToday(d);
        });
        break;
      }
      case 'all':
        break;
    }

    return filtered;
  }, [allTasks, timeFilter, searchQuery, language]);

  const groupedTasks = useMemo(() => {
    if (timeFilter === 'today' || timeFilter === 'tomorrow' || timeFilter === 'yesterday') {
      return null;
    }

    const groups: { label: string; dateKey: string; tasks: Task[]; isToday: boolean }[] = [];
    const tasksByDate = new Map<string, Task[]>();

    const sorted = [...filteredTasks].sort((a, b) => {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return dateB - dateA;
    });

    sorted.forEach(task => {
      if (!task.dueDate) return;
      const d = new Date(task.dueDate);
      const key = format(d, 'yyyy-MM-dd');
      if (!tasksByDate.has(key)) tasksByDate.set(key, []);
      tasksByDate.get(key)!.push(task);
    });

    tasksByDate.forEach((tasks, dateKey) => {
      const d = new Date(dateKey);
      let label: string;
      const todayFlag = isToday(d);
      
      if (todayFlag) {
        label = language === 'ko' ? '오늘' : 'Today';
      } else if (isYesterday(d)) {
        label = language === 'ko' ? '어제' : 'Yesterday';
      } else {
        label = format(d, language === 'ko' ? 'M월 d일 (EEE)' : 'EEE, MMM d', 
          { locale: language === 'ko' ? ko : undefined });
      }

      groups.push({ label, dateKey, tasks, isToday: todayFlag });
    });

    return groups;
  }, [filteredTasks, timeFilter, language]);

  const pendingTasks = filteredTasks.filter(task => task.status === 'pending');
  const inProgressTasks = filteredTasks.filter(task => task.status === 'in-progress');
  const completedTasks = filteredTasks.filter(task => task.status === 'completed');

  const todayCount = allTasks.filter(t => t.dueDate && isToday(new Date(t.dueDate))).length;
  const tomorrowCount = allTasks.filter(t => t.dueDate && isTomorrow(new Date(t.dueDate))).length;
  const pastCount = allTasks.filter(t => t.dueDate && isBefore(startOfDay(new Date(t.dueDate)), startOfDay(new Date()))).length;

  const handleAddTask = useCallback((title: string, status: Task['status']) => {
    const dueDate = timeFilter === 'tomorrow' ? addDays(new Date(), 1) : new Date();
    const newTask: Task = {
      id: `t${Date.now()}`,
      title,
      titleKo: title,
      level: 'Day' as const,
      progress: status === 'completed' ? 100 : status === 'in-progress' ? 50 : 0,
      status,
      dueDate,
      assigneeId: currentUser.id,
      assigneeIds: [currentUser.id],
      priority: 'medium',
    };
    setAllTasks(prev => [...prev, newTask]);
  }, [timeFilter, currentUser.id]);

  const handleStatusChange = useCallback((taskId: string, newStatus: Task['status']) => {
    setAllTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId 
          ? { ...task, status: newStatus, progress: newStatus === 'completed' ? 100 : newStatus === 'in-progress' ? 50 : 0 } 
          : task
      )
    );
  }, []);

  const toggleGroup = useCallback((dateKey: string) => {
    setExpandedGroups(prev => ({ ...prev, [dateKey]: prev[dateKey] === false ? true : false }));
  }, []);

  const timeFilters: { id: TimeFilter; labelKey: string; count?: number }[] = [
    { id: 'today', labelKey: 'task_filter_today', count: todayCount },
    { id: 'tomorrow', labelKey: 'task_filter_tomorrow', count: tomorrowCount },
    { id: 'yesterday', labelKey: 'task_filter_yesterday' },
    { id: 'this_week', labelKey: 'task_filter_this_week' },
    { id: 'all', labelKey: 'task_filter_all' },
  ];

  return (
      <div className="h-full flex flex-col">
        <header className="mb-6 shrink-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{t("my_tasks")}</h1>
              <p className="text-gray-500 text-xs sm:text-sm">
                {language === 'ko' 
                  ? `오늘 ${todayCount}개 · 내일 ${tomorrowCount}개 · 지난 업무 ${pastCount}개` 
                  : `${todayCount} today · ${tomorrowCount} tomorrow · ${pastCount} ${t("task_past_summary")}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* AI Recommend Button */}
              <PermissionGate permission="ai.recommend">
                <button
                  onClick={() => setShowRecommendPanel(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm shadow-blue-200 group"
                >
                  <Sparkles size={15} className="group-hover:animate-pulse" />
                  {language === 'ko' ? 'AI 업무 추천' : 'AI Recommend'}
                </button>
              </PermissionGate>
            </div>
          </div>

          {/* Time Filter Tabs */}
          <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-full sm:w-fit overflow-x-auto">
            {timeFilters.map(tf => (
              <button
                key={tf.id}
                onClick={() => setTimeFilter(tf.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all",
                  timeFilter === tf.id
                    ? "bg-white shadow-sm text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {tf.id === 'yesterday' && <History size={13} />}
                {t(tf.labelKey as any)}
                {tf.count !== undefined && (
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                    timeFilter === tf.id
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-200 text-gray-500"
                  )}>
                    {tf.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
            <div className="flex-1 sm:max-w-md">
              <div className="flex items-center w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all shadow-sm">
                <Search className="text-gray-400 mr-2 shrink-0" size={18} />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'ko' ? "업무 검색..." : "Search tasks..."}
                  className="w-full text-sm outline-none bg-transparent placeholder-gray-400 text-gray-900"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                <Filter size={16} />
                {t("filter")}
              </button>
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button 
                  onClick={() => setViewMode('board')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    viewMode === 'board' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900"
                  )}
                >
                  <LayoutGrid size={14} />
                  Board
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    viewMode === 'list' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900"
                  )}
                >
                  <ListIcon size={14} />
                  List
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-x-auto pb-4">
          {viewMode === 'board' ? (
            (timeFilter === 'all' || timeFilter === 'this_week') && groupedTasks ? (
              <GroupedBoardView
                groupedTasks={groupedTasks}
                expandedGroups={expandedGroups}
                toggleGroup={toggleGroup}
                onStatusChange={handleStatusChange}
                onAddTask={handleAddTask}
                language={language}
                addingInColumn={addingInColumn}
                onStartAdd={setAddingInColumn}
                onCancelAdd={() => setAddingInColumn(null)}
              />
            ) : (
              <BoardView
                pendingTasks={pendingTasks}
                inProgressTasks={inProgressTasks}
                completedTasks={completedTasks}
                onStatusChange={handleStatusChange}
                onAddTask={handleAddTask}
                language={language}
                addingInColumn={addingInColumn}
                onStartAdd={setAddingInColumn}
                onCancelAdd={() => setAddingInColumn(null)}
              />
            )
          ) : (
            (timeFilter === 'all' || timeFilter === 'this_week') && groupedTasks ? (
              <div className="space-y-4">
                {groupedTasks.map(group => {
                  const isExpanded = expandedGroups[group.dateKey] !== false;
                  return (
                    <div key={group.dateKey}>
                      <button
                        onClick={() => toggleGroup(group.dateKey)}
                        className="flex items-center gap-2 group/header w-full text-left mb-2"
                      >
                        <div className="flex items-center justify-center w-5 h-5 rounded text-gray-400 group-hover/header:text-gray-600">
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                        <span className={cn(
                          "text-sm font-semibold",
                          group.isToday ? "text-blue-600" : "text-gray-700"
                        )}>
                          {group.label}
                        </span>
                        <span className="text-[11px] text-gray-400 font-medium">
                          {group.tasks.length} {language === 'ko' ? '개' : group.tasks.length === 1 ? 'task' : 'tasks'}
                        </span>
                        <div className="flex-1 border-t border-gray-100 ml-2" />
                        {group.isToday && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                            {language === 'ko' ? '현재' : 'CURRENT'}
                          </span>
                        )}
                      </button>
                      {isExpanded && (
                        <div className="pl-7">
                          <TaskListView tasks={group.tasks} onStatusChange={handleStatusChange} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full">
                <TaskListView tasks={filteredTasks} onStatusChange={handleStatusChange} />
              </div>
            )
          )}
        </div>

        {/* AI Recommendation Panel */}
        <TaskRecommendationPanel
          isOpen={showRecommendPanel}
          onClose={() => setShowRecommendPanel(false)}
        />
      </div>
  );
}