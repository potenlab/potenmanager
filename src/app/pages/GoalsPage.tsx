import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronDown, 
  ChevronRight, 
  Flag, 
  Milestone, 
  Target, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Plus, 
  MoreHorizontal,
  Search,
  ArrowUpRight,
  Zap,
  Clock,
  AlertTriangle,
  Banknote,
  TrendingUp,
  FileText,
  CalendarClock,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { GoalItem, GoalLevel, Task, UrgentCategory } from "../../lib/mockData";
import { useLanguage } from "../context/LanguageContext";
import { useGoalContext } from "../context/GoalContext";
import { useTaskContext } from "../context/TaskContext";
import { PermissionGate } from "../components/layout/PermissionGate";
import { usePermission } from "../context/PermissionContext";
import { differenceInDays, format } from "date-fns";
import { ko as koLocale } from "date-fns/locale";

// Combined type for the tree view
type HierarchyItem = (GoalItem | Task) & {
  childrenItems?: HierarchyItem[];
};

// ─── Urgent Category Config ────────────────────────────────────────
const CATEGORY_CONFIG: Record<UrgentCategory, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  funding: { icon: <Banknote size={14} />, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  investment: { icon: <TrendingUp size={14} />, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  contract: { icon: <FileText size={14} />, color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
  submission: { icon: <CalendarClock size={14} />, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  event: { icon: <CalendarIcon size={14} />, color: "text-pink-700", bg: "bg-pink-50", border: "border-pink-200" },
  other: { icon: <Zap size={14} />, color: "text-gray-700", bg: "bg-gray-50", border: "border-gray-200" },
};

// ─── D-Day Badge ────────────────────────────────────────────────────
function DDayBadge({ deadline, status }: { deadline: Date; status: string }) {
  const { t } = useLanguage();
  const now = new Date();
  const daysLeft = differenceInDays(deadline, now);
  
  if (status === 'completed') {
    return (
      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
        <CheckCircle2 size={11} className="inline mr-1 -mt-0.5" />
        {t("status_completed" as any)}
      </span>
    );
  }

  if (daysLeft < 0) {
    return (
      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-red-100 text-red-700 border border-red-200 animate-pulse">
        <AlertTriangle size={11} className="inline mr-1 -mt-0.5" />
        D+{Math.abs(daysLeft)}
      </span>
    );
  }
  if (daysLeft === 0) {
    return (
      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-red-100 text-red-700 border border-red-200 animate-pulse">
        <Zap size={11} className="inline mr-1 -mt-0.5" />
        D-Day
      </span>
    );
  }
  if (daysLeft <= 3) {
    return (
      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-200">
        <Clock size={11} className="inline mr-1 -mt-0.5" />
        D-{daysLeft}
      </span>
    );
  }
  if (daysLeft <= 7) {
    return (
      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
        D-{daysLeft}
      </span>
    );
  }
  return (
    <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 border border-gray-200">
      D-{daysLeft}
    </span>
  );
}

// ─── Urgent Goal Card ───────────────────────────────────────────────
function UrgentGoalCard({ goal }: { goal: GoalItem }) {
  const { language, t } = useLanguage();
  const { members } = usePermission();
  const title = language === 'ko' ? goal.titleKo || goal.title : goal.title;
  const category = goal.urgentCategory || 'other';
  const catCfg = CATEGORY_CONFIG[category];
  const catLabel = t(`category_${category}` as any);
  const assignee = goal.assigneeId ? members.find(m => m.id === goal.assigneeId) : null;
  const daysLeft = goal.deadline ? differenceInDays(goal.deadline, new Date()) : null;
  const isOverdue = daysLeft !== null && daysLeft < 0 && goal.status !== 'completed';
  const isUrgentSoon = daysLeft !== null && daysLeft <= 3 && daysLeft >= 0 && goal.status !== 'completed';

  return (
    <Link
      to={`/goals/${goal.id}`}
      className={cn(
        "block bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all group relative overflow-hidden",
        isOverdue ? "border-red-200 ring-1 ring-red-100" :
        isUrgentSoon ? "border-orange-200 ring-1 ring-orange-100" :
        goal.status === 'completed' ? "border-gray-200 opacity-70" :
        "border-gray-200"
      )}
    >
      <div className={cn(
        "h-1 w-full",
        isOverdue ? "bg-red-500" :
        isUrgentSoon ? "bg-gradient-to-r from-orange-400 to-red-400" :
        goal.status === 'completed' ? "bg-emerald-400" :
        "bg-gradient-to-r from-amber-400 to-orange-400"
      )} />
      
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider flex items-center gap-1",
            catCfg.bg, catCfg.color, catCfg.border
          )}>
            {catCfg.icon}
            {catLabel}
          </span>
          {goal.deadline && <DDayBadge deadline={goal.deadline} status={goal.status} />}
        </div>

        <h3 className={cn(
          "font-semibold text-gray-900 mb-3 leading-snug group-hover:text-blue-600 transition-colors",
          goal.status === 'completed' && "line-through text-gray-400"
        )}>
          {title}
        </h3>

        <div className="mb-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] text-gray-500 font-medium">{t("progress" as any)}</span>
            <span className={cn(
              "text-xs font-bold",
              goal.progress === 100 ? "text-emerald-600" :
              goal.progress > 60 ? "text-blue-600" : "text-amber-600"
            )}>
              {goal.progress}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                goal.progress === 100 ? "bg-emerald-500" :
                isOverdue ? "bg-red-400" :
                isUrgentSoon ? "bg-orange-400" :
                goal.progress > 60 ? "bg-blue-500" : "bg-amber-500"
              )}
              style={{ width: `${goal.progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          {goal.deadline && (
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <CalendarIcon size={11} />
              {format(goal.deadline, language === 'ko' ? 'M\uC6D4 d\uC77C' : 'MMM d', {
                locale: language === 'ko' ? koLocale : undefined,
              })}
            </span>
          )}
          {assignee && (
            <img
              src={assignee.avatar}
              alt={assignee.name}
              className="w-6 h-6 rounded-full border-2 border-white shadow-sm object-cover"
            />
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────
export function GoalsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCompletedUrgent, setShowCompletedUrgent] = useState(false);
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  // *** Context-connected data ***
  const { goals: ctxGoals, urgentGoals: ctxUrgentGoals, isLoading: goalsLoading } = useGoalContext();
  const { tasks: ctxTasks, isLoading: tasksLoading } = useTaskContext();

  const isLoading = goalsLoading || tasksLoading;
  
  const handleCreateGoal = (defaultLevel?: GoalLevel) => {
    const params = defaultLevel ? `?level=${defaultLevel}` : "";
    navigate(`/goals/new${params}`);
  };
  
  // Build the hierarchy tree from context data
  const hierarchyData = useMemo(() => {
    const itemMap = new Map<string, HierarchyItem>();
    const rootItems: HierarchyItem[] = [];

    // Use goals and tasks from context (server-synced)
    const strategicGoals = ctxGoals.filter(g => !g.isUrgent);
    [...strategicGoals, ...ctxTasks].forEach(item => {
      itemMap.set(item.id, { ...item, childrenItems: [] });
    });

    itemMap.forEach(item => {
      if (item.parentId && itemMap.has(item.parentId)) {
        itemMap.get(item.parentId)!.childrenItems!.push(item);
      } else if (!item.parentId || !itemMap.has(item.parentId)) {
        // Root item if level is Year or has no valid parent
        if ('level' in item && (item.level === 'Year' || item.level === 'Quarter')) {
          rootItems.push(item);
        }
      }
    });

    return rootItems;
  }, [ctxGoals, ctxTasks]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm text-gray-500 font-medium">
            {language === 'ko' ? '\uB370\uC774\uD130 \uB85C\uB529 \uC911...' : 'Loading data...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <header className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{t("goals_strategy")}</h1>
            <p className="text-gray-500 text-sm">{t("align_vision")}</p>
          </div>
          <PermissionGate permission="strategy.create">
            <button
              onClick={() => navigate("/strategy/new")}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-md shadow-blue-200 shrink-0"
            >
              <Sparkles size={15} />
              AI {language === 'ko' ? '\uC804\uB7B5 \uC0DD\uC131' : 'Strategy'}
            </button>
          </PermissionGate>
        </div>

        <div className="flex items-center w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all shadow-sm">
          <Search className="text-gray-400 mr-3 shrink-0" size={18} />
          <input 
            type="text"
            placeholder={t("search_goals")}
            className="w-full text-sm outline-none bg-transparent placeholder-gray-400 text-gray-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {/* Urgent Goals Section - now context-connected */}
      <UrgentGoalsSection 
        urgentGoals={ctxUrgentGoals}
        showCompleted={showCompletedUrgent} 
        onToggleCompleted={() => setShowCompletedUrgent(!showCompletedUrgent)} 
        onAddUrgent={() => handleCreateGoal('Urgent')} 
      />

      {/* Strategic Goals (Hierarchy) */}
      <div className="mt-8 mb-2 flex items-center gap-2">
        <Flag size={16} className="text-purple-600" />
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
          {language === 'ko' ? '\uC804\uB7B5 \uBAA9\uD45C' : 'Strategic Goals'}
        </h2>
        <div className="flex-1 border-t border-gray-100 ml-2" />
      </div>

      <div className="space-y-6">
        {hierarchyData.map(node => (
          <GoalNodeCard key={node.id} node={node} level={0} />
        ))}
        {hierarchyData.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <Target size={32} />
            </div>
            <h3 className="text-gray-900 font-medium mb-1">{t("no_goals")}</h3>
            <p className="text-gray-500 text-sm">{t("start_goal")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Goal Node Card (Hierarchy) ─────────────────────────────────────
function GoalNodeCard({ node, level }: { node: HierarchyItem; level: number }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.childrenItems && node.childrenItems.length > 0;
  const { language, t } = useLanguage();

  const isYear = level === 0;

  const containerClasses = cn(
    "relative transition-all duration-200",
    isYear ? "bg-white rounded-2xl border border-gray-200 shadow-card mb-6" : "",
    !isYear && "mt-2 ml-4 pl-4 border-l border-gray-100"
  );

  const title = language === 'ko' ? node.titleKo || node.title : node.title;
  const levelKey = `level_${node.level.toLowerCase()}` as any;
  const levelLabel = t(levelKey) || node.level;

  return (
    <div className={containerClasses}>
      {!isYear && (
        <div className="absolute left-[-1px] top-6 w-4 h-[1px] bg-gray-200" />
      )}

      <div className={cn(
        "flex items-center gap-4 p-4 rounded-xl transition-colors group",
        isYear ? "bg-white" : "hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 bg-transparent"
      )}>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors shrink-0",
            !hasChildren && "invisible"
          )}
        >
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        <div className={cn(
          "p-2.5 rounded-xl border shrink-0",
          node.level === 'Year' && "bg-purple-50 text-purple-600 border-purple-100",
          node.level === 'Quarter' && "bg-blue-50 text-blue-600 border-blue-100",
          node.level === 'Month' && "bg-emerald-50 text-emerald-600 border-emerald-100",
          node.level === 'Week' && "bg-amber-50 text-amber-600 border-amber-100",
          node.level === 'Day' && "bg-gray-50 text-gray-600 border-gray-200"
        )}>
          {node.level === 'Year' && <Flag size={20} />}
          {node.level === 'Quarter' && <Milestone size={20} />}
          {node.level === 'Month' && <Target size={20} />}
          {node.level === 'Week' && <CalendarIcon size={20} />}
          {node.level === 'Day' && <CheckCircle2 size={20} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider",
              node.level === 'Year' && "bg-purple-50 text-purple-700 border-purple-200",
              node.level === 'Quarter' && "bg-blue-50 text-blue-700 border-blue-200",
              node.level === 'Month' && "bg-emerald-50 text-emerald-700 border-emerald-200",
              node.level === 'Week' && "bg-amber-50 text-amber-700 border-amber-200",
              node.level === 'Day' && "bg-gray-100 text-gray-700 border-gray-200"
            )}>
              {levelLabel}
            </span>
            {node.status === 'completed' && (
              <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={10} /> {t("status_completed")}
              </span>
            )}
          </div>
          <Link to={`/goals/${node.id}`}>
            <h3 className={cn(
              "font-semibold text-gray-900 truncate hover:text-blue-600 transition-colors cursor-pointer",
              isYear ? "text-lg" : "text-sm"
            )}>
              {title}
            </h3>
          </Link>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end w-32 gap-1.5">
            <div className="flex justify-between w-full text-[10px] text-gray-500 font-medium">
              <span>{t("progress")}</span>
              <span>{node.progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  node.progress === 100 ? "bg-emerald-500" : 
                  node.progress > 60 ? "bg-blue-500" : "bg-amber-500"
                )}
                style={{ width: `${node.progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to={`/goals/${node.id}`} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
              <ArrowUpRight size={18} />
            </Link>
            <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className={cn(isYear ? "p-4 pt-0" : "")}>
              {node.childrenItems!.map(child => (
                <GoalNodeCard key={child.id} node={child} level={level + 1} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Urgent Goals Section ───────────────────────────────────────────
function UrgentGoalsSection({ 
  urgentGoals,
  showCompleted, 
  onToggleCompleted, 
  onAddUrgent 
}: { 
  urgentGoals: GoalItem[];
  showCompleted: boolean; 
  onToggleCompleted: () => void; 
  onAddUrgent: () => void;
}) {
  const { language, t } = useLanguage();

  const activeGoals = urgentGoals.filter(g => g.status !== 'completed');
  const completedGoalsList = urgentGoals.filter(g => g.status === 'completed');
  const activeCount = activeGoals.length;
  const completedCount = completedGoalsList.length;

  const sortedActive = [...activeGoals].sort((a, b) => {
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline.getTime() - b.deadline.getTime();
  });

  const displayGoals = showCompleted ? [...sortedActive, ...completedGoalsList] : sortedActive;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-orange-50 border border-orange-200">
          <Zap size={16} className="text-orange-600" />
        </div>
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
          {t("urgent_goals" as any)}
        </h2>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
          {activeCount} {t("urgent_active" as any)}
        </span>
        {completedCount > 0 && (
          <button
            onClick={onToggleCompleted}
            className="flex items-center gap-1 ml-auto text-[11px] font-medium text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showCompleted ? <EyeOff size={12} /> : <Eye size={12} />}
            {showCompleted ? t("hide_completed" as any) : `${completedCount} ${t("urgent_completed" as any)}`}
          </button>
        )}
        <div className="hidden sm:block flex-1 border-t border-gray-100 ml-2" />
        <PermissionGate permission="goal.create">
          <button
            onClick={onAddUrgent}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition-colors border border-orange-200 bg-white"
          >
            <Plus size={13} />
            {t("new_urgent_goal" as any)}
          </button>
        </PermissionGate>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {displayGoals.map(goal => (
            <motion.div
              key={goal.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <UrgentGoalCard goal={goal} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}