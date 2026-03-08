import { useMemo } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router";
import {
  CheckCircle2,
  ChevronRight as ChevronRightIcon,
  Circle,
  CircleDot,
  Clock,
  Calendar,
  Flag,
  Milestone,
  Target,
  ChevronDown,
  X,
  Check,
  Zap,
  TrendingUp,
  Trash2,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { GoalLevel } from "../../lib/mockData";
import { useLanguage } from "../context/LanguageContext";
import { usePermission } from "../context/PermissionContext";
import { useGoalContext } from "../context/GoalContext";
import { NotionBlockEditor } from "../components/NotionBlockEditor";
import { UrlPreviewSection } from "../components/detail/UrlPreviewCard";
import { NotionDateRangePicker } from "../components/NotionDateRangePicker";
import { TaskRecommendationPanel } from "../components/tasks/TaskRecommendationPanel";
import { useState, useRef, useEffect } from "react";

type GoalStatus = "pending" | "in-progress" | "completed";

const STATUS_CONFIG: Record<GoalStatus, { label: string; labelKo: string; icon: React.ReactNode; color: string; bg: string }> = {
  pending: { label: "To Do", labelKo: "예정", icon: <Circle size={14} />, color: "text-gray-500", bg: "bg-gray-100" },
  "in-progress": { label: "In Progress", labelKo: "진행 중", icon: <CircleDot size={14} />, color: "text-blue-600", bg: "bg-blue-50" },
  completed: { label: "Done", labelKo: "완료", icon: <CheckCircle2 size={14} />, color: "text-emerald-600", bg: "bg-emerald-50" },
};

const LEVEL_CONFIG: Record<string, { label: string; labelKo: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  Year:    { label: "Annual", labelKo: "연간", icon: <Flag size={14} />, color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
  Quarter: { label: "Quarterly", labelKo: "분기", icon: <Milestone size={14} />, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  Month:   { label: "Monthly", labelKo: "월간", icon: <Target size={14} />, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  Urgent:  { label: "Urgent", labelKo: "긴급", icon: <Zap size={14} />, color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
};

// ─── Inline Editable Text ───────────────────────────────────────────
function InlineText({
  value,
  onChange,
  placeholder,
  className,
  as = "p",
  readOnly = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  as?: "h1" | "p" | "span";
  readOnly?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (ref.current && !isFocused) {
      ref.current.textContent = value;
    }
  }, [value, isFocused]);

  const handleBlur = () => {
    setIsFocused(false);
    const newVal = ref.current?.textContent?.trim() || "";
    if (newVal !== value) onChange(newVal);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && as !== "p") {
      e.preventDefault();
      ref.current?.blur();
    }
  };

  return (
    <div
      ref={ref}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      onFocus={() => !readOnly && setIsFocused(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      data-placeholder={placeholder}
      className={cn(
        "outline-none rounded-lg transition-colors relative",
        "empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300 empty:before:pointer-events-none",
        !readOnly && "focus:bg-gray-50 focus:ring-2 focus:ring-blue-100 px-1 -mx-1",
        !readOnly && "hover:bg-gray-50/50",
        readOnly && "cursor-default",
        className
      )}
    />
  );
}

// ─── Portal Position Helper ──────────────────────────────────────────
function usePortalPosition(open: boolean, triggerRef: React.RefObject<HTMLElement | null>) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useEffect(() => {
    if (!open || !triggerRef.current) { setPos(null); return; }
    const rect = triggerRef.current.getBoundingClientRect();
    let top = rect.bottom + 4;
    let left = rect.left;
    if (left + 240 > window.innerWidth - 16) left = window.innerWidth - 256;
    if (top + 300 > window.innerHeight - 16) top = rect.top - 304;
    setPos({ top, left });
  }, [open]);
  return pos;
}

// ─── Dropdown Select (Portal) ───────────────────────────────────────
function InlineDropdown<T extends string>({
  value,
  options,
  onChange,
  renderOption,
  renderValue,
  disabled = false,
}: {
  value: T;
  options: T[];
  onChange: (v: T) => void;
  renderOption: (opt: T) => React.ReactNode;
  renderValue: (val: T) => React.ReactNode;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const pos = usePortalPosition(open, triggerRef);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popupRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
        {renderValue(value)}
        {!disabled && <ChevronDown size={12} className="text-gray-400" />}
      </button>
      {open && pos && createPortal(
        <div
          ref={popupRef}
          className="fixed bg-white border border-gray-200 rounded-xl shadow-lg z-[9999] min-w-[160px] py-1"
          style={{ top: pos.top, left: pos.left }}
        >
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors",
                opt === value && "bg-blue-50/50"
              )}
            >
              {renderOption(opt)}
              {opt === value && <Check size={14} className="ml-auto text-blue-600" />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

// ─── Main Goal Detail Page ────────────────────────────────────────────
export function GoalDetailPage() {
  const { goalId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const ko = language === "ko";
  const { can } = usePermission();
  const { allGoals, updateGoal, removeGoal } = useGoalContext();

  const goal = goalId ? allGoals.find((g) => g.id === goalId) : null;

  // Children of this goal (for checklist progress)
  const children = useMemo(
    () => allGoals.filter((g) => g.parentId === goalId),
    [allGoals, goalId]
  );
  const hasChildren = children.length > 0;

  // Auto-calculated progress from children
  const calculatedProgress = useMemo(() => {
    if (!hasChildren) return goal?.progress || 0;
    const completed = children.filter((c) => c.status === "completed").length;
    return Math.round((completed / children.length) * 100);
  }, [children, hasChildren, goal?.progress]);

  const canEdit = can("goal.editAny");
  const canDelete = can("goal.deleteAny");
  const [showRecommendPanel, setShowRecommendPanel] = useState(false);

  // ─── Auto-save handlers ──────────────────────────────────────────
  const handleTitleChange = (v: string) => {
    if (goalId) updateGoal(goalId, { title: v, titleKo: v });
  };

  const handleStatusChange = (v: GoalStatus) => {
    if (goalId) {
      updateGoal(goalId, {
        status: v,
        progress: v === "completed" ? 100 : v === "pending" ? 0 : goal?.progress || 0,
      });
    }
  };

  const handleLevelChange = (v: GoalLevel) => {
    if (goalId) updateGoal(goalId, { level: v });
  };

  const handleDateChange = (s: Date | null, e: Date | null) => {
    if (goalId) updateGoal(goalId, { startDate: s || undefined, endDate: e || undefined });
  };

  const handleChildToggle = (childId: string, done: boolean) => {
    // Update child goal
    updateGoal(childId, {
      status: done ? "completed" : "pending",
      progress: done ? 100 : 0,
    });

    // Recalculate and update parent progress
    const newCompletedCount = children.filter((c) =>
      c.id === childId ? done : c.status === "completed"
    ).length;
    const newProgress = Math.round((newCompletedCount / children.length) * 100);

    if (goalId) {
      updateGoal(goalId, {
        progress: newProgress,
        status: newProgress === 100 ? "completed" : newProgress > 0 ? "in-progress" : "pending",
      });
    }
  };

  // Simple toggle for leaf goals
  const handleLeafToggle = (done: boolean) => {
    if (goalId) {
      updateGoal(goalId, {
        status: done ? "completed" : "pending",
        progress: done ? 100 : 0,
      });
    }
  };

  const handleDelete = () => {
    if (confirm(ko ? "정말 삭제하시겠습니까?" : "Are you sure you want to delete?")) {
      if (goalId) removeGoal(goalId);
      navigate(-1);
    }
  };

  // Not found
  if (!goal) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Target size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">{ko ? "목표를 찾을 수 없습니다" : "Goal not found"}</p>
          <button onClick={() => navigate("/organization")} className="mt-3 text-sm text-blue-500 hover:text-blue-700">
            {ko ? "돌아가기" : "Go back"}
          </button>
        </div>
      </div>
    );
  }

  const title = ko ? (goal.titleKo || goal.title) : goal.title;
  const status = (goal.status as GoalStatus) || "pending";
  const level = (goal.level as GoalLevel) || "Quarter";
  const progress = hasChildren ? calculatedProgress : (goal.progress || 0);

  return (
    <div className="h-full overflow-y-auto bg-white scrollbar-hide">
      <div className="max-w-6xl mx-auto py-4 sm:py-7 px-4 sm:px-8 pb-64">

        {/* Back + Breadcrumb Navigation & Header */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-2 -ml-0.5"
        >
          <ArrowLeft size={14} />
          <span>{ko ? "뒤로가기" : "Back"}</span>
        </button>
        <div className="flex items-center justify-between mb-6">
          <nav className="flex items-center gap-1 text-sm">
            <button onClick={() => navigate("/organization")} className="text-gray-400 hover:text-blue-600 transition-colors font-medium">
              {ko ? "전략 목표" : "Goals"}
            </button>
            <ChevronRightIcon size={14} className="text-gray-300 shrink-0" />
            <span className="text-gray-700 font-semibold truncate max-w-[200px]">
              {title || (ko ? "목표" : "Goal")}
            </span>
          </nav>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => setShowRecommendPanel(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-xl transition-all border border-purple-200"
              >
                <Sparkles size={14} />
                {ko ? "AI 업무 추천" : "AI Task Suggest"}
              </button>
            )}
            <button
              onClick={() => navigate("/strategy/new")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-blue-200"
            >
              <Sparkles size={14} />
              AI {ko ? "전략 생성" : "Strategy"}
            </button>
            {canDelete && (
              <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>

        <div className="max-w-3xl">

          <div className="space-y-6">
            {/* Title */}
            <div>
              <InlineText
                value={title} onChange={handleTitleChange} readOnly={!canEdit}
                placeholder={ko ? "목표 제목" : "Goal Title"}
                className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight tracking-tight focus:ring-0 focus:bg-transparent hover:bg-transparent border-b-2 border-transparent focus:border-gray-200 rounded-none pb-0.5"
                as="h1"
              />
            </div>

            {/* Properties — one per row, notion style */}
            <div className="bg-gray-50/50 rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
              <PropertyItem icon={<Clock size={14} />} label={ko ? "상태" : "Status"}>
                <InlineDropdown
                  value={status} options={["pending", "in-progress", "completed"] as GoalStatus[]}
                  onChange={handleStatusChange} disabled={!canEdit}
                  renderValue={(v) => {
                    const cfg = STATUS_CONFIG[v];
                    return <span className={cn("flex items-center gap-1.5 font-bold", cfg.color)}>{cfg.icon} {ko ? cfg.labelKo : cfg.label}</span>;
                  }}
                  renderOption={(o) => <span className={cn("flex items-center gap-2", STATUS_CONFIG[o].color)}>{STATUS_CONFIG[o].icon} {ko ? STATUS_CONFIG[o].labelKo : STATUS_CONFIG[o].label}</span>}
                />
              </PropertyItem>

              <PropertyItem icon={<Milestone size={14} />} label={ko ? "단계" : "Level"}>
                <InlineDropdown
                  value={level} options={["Year", "Quarter", "Month", "Urgent"] as GoalLevel[]}
                  onChange={handleLevelChange} disabled={!canEdit}
                  renderValue={(v) => <span className={cn("px-2 py-0.5 rounded-md font-bold", LEVEL_CONFIG[v]?.bg, LEVEL_CONFIG[v]?.color)}>{ko ? LEVEL_CONFIG[v]?.labelKo : LEVEL_CONFIG[v]?.label}</span>}
                  renderOption={(o) => <span className={cn("flex items-center gap-2", LEVEL_CONFIG[o]?.color)}>{LEVEL_CONFIG[o]?.icon} {ko ? LEVEL_CONFIG[o]?.labelKo : LEVEL_CONFIG[o]?.label}</span>}
                />
              </PropertyItem>

              <PropertyItem icon={<Calendar size={14} />} label={ko ? "기간" : "Timeline"}>
                <NotionDateRangePicker
                  startDate={goal.startDate ? new Date(goal.startDate) : null}
                  endDate={goal.endDate ? new Date(goal.endDate) : null}
                  onChange={handleDateChange}
                  language={language}
                />
              </PropertyItem>

              <PropertyItem icon={<TrendingUp size={14} />} label={ko ? "진행률" : "Progress"}>
                {hasChildren ? (
                  /* Auto-calculated progress from children */
                  <div className="flex items-center gap-3 px-2 py-1">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", progress === 100 ? "bg-emerald-500" : "bg-[#0079FF]")}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-700 min-w-[32px]">{progress}%</span>
                    <span className="text-[10px] text-gray-400">
                      ({children.filter((c) => c.status === "completed").length}/{children.length})
                    </span>
                  </div>
                ) : (
                  /* Simple checkbox toggle for leaf goals */
                  <label className={cn("flex items-center gap-3 px-2 py-1 rounded-md transition-colors", canEdit && "cursor-pointer hover:bg-gray-100")}>
                    <button
                      onClick={() => canEdit && handleLeafToggle(goal.status !== "completed")}
                      disabled={!canEdit}
                      className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                        goal.status === "completed"
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-gray-300 hover:border-blue-400"
                      )}
                    >
                      {goal.status === "completed" && <Check size={12} />}
                    </button>
                    <span className={cn("text-sm font-medium", goal.status === "completed" ? "text-emerald-600" : "text-gray-500")}>
                      {goal.status === "completed" ? (ko ? "완료됨" : "Completed") : (ko ? "미완료" : "Not completed")}
                    </span>
                  </label>
                )}
              </PropertyItem>
            </div>

            {/* Children Checklist (if parent goal) */}
            {hasChildren && (
              <div className="bg-gray-50/50 rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {ko ? "세부 항목" : "Sub-goals"} ({children.filter((c) => c.status === "completed").length}/{children.length})
                  </p>
                </div>
                <div className="divide-y divide-gray-100">
                  {children.map((child) => {
                    const childTitle = ko ? (child.titleKo || child.title) : child.title;
                    const isDone = child.status === "completed";
                    return (
                      <div
                        key={child.id}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 transition-colors",
                          canEdit && "hover:bg-gray-50 cursor-pointer"
                        )}
                        onClick={() => canEdit && handleChildToggle(child.id, !isDone)}
                      >
                        <div
                          className={cn(
                            "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                            isDone
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-gray-300"
                          )}
                        >
                          {isDone && <Check size={12} />}
                        </div>
                        <span className={cn(
                          "text-sm flex-1 transition-colors",
                          isDone ? "line-through text-gray-400" : "text-gray-700"
                        )}>
                          {childTitle}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description / Editor */}
            <div className="min-h-[200px] border-t border-gray-100 pt-5">
              <NotionBlockEditor
                initialContent=""
                onChange={() => {}}
                readOnly={!canEdit}
                placeholder={ko ? "내용을 입력하세요..." : "Type something..."}
                parentType="goal"
                parentId={goalId}
              />

              <UrlPreviewSection content="" language={language} />
            </div>
          </div>
        </div>

        {/* AI Task Recommendation Panel */}
        <TaskRecommendationPanel
          isOpen={showRecommendPanel}
          onClose={() => setShowRecommendPanel(false)}
        />
      </div>
    </div>
  );
}

function PropertyItem({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50/80 transition-colors group">
      <div className="flex items-center gap-2 w-[110px] shrink-0 text-gray-400 font-medium text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
