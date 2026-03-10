import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import {
  Sparkles, X, ChevronRight, Plus, CheckCircle2, RefreshCw,
  TrendingUp, Calendar, User, Tag, AlertTriangle, Target,
  Zap, Clock, ArrowUpRight, Info
} from "lucide-react";
import { generateRecommendations, getGoalContextSummary, TaskRecommendation, GoalContext } from "../../../lib/taskRecommendation";
import { Task } from "../../../lib/mockData";
import { useLanguage } from "../../context/LanguageContext";
import { useTaskContext } from "../../context/TaskContext";
import { useGoalContext } from "../../context/GoalContext";
import { usePermission } from "../../context/PermissionContext";
import { format, differenceInDays } from "date-fns";
import { ko as koLocale } from "date-fns/locale";
import { cn } from "../../../lib/utils";
import { toast } from "sonner";

// ─── Constants ──────────────────────────────────────────────────────────────
const LEVEL_CONFIG: Record<string, { label: string; labelKo: string; color: string; bg: string; icon: React.ReactNode }> = {
  Week:    { label: "Weekly Goal",   labelKo: "주간 목표",   color: "text-blue-600",   bg: "bg-blue-50 border-blue-200",   icon: <Zap size={11} /> },
  Month:   { label: "Monthly Goal",  labelKo: "월간 목표",   color: "text-purple-600", bg: "bg-purple-50 border-purple-200", icon: <Target size={11} /> },
  Quarter: { label: "Quarter Goal",  labelKo: "분기 목표",   color: "text-emerald-600",bg: "bg-emerald-50 border-emerald-200", icon: <TrendingUp size={11} /> },
  Urgent:  { label: "Urgent",        labelKo: "긴급 미션",   color: "text-red-600",    bg: "bg-red-50 border-red-200",     icon: <AlertTriangle size={11} /> },
};

