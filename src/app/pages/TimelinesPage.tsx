import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { Diamond, Calendar, ChevronDown, Circle, Clock, CheckCircle2, X, Plus } from "lucide-react";
import { cn } from "../../lib/utils";
import { useTimeline, type TimelineMilestone } from "../context/TimelineContext";
import { useLanguage } from "../context/LanguageContext";
import { useOrgPath } from "../hooks/useOrgPath";
import { useInvite } from "../context/InviteContext";

const STATUS_CONFIG = {
  pending: { label: "Pending", labelKo: "대기", color: "bg-gray-200 text-gray-700", icon: Circle, dotColor: "bg-gray-400" },
  in_progress: { label: "In Progress", labelKo: "진행중", color: "bg-blue-100 text-blue-700", icon: Clock, dotColor: "bg-blue-500" },
  completed: { label: "Completed", labelKo: "완료", color: "bg-green-100 text-green-700", icon: CheckCircle2, dotColor: "bg-green-500" },
} as const;

const PRIORITY_CONFIG = {
  high: { label: "High", labelKo: "높음", color: "bg-red-100 text-red-700" },
  medium: { label: "Medium", labelKo: "보통", color: "bg-yellow-100 text-yellow-700" },
  low: { label: "Low", labelKo: "낮음", color: "bg-gray-100 text-gray-500" },
} as const;

const STATUS_CYCLE: Array<'pending' | 'in_progress' | 'completed'> = ['pending', 'in_progress', 'completed'];

type FilterStatus = 'all' | 'pending' | 'in_progress' | 'completed';

export function TimelinesPage() {
  const { milestones, updateMilestone, removeMilestone } = useTimeline();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const p = useOrgPath();
  const { org } = useInvite();
  const ko = language === "ko";

  const [filter, setFilter] = useState<FilterStatus>('all');

  const filtered = useMemo(() => {
    let items = [...milestones];
    if (filter !== 'all') items = items.filter(m => m.status === filter);
    return items.sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
  }, [milestones, filter]);

  const stats = useMemo(() => ({
    total: milestones.length,
    pending: milestones.filter(m => m.status === 'pending').length,
    inProgress: milestones.filter(m => m.status === 'in_progress').length,
    completed: milestones.filter(m => m.status === 'completed').length,
    overdue: milestones.filter(m => m.status !== 'completed' && new Date(m.targetDate) < new Date(new Date().toDateString())).length,
  }), [milestones]);

  const handleStatusToggle = (m: TimelineMilestone) => {
    const currentIdx = STATUS_CYCLE.indexOf(m.status);
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];
    updateMilestone(m.id, { status: nextStatus });
  };

  const isOverdue = (m: TimelineMilestone) =>
    m.status !== 'completed' && new Date(m.targetDate) < new Date(new Date().toDateString());

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Diamond size={20} className="text-purple-500" />
            {ko ? "타임라인" : "Timelines"}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {ko ? "모든 프로젝트의 마일스톤을 한눈에" : "All project milestones at a glance"}
          </p>
        </div>
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

      {/* Filter */}
      <div className="flex gap-1 mb-4">
        {(['all', 'pending', 'in_progress', 'completed'] as FilterStatus[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1 text-xs rounded-full transition-colors",
              filter === f ? "bg-purple-100 text-purple-700 font-medium" : "text-gray-400 hover:bg-gray-100"
            )}
          >
            {f === 'all' ? (ko ? "전체" : "All") :
             f === 'pending' ? (ko ? "대기" : "Pending") :
             f === 'in_progress' ? (ko ? "진행중" : "In Progress") :
             (ko ? "완료" : "Completed")}
          </button>
        ))}
      </div>

      {/* Timeline list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Diamond size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{ko ? "마일스톤이 없습니다" : "No milestones"}</p>
          <p className="text-xs mt-1">{ko ? "프로젝트 상세에서 추가하거나 회의 처리 시 자동 생성됩니다" : "Add from project detail or auto-created when processing meetings"}</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />
          <div className="space-y-0">
            {filtered.map(m => {
              const statusConf = STATUS_CONFIG[m.status];
              const priorityConf = PRIORITY_CONFIG[m.priority];
              const overdue = isOverdue(m);
              const StatusIcon = statusConf.icon;

              return (
                <div key={m.id} className="relative flex items-start gap-3 py-3 group">
                  <button
                    onClick={() => handleStatusToggle(m)}
                    className={cn(
                      "relative z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0",
                      "ring-4 ring-white cursor-pointer hover:scale-110",
                      statusConf.dotColor,
                      overdue && "ring-red-100"
                    )}
                  >
                    <StatusIcon size={12} className="text-white" />
                  </button>

                  <div className={cn("flex-1 min-w-0", m.status === 'completed' && "opacity-60")}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "text-sm font-medium",
                        m.status === 'completed' && "line-through text-gray-400",
                        overdue && "text-red-600"
                      )}>
                        {m.milestone}
                      </span>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", priorityConf.color)}>
                        {ko ? priorityConf.labelKo : priorityConf.label}
                      </span>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", statusConf.color)}>
                        {ko ? statusConf.labelKo : statusConf.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className={cn(
                        "text-xs flex items-center gap-1",
                        overdue ? "text-red-500 font-medium" : "text-gray-400"
                      )}>
                        <Calendar size={10} />
                        {new Date(m.targetDate).toLocaleDateString(ko ? 'ko-KR' : 'en-US', {
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                        {overdue && (ko ? " (기한 초과)" : " (overdue)")}
                      </span>
                      {m.notes && <span className="text-xs text-gray-400 truncate max-w-[300px]">{m.notes}</span>}
                    </div>
                  </div>

                  <button
                    onClick={() => removeMilestone(m.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all p-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
