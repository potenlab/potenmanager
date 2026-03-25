import { useState, useRef, useEffect } from "react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  MoreHorizontal,
  User,
  AlertCircle,
  ChevronDown,
  Zap,
  AlertTriangle as AlertTriangleIcon,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { Task, TaskCategory } from "../../../lib/mockData";
import { TASK_CATEGORY_CONFIG } from "../../../lib/jobRoles";
import { useLanguage } from "../../context/LanguageContext";
import { usePermission } from "../../context/PermissionContext";
import { format } from "date-fns";
import { useNavigate } from "react-router";
import { useOrgPath } from "../../hooks/useOrgPath";

const STATUS_OPTIONS: { value: Task['status']; labelKo: string; labelEn: string; color: string; icon: typeof Circle }[] = [
  { value: 'pending', labelKo: '할 일', labelEn: 'To Do', color: 'text-gray-500', icon: Circle },
  { value: 'in-progress', labelKo: '진행 중', labelEn: 'In Progress', color: 'text-blue-500', icon: Clock },
  { value: 'routine', labelKo: '루틴', labelEn: 'Routine', color: 'text-purple-500', icon: AlertTriangleIcon },
  { value: 'completed', labelKo: '완료', labelEn: 'Done', color: 'text-emerald-500', icon: CheckCircle2 },
];

interface TaskListViewProps {
  tasks: Task[];
  groupBy?: 'status' | 'time' | 'category';
  onStatusChange?: (taskId: string, newStatus: Task['status']) => void;
}

