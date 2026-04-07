import { useState, useMemo } from "react";
import { ListChecks, Circle, Clock, CheckCircle2, X, UserCircle, Calendar } from "lucide-react";
import { cn } from "../../lib/utils";
import { useActionItems, type ActionItemRecord } from "../context/ActionItemContext";
import { useLanguage } from "../context/LanguageContext";
import { usePermission } from "../context/PermissionContext";

const STATUS_CONFIG = {
  pending: { label: "Pending", labelKo: "대기", color: "text-gray-400", icon: Circle },
  in_progress: { label: "In Progress", labelKo: "진행중", color: "text-blue-500", icon: Clock },
  completed: { label: "Done", labelKo: "완료", color: "text-green-500", icon: CheckCircle2 },
} as const;

const STATUS_CYCLE: Array<'pending' | 'in_progress' | 'completed'> = ['pending', 'in_progress', 'completed'];

type FilterStatus = 'all' | 'pending' | 'in_progress' | 'completed';

export function ActionItemsPage() {
  const { actionItems, updateActionItem, removeActionItem } = useActionItems();
  const { language } = useLanguage();
  const { members } = usePermission();
  const ko = language === "ko";

  const [filter, setFilter] = useState<FilterStatus>('all');
  const [showCompleted, setShowCompleted] = useState(false);

  const filtered = useMemo(() => {
    let items = [...actionItems];
    if (filter !== 'all') items = items.filter(i => i.status === filter);
    else if (!showCompleted) items = items.filter(i => i.status !== 'completed');
    return items.sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  }, [actionItems, filter, showCompleted]);

  const stats = useMemo(() => ({
    total: actionItems.length,
    pending: actionItems.filter(i => i.status === 'pending').length,
    inProgress: actionItems.filter(i => i.status === 'in_progress').length,
    completed: actionItems.filter(i => i.status === 'completed').length,
    overdue: actionItems.filter(i => i.status !== 'completed' && i.deadline && new Date(i.deadline) < new Date(new Date().toDateString())).length,
  }), [actionItems]);

  const handleStatusToggle = (item: ActionItemRecord) => {
    const currentIdx = STATUS_CYCLE.indexOf(item.status);
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];
    updateActionItem(item.id, { status: nextStatus });
  };

  const getMemberName = (id?: string) => {
    if (!id) return null;
    return members.find(m => m.id === id)?.name || null;
  };

  const isOverdue = (item: ActionItemRecord) =>
    item.status !== 'completed' && item.deadline && new Date(item.deadline) < new Date(new Date().toDateString());

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <ListChecks size={20} className="text-orange-500" />
          {ko ? "액션 아이템" : "Action Items"}
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {ko ? "모든 프로젝트의 액션 아이템" : "Action items across all projects"}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: ko ? "전체" : "Total", value: stats.total, color: "text-gray-700", bg: "bg-gray-50" },
          { label: ko ? "대기" : "Pending", value: stats.pending, color: "text-yellow-700", bg: "bg-yellow-50" },
          { label: ko ? "진행중" : "In Progress", value: stats.inProgress, color: "text-blue-700", bg: "bg-blue-50" },
          { label: ko ? "완료" : "Completed", value: stats.completed, color: "text-green-700", bg: "bg-green-50" },
        ].map(s => (
          <div key={s.label} className={cn("rounded-lg p-3 text-center", s.bg)}>
            <div className={cn("text-2xl font-bold", s.color)}>{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {stats.overdue > 0 && (
        <div className="mb-4 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 font-medium">
          {stats.overdue} {ko ? "개 기한 초과" : "overdue"}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {(['all', 'pending', 'in_progress', 'completed'] as FilterStatus[]).map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); if (f === 'completed') setShowCompleted(true); }}
              className={cn(
                "px-3 py-1 text-xs rounded-full transition-colors",
                filter === f ? "bg-orange-100 text-orange-700 font-medium" : "text-gray-400 hover:bg-gray-100"
              )}
            >
              {f === 'all' ? (ko ? "전체" : "All") :
               f === 'pending' ? (ko ? "대기" : "Pending") :
               f === 'in_progress' ? (ko ? "진행중" : "In Progress") :
               (ko ? "완료" : "Completed")}
            </button>
          ))}
        </div>
        {filter === 'all' && stats.completed > 0 && (
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showCompleted ? (ko ? "완료 숨기기" : "Hide done") : `${ko ? "완료 보기" : "Show done"} (${stats.completed})`}
          </button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ListChecks size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{ko ? "액션 아이템이 없습니다" : "No action items"}</p>
          <p className="text-xs mt-1">{ko ? "회의 처리 시 자동 생성되거나 프로젝트에서 수동 추가" : "Auto-created when processing meetings or add manually from projects"}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map(item => {
            const statusConf = STATUS_CONFIG[item.status];
            const StatusIcon = statusConf.icon;
            const overdue = isOverdue(item);
            const assigneeName = getMemberName(item.assigneeId);

            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 py-2.5 px-3 rounded-lg group hover:bg-gray-50 transition-colors",
                  item.status === 'completed' && "opacity-50"
                )}
              >
                <button
                  onClick={() => handleStatusToggle(item)}
                  className={cn("shrink-0 transition-colors hover:scale-110", statusConf.color)}
                >
                  <StatusIcon size={20} />
                </button>

                <span className={cn(
                  "text-sm flex-1 min-w-0",
                  item.status === 'completed' && "line-through text-gray-400"
                )}>
                  {item.task}
                </span>

                {assigneeName && (
                  <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
                    <UserCircle size={12} />
                    {assigneeName}
                  </span>
                )}

                {item.deadline && (
                  <span className={cn(
                    "text-xs flex items-center gap-1 shrink-0",
                    overdue ? "text-red-500 font-medium" : "text-gray-400"
                  )}>
                    <Calendar size={10} />
                    {new Date(item.deadline).toLocaleDateString(ko ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}

                <button
                  onClick={() => removeActionItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all p-1"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