const PRIORITY_CONFIG = {
  high:   { label: "긴급",  labelEn: "High",   color: "text-red-600",   bg: "bg-red-50",   border: "border-red-200" },
  medium: { label: "보통",  labelEn: "Medium", color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
  low:    { label: "낮음",  labelEn: "Low",    color: "text-gray-500",  bg: "bg-gray-50",  border: "border-gray-200" },
};

// ─── Goal Context Card ───────────────────────────────────────────────────────
function GoalContextCard({ goal, language }: { goal: GoalContext; language: string }) {
  const cfg = LEVEL_CONFIG[goal.level] ?? LEVEL_CONFIG.Week;
  const title = language === "ko" ? goal.titleKo || goal.title : goal.title;
  const isUrgent = goal.daysLeft <= 5;

  return (
    <div className={cn("rounded-xl border p-3 bg-white shadow-sm", isUrgent && "ring-1 ring-red-200")}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className={cn("flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border", cfg.bg, cfg.color)}>
          {cfg.icon}
          <span className="ml-0.5">{language === "ko" ? cfg.labelKo : cfg.label}</span>
        </div>
        <div className={cn("flex items-center gap-1 text-[11px] font-semibold", isUrgent ? "text-red-500" : "text-gray-500")}>
          <Clock size={10} />
          {goal.daysLeft === 0 ? "D-Day" : `D-${goal.daysLeft}`}
        </div>
      </div>
      <p className="text-xs font-semibold text-gray-800 leading-snug mb-2 line-clamp-2">{title}</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", goal.progress >= 80 ? "bg-emerald-500" : goal.progress >= 50 ? "bg-blue-500" : "bg-amber-500")}
            style={{ width: `${goal.progress}%` }}
          />
        </div>
        <span className="text-[11px] font-bold text-gray-600 shrink-0">{goal.progress}%</span>
      </div>
    </div>
  );
}

// ─── Recommendation Card ─────────────────────────────────────────────────────
function RecommendationCard({
  rec,
  index,
  isAdded,
  onAdd,
  language,
}: {
  rec: TaskRecommendation;
  index: number;
  isAdded: boolean;
  onAdd: (rec: TaskRecommendation) => void;
  language: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const { members } = usePermission();
  const assignee = rec.suggestedAssigneeId ? members.find((m) => m.id === rec.suggestedAssigneeId) : null;
  const levelCfg = LEVEL_CONFIG[rec.goalLevel] ?? LEVEL_CONFIG.Week;
  const pCfg = PRIORITY_CONFIG[rec.priority];
  const title = language === "ko" ? rec.titleKo : rec.title;
  const description = language === "ko" ? rec.descriptionKo : rec.description;
  const reason = language === "ko" ? rec.reasonKo : rec.reason;
  const goalTitle = language === "ko" ? rec.goalTitleKo || rec.goalTitle : rec.goalTitle;
  const dueDateStr = format(rec.suggestedDueDate, language === "ko" ? "M월 d일" : "MMM d", {
    locale: language === "ko" ? koLocale : undefined,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: "spring", stiffness: 300, damping: 28 }}
      className={cn(
        "rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all overflow-hidden",
        isAdded ? "border-emerald-200 bg-emerald-50/30" : "border-gray-100"
      )}
    >
      {/* Score bar accent */}
      <div
        className="h-0.5 rounded-t-full"
        style={{
          background: `linear-gradient(to right, #0079FF ${rec.score}%, #e5e7eb ${rec.score}%)`,
        }}
      />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Goal level badge */}
            <span className={cn("flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border", levelCfg.bg, levelCfg.color)}>
              {levelCfg.icon}
              <span className="ml-0.5">{language === "ko" ? levelCfg.labelKo : levelCfg.label}</span>
            </span>
            {/* Priority badge */}
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", pCfg.bg, pCfg.color, pCfg.border)}>
              {language === "ko" ? pCfg.label : pCfg.labelEn}
            </span>
          </div>
          {/* Score */}
          <div className="flex items-center gap-1 shrink-0">
            <Sparkles size={11} className="text-blue-400" />
            <span className="text-[11px] font-bold text-blue-600">{rec.score}</span>
          </div>
        </div>

        {/* Title */}
        <h3 className={cn("text-sm font-bold leading-snug mb-1.5", isAdded ? "text-emerald-700" : "text-gray-900")}>
          {isAdded && <CheckCircle2 size={13} className="inline mr-1.5 text-emerald-500" />}
          {title}
        </h3>

        {/* Goal link */}
        <div className="flex items-center gap-1 mb-2.5 text-[11px] text-gray-500">
          <ArrowUpRight size={11} className="shrink-0" />
          <span className="truncate">{goalTitle}</span>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 mb-3 text-[11px] text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar size={11} />
            <span className="font-medium">{dueDateStr}</span>
          </div>
          {assignee && (
            <div className="flex items-center gap-1">
              <img src={assignee.avatar} alt={assignee.name} className="w-4 h-4 rounded-full object-cover border border-white shadow-sm" />
              <span>{assignee.name.split(" ")[0]}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-emerald-600 font-semibold">
            <TrendingUp size={11} />
            +{rec.estimatedImpact}%
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {rec.tags.map((tag) => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">
              #{tag}
            </span>
          ))}
        </div>

        {/* Reason (expandable) */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 font-medium mb-2 w-full text-left"
        >
          <Info size={11} />
          {language === "ko" ? "추천 이유 보기" : "Why recommended"}
          <ChevronRight size={11} className={cn("transition-transform ml-auto", expanded && "rotate-90")} />
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.p
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="text-[11px] text-gray-600 leading-relaxed bg-blue-50/60 rounded-lg px-3 py-2 mb-3 border border-blue-100 overflow-hidden"
            >
              {reason}
            </motion.p>
          )}
        </AnimatePresence>

        {/* CTA */}
        <button
          onClick={() => !isAdded && onAdd(rec)}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all",
            isAdded
              ? "bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default"
              : "bg-[#0079FF] hover:bg-blue-600 text-white shadow-sm shadow-blue-200 active:scale-[0.98]"
          )}
        >
          {isAdded ? (
            <>
              <CheckCircle2 size={15} />
              {language === "ko" ? "내 업무에 추가됨" : "Added to My Tasks"}
            </>
          ) : (
            <>
              <Plus size={15} />
              {language === "ko" ? "내 업무에 추가" : "Add to My Tasks"}
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Skeleton Loader ─────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 animate-pulse">
      <div className="flex gap-2 mb-3">
        <div className="h-5 w-20 bg-gray-100 rounded-full" />
        <div className="h-5 w-12 bg-gray-100 rounded-full" />
      </div>
      <div className="h-4 bg-gray-100 rounded-lg w-3/4 mb-2" />
      <div className="h-3 bg-gray-100 rounded-lg w-1/2 mb-4" />
      <div className="flex gap-3 mb-4">
        <div className="h-3 w-16 bg-gray-100 rounded" />
        <div className="h-3 w-16 bg-gray-100 rounded" />
      </div>
      <div className="h-9 bg-gray-100 rounded-xl" />
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────────────────
interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function TaskRecommendationPanel({ isOpen, onClose }: Props) {
  const { language } = useLanguage();
  const { tasks, setTasks } = useTaskContext();
  const { allGoals } = useGoalContext();
  const { currentUser } = usePermission();
  const navigate = useNavigate();

  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendations, setRecommendations] = useState<TaskRecommendation[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [filterLevel, setFilterLevel] = useState<string>("all");

  const goalContexts = useMemo(() => getGoalContextSummary(allGoals), [allGoals]);

  const runGeneration = () => {
    setIsGenerating(true);
    setRecommendations([]);
    setTimeout(() => {
      const recs = generateRecommendations(allGoals, tasks);
      setRecommendations(recs);
      setIsGenerating(false);
    }, 1800);
  };

  useEffect(() => {
    if (isOpen) {
      runGeneration();
      setAddedIds(new Set());
      setFilterLevel("all");
    }
  }, [isOpen]);

  const filteredRecs = useMemo(() => {
    if (filterLevel === "all") return recommendations;
    return recommendations.filter((r) => r.goalLevel === filterLevel);
  }, [recommendations, filterLevel]);

  const levelFilters = [
    { id: "all", labelKo: "전체", labelEn: "All" },
    { id: "Urgent", labelKo: "긴급", labelEn: "Urgent" },
    { id: "Week", labelKo: "주간", labelEn: "Weekly" },
    { id: "Month", labelKo: "월간", labelEn: "Monthly" },
    { id: "Quarter", labelKo: "분기", labelEn: "Quarterly" },
  ];

  const handleAdd = (rec: TaskRecommendation) => {
    const newTask: Task = {
      id: `rec_task_${Date.now()}`,
      title: rec.title,
      titleKo: rec.titleKo,
      level: "Day" as const,
      progress: 0,
      status: "pending",
      dueDate: rec.suggestedDueDate,
      startDate: new Date(),
      endDate: rec.suggestedDueDate,
      assigneeId: currentUser.id,
      assigneeIds: [currentUser.id],
      priority: rec.priority,
      description: language === "ko" ? rec.descriptionKo : rec.description,
    };
    setTasks((prev) => [newTask, ...prev]);
    setAddedIds((prev) => new Set([...prev, rec.id]));
    toast.success(
      language === "ko" ? `"${rec.titleKo}" 업무가 추가됐어요!` : `"${rec.title}" added to tasks!`,
      { description: language === "ko" ? "내 업무 탭에서 확인하세요." : "Check My Tasks tab." }
    );
  };

  const addedCount = addedIds.size;
  const totalImpact = [...addedIds].reduce((sum, id) => {
    const rec = recommendations.find((r) => r.id === id);
    return sum + (rec?.estimatedImpact ?? 0);
  }, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-[8000]"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed top-0 right-0 h-full w-full max-w-[520px] z-[8001] flex flex-col bg-[#F8F9FB] shadow-2xl border-l border-gray-200"
          >
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="bg-gradient-to-br from-[#0079FF] to-blue-600 px-6 pt-6 pb-5 shrink-0">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={18} className="text-blue-200" />
                    <p className="text-blue-100 text-xs font-bold uppercase tracking-widest">
                      {language === "ko" ? "AI 업무 추천" : "AI Task Recommendation"}
                    </p>
                  </div>
                  <h2 className="text-white text-xl font-bold leading-tight">
                    {language === "ko"
                      ? "목표 달성에 필요한 업무를\n자동으로 찾아드려요"
                      : "Tasks recommended to hit\nyour goals faster"}
                  </h2>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors shrink-0 mt-1">
                  <X size={16} />
                </button>
              </div>

              {/* Goal context strips */}
              {goalContexts.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {goalContexts.slice(0, 4).map((g) => (
                    <GoalContextCard key={g.id} goal={g} language={language} />
                  ))}
                </div>
              )}
            </div>

            {/* ── Toolbar ────────────────────────────────────────────────── */}
            <div className="px-5 py-3 border-b border-gray-200 bg-white flex items-center justify-between gap-3 shrink-0">
              {/* Level filter */}
              <div className="flex gap-1 overflow-x-auto">
                {levelFilters.map((f) => {
                  const count = f.id === "all" ? recommendations.length : recommendations.filter((r) => r.goalLevel === f.id).length;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setFilterLevel(f.id)}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                        filterLevel === f.id
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-gray-500 hover:bg-gray-100"
                      )}
                    >
                      {language === "ko" ? f.labelKo : f.labelEn}
                      {count > 0 && (
                        <span className={cn("text-[10px] font-bold rounded-full px-1", filterLevel === f.id ? "text-blue-200" : "text-gray-400")}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Refresh */}
              <button
                onClick={runGeneration}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 shrink-0"
              >
                <RefreshCw size={12} className={isGenerating ? "animate-spin" : ""} />
                {language === "ko" ? "재생성" : "Refresh"}
              </button>
            </div>

            {/* ── Added banner ───────────────────────────────────────────── */}
            <AnimatePresence>
              {addedCount > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden shrink-0"
                >
                  <div className="mx-5 mt-3 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                    <p className="text-xs text-emerald-700 font-semibold">
                      {language === "ko"
                        ? `${addedCount}개 업무 추가됨 · 예상 목표 진행률 +${totalImpact}%`
                        : `${addedCount} tasks added · Est. goal boost +${totalImpact}%`}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Body ───────────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {isGenerating ? (
                <>
                  {/* Generating state */}
                  <div className="flex items-center gap-3 py-4 px-2">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full bg-blue-400"
                          animate={{ y: [0, -6, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 font-medium">
                      {language === "ko"
                        ? "목표를 분석하고 업무를 추천하는 중…"
                        : "Analysing your goals and generating tasks…"}
                    </p>
                  </div>
                  {[0, 1, 2, 4].map((i) => (
                    <SkeletonCard key={i} />
                  ))}
                </>
              ) : filteredRecs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Sparkles size={36} className="mb-3 text-gray-200" />
                  <p className="text-sm font-medium text-gray-500">
                    {language === "ko" ? "추천할 업무가 없어요" : "No recommendations found"}
                  </p>
                  <p className="text-xs mt-1">
                    {language === "ko" ? "모든 목표가 순조롭게 진행 중이에요!" : "All goals are on track!"}
                  </p>
                </div>
              ) : (
                filteredRecs.map((rec, i) => (
                  <RecommendationCard
                    key={rec.id}
                    rec={rec}
                    index={i}
                    isAdded={addedIds.has(rec.id)}
                    onAdd={handleAdd}
                    language={language}
                  />
                ))
              )}
            </div>

            {/* ── Footer ─────────────────────────────────────────────────── */}
            <div className="px-5 py-4 border-t border-gray-200 bg-white shrink-0">
              <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                {language === "ko"
                  ? "추천 업무는 월별·주간·분기 목표의 진행률과 마감일을 기반으로 생성됩니다."
                  : "Recommendations are generated based on goal progress, deadlines, and team context."}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}