export function TaskListView({ tasks, groupBy = 'status', onStatusChange }: TaskListViewProps) {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const p = useOrgPath();
  const { members } = usePermission();
  const [openStatusId, setOpenStatusId] = useState<string | null>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setOpenStatusId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 size={18} className="text-emerald-500" />;
      case 'in-progress': return <Clock size={18} className="text-blue-500" />;
      case 'routine': return <Clock size={18} className="text-purple-500" />;
      default: return <Circle size={18} className="text-gray-300 hover:text-gray-400 transition-colors" />;
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return "bg-red-50 text-red-600 border-red-100";
      case 'delayed': return "bg-orange-50 text-orange-600 border-orange-100";
      case 'medium': return "bg-green-50 text-green-600 border-green-100";
      case 'low': return "bg-blue-50 text-blue-600 border-blue-100";
      default: return "bg-gray-50 text-gray-600 border-gray-100";
    }
  };

  // Group tasks
  const groups = (() => {
    if (groupBy === 'category') {
      const buckets: { key: string; label: string; color: string; tasks: Task[] }[] = [];
      const catMap: Record<string, Task[]> = {};
      const uncategorized: Task[] = [];
      tasks.forEach(t => {
        if (t.category && TASK_CATEGORY_CONFIG[t.category]) {
          if (!catMap[t.category]) catMap[t.category] = [];
          catMap[t.category].push(t);
        } else {
          uncategorized.push(t);
        }
      });
      (Object.keys(TASK_CATEGORY_CONFIG) as TaskCategory[]).forEach(cat => {
        if (catMap[cat]?.length) {
          const cfg = TASK_CATEGORY_CONFIG[cat];
          buckets.push({ key: cat, label: language === 'ko' ? cfg.labelKo : cfg.label, color: cfg.color, tasks: catMap[cat] });
        }
      });
      if (uncategorized.length) buckets.push({ key: '_none', label: language === 'ko' ? '미분류' : 'Uncategorized', color: 'text-gray-500', tasks: uncategorized });
      return buckets;
    } else if (groupBy === 'time') {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const buckets: { key: string; label: string; color: string; tasks: Task[] }[] = [
        { key: 'today', label: language === 'ko' ? '오늘' : 'Today', color: 'text-orange-600', tasks: [] },
        { key: 'tomorrow', label: language === 'ko' ? '내일' : 'Tomorrow', color: 'text-blue-600', tasks: [] },
        { key: 'week', label: language === 'ko' ? '이번 주' : 'This Week', color: 'text-indigo-600', tasks: [] },
        { key: 'month', label: language === 'ko' ? '이번 달' : 'This Month', color: 'text-gray-500', tasks: [] },
      ];
      tasks.forEach(t => {
        if (!t.dueDate) { buckets[3].tasks.push(t); return; }
        const due = new Date(t.dueDate); due.setHours(0, 0, 0, 0);
        if (due <= today) buckets[0].tasks.push(t);
        else if (due.getTime() === tomorrow.getTime()) buckets[1].tasks.push(t);
        else if (due <= weekEnd) buckets[2].tasks.push(t);
        else buckets[3].tasks.push(t);
      });
      return buckets.filter(b => b.tasks.length > 0);
    } else {
      // status
      const statusOrder: { key: Task['status']; label: string; color: string }[] = [
        { key: 'pending', label: language === 'ko' ? '할 일' : 'To Do', color: 'text-gray-600' },
        { key: 'in-progress', label: language === 'ko' ? '진행 중' : 'In Progress', color: 'text-blue-600' },
        { key: 'routine', label: language === 'ko' ? '루틴' : 'Routine', color: 'text-purple-600' },
        { key: 'completed', label: language === 'ko' ? '완료' : 'Done', color: 'text-emerald-600' },
      ];
      return statusOrder.map(s => ({
        ...s,
        tasks: tasks.filter(t => t.status === s.key),
      })).filter(g => g.tasks.length > 0);
    }
  })();

  const renderTableHeader = () => (
    <thead>
      <tr className="bg-gray-50/50 border-b border-gray-100">
        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-12 text-center">#</th>
        <th className="px-4 sm:px-6 py-3 sm:py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[160px] sm:min-w-[300px]">
          {language === 'ko' ? "업무명" : "Task Name"}
        </th>
        <th className="px-3 sm:px-4 py-3 sm:py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {language === 'ko' ? "상태" : "Status"}
        </th>
        <th className="hidden sm:table-cell px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {language === 'ko' ? "우선순위" : "Priority"}
        </th>
        <th className="hidden md:table-cell px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {language === 'ko' ? "카테고리" : "Category"}
        </th>
        <th className="hidden md:table-cell px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {language === 'ko' ? "참여자" : "Participant"}
        </th>
        <th className="hidden sm:table-cell px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {language === 'ko' ? "마감일" : "Due Date"}
        </th>
        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-12"></th>
      </tr>
    </thead>
  );

  return (
    <div className="space-y-4">
      {tasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm px-6 py-20 text-center text-gray-400 italic">
          {language === 'ko' ? "등록된 업무가 없습니다." : "No tasks found."}
        </div>
      ) : (
        groups.map(group => (
          <div key={group.key} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Group header */}
            <div className="px-6 py-3 bg-gray-50/80 border-b border-gray-100 flex items-center gap-2">
              <span className={cn("text-sm font-bold", group.color)}>{group.label}</span>
              <span className="text-xs text-gray-400 font-medium">{group.tasks.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                {renderTableHeader()}
                <tbody className="divide-y divide-gray-100">
                  {group.tasks.map((task, index) => {
                    const assignee = members.find(m => m.id === task.assigneeId);
                    const title = language === 'ko' ? task.titleKo || task.title : task.title;
                    const isOverdue = task.dueDate && task.dueDate < new Date() && task.status !== 'completed';
                    return (
                      <tr
                        key={task.id}
                        className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                        onClick={() => navigate(p(`/tasks/${task.id}`))}
                      >
                        <td className="px-6 py-4 text-sm text-gray-400 font-mono text-center">
                          {String(index + 1).padStart(2, '0')}
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="relative shrink-0" ref={openStatusId === task.id ? statusRef : undefined}>
                              <button
                                onClick={(e) => { e.stopPropagation(); setOpenStatusId(openStatusId === task.id ? null : task.id); }}
                                className="shrink-0"
                              >
                                {getStatusIcon(task.status)}
                              </button>
                              {openStatusId === task.id && (
                                <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 min-w-[130px]">
                                  {STATUS_OPTIONS.map((opt) => {
                                    const Icon = opt.icon;
                                    return (
                                      <button
                                        key={opt.value}
                                        onClick={(e) => { e.stopPropagation(); if (task.status !== opt.value) onStatusChange?.(task.id, opt.value); setOpenStatusId(null); }}
                                        className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors", task.status === opt.value && "bg-blue-50/50 font-semibold")}
                                      >
                                        <Icon size={14} className={opt.color} />
                                        {language === 'ko' ? opt.labelKo : opt.labelEn}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className={cn("text-sm font-medium text-gray-900 line-clamp-1", task.status === 'completed' && "line-through text-gray-400")}>
                                {task.emoji && <span className="mr-1.5">{task.emoji}</span>}
                                {title}
                              </p>
                              {task.description && <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{task.description}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={cn(
                            "text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border",
                            task.status === 'completed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                            task.status === 'in-progress' ? "bg-blue-50 text-blue-600 border-blue-100" :
                            task.status === 'routine' ? "bg-purple-50 text-purple-600 border-purple-100" :
                            "bg-gray-100 text-gray-600 border-gray-200"
                          )}>
                            {task.status}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell px-4 py-4">
                          <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border", getPriorityColor(task.priority))}>
                            {task.priority || 'low'}
                          </span>
                        </td>
                        <td className="hidden md:table-cell px-4 py-4">
                          {task.category && TASK_CATEGORY_CONFIG[task.category] ? (() => {
                            const catCfg = TASK_CATEGORY_CONFIG[task.category];
                            return (
                              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1", catCfg.bg, catCfg.color, catCfg.border)}>
                                {catCfg.icon} {language === 'ko' ? catCfg.labelKo : catCfg.label}
                              </span>
                            );
                          })() : <span className="text-xs text-gray-300">-</span>}
                        </td>
                        <td className="hidden md:table-cell px-4 py-4">
                          {assignee ? (
                            <div className="flex items-center gap-2">
                              <img src={assignee.avatar} alt={assignee.name} className="w-6 h-6 rounded-full object-cover border border-gray-100" />
                              <span className="text-xs text-gray-600 font-medium">{assignee.name}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-gray-400">
                              <User size={14} />
                              <span className="text-[11px] italic">{language === 'ko' ? '나' : 'Me'}</span>
                            </div>
                          )}
                        </td>
                        <td className="hidden sm:table-cell px-4 py-4">
                          {task.dueDate ? (
                            <div className={cn("flex items-center gap-1.5 text-xs font-medium", isOverdue ? "text-red-500" : "text-gray-600")}>
                              <Calendar size={12} />
                              <span>{format(new Date(task.dueDate), "MMM d, yyyy")}</span>
                              {isOverdue && <AlertCircle size={12} className="shrink-0" />}
                            </div>
                          ) : <span className="text-xs text-gray-400">-</span>}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all">
                            <MoreHorizontal size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}