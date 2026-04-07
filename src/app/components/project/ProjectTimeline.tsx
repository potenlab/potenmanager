import { useState, useMemo } from "react";
import { Plus, X, Diamond, Calendar, Flag, CheckCircle2, Circle, Clock } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useTimeline, type TimelineMilestone } from "../../context/TimelineContext";
import { useLanguage } from "../../context/LanguageContext";

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

interface ProjectTimelineProps {
  projectId: string;
  orgId: string;
}

export function ProjectTimeline({ projectId, orgId }: ProjectTimelineProps) {
  const { milestones, addMilestone, updateMilestone, removeMilestone } = useTimeline();
  const { language } = useLanguage();
  const ko = language === "ko";

  const [showForm, setShowForm] = useState(false);
  const [newMilestone, setNewMilestone] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>("medium");

  const projectMilestones = useMemo(() =>
    milestones
      .filter(m => m.projectId === projectId)
      .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()),
    [milestones, projectId]
  );

  const handleAdd = () => {
    if (!newMilestone.trim() || !newDate) return;
    addMilestone({
      projectId,
      orgId,
      milestone: newMilestone.trim(),
      targetDate: newDate,
      priority: newPriority,
      status: 'pending',
    });
    setNewMilestone("");
    setNewDate("");
    setNewPriority("medium");
    setShowForm(false);
  };

  const handleStatusToggle = (m: TimelineMilestone) => {
    const currentIdx = STATUS_CYCLE.indexOf(m.status);
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];
    updateMilestone(m.id, { status: nextStatus });
  };

  const isOverdue = (m: TimelineMilestone) =>
    m.status !== 'completed' && new Date(m.targetDate) < new Date(new Date().toDateString());

  return (
    <div className="py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Diamond size={16} className="text-purple-500" />
          <h3 className="text-sm font-semibold text-gray-700">
            {ko ? "타임라인" : "Timeline"}
          </h3>
          <span className="text-xs text-gray-400">
            {projectMilestones.length} {ko ? "개 마일스톤" : "milestones"}
          </span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-purple-500 transition-colors"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? (ko ? "취소" : "Cancel") : (ko ? "추가" : "Add")}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-6 p-3 rounded-lg border border-purple-200 bg-purple-50/50">
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder={ko ? "마일스톤 이름" : "Milestone name"}
              value={newMilestone}
              onChange={e => setNewMilestone(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-md border border-gray-200 focus:border-purple-400 focus:outline-none"
              autoFocus
              onKeyDown={e => e.key === "Enter" && handleAdd()}
            />
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="text-sm px-3 py-1.5 rounded-md border border-gray-200 focus:border-purple-400 focus:outline-none flex-1"
              />
              <select
                value={newPriority}
                onChange={e => setNewPriority(e.target.value as any)}
                className="text-sm px-3 py-1.5 rounded-md border border-gray-200 focus:border-purple-400 focus:outline-none"
              >
                <option value="high">{ko ? "높음" : "High"}</option>
                <option value="medium">{ko ? "보통" : "Medium"}</option>
                <option value="low">{ko ? "낮음" : "Low"}</option>
              </select>
              <button
                onClick={handleAdd}
                disabled={!newMilestone.trim() || !newDate}
                className="px-3 py-1.5 text-sm rounded-md bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {ko ? "추가" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      {projectMilestones.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Diamond size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">{ko ? "아직 마일스톤이 없습니다" : "No milestones yet"}</p>
          <p className="text-xs mt-1">{ko ? "회의 처리 시 자동으로 추가되거나 수동으로 추가할 수 있습니다" : "Milestones are auto-extracted from meetings or can be added manually"}</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />

          <div className="space-y-0">
            {projectMilestones.map((m, idx) => {
              const statusConf = STATUS_CONFIG[m.status];
              const priorityConf = PRIORITY_CONFIG[m.priority];
              const overdue = isOverdue(m);
              const StatusIcon = statusConf.icon;

              return (
                <div key={m.id} className="relative flex items-start gap-3 py-3 group">
                  {/* Dot */}
                  <button
                    onClick={() => handleStatusToggle(m)}
                    className={cn(
                      "relative z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0",
                      "ring-4 ring-white cursor-pointer hover:scale-110",
                      statusConf.dotColor,
                      overdue && "ring-red-100"
                    )}
                    title={ko ? "상태 변경" : "Toggle status"}
                  >
                    <StatusIcon size={12} className="text-white" />
                  </button>

                  {/* Content */}
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

                      {m.notes && (
                        <span className="text-xs text-gray-400 truncate max-w-[200px]">{m.notes}</span>
                      )}
                    </div>
                  </div>

                  {/* Delete button */}
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
