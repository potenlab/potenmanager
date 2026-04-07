import { useState, useMemo } from "react";
import { Plus, X, CheckSquare, Square, Clock, CheckCircle2, Circle, UserCircle } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useActionItems, type ActionItemRecord } from "../../context/ActionItemContext";
import { useLanguage } from "../../context/LanguageContext";
import { usePermission } from "../../context/PermissionContext";

const STATUS_CONFIG = {
  pending: { label: "Pending", labelKo: "대기", color: "text-gray-400", icon: Circle },
  in_progress: { label: "In Progress", labelKo: "진행중", color: "text-blue-500", icon: Clock },
  completed: { label: "Done", labelKo: "완료", color: "text-green-500", icon: CheckCircle2 },
} as const;

const STATUS_CYCLE: Array<'pending' | 'in_progress' | 'completed'> = ['pending', 'in_progress', 'completed'];

interface ProjectActionItemsProps {
  projectId: string;
  orgId: string;
}

export function ProjectActionItems({ projectId, orgId }: ProjectActionItemsProps) {
  const { actionItems, addActionItem, updateActionItem, removeActionItem } = useActionItems();
  const { language } = useLanguage();
  const { members } = usePermission();
  const ko = language === "ko";

  const [showForm, setShowForm] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  const projectItems = useMemo(() => {
    const items = actionItems.filter(i => i.projectId === projectId);
    if (!showCompleted) return items.filter(i => i.status !== 'completed');
    return items;
  }, [actionItems, projectId, showCompleted]);

  const completedCount = useMemo(() =>
    actionItems.filter(i => i.projectId === projectId && i.status === 'completed').length,
    [actionItems, projectId]
  );

  const handleAdd = () => {
    if (!newTask.trim()) return;
    addActionItem({
      projectId,
      orgId,
      task: newTask.trim(),
      deadline: newDeadline || undefined,
      assigneeId: newAssignee || undefined,
      status: 'pending',
    });
    setNewTask("");
    setNewDeadline("");
    setNewAssignee("");
    setShowForm(false);
  };

  const handleStatusToggle = (item: ActionItemRecord) => {
    const currentIdx = STATUS_CYCLE.indexOf(item.status);
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];
    updateActionItem(item.id, { status: nextStatus });
  };

  const getMemberName = (id?: string) => {
    if (!id) return null;
    const m = members.find(m => m.id === id);
    return m?.name || null;
  };

  const isOverdue = (item: ActionItemRecord) =>
    item.status !== 'completed' && item.deadline && new Date(item.deadline) < new Date(new Date().toDateString());

  return (
    <div className="py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckSquare size={16} className="text-orange-500" />
          <h3 className="text-sm font-semibold text-gray-700">
            {ko ? "액션 아이템" : "Action Items"}
          </h3>
          <span className="text-xs text-gray-400">
            {projectItems.length}{completedCount > 0 && !showCompleted ? ` (+${completedCount} ${ko ? "완료" : "done"})` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {completedCount > 0 && (
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showCompleted ? (ko ? "완료 숨기기" : "Hide done") : (ko ? "완료 보기" : "Show done")}
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-orange-500 transition-colors"
          >
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? (ko ? "취소" : "Cancel") : (ko ? "추가" : "Add")}
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-4 p-3 rounded-lg border border-orange-200 bg-orange-50/50">
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder={ko ? "할 일 입력" : "Task description"}
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-md border border-gray-200 focus:border-orange-400 focus:outline-none"
              autoFocus
              onKeyDown={e => e.key === "Enter" && handleAdd()}
            />
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={newDeadline}
                onChange={e => setNewDeadline(e.target.value)}
                className="text-sm px-3 py-1.5 rounded-md border border-gray-200 focus:border-orange-400 focus:outline-none flex-1"
                placeholder={ko ? "기한" : "Deadline"}
              />
              <select
                value={newAssignee}
                onChange={e => setNewAssignee(e.target.value)}
                className="text-sm px-3 py-1.5 rounded-md border border-gray-200 focus:border-orange-400 focus:outline-none flex-1"
              >
                <option value="">{ko ? "담당자 선택" : "Assign to..."}</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <button
                onClick={handleAdd}
                disabled={!newTask.trim()}
                className="px-3 py-1.5 text-sm rounded-md bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {ko ? "추가" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {projectItems.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <CheckSquare size={28} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">{ko ? "액션 아이템이 없습니다" : "No action items"}</p>
          <p className="text-xs mt-1">{ko ? "회의 처리 시 자동 추출되거나 수동으로 추가할 수 있습니다" : "Auto-extracted from meetings or add manually"}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {projectItems.map(item => {
            const statusConf = STATUS_CONFIG[item.status];
            const StatusIcon = statusConf.icon;
            const overdue = isOverdue(item);
            const assigneeName = getMemberName(item.assigneeId);

            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-2 py-2 px-2 rounded-md group hover:bg-gray-50 transition-colors",
                  item.status === 'completed' && "opacity-50"
                )}
              >
                <button
                  onClick={() => handleStatusToggle(item)}
                  className={cn("shrink-0 transition-colors hover:scale-110", statusConf.color)}
                  title={ko ? "상태 변경" : "Toggle status"}
                >
                  <StatusIcon size={18} />
                </button>

                <span className={cn(
                  "text-sm flex-1 min-w-0 truncate",
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
                    "text-xs shrink-0",
                    overdue ? "text-red-500 font-medium" : "text-gray-400"
                  )}>
                    {new Date(item.deadline).toLocaleDateString(ko ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}

                <button
                  onClick={() => removeActionItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all p-0.5"
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